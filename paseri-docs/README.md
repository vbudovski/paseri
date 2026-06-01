# Paseri docs

Source for the [paseri.dev](https://paseri.dev) documentation site. Built with [Astro](https://astro.build/) and
[Starlight](https://starlight.astro.build/).

## Project layout

- `src/content/docs/` &mdash; documentation pages (`.md` / `.mdx`), organised by URL path.
- `src/components/` &mdash; Preact components used inside pages (e.g. the playground editor).
- `src/assets/` &mdash; images and other static assets imported by pages.
- `src/styles/` &mdash; global and component CSS.
- `astro.config.ts` &mdash; site config, sidebar definition, and integrations.

## Adding a doc page

Docs are a Starlight content collection. Create an `.md` or `.mdx` file under `src/content/docs/` whose path matches
the desired URL. The `reference/` section autogenerates from its directory tree; any other section needs an explicit
entry in the `sidebar` array of `astro.config.ts`.

## Local development

You can preview the documentation by executing the following command from the workspace root:

```shell
deno task -f paseri-docs dev
```

Deployment is automatically handled on push to `main`, but you can verify the static build locally using:

```shell
deno task -f paseri-docs build
deno task -f paseri-docs preview
```

## Deployment

[paseri.dev](https://paseri.dev) is auto-deployed by Cloudflare Pages on push to `main`.

---

Part of the [Paseri workspace](https://github.com/vbudovski/paseri).
