---
"@paseri/paseri": patch
"@paseri/compiler": patch
---

When a member of a discriminated union is wrapped in `.refine()`, an unknown discriminator value now reports a single `invalid_discriminator_value` — matching a union with no refined members — instead of aggregated per-member issues. The refined member's own checks still run once its tag is matched.
