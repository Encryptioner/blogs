## Slide 1: Title Slide

# Domain-Driven Design
## A Beginner's Guide — Why Your Code Should Speak the Language of the Business

- **Presented by:** Mir Mursalin Ankur
- **Lead Software Engineer @Nerddevs Ltd**

*Most software doesn't break because of syntax errors or flawed if-else logic — it breaks because teams lose alignment with the business problem they're supposed to solve. Domain-Driven Design (DDD) is a way of designing software that keeps the business domain, not the database schema or the latest framework, at the center of every decision.*

---

## Slide 2: A Bug That Vocabulary Caused

# The Bug: Two Teams, One Word, Two Meanings

Two small services in an online store. Both use a type called `Product`. Neither team thinks there's a problem.

```ts
// InventoryService — "price" is the wholesale cost we pay the supplier
class Product { sku: string; price: number; stockCount: number; }

// OrderService — imports the SAME Product type from a shared "models" folder
// and charges the customer this "price" directly
function calculateTotal(product: Product, qty: number) {
  return product.price * qty;   // customer is charged supplier COST, not retail price
}
```

Nobody wrote a bug. Both teams used a perfectly reasonable field named `price`. The system still shipped a real one: **customers were charged wholesale cost** for weeks before anyone noticed margins had collapsed.

**Why:** there was no agreement on what "Product" — or "price" — means, and no boundary stopping one team's meaning from leaking into another team's code.

---

## Slide 3: Why This Keeps Happening

# Systems Don't Fail on Day One — They Fail as They Grow

- **Early systems succeed** because one or two people hold the whole mental model in their head.
- **Late-stage systems fail** because that model fractures: teams grow, terminology drifts, and the code becomes a poor translation of the business — exactly what caused the bug on the last slide.
- Features get bolted on without design consideration. Every new requirement piles more special cases onto assumptions that are already stale.
- **This is rarely a tooling problem.** It's a *modeling* problem — and it's exactly the moment DDD targets.

**The hardest part of a complex product was never the codebase. It's agreeing on what the business is actually doing.**

---

## Slide 4: What Is a Domain?

# "Domain" Is the Business — Not the Code

Before DDD makes sense, "domain" needs a plain definition:

- **Domain** = the real-world subject matter and activity your software exists to serve — independent of any code. "Online retail," "flight booking," "health insurance claims" are all domains.
- **Business domain** = the specific domain *your* organization operates in. For our running example, the business domain is **Online Retail**.
- A business domain is made of **subdomains** — distinct areas of responsibility:
  - **Core** — what makes the business money or wins the market. Invest here, build it well: *Order Management, Pricing & Promotions*.
  - **Supporting** — necessary to run the business, but not the differentiator: *Inventory, Fulfillment/Shipping*.
  - **Generic** — solved problems everyone needs. Buy or plug in a vendor, don't build it: *Payments Gateway, Authentication*.

**How to identify domains in a real system:** don't start from database tables — ask domain experts "what does this part of the business actually do?" Each answer becomes a subdomain, and each subdomain typically becomes its own **Bounded Context** in code:

```
src/
├── order-management/   ← Core domain (Bounded Context)
│   ├── Order.ts
│   └── OrderRepository.ts
├── inventory/           ← Supporting domain (Bounded Context)
│   └── Product.ts
├── fulfillment/         ← Supporting domain (Bounded Context)
├── payments/            ← Generic domain — thin wrapper around a payment SDK
└── auth/                ← Generic domain — thin wrapper around Auth0 / Cognito
```

*(Image: `images/domain-subdomain-map.svg` — Online Retail broken into Core, Supporting, and Generic subdomains.)*

---

## Slide 5: What Is Domain-Driven Design

# Model the Business, Not the Database

Domain-Driven Design is an approach to software design that puts the **business domain** — not the schema, not the framework — at the center of decision-making. It requires engineers to collaborate deeply and continuously with domain experts, not just gather requirements once and disappear into tickets.

- **Not a silver bullet.** DDD doesn't generate code and won't fix a legacy monolith by itself.
- **What it gives you instead:** clarity about what the system is supposed to do, and where it's safe to change.
- **Architecture-agnostic.** Works whether you build a monolith or microservices — what matters is whether the model reflects real domain rules and can evolve safely.

**Cheatsheet (ByteByteGo):** rich domain model + ubiquitous language + bounded contexts + aggregates + repositories, all reflecting the real-world rules of the business.

*(Image: `images/ByteByteGo - Domain-Driven Design (DDD) Demystified.webp` — full cheatsheet overview.)*

---

## Slide 6: Fix #1 — Ubiquitous Language

# One Word, One Meaning — Everywhere

**Ubiquitous language** is a shared vocabulary that developers and domain experts use everywhere: meetings, tickets, docs, and code. Applied to the bug on Slide 2, the fix starts with a naming conversation, not a code review comment:

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

## Slide 7: Fix #2 — Bounded Contexts

# Make the Confusion Structurally Impossible

Renaming one field fixes one bug. It doesn't stop the *next* team from importing the wrong `Product` again — because there's still only one shared `Product` type for two different meanings. A **bounded context** draws a boundary so each meaning gets its own model, and the same word can legitimately mean different things on each side.

```ts
// inventory-context/Product.ts — Inventory's own model, not shared
class Product { sku: string; wholesaleCost: Money; stockCount: number; }

// order-context/Product.ts — Order Management's own model, not shared
class Product { sku: string; retailPrice: Money; }   // no wholesaleCost field even exists here
```

*(Image: `images/luc-bounded-contexts.jpg` — Order Management and Inventory each define "Product" independently.)*

There is no shared "models" folder to accidentally import from anymore — the two `Product`s are different types in different modules.

**Pros:** prevents one model from becoming a "big ball of mud"; teams evolve independently; local refactors stay local.
**Cons:** you must design how contexts talk to each other (see the Deep Dive deck); wrong splits create duplicated logic.

---

## Slide 8: Building Blocks Inside a Context — Entities vs. Value Objects

# Identity vs. Attributes

Inside a bounded context, you still need to model the domain correctly. Two kinds of building blocks do that:

- **Entity** — defined by identity and lifecycle. A `Customer` stays the same person even after their address changes. Entities are **mutable**.
- **Value Object** — defined only by its values, often immutable. `Money` or `Address` have no identity of their own — two `Money` objects with the same amount and currency *are* the same value. Value objects are **immutable**.

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

## Slide 9: When to Use It — and What's Next

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

**Next up — the Deep Dive deck:** the wholesale/retail example returns — this time an inconsistent-total bug that Aggregates fix, a tightly-coupled service call that Domain Events fix, SQL leaking into business logic that Repositories fix, and a legacy webhook's field names leaking into the domain that the Anti-Corruption Layer fixes → `deep-dive.html`

---

## Sources

- ByteByteGo — [Domain-Driven Design (DDD) Demystified](https://blog.bytebytego.com/p/domain-driven-design-ddd-demystified)
- Nikki Siapno, Level Up Coding — [Domain-Driven Design, Broken Down](https://blog.levelupcoding.com/p/domain-driven-design-broken-down)
