## Slide 1: Title Slide

# Domain-Driven Design
## A Beginner's Guide — Why Your Code Should Speak the Language of the Business

- **Presented by:** Mir Mursalin Ankur
- **Lead Software Engineer @Nerddevs Ltd**

*Most software doesn't break because of syntax errors or flawed if-else logic — it breaks because teams lose alignment with the business problem they're supposed to solve. Everything in this deck is built up from one real, named business, from scratch, before any code shows up.*

---

## Slide 2: Meet Northwind

# Meet Northwind — a Small Online Retail Business

In plain English, here is everything Northwind does. No code, no database, no framework — just the business, as its three founders would describe it:

- People browse a catalog and place orders.
- Someone decides what things cost, and runs the occasional discount.
- Someone keeps track of what's actually in the warehouse.
- Someone packs boxes and hands them to a carrier.
- Someone charges the customer's card and refunds it when something goes wrong.
- Someone lets a customer log in and see their order history.

**That list — nothing more than what the founders would actually say — is the business domain.** Not a diagram, not a schema. Everything in this deck is this same list, gradually made precise enough to build software against.

---

## Slide 3: Terms at a Glance

# Five Words That Get Conflated — Pin Them Down Early

| Term | What it means | Northwind example |
|---|---|---|
| **Domain** | The real-world subject matter the software exists to serve | "Online retail" |
| **Business domain** | The specific domain *your* company operates in | Northwind's business domain is online retail |
| **Subdomain** | A distinct area of responsibility inside the business domain | Order Management, Inventory, Payments, Fulfillment, Auth, Pricing |
| **Bounded Context** | The boundary you draw *in code* where one model/vocabulary apply | The `order-management` module, with its own `Product` and `Order` |
| **Ubiquitous Language** | The shared vocabulary inside one bounded context — not the whole company | Inside Order Management, "Product" always means a purchasable line item |

**The short version:** domain and subdomain describe the business. Bounded context and ubiquitous language describe how you organize the code and the words around it. Keep those two groups separate and most DDD confusion disappears.

---

## Slide 4: A Bug That Vocabulary Caused

# The Bug: Two Teams, One Word, Two Meanings

Northwind grew. Now there's an Ordering team and a separate Inventory team, each shipping its own service. Both use a type called `Product`. Neither team thinks there's a problem.

```ts
// InventoryService — "price" is the wholesale cost Northwind pays the supplier
class Product { sku: string; price: number; stockCount: number; }

// OrderService — imports the SAME Product type from a shared "models" folder
function calculateTotal(product: Product, qty: number) {
  return product.price * qty;   // customer is charged supplier COST, not retail price
}
```

Nobody wrote a bug. Both teams used a perfectly reasonable field named `price`. The system still shipped a real one: **customers were charged wholesale cost** for weeks before anyone noticed margins had collapsed.

**Why:** there was no agreement on what "Product" — or "price" — means, and no boundary stopping one team's meaning from leaking into another team's code.

---

## Slide 5: Why This Keeps Happening

# Systems Don't Fail on Day One — They Fail as They Grow

- **Early Northwind succeeded** because the three founders held the whole mental model in their heads.
- **Later Northwind failed** because that model fractured: teams grew apart, terminology drifted — exactly what caused the bug on the last slide.
- Features get bolted on without design consideration. Every new requirement piles more special cases onto assumptions that are already stale.
- **This is rarely a tooling problem.** It's a *modeling* problem — and it's exactly the moment DDD targets.

**The hardest part of a complex product was never the codebase. It's agreeing on what the business is actually doing.**

---

## Slide 6: What Is Domain-Driven Design

# Model the Business, Not the Database

The term traces back to a specific source: Eric Evans' 2003 book *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Every tactical pattern in this deck and the Deep Dive — Entity, Value Object, Aggregate, Domain Event, Repository — comes from that book by name.

Domain-Driven Design is an approach to software design that puts the **business domain** — not the schema, not the framework — at the center of decision-making. It requires engineers to collaborate deeply and continuously with domain experts, not just gather requirements once and disappear into tickets.

- **Not a silver bullet.** DDD doesn't generate code and won't fix a legacy monolith by itself.
- **What it gives you instead:** clarity about what the system is supposed to do, and where it's safe to change.
- **Architecture-agnostic.** Works whether Northwind is a monolith or microservices — what matters is whether the model reflects real domain rules and can evolve safely.

**Cheatsheet (ByteByteGo):** rich domain model + ubiquitous language + bounded contexts + aggregates + repositories, all reflecting the real-world rules of the business.

*(Image: `images/ByteByteGo - Domain-Driven Design (DDD) Demystified.webp` — full cheatsheet overview.)*

---

## Slide 7: How to Identify Northwind's Subdomains

# A Repeatable Method — Not Guesswork

1. **List what the business actually does**, in the founders' own words.
2. **Ask: does a shared word change meaning here?** "Product" means something different to whoever counts warehouse stock versus whoever builds a shopping cart — that shift is a signal.
3. **Ask: does a different group decide here, on a different rhythm?** Pricing changes daily; stock syncs hourly; login barely changes at all.
4. **Group the answers by how much they matter to Northwind's success:**
   - **Core** — what makes the business money or wins the market. Invest here: *Order Management, Pricing & Promotions*.
   - **Supporting** — necessary, not the differentiator: *Inventory, Fulfillment/Shipping*.
   - **Generic** — solved problems. Buy, don't build: *Payments Gateway, Authentication*.

Each subdomain typically becomes its own **Bounded Context** in code:

```
src/
├── order-management/   ← Core domain (Bounded Context)
├── inventory/           ← Supporting domain (Bounded Context)
├── fulfillment/         ← Supporting domain (Bounded Context)
├── payments/            ← Generic domain — thin wrapper around a payment SDK
└── auth/                ← Generic domain — thin wrapper around Auth0 / Cognito
```

**Legacy codebase, not greenfield?** Same method — read the code for a class name used two different ways, or a "simple" change that unexpectedly needs another team's sign-off. Those are the seams this method would have found on day one.

*(Image: `images/domain-subdomain-map.svg` — Online Retail broken into Core, Supporting, and Generic subdomains.)*

**Writing the boundary down — a context definition table:**

| Context | Owns | Core model |
|---|---|---|
| Order Management | Orders, checkout | `Order` (root), `OrderLineItem` |
| Inventory | Stock, warehouse SKUs | `Product`, `StockCount` |
| Payments | Charges, refunds | `PaymentAttempt` (via ACL) |

**This is a candidate, not a final answer — candidates get discussed and can be rejected.** Northwind initially proposed splitting "Pricing" out of Order Management, but discussion revealed one team makes every pricing decision *as part of* placing an order — no real seam. Pricing got merged back in. Propose → discuss with the people who'd own each row → reject or merge weak candidates → standardize what survives.

---

## Slide 8: Fix #1 — Ubiquitous Language

# One Word, One Meaning — Inside a Context

**Ubiquitous language** is a shared vocabulary that developers and domain experts use everywhere, for one bounded context: meetings, tickets, docs, and code. Applied to the bug on Slide 4, the fix starts with a naming conversation, not a code review comment:

```ts
// After a 15-minute glossary conversation with the business:
// "price" the business pays a supplier is a WholesaleCost.
// "price" the customer pays is a RetailPrice. They are never the same field.
class Product { sku: string; wholesaleCost: Money; retailPrice: Money; stockCount: number; }

function calculateTotal(product: Product, qty: number) {
  return product.retailPrice.multiply(qty);   // unambiguous — reads like the business talks
}
```

**Pros:** shared meaning, readable code, better decisions (clear terms expose missing rules like this one).
**Cons:** upfront workshop effort; sloppy naming breaks the whole benefit.

---

## Slide 9: Common Confusion — One Language for Everyone, or One Per Team?

# There Is No Company-Wide Glossary

**Ubiquitous language is scoped per bounded context — not company-wide.** Each context gets its own internally-consistent vocabulary:

- Inside **Order Management**, "Product" always means a purchasable line item.
- Inside **Inventory**, "Product" always means a stocked SKU with a wholesale cost.
- Neither definition is wrong. Neither team needs to "win." They just need to never accidentally share the same `Product` class.

Where two contexts genuinely need to talk, you don't force one team's words onto the other — you **translate explicitly at the boundary** (context mapping — see the Deep Dive deck).

**Remember: one language per context, translated at the seams — never one language forced onto everyone.**

---

## Slide 10: Fix #2 — Bounded Contexts

# Make the Confusion Structurally Impossible

Renaming one field fixes one bug. It doesn't stop the *next* team from importing the wrong `Product` again — there's still one shared type for two meanings. A **bounded context** gives each meaning its own model.

```ts
// inventory-context/Product.ts — Inventory's own model, not shared
class Product { sku: string; wholesaleCost: Money; stockCount: number; }

// order-context/Product.ts — Order Management's own model, not shared
class Product { sku: string; retailPrice: Money; }   // no wholesaleCost field even exists here
```

*(Image: `images/luc-bounded-contexts.jpg` — Order Management and Inventory each define "Product" independently.)*

**One clarification:** a bounded context is not automatically a microservice — it can be a folder/module inside one monolith. What makes it a bounded context is the model-and-language boundary, not how it's deployed.

**Pros:** prevents a "big ball of mud"; teams evolve independently; local refactors stay local.
**Cons:** you must design how contexts talk to each other (see the Deep Dive deck); wrong splits create duplicated logic.

---

## Slide 11: Building Blocks Inside a Context — Entities vs. Value Objects

# Identity vs. Attributes

Inside a bounded context, you still need to model the domain correctly. Two kinds of building blocks do that:

- **Entity** — defined by identity and lifecycle. A `Customer` stays the same person even after their address changes. Entities are **mutable**.
- **Value Object** — defined only by its values, often immutable. `Money` has no identity of its own — two `Money` objects with the same amount and currency *are* the same value. Value objects are **immutable**.

```ts
class Customer {                 // Entity — has an ID that outlives any single attribute
  constructor(public readonly id: string, private address: Address) {}
  relocate(newAddress: Address) { this.address = newAddress; } // same customer, new address
}

class Money {                    // Value Object — immutable, compared by value, no ID
  constructor(public readonly amount: number, public readonly currency: string) {}
  multiply(qty: number) { return new Money(this.amount * qty, this.currency); }
}
```

*(Image: `images/luc-entities-value-objects.jpg` — Order is an entity because it has an ID and lifecycle; Money is a value object because only its value matters.)*

**Pros:** clear intent, fewer accidental bugs, directly testable domain behavior.
**Cons:** more types to write upfront; slipping into "anemic models" (data-only objects) loses most of the value.

---

## Slide 12: When to Use It — and What's Next

# DDD Is a Tool, Not a Default

**Reach for DDD when:**
- The domain is complex and keeps evolving — finance, healthcare, logistics, large marketplaces.
- Multiple teams work on overlapping parts of the system.
- The system needs to live and change safely for years.

**Skip DDD when:**
- The app is mostly CRUD — DDD adds layers and coordination you don't need.
- You can't get sustained access to domain experts — DDD becomes guesswork that hardens into code.
- The project is short-lived or low-impact — the modeling cost won't pay back.

**You don't adopt DDD by adding patterns — you adopt it by removing ambiguity.**

**Next up — the Deep Dive deck:** Northwind keeps growing — an inconsistent-total bug that Aggregates fix, a tightly-coupled service call that Domain Events fix, SQL leaking into business logic that Repositories fix (plus the "one database or many?" question, answered directly), and a legacy webhook's field names leaking into the domain that the Anti-Corruption Layer fixes → `deep-dive.html`

---

## Sources

- ByteByteGo — [Domain-Driven Design (DDD) Demystified](https://blog.bytebytego.com/p/domain-driven-design-ddd-demystified)
- Nikki Siapno, Level Up Coding — [Domain-Driven Design, Broken Down](https://blog.levelupcoding.com/p/domain-driven-design-broken-down)
