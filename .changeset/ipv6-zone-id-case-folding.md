---
"@paseri/paseri": patch
---

`p.string().ip()` and `p.string().cidr()` now reject IPv6 zone IDs containing U+212A (Kelvin sign) or U+017F (long s), e.g. `fe80::1%ſ1`; zone IDs are ASCII-only per RFC 6874.
