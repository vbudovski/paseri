# Changesets

This directory is consumed by [`@changesets/cli`](https://github.com/changesets/changesets), driven through the Deno
wrapper in `bin/changeset.ts`. Because Paseri ships to JSR (not npm), the wrapper generates ephemeral `package.json`
shims from `paseri-lib/deno.json` before each run and syncs the bumped version back to `deno.json` afterwards. The shims
are gitignored and removed at the end of every invocation.

## Adding a changeset

```sh
deno task changeset
```

Pick the affected package (`@vbudovski/paseri`), the bump level (patch / minor / major), and write a summary. Commit the
generated markdown file under `.changeset/`.

## Releasing

When you're ready to cut a release:

```sh
git checkout main && git pull
git checkout -b changeset-release/main
deno task changeset:version
git add paseri-lib/deno.json paseri-lib/CHANGELOG.md .changeset
git commit -m "feature: Bump version"
git push -u origin changeset-release/main
gh pr create   # title e.g. "Release 1.1.0"
```

`changeset:version` consumes every pending changeset, bumps `paseri-lib/deno.json`, and updates
`paseri-lib/CHANGELOG.md`. Merging the PR to `main` triggers `.github/workflows/release.yml`, which (in order) publishes
to JSR, pushes a `v$VERSION` git tag, and creates a **draft** GitHub release with the latest CHANGELOG entry as the
notes. The release stays in draft until you review it on GitHub and click Publish — nothing is public until then.

The branch name `changeset-release/main` matches the convention used by the official `changesets/action` GitHub Action;
we're not running the Action, but reusing its name keeps things recognisable. The branch is meant to be reused — delete
it locally (and on origin) after each release lands, then recreate it on the next pass. The PR title carries the actual
version number.

## Other commands

```sh
deno task changeset:status   # list pending changesets and the version they imply
```

Anything else from the changesets CLI can be invoked via `deno run -A bin/changeset.ts <subcommand>`.
