---
"@paseri/paseri": patch
---

`p.string().url()` now rejects URLs whose host is an invalid all-numeric address — e.g. `http://999999999999`, `http://1.2.3.4.5`, `http://256.0` — which it previously accepted. These are malformed IPv4 per the WHATWG URL standard; genuine IPv4 like `http://1.2.3.4` is still accepted.
