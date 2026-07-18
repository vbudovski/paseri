---
"@paseri/paseri": patch
---

Fixed `email()` accepting U+017F (long s) and U+212A (Kelvin sign), e.g. `ſ@example.com`, and `url()` accepting them in a scheme. RFC 5321/RFC 1035 email addresses and WHATWG URL schemes are ASCII-only.
