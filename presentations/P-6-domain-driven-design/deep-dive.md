## Slide 1: Title Slide

# Domain-Driven Design — Deep Dive
## Aggregates, Events, Repositories, and Context Maps in a Real System

- **Presented by:** Mir Mursalin Ankur
- **Lead Software Engineer @Nerddevs Ltd**

*Picks up where the [Intro deck](./intro.html) left off. Northwind — the small online retail business from the Intro deck — keeps growing. Ubiquitous Language and Bounded Contexts fixed how its teams talk about "Product." This deck covers the patterns that make the model safe to change under real traffic and real teams — Aggregates, Domain Events, Repositories, Ports & Adapters layering, and Context Mapping — each introduced with the bug it prevents.*

---

## Slide 2: Quick Recap

# Five Patterns, One Goal: Protect the Model as It Scales

| Pattern | Optimizes for | Trade-off |
|---|---|---|
| Ubiquitous Language | Shared understanding | Ongoing collaboration cost |
| Bounded Contexts | Modularity at scale | Integration complexity |
| Entities + Value Objects | Expressive models | More types + modeling work |
| **Aggregates** ← today | Consistency + invariants | Boundary design is hard |
| **Events + Repositories** ← today | Decoupling + clean domain | More infrastructure + discipline |

*(Image: `images/luc-when-to-use-ddd.jpg` — the same trade-off table, illustrated.)*

The Intro deck's patterns give you vocabulary and boundaries. What follows is what makes those boundaries *safe to change* once real traffic and multiple teams hit them — and it traces back to a specific source: Eric Evans' 2003 book *Domain-Driven Design*, which is where Aggregate, Entity, Value Object, Domain Event, and Repository come from by name.

---

## Slide 3: The Bug — Two Code Paths, One Inconsistent Order

# When Nothing Owns the Rules, Everything Can Break Them

`Order` lives in Northwind's codebase as a plain data bag. Two different parts of the codebase are allowed to mutate it directly.

```ts
// order.ts — just a data shape, no rules attached
interface Order { id: string; status: "draft" | "placed"; lineItems: LineItem[]; }

// checkout-controller.ts
function addPromoItem(order: Order, item: LineItem) {
  order.lineItems.push(item);              // works even if the order was already placed
}

// admin-panel.ts (written by a different team, six months later)
function forceAddItem(order: Order, item: LineItem) {
  order.lineItems.push(item);              // same mistake, independently
}
```

A support agent used the admin panel to "add a free gift" to an order that had *already shipped*. The warehouse re-picked it, and the finance report for that day no longer matched the shipped-items count. Two teams, zero communication, same bug — because nothing in the code says an order can't change after it's placed.

---

## Slide 4: Fix — Aggregates & the Aggregate Root

# One Door In, So the Rules Can't Be Skipped

An **aggregate** is a cluster of domain objects treated as a single consistency boundary, controlled by one **aggregate root**. Outside code talks only to the root — never mutates internals directly — so the rule lives in exactly one place.

```ts
class Order {                              // Aggregate Root — the only door in
  private lineItems: LineItem[] = [];
  private status: "draft" | "placed" = "draft";

  addLineItem(item: LineItem) {
    if (this.status !== "draft") {
      throw new Error("Cannot modify a placed order");   // the rule from Slide 3, enforced ONCE
    }
    this.lineItems.push(item);
  }

  place(): OrderPlaced {
    if (this.lineItems.length === 0) throw new Error("Cannot place an empty order");
    this.status = "placed";
    return new OrderPlaced(this.id, this.lineItems);      // see Slide 6
  }
}
```

Both `checkout-controller.ts` and `admin-panel.ts` now call `order.addLineItem(item)` — there is no other way to touch `lineItems`, so the "already shipped" bug is no longer representable in code.

*(Image: `images/luc-aggregates.jpg` — Order Management's `Order` aggregate root and Payments' `Payments` aggregate root, talking only through events.)*

**Pros:** invariants live in one place; transaction boundaries stop at the aggregate; code reads like real business operations.
**Cons:** oversized aggregates become bottlenecks, undersized ones leak invariants; cross-aggregate workflows need orchestration (→ events, next).

---

## Slide 5: The Bug — A Change in One Service Breaks Three Others

# Tight Coupling Hides in Plain Sight

`OrderService.place()` looks harmless — until you see everything it now directly calls.

```ts
class OrderService {
  async place(order: Order) {
    const event = order.place();
    await inventoryService.reserveStock(event.lineItems);   // direct call
    await emailService.sendConfirmation(event.orderId);     // direct call
    await analyticsService.track("order_placed", event);    // direct call
    await loyaltyService.addPoints(event.orderId);           // direct call, added last sprint
  }
}
```

Every new subscriber means editing `OrderService` again. When `inventoryService.reserveStock` was renamed during a refactor, `OrderService` broke — even though the change had nothing to do with placing an order. Order Management is now coupled to four other teams' release schedules.

---

## Slide 6: Fix — Domain Events

# Let Other Contexts React — Without Reaching Into Your Model

A **domain event** captures something meaningful that already happened, named in past tense: `OrderPlaced`. Inside its own context it's a fact; published outward, it becomes an **integration event** other bounded contexts subscribe to independently.

```ts
class OrderPlaced {
  constructor(public readonly orderId: string, public readonly lineItems: LineItem[]) {}
}

class OrderService {
  async place(order: Order) {
    const event = order.place();
    eventBus.publish(event);      // ONE line — OrderService no longer knows who's listening
  }
}

// Each subscriber lives in its own context, wired independently:
eventBus.on(OrderPlaced, (e) => inventoryService.reserveStock(e.lineItems));
eventBus.on(OrderPlaced, (e) => emailService.sendConfirmation(e.orderId));
eventBus.on(OrderPlaced, (e) => loyaltyService.addPoints(e.orderId));
```

Renaming `reserveStock` tomorrow only touches the Inventory context's own subscriber — `OrderService` never changes again for this reason.

**Growth path for `eventBus` — none of it touches domain code:** in-process `EventEmitter` for an MVP monolith → Redis pub/sub once Order and Inventory split into separate services → Kafka once events need replay/audit at scale. `OrderPlaced` and its subscribers never change across any of these three stages — only the adapter underneath `eventBus` does.

**Pros:** lower coupling, cleaner domain model, easier to evolve infrastructure independently.
**Cons:** failures surface later (async); cross-context consistency now needs deliberate design (eventual, not immediate).

---

## Slide 7: The Bug — SQL Buried Inside Business Logic (Problem)

# When the Database Leaks Into the Domain

```ts
async function place(orderId: string) {
  const rows = await db.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  const order = rows[0];
  if (order.status !== "draft") throw new Error("Cannot modify a placed order");
  await db.query(`UPDATE orders SET status = 'placed' WHERE id = $1`, [orderId]);
  // business rule and SQL string, tangled in the same function
}
```

A migration from Postgres to a different column-naming convention broke every business-rule function that touched `orders`, because the rules and the raw SQL lived in the same place. Nobody could test "can't place an empty order" without spinning up a real database.

---

## Slide 8: Fix — Repositories

# Keep the Database Out of the Domain

A **repository** is a domain-facing interface for loading and saving aggregates — it hides persistence behind domain vocabulary.

```ts
interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

async function place(orderId: string, repo: OrderRepository) {
  const order = await repo.findById(orderId);
  const event = order.place();       // Order.place() from Slide 4 — pure business logic
  await repo.save(order);
  eventBus.publish(event);
}
```

Swap Postgres for DynamoDB, rename every column — only the concrete `PostgresOrderRepository` changes. `place()` is now testable with an in-memory fake repository and zero database.

**Pros:** persistence concerns never leak into business logic; the domain is trivially unit-testable.
**Cons:** one more layer of indirection to maintain and keep honest.

---

## Slide 9: How a Bounded Context Is Layered — Ports & Adapters

# Hexagonal Architecture: Everything Points Inward

`OrderRepository` is a small example of a bigger idea: **Ports & Adapters**. `OrderRepository` is a **port** — an interface Domain/Application defines and owns. `PostgresOrderRepository` is the **adapter** that plugs into it from Infrastructure.

| Layer | What lives here | From this deck |
|---|---|---|
| **Domain** (zero deps) | Aggregates, Entities, Value Objects, Domain Events | `Order`, `LineItem`, `OrderPlaced` |
| **Application** (use cases) | Orchestrates the domain | `place(orderId, repo)` |
| **Infrastructure** (implements the ports) | Real database, real event bus, real SDK client | `PostgresOrderRepository`, Redis/Kafka `eventBus` |
| **Interfaces** (driving adapters) | Whatever calls in from outside | public/admin/service-to-service routes (Slide 14) |

**The dependency rule: every arrow points inward, toward Domain.** `Order` and `OrderPlaced` have never heard of Postgres, Redis, or Express — Infrastructure and Interfaces depend on Domain, never the reverse. That's what makes swapping databases a one-file change instead of a rewrite.

---

## Slide 10: Common Confusion — One Database, or One Per Context?

# Ownership Matters More Than Physical Separation

**Does Order Management need a physically separate database from Inventory?** The rule isn't physical separation — it's that a bounded context must be the only thing that ever writes to (and directly reads) its own data.

| Architecture | What "database per context" looks like |
|---|---|
| **Microservices** | Usually a genuinely separate physical database per context |
| **Modular monolith** | One physical Postgres instance is fine — separate schemas, zero foreign keys crossing the boundary |

At Northwind's monolith: one Postgres instance, but Inventory never runs `SELECT ... FROM orders JOIN products`. If Inventory needs to know an order happened, it reacts to `OrderPlaced` (Slide 6) or calls Order Management's repository/API in-process.

**The smell:** the moment a SQL query joins across two bounded contexts' tables, the database has quietly become an unplanned shared kernel — the same failure mode as the shared `Product` class, one layer lower.

**The rule that generalizes:** one writer per table, always — whether "table" means a row in a shared instance or an entire database three networks away.

---

## Slide 11: The Bug — A Legacy Payment Gateway's Field Names, Everywhere (Problem)

# When a Third Party's Model Leaks Into Yours

```ts
// scattered across 6 files, wherever a webhook is handled
function handleWebhook(payload: any) {
  const orderId = payload.order_ref;                 // legacy snake_case
  const amount = payload.amt_cents / 100;             // legacy field, cents not dollars
  const currency = payload.cur;                       // legacy abbreviation
  // ...
}
```

The gateway vendor renamed `amt_cents` to `amount_minor_units` in a v2 API. Six files broke, in six different ways, because the vendor's field names had leaked directly into business logic across the codebase.

---

## Slide 12: Fix — Context Mapping & the Anti-Corruption Layer

# A Translator at Every Boundary, Not Just the Third-Party Edge

An **Anti-Corruption Layer (ACL)** is a translation point that converts another model into your own — so a vendor's naming, or another context's internals, only ever touches one file.

```ts
// payment-gateway-acl.ts — the ONLY file that knows the vendor's field names
function translateGatewayWebhook(payload: LegacyGatewayPayload): PaymentCompleted {
  return new PaymentCompleted(payload.order_ref, Money.fromCents(payload.amt_cents, payload.cur));
}

// order-management/ProductRef.ts — Order Mgmt's OWN translated view of Inventory's Product,
// even though Inventory is an in-house, fully-trusted team
interface ProductRef { sku: string; available: boolean; }
```

**The rule of thumb reverses what beginners usually assume:** a translated reference at the boundary is the *default* for every context relationship, in-house or not. **Shared Kernel** — two contexts jointly co-owning a small slice like a common `Money` type — is the deliberate *exception*, chosen only when both teams agree to version it together.

---

## Slide 13: How Contexts — and Their Teams — Actually Communicate

# Two Questions: a Business One, and a Coding One

**Business perspective — context mapping is a team pattern, not just an API diagram:**
- **Partnership** — Order Management and Inventory, both in-house, evolve together via a standing contract review.
- **Customer/Supplier** — Inventory (upstream) ships on its own schedule; Order Management (downstream) formally requests what it needs.
- **Conformist** — Payments is a vendor; Northwind has zero negotiating power, so the team just accepts the model as-is, isolated behind the ACL.

**Coding perspective — contexts never call each other's internals, only explicit contracts:**
- **Synchronous** — versioned REST/HTTP JSON or gRPC, for "ask and wait now."
- **Asynchronous events** — a message bus, for "tell me when something happens."
- **Shared/Published Language** — a jointly-versioned schema (OpenAPI/Protobuf/JSON Schema) — the same document the Partnership meeting reviews.

**Because the contract is the boundary, not shared code, contexts don't need to share a language.** Order Management could be TypeScript, Inventory a Go service, Payments a Python wrapper — DDD has no opinion on the runtime, only on whether the contract is honored. Every code sample in this deck is TypeScript-flavored pseudocode for readability; none of it is TypeScript-specific.

---

## Slide 14: One Core, Many Doors

# Public API, Admin API, Service-to-Service — Same Aggregate

Revisit the very first bug in this deck: the admin panel that let a support agent add an item to an already-shipped order. **The bug wasn't that the admin panel was "different code" — it had its own separate door into `lineItems` instead of using the same aggregate as everything else.**

```ts
// public-api/orders-controller.ts
app.post("/orders/:id/items", (req, res) => order.addLineItem(req.body.item));

// admin-api/orders-controller.ts — a DIFFERENT route, SAME aggregate method
app.post("/admin/orders/:id/items", requireSupportRole, (req, res) =>
  order.addLineItem(req.body.item)   // the invariant from Slide 4 fires here too — no bypass
);
```

Public API, Admin API, and Service-to-service (gRPC/events) are three **Interfaces**-ring adapters (Slide 9) — all funneling into the identical `Order` aggregate. Three doors, one set of rules, no matter which door you came through.

---

## Slide 15: It All Wires Together

# One Flow, Every Pattern in Its Place

```
 Public API      Admin API      Service-to-service
 (customer)      (support)        (other contexts)
     │               │                   │
     └───────────────┼───────────────────┘
                     ▼
           ┌─────────────────┐   Order.place()         ┌──────────────────┐
           │ Order (Aggregate │ ───────────────────────▶│ OrderPlaced event │
           │      Root)       │   enforces invariants   └──────────────────┘
           └─────────────────┘                                   │
                   │  OrderRepository.save()                      │  published on event bus
                   ▼                                               ▼
           ┌─────────────────┐                          ┌───────────────────┐
           │   Persistence    │                          │ Inventory context  │
           │ (own schema/DB)  │                          │ reserves stock      │
           └─────────────────┘                          │ (a Go service)      │
                                                          └───────────────────┘
                                                                     │
                                                                     ▼
                                                           ┌───────────────────┐
                                                           │ Payments context   │
                                                           │ (via ACL, external │
                                                           │  gateway webhook)   │
                                                           └───────────────────┘
```

Ubiquitous Language named every box the way Northwind would. Bounded Contexts kept "Product" from fighting over meaning. The Aggregate + Ports & Adapters layering stopped the admin-panel bug across all three doors. The Event decoupled Inventory — on a different stack entirely — from Order's internals. The Repository, and its own schema boundary, kept SQL and cross-context joins out. The ACL kept a vendor's v2 migration to one file.

---

## Slide 16: Checklist & Resources

# Take It Back to Your Codebase

- [ ] Find your biggest "god object." Identify its aggregate root and what invariants it should enforce alone.
- [ ] Name one domain event your system already has implicitly, and make it explicit.
- [ ] Check whether your domain layer imports anything database- or framework-specific — a missing repository, and a Ports & Adapters violation.
- [ ] Search for a SQL join spanning two bounded contexts' tables — a database boundary already crossed.
- [ ] Check whether any context imports another in-house context's model directly instead of a translated reference — a missing ACL, not just a third-party concern.

**Remember where DDD does *not* pay off:** simple CRUD apps, no sustained access to domain experts, short-lived or low-impact projects. Use the tool where the domain — not the plumbing — is the hard part.

## Sources

- ByteByteGo — [Domain-Driven Design (DDD) Demystified](https://blog.bytebytego.com/p/domain-driven-design-ddd-demystified)
- Nikki Siapno, Level Up Coding — [Domain-Driven Design, Broken Down](https://blog.levelupcoding.com/p/domain-driven-design-broken-down)
- Level Up Coding — [LUC #77: Domain-Driven Design Demystified](https://blog.levelupcoding.com/luc-77-domain-driven-design-demystified-bridging-development-and-business-needs)
- Eric Evans — *Domain-Driven Design: Tackling Complexity in the Heart of Software* (2003)
