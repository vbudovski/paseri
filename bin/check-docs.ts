// Runs `deno doc --lint` on each JSR-publishable workspace member's entrypoints, one invocation per member, so
// a new public export cannot ship without documentation. Linting per member (not all at once) matches how JSR
// evaluates each package: co-linting would union their public surfaces and hide a type one package leaks from
// another. Entrypoints come from each member's `exports`, so a new one (or a new package) is covered automatically.

import { listPublishableMembers, readJson } from './lib/workspace.ts';

const rootUrl = new URL('../', import.meta.url);
const members = await listPublishableMembers(rootUrl);

let failed = false;
for (const member of members) {
    const { exports } = await readJson<{ exports: string | Record<string, string> }>(member.denoJsonUrl);
    const paths = typeof exports === 'string' ? [exports] : Object.values(exports);
    const entrypoints = paths.map((path) => `${member.dir}/${path.replace(/^\.\//, '')}`);
    if (entrypoints.length === 0) {
        continue;
    }

    const { code } = await new Deno.Command('deno', {
        args: ['doc', '--lint', ...entrypoints],
        stdout: 'inherit',
        stderr: 'inherit',
    }).output();
    if (code !== 0) {
        failed = true;
    }
}

Deno.exit(failed ? 1 : 0);
