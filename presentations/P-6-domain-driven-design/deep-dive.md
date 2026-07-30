## Slide 1: Title Slide

# Domain-Driven Design — Deep Dive
## Aggregates, Events, Repositories, and Context Maps in a Real System

- **Presented by:** Mir Mursalin Ankur
- **Lead Software Engineer @Nerddevs Ltd**

*Picks up where the [Intro deck](./intro.html) left off. Ubiquitous Language and Bounded Contexts fixed how the business talks about "Product." This deck covers the patterns that make the model safe to change under real traffic and real teams — Aggregates, Domain Events, Repositories, and Context Mapping — each one introduced with the bug it prevents, on one running Order Management example.*

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

The Intro deck's patterns give you vocabulary and boundaries. What follows is what makes those boundaries *safe to change* once real traffic and multiple teams hit them.

---

## Slide 3: The Bug — Two Code Paths, One Inconsistent Order

# When Nothing Owns the Rules, Everything Can Break Them

`Order` lives as a plain data bag. Two different parts of the codebase are allowed to mutate it directly.

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

A customer support agent used the admin panel to "add a free gift" to an order that had *already shipped*. The warehouse re-picked it, and the finance report for that day no longer matched the shipped-items count. Two teams, zero communication, same bug — because nothing in the code says an order can't change after it's placed.

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
  // ...business rule and SQL string, tangled in the same function
}
```

A migration from Postgres to a different column-naming convention broke every business-rule function that touched `orders`, because the rules and the raw SQL lived in the same place. Nobody could test "can't place an empty order" without spinning up a real database.

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

## Slide 9: The Bug — A Legacy Payment Gateway's Field Names, Everywhere (Problem)

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

## Slide 10: Fix — Context Mapping & the Anti-Corruption Layer

# One Translator, at the Boundary

An **Anti-Corruption Layer (ACL)** is a single translation point that converts an external system's model into your own — so a vendor's naming, quirks, or v2 migration only ever touches one file.

```ts
// payment-gateway-acl.ts — the ONLY file that knows the vendor's field names
function translateGatewayWebhook(payload: LegacyGatewayPayload): PaymentCompleted {
  return new PaymentCompleted(
    payload.order_ref,
    Money.fromCents(payload.amt_cents, payload.cur)
  );
}
```

When the vendor ships v2, one function changes. A **Shared Kernel** is the other context-mapping shape — two contexts *you* control deliberately sharing a small, jointly-owned model (like a common `Money` type). Rule of thumb: Shared Kernel between contexts your team owns; ACL at the edge of anything you don't control.

---

## Slide 11: It All Wires Together

# One Flow, Every Pattern in Its Place

```
Customer places an order
        │
        ▼
 ┌─────────────────┐   Order.place()         ┌──────────────────┐
 │ Order (Aggregate │ ───────────────────────▶│ OrderPlaced event │
 │      Root)       │   enforces invariants   └──────────────────┘
 └─────────────────┘                                   │
        │  OrderRepository.save()                      │  published on event bus
        ▼                                               ▼
 ┌─────────────────┐                          ┌───────────────────┐
 │   Persistence    │                          │ Inventory context  │
 │ (hidden by repo) │                          │ reserves stock      │
 └─────────────────┘                          └───────────────────┘
                                                          │
                                                          ▼
                                                ┌───────────────────┐
                                                │ Payments context   │
                                                │ (via ACL, external │
                                                │  gateway webhook)  │
                                                └───────────────────┘
```

Ubiquitous Language named every box the way the business would. Bounded Contexts kept Order Management, Inventory, and Payments from fighting over what "Product" means. The Aggregate kept `Order` consistent — no more admin-panel bug. The Event decoupled Inventory from Order's internals — no more rename breaking four services. The Repository kept SQL out of the domain — no more untestable business rules. The ACL kept the gateway's v2 migration to one file.

---

## Slide 12: Checklist & Resources

# Take It Back to Your Codebase

- [ ] Find your biggest "plain data bag" — a type anyone can mutate from anywhere. That's a missing aggregate root.
- [ ] Grep for a function name that shows up in more than 3 unrelated files' direct calls — that's a missing domain event.
- [ ] Grep your domain/business logic for `SELECT`, `UPDATE`, or an ORM import — that's a missing repository.
- [ ] At every integration with a system you don't control, check: is there one translation file, or are vendor field names scattered everywhere? That's a missing ACL.

**Remember where DDD does *not* pay off:** simple CRUD apps, no sustained access to domain experts, short-lived or low-impact projects. Use the tool where the domain — not the plumbing — is the hard part.

## Sources

- ByteByteGo — [Domain-Driven Design (DDD) Demystified](https://blog.bytebytego.com/p/domain-driven-design-ddd-demystified)
- Nikki Siapno, Level Up Coding — [Domain-Driven Design, Broken Down](https://blog.levelupcoding.com/p/domain-driven-design-broken-down)
- Level Up Coding — [LUC #77: Domain-Driven Design Demystified](https://blog.levelupcoding.com/luc-77-domain-driven-design-demystified-bridging-development-and-business-needs)
