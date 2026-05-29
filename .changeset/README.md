# Changesets

This directory is consumed by [`@changesets/cli`](https://github.com/changesets/changesets), driven through the Deno
wrapper in `bin/changeset.ts`. Because Paseri ships to JSR (not npm), the wrapper generates ephemeral `package.json`
shims from each publishable workspace member's `deno.json` before each run and syncs any bumped versions back to those
`deno.json` files afterwards. The shims are gitignored and removed at the end of every invocation.

A workspace member is treated as publishable iff its `deno.json` declares all of `name`, `version`, and `exports` (the
same set JSR requires). Members without these fields are silently skipped.

## Adding a changeset

```sh
deno task changeset
```

Pick the affected package(s), the bump level (patch / minor / major) for each, and write a summary. Commit the generated
markdown file under `.changeset/`.

## Releasing

When you're ready to cut a release:

```sh
deno task release:prepare
```

The task refreshes `main`, recreates the `changeset-release/main` branch, runs `changeset version` to consume pending
changesets, commits the version bumps for any packages whose version changed, force-pushes the branch, and opens (or
refreshes) the release PR. It's safe to re-run: until the PR is merged, nothing has been published.

Merging the PR to `main` triggers `.github/workflows/release.yml`, which (in order) publishes every publishable member
to JSR, then — per package — pushes a `{dir}@v{version}` git tag and creates a **draft** GitHub release with that
package's latest CHANGELOG entry as the notes. Each release stays in draft until you review it on GitHub and click
Publish — nothing is public until then.

The branch name `changeset-release/main` matches the convention used by the official `changesets/action` GitHub Action;
we're not running the Action, but reusing its name keeps things recognisable. The branch is reused across releases —
`release:prepare` deletes and recreates it locally on every run and force-pushes (with `--force-with-lease`) over the
remote. The PR title lists each package's new version.

## Other commands

```sh
deno task changeset:status   # list pending changesets and the versions they imply
```

Anything else from the changesets CLI can be invoked via `deno run -A bin/changeset.ts <subcommand>`.
