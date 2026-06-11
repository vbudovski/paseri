---
"@paseri/paseri": minor
"@paseri/compiler": patch
---

Union IR nodes record the discriminator key the runtime selected at construction; the compiler dispatches on the recorded key instead of re-deriving the selection rule. Generated output is unchanged.
