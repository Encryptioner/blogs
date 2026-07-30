# Domain-Driven Design

Two decks, built from the same running e-commerce example (an Order Management system), each pattern introduced with the real bug it prevents rather than a dictionary definition.

## 1. Intro — DDD for Beginners (`intro.html`, 9 slides)

For engineers with little or no DDD background. Opens with a real bug caused by two teams disagreeing on what "Product" means, then builds up: what a domain/business domain/subdomain actually is, what DDD is, Ubiquitous Language, Bounded Contexts, and Entities vs. Value Objects.

## 2. Deep Dive — Aggregates, Events, Repositories, Context Maps (`deep-dive.html`, 12 slides)

Continues the same example into production-grade patterns: Aggregates & the aggregate root, Domain Events, Repositories, Context Mapping & the Anti-Corruption Layer — each introduced with the bug it prevents, then wired together into one end-to-end flow, plus a take-it-back-to-your-codebase checklist.

## Sources

- ByteByteGo — [Domain-Driven Design (DDD) Demystified](https://blog.bytebytego.com/p/domain-driven-design-ddd-demystified)
- Nikki Siapno, Level Up Coding — [Domain-Driven Design, Broken Down](https://blog.levelupcoding.com/p/domain-driven-design-broken-down)
- Level Up Coding — [LUC #77: Domain-Driven Design Demystified](https://blog.levelupcoding.com/luc-77-domain-driven-design-demystified-bridging-development-and-business-needs)

Raw source text + saved diagrams are in [`sources/`](./sources/) and [`images/`](./images/).
