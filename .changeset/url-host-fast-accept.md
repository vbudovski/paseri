---
"@paseri/paseri": patch
---

Fixed `url()` accepting invalid URLs whose host the WHATWG parser rejects: a label starting with `xn--` that is invalid punycode (e.g. `http://xn--a.com`), or a host whose last label is a number that fails IPv4 parsing (e.g. `http://a.1`).
