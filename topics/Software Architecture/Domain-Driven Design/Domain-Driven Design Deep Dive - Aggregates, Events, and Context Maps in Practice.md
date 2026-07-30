# Domain-Driven Design Deep Dive: Aggregates, Events, and Context Maps in Practice

> You don't adopt DDD by adding patterns. You adopt it by removing ambiguity.

This is the second of two posts on Domain-Driven Design. The [first post](./Domain-Driven%20Design%20for%20Beginners%20-%20What%20It%20Is%20and%20Why%20It%20Matters.md) covered the foundations — what a domain, business domain, and bounded context actually are — using Northwind, a small online retail business, and a bug caused by its Order and Inventory teams disagreeing on what "Product" means. If any of that is unfamiliar, start there; this post assumes it.

Here, Northwind keeps growing, and its Order Management system hits four more real bugs — each one introduced before the pattern that fixes it, the same way as the first post. Along the way, this post directly answers the question almost everyone asks once they've heard of Repositories: **does each bounded context need its own database?** By the end, every pattern is wired together into a single request flow. A companion deck with the same content is available [here](../../../presentations/P-6-domain-driven-design/deep-dive.html).

---

## Quick Recap

| Pattern | Optimizes for | Trade-off |
|---|---|---|
| Ubiquitous Language | Shared understanding | Ongoing collaboration cost |
| Bounded Contexts | Modularity at scale | Integration complexity |
| Entities + Value Objects | Expressive models | More types + modeling work |
| **Aggregates** ← this post | Consistency + invariants | Boundary design is hard |
| **Events + Repositories** ← this post | Decoupling + clean domain | More infrastructure + discipline |

<div align="center">
  <img src="../../../assets/B-18/when-to-use-ddd.jpg" alt="Table: DDD Pattern, Optimizes For, Trade-Off — covering Ubiquitous Language, Bounded Contexts, Entities + Value Objects, Aggregates, and Events + Repositories + Layers"/>
  <br/>
  <sub>Source: Nikki Siapno, Level Up Coding — <a href="https://blog.levelupcoding.com/p/domain-driven-design-broken-down">"Domain-Driven Design, Broken Down"</a></sub>
</div>

The first three patterns give you vocabulary and boundaries. What follows is what makes those boundaries *safe to change* once real traffic and multiple teams are hitting them at once.

## The Bug: Two Code Paths, One Inconsistent Order

`Order` lives in Northwind's codebase as a plain data bag. Two different parts of the system are allowed to mutate it directly, with no single place enforcing what's actually allowed.

```ts
// order.ts — just a data shape, no rules attached
interface Order { id: string; status: "draft" | "placed"; lineItems: LineItem[]; }

// checkout-controller.ts
function addPromoItem(order: Order, item: LineItem) {
  order.lineItems.push(item);              // works even if the order was already placed
}

// admin-panel.ts — written by a different team, six months later
function forceAddItem(order: Order, item: LineItem) {
  order.lineItems.push(item);              // same mistake, independently
}
```

A Northwind support agent used the admin panel to "add a free gift" to an order that had *already shipped*. The warehouse re-picked the order, and that day's finance report no longer matched the shipped-items count. Two teams, zero communication between them, and the exact same underlying bug — because nothing in the code says an order can't change after it's been placed.

## Fix: Aggregates & the Aggregate Root

An **aggregate** is a cluster of domain objects treated as a single consistency boundary, controlled by one **aggregate root**. Outside code is only ever allowed to talk to the root — never to mutate the internals directly — so the rule ends up living in exactly one place instead of being re-implemented (or forgotten) by every caller.

```ts
class Order {                              // Aggregate Root — the only door in
  private lineItems: LineItem[] = [];
  private status: "draft" | "placed" = "draft";

  addLineItem(item: LineItem) {
    if (this.status !== "draft") {
      throw new Error("Cannot modify a placed order");   // the rule, enforced ONCE
    }
    this.lineItems.push(item);
  }

  place(): OrderPlaced {
    if (this.lineItems.length === 0) throw new Error("Cannot place an empty order");
    this.status = "placed";
    return new OrderPlaced(this.id, this.lineItems);      // see the next section
  }
}
```

Both `checkout-controller.ts` and `admin-panel.ts` now call `order.addLineItem(item)` — there is no other way to touch `lineItems`, so the "already shipped" bug is no longer something the code is even capable of expressing.

<div align="center">
  <img src="../../../assets/B-18/aggregates.jpg" alt="Aggregates diagram: Order Management and Payments bounded contexts, each with an aggregate exposing a single Aggregate root entry point, communicating via events"/>
  <br/>
  <sub>Source: Nikki Siapno, Level Up Coding — <a href="https://blog.levelupcoding.com/p/domain-driven-design-broken-down">"Domain-Driven Design, Broken Down"</a></sub>
</div>

**What you gain:** invariants live in exactly one place instead of being duplicated across controllers; transaction boundaries stop cleanly at the aggregate; the code reads like real business operations instead of database plumbing.
**What it costs:** choosing aggregate boundaries is genuinely hard — oversized aggregates become contention bottlenecks, undersized ones leak the very invariants they're supposed to protect. Workflows that cross aggregate boundaries need orchestration, which is exactly what the next pattern provides.

## The Bug: A Change in One Service Breaks Three Others

`OrderService.place()` looks harmless at first glance — until you look at everything it directly calls.

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

Every new subscriber to "an order was placed" means editing `OrderService` again, and now `OrderService` is coupled to four other teams' release schedules. When `inventoryService.reserveStock` was renamed during an unrelated refactor, `OrderService` broke in production — despite the change having nothing to do with placing an order.

## Fix: Domain Events

A **domain event** captures something meaningful that already happened in the domain, named in the past tense: `OrderPlaced`, `PaymentCompleted`. Inside its own context it's simply a fact; published outward, it becomes an **integration event** that other bounded contexts can subscribe to independently, without `OrderService` ever needing to know they exist.

```ts
class OrderPlaced {
  constructor(
    public readonly orderId: string,
    public readonly lineItems: LineItem[],
    public readonly occurredAt: Date = new Date()
  ) {}
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

Renaming `reserveStock` tomorrow now only touches Inventory's own subscriber. `OrderService` never has to change again for a reason that has nothing to do with placing an order — new subscribers (shipping, fraud checks, whatever comes next) are added without touching it at all.

**What you gain:** lower coupling between contexts; a cleaner domain model that isn't cluttered with knowledge of every downstream consumer; infrastructure in one context can evolve independently of another.
**What it costs:** failures now surface later, since the reaction is asynchronous — and cross-context consistency needs deliberate design, because it's eventual rather than immediate.

**A concrete growth path, so this doesn't feel like an infrastructure decision made too early:** `eventBus` above can start as nothing more than Node's built-in `EventEmitter` (or `eventemitter2`) inside a single monolith process — genuinely a few lines, no new infrastructure to run. If Order Management and Inventory later split into separate deployed services, the same `eventBus.publish` / `eventBus.on` calls move behind Redis pub/sub with no change to `OrderService` itself. If the system grows to the point where events need to be replayed, audited, or fanned out to many independent consumers at scale, that same interface moves behind Kafka. The domain code — `OrderPlaced`, and everything that reacts to it — never has to change across any of these three stages; only the adapter underneath the `eventBus` interface does.

## The Bug: SQL Buried Inside Business Logic

```ts
async function place(orderId: string) {
  const rows = await db.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  const order = rows[0];
  if (order.status !== "draft") throw new Error("Cannot modify a placed order");
  await db.query(`UPDATE orders SET status = 'placed' WHERE id = $1`, [orderId]);
  // business rule and raw SQL string, tangled in the same function
}
```

A migration to a different column-naming convention broke every business-rule function that touched `orders`, simply because the rules and the SQL lived in the exact same place. Worse, nobody could unit test "can't place an empty order" without spinning up a real database first — the business rule and the infrastructure were inseparable.

## Fix: Repositories

A **repository** is a domain-facing interface for loading and saving aggregates — it hides persistence entirely behind domain vocabulary, so the domain model never has to import an ORM or embed a SQL string.

```ts
interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

// Domain / application layer — reads like business logic, not plumbing
async function placeOrder(orderId: string, repo: OrderRepository) {
  const order = await repo.findById(orderId);
  const event = order.place();      // Order.place() — pure business logic
  await repo.save(order);
  eventBus.publish(event);
}
```

Swap Postgres for DynamoDB, or rename every column in a migration — only the concrete `PostgresOrderRepository` implementation changes. `placeOrder` is now trivially unit-testable with an in-memory fake repository and zero database.

**What you gain:** persistence concerns never leak into business logic; the domain becomes directly, cheaply testable.
**What it costs:** one additional layer of indirection to write and keep honest — worth it exactly when the alternative is untestable business rules.

## How a Bounded Context Is Layered Internally: Ports & Adapters

`OrderRepository` above is a small example of a much bigger idea worth naming explicitly: **Hexagonal Architecture**, also called **Ports & Adapters**. Every pattern used so far already fits into it — this section just gives the four rings names, so the whole context can be organized the same way on purpose instead of by accident.

| Layer | What lives here | From this post |
|---|---|---|
| **Domain** (zero dependencies) | Aggregates, Entities, Value Objects, Domain Events — pure business rules, no imports from anything outside this ring | `Order`, `LineItem`, `OrderPlaced` |
| **Application** (use cases) | Orchestrates the domain: loads an aggregate, calls its methods, saves it, publishes events | `placeOrder(orderId, repo)` |
| **Infrastructure** (implements the domain's ports) | Concrete adapters — a real database, a real event bus, a real payment SDK client | `PostgresOrderRepository`, the Redis/Kafka-backed `eventBus`, the gateway ACL |
| **Interfaces** (driving adapters) | Whatever calls into Application from the outside — HTTP controllers, admin tools, event handlers | the public/admin/service-to-service routes from later in this post |

**The dependency rule, stated once so it's unambiguous: every arrow points inward, toward Domain.** Application is allowed to depend on Domain. Infrastructure is allowed to depend on Domain (it *implements* the `OrderRepository` interface that Domain/Application defined). Interfaces depend on Application. But Domain never imports anything from Infrastructure or Interfaces — `Order` and `OrderPlaced` have never heard of Postgres, Redis, or Express, and that's not an accident, it's the entire point. `OrderRepository` is what's called a **port** — an interface the Domain/Application layer defines and *owns*; `PostgresOrderRepository` is the **adapter** that plugs into it from Infrastructure. The direction of that relationship — Infrastructure depending on Domain, never the reverse — is what makes swapping Postgres for DynamoDB a one-file change instead of a rewrite.

This is also the layer where **Eric Evans' original 2003 book, *Domain-Driven Design: Tackling Complexity in the Heart of Software***, is worth a direct nod — Aggregate, Entity, Value Object, Domain Event, and Repository are his tactical patterns by name, and they all belong in the Domain ring. Ports & Adapters isn't part of that original book, but it's become the near-universal way teams organize a bounded context's internals in practice, precisely because it keeps Evans' tactical patterns honestly isolated from whatever database or framework happens to be fashionable this year.

## Common Confusion: One Database for All Contexts, or One Per Context?

This is the question that comes up the moment Repositories click: **does Order Management need a physically separate database from Inventory?**

The honest answer is that physical separation isn't the rule — **ownership and write-access are.** A bounded context must be the only thing that ever writes to its own data, and the only thing that reads it directly. Whether that's enforced by a separate physical database or by a schema boundary inside one shared instance depends on your architecture:

| Architecture | What "database per context" looks like |
|---|---|
| **Microservices** | Usually a genuinely separate physical database per context — enforced by network boundaries, not just convention |
| **Modular monolith** | One physical Postgres instance is fine — but `order_management` and `inventory` get separate schemas, **zero foreign keys crossing the boundary**, and neither ever queries the other's tables directly |

Concretely, at Northwind: the monolith runs a single Postgres instance, but Inventory never runs `SELECT ... FROM orders JOIN products`. If Inventory needs to know an order happened, it reacts to the `OrderPlaced` event from the previous section, or calls Order Management's repository/API in-process — it never reaches across the schema boundary to read the table directly.

**The smell that tells you the boundary is already broken:** the moment a SQL query joins across two bounded contexts' tables, the database has quietly become a shared kernel that nobody agreed to. That join will keep working right up until one team's migration breaks the other team's query — the exact same failure mode as the shared `Product` class from the first post, just one layer lower, in the schema instead of the code.

The rule that generalizes across both architectures: **one writer per table, always** — whether "table" means a row in a shared Postgres instance or an entire database three networks away.

## The Bug: A Legacy Payment Gateway's Field Names, Everywhere

```ts
// scattered across 6 files, wherever a webhook happens to be handled
function handleWebhook(payload: any) {
  const orderId = payload.order_ref;                 // legacy snake_case
  const amount = payload.amt_cents / 100;             // legacy field, cents not dollars
  const currency = payload.cur;                       // legacy abbreviation
  // ...
}
```

The payment gateway vendor renamed `amt_cents` to `amount_minor_units` in a v2 API release. Six files broke, in six slightly different ways, because the vendor's own field naming had been allowed to leak directly into business logic scattered across the codebase.

## Fix: Context Mapping & the Anti-Corruption Layer

Bounded contexts don't exist in isolation forever — **context mapping** is the deliberate decision of how they integrate with each other, and with the outside world. Two shapes come up constantly:

- **Shared Kernel** — two contexts you control deliberately share a small, jointly-owned slice of the model (a common `Money` value object, say). Cheap to set up, but it couples both contexts to every future change in that slice.
- **Anti-Corruption Layer (ACL)** — a translation layer sitting at the boundary that converts an external system's model into your own, so a legacy system's or third party's assumptions never leak past that one boundary.

```ts
// payment-gateway-acl.ts — the ONLY file that knows the vendor's field names
function translateGatewayWebhook(payload: LegacyGatewayPayload): PaymentCompleted {
  return new PaymentCompleted(
    payload.order_ref,          // legacy snake_case, foreign field names
    Money.fromCents(payload.amt_cents, payload.cur)
  );
}
```

When the vendor ships their v2 API, exactly one function changes.

**A translated reference is worth using at every context boundary, not only at the edge of a third-party vendor.** Order Management still needs to know *something* about Inventory's `Product` — is this SKU in stock? — but it should never import Inventory's actual `Product` class to find out, even though Inventory is an in-house team Northwind trusts completely. Instead, Order Management defines its own small, translated type for exactly what it needs:

```ts
// order-management/ProductRef.ts — Order Management's OWN translated view, never Inventory's real Product
interface ProductRef { sku: string; available: boolean; }

// populated by calling Inventory's API or reacting to its events — never by importing Inventory/Product.ts
```

This is the same shape as the payment-gateway ACL above, just applied between two contexts your own company owns. **The rule of thumb, then, isn't "ACL for outsiders, Shared Kernel for insiders" — it's the reverse of what beginners usually assume: a translated reference at the boundary is the default for every context relationship, in-house or not, and Shared Kernel is the deliberate exception** you choose only for a genuinely small, jointly-owned slice (like a common `Money` type) that both teams agree to co-own and version together.

## How Contexts — and Their Teams — Actually Communicate

Everything so far has shown *what* crosses a bounded context boundary (an event, a repository call, an ACL translation). It's worth being explicit about *how*, because this is where a lot of the remaining confusion lives — and it splits cleanly into a business/team question and a coding/technical question.

**From the business perspective: context mapping is a team-communication pattern, not just an API diagram.** At Northwind, Order Management and Inventory are both run by in-house teams that need to evolve together — that relationship is called a **Partnership**: the two teams hold a standing contract review, and a change to the `OrderPlaced` event shape gets negotiated between them before it ships. Payments, on the other hand, is a **Conformist** relationship: it's a third-party vendor's API, Northwind has zero negotiating power over its schema, so Northwind's team simply accepts the vendor's model as-is and isolates it entirely behind the ACL from the previous section. A third common shape is **Customer/Supplier**: Inventory (upstream) ships changes on its own schedule, and Order Management (downstream) formally requests what it needs, the way a customer requests a feature from a vendor — even though both are in-house. Naming which relationship you actually have tells you how much negotiating leverage to expect, and stops a downstream team from being surprised when an upstream team ships a breaking change without asking.

**From the coding perspective: contexts never call each other's internals — they talk through one of three explicit, versioned contracts:**

- **Synchronous request/response** — a versioned REST/HTTP JSON API or gRPC call, for "ask and wait right now" (Order Management asking Inventory "is this SKU in stock?").
- **Asynchronous events** — a message bus (Kafka, SQS, RabbitMQ, or an in-process event emitter at small scale), for "tell me when something happens" — this is exactly what `OrderPlaced` has been doing throughout this post.
- **A Shared/Published Language** — a jointly-versioned schema (an OpenAPI spec, a Protobuf definition, or a JSON Schema) that both sides commit to. This schema *is* the actual contract that gets reviewed in the Partnership meeting described above — the team conversation and the technical contract are the same document, seen from two angles.

**Because the contract is the boundary — not shared code — bounded contexts don't need to share a programming language.** Northwind's Order Management could run Node.js/TypeScript, Inventory could be a Go service, and Payments could be a Python wrapper around the vendor's SDK. DDD has no opinion on the runtime; it only cares whether the model is right and the contract between contexts is honored. (This is also why every code sample in this post is TypeScript-flavored pseudocode for readability — none of it is TypeScript-specific. An aggregate root in Go is a `struct` with exported methods and unexported fields enforcing the same invariant; a repository in Java is simply an `interface`; a domain event in Python is a small `dataclass` published to the same message bus. The pattern is the point, not the syntax.)

## One Core, Many Doors: Public API, Admin API, Service-to-Service

Go back to the very first bug in this post — the admin panel that let a support agent add an item to an already-shipped order. It's worth revisiting now with the full picture: **the bug wasn't that the admin panel was "different code."** The bug was that the admin panel had its *own separate path* into `lineItems`, instead of going through the same aggregate as everything else.

A single bounded context routinely serves more than one audience, and that's completely fine — as long as every audience is routed through the same domain core underneath:

- **Public API** — the storefront calling `POST /orders` on behalf of a customer.
- **Admin API** — a support agent's internal tool, doing exactly what the buggy `admin-panel.ts` was trying to do, just now through the front door.
- **Service-to-service** — another bounded context calling in via gRPC or reacting to an event, authenticated differently than a public customer would be.

All three are just different **adapters** sitting in front of the identical `Order` aggregate from earlier in this post:

```ts
// public-api/orders-controller.ts
app.post("/orders/:id/items", (req, res) => order.addLineItem(req.body.item));

// admin-api/orders-controller.ts — a DIFFERENT route, SAME aggregate method
app.post("/admin/orders/:id/items", requireSupportRole, (req, res) =>
  order.addLineItem(req.body.item)   // the invariant from Slide 4 fires here too — no bypass
);
```

Three doors, one aggregate enforcing the same rule no matter which door you came through. That's the deeper fix the Aggregate pattern was already giving you — the admin panel doesn't need special-case business logic, it needs to stop having its own door.

## It All Wires Together

```
 Public API          Admin API         Service-to-service
 (customer)           (support)          (other contexts)
     │                    │                     │
     └────────────────────┼─────────────────────┘
                          ▼
                ┌─────────────────┐   Order.place()         ┌──────────────────┐
                │ Order (Aggregate │ ───────────────────────▶│ OrderPlaced event │
                │      Root)       │   enforces invariants   └──────────────────┘
                └─────────────────┘                                   │
                        │  OrderRepository.save()                      │  published on event bus
                        ▼                                               ▼
                ┌─────────────────┐                          ┌───────────────────┐
                │   Persistence    │                          │ Inventory context  │
                │ (own schema/DB,  │                          │ reserves stock      │
                │  hidden by repo) │                          │ (a Go service)      │
                └─────────────────┘                          └───────────────────┘
                                                                          │
                                                                          ▼
                                                                ┌───────────────────┐
                                                                │ Payments context   │
                                                                │ (via ACL, external │
                                                                │  gateway webhook,   │
                                                                │  Python wrapper)    │
                                                                └───────────────────┘
```

Ubiquitous Language named every box the way Northwind itself would name it. Bounded Contexts stopped Order Management, Inventory, and Payments from fighting over what "Product" means. Three doors — public, admin, and service-to-service — all funnel into the same Aggregate, so the admin-panel bug can't exist regardless of entry point. The Event decoupled Inventory from Order's internals, so one rename no longer breaks four unrelated services — and it doesn't matter that Inventory happens to run on a different stack entirely. The Repository kept SQL out of the domain, and its own schema boundary kept Inventory from silently joining across into Order Management's tables. The Anti-Corruption Layer kept a vendor's v2 migration contained to a single file.

## Checklist: Take It Back to Your Codebase

- [ ] Find your biggest "plain data bag" — a type anyone in the codebase can mutate from anywhere. That's a missing aggregate root.
- [ ] Grep for a function name that gets called directly from three or more unrelated files. That's a missing domain event.
- [ ] Grep your domain or business-logic layer for `SELECT`, `UPDATE`, or an ORM import. That's a missing repository — and a layering violation, since Domain should never depend on Infrastructure.
- [ ] Search your codebase (or your DB migrations) for a SQL join that spans two different bounded contexts' tables. That's a database boundary that's already been silently crossed.
- [ ] Check whether any context imports another in-house context's model directly instead of a translated reference type. That's a missing (in-house) Anti-Corruption Layer, not just a third-party-vendor concern.
- [ ] At every integration with a system you don't control, check whether there's one translation file — or whether the vendor's field names are scattered everywhere. That's a missing Anti-Corruption Layer.

And the reminder that bears repeating from the first post: simple CRUD apps, no sustained access to domain experts, and short-lived or low-impact projects are exactly where DDD does *not* pay off. Reach for it where the domain — not the plumbing — is genuinely the hard part.

## Sources

- ByteByteGo — [Domain-Driven Design (DDD) Demystified](https://blog.bytebytego.com/p/domain-driven-design-ddd-demystified)
- Nikki Siapno, Level Up Coding — [Domain-Driven Design, Broken Down](https://blog.levelupcoding.com/p/domain-driven-design-broken-down)
- Level Up Coding — [LUC #77: Domain-Driven Design Demystified](https://blog.levelupcoding.com/luc-77-domain-driven-design-demystified-bridging-development-and-business-needs)
- Companion deck: [Deep Dive — Aggregates, Events, Context Maps](../../../presentations/P-6-domain-driven-design/deep-dive.html)
