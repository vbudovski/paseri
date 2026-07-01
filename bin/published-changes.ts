// CLI wrapper for the changeset gate: reads repo-relative changed paths (one per line on stdin) and prints
// the ones `deno publish` ships, via publishedChanges. Non-empty output means the PR needs a changeset.

import { publishedChanges } from './lib/workspace.ts';

const rootUrl = new URL('../', import.meta.url);
const input = await new Response(Deno.stdin.readable).text();
const paths = input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

for (const path of await publishedChanges(rootUrl, paths)) {
    console.log(path);
}
