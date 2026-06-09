// Per-package tagging and GitHub release creation, invoked from release.yml
// after `deno publish` succeeds. Idempotent — skips any package whose tag
// or GitHub release already exists.

import { listPublishableMembers, readLatestChangelogEntry } from './lib/workspace.ts';

const rootUrl = new URL('../', import.meta.url);

async function run(cmd: string, args: string[]): Promise<void> {
    const { code } = await new Deno.Command(cmd, {
        args,
        stdout: 'inherit',
        stderr: 'inherit',
    }).output();
    if (code !== 0) {
        throw new Error(`\`${cmd} ${args.join(' ')}\` exited with code ${code}.`);
    }
}

// Runs a command purely for its exit code. Both streams are discarded so
// the expected-failure path (e.g. "tag does not exist yet") doesn't leak
// alarming-looking stderr into CI logs.
async function probe(cmd: string, args: string[]): Promise<boolean> {
    const { code } = await new Deno.Command(cmd, {
        args,
        stdout: 'null',
        stderr: 'null',
    }).output();
    return code === 0;
}

// Runs a command and returns its captured stdout. An optional string is fed
// to the process's stdin (used to pass a JSON request body to `gh api`).
async function capture(cmd: string, args: string[], stdin?: string): Promise<string> {
    const child = new Deno.Command(cmd, {
        args,
        stdin: stdin === undefined ? 'null' : 'piped',
        stdout: 'piped',
        stderr: 'inherit',
    }).spawn();
    if (stdin !== undefined) {
        const writer = child.stdin.getWriter();
        await writer.write(new TextEncoder().encode(stdin));
        await writer.close();
    }
    const { code, stdout } = await child.output();
    if (code !== 0) {
        throw new Error(`\`${cmd} ${args.join(' ')}\` exited with code ${code}.`);
    }
    return new TextDecoder().decode(stdout);
}

async function tagExists(tag: string): Promise<boolean> {
    return probe('git', ['rev-parse', '--verify', `refs/tags/${tag}`]);
}

async function releaseExists(tag: string): Promise<boolean> {
    return probe('gh', ['release', 'view', tag]);
}

// Creates an annotated tag on the remote via the GitHub API, authenticated
// with GH_TOKEN. This avoids `git push`, so the release checkout needs no
// persisted credential (see persist-credentials: false in release.yml).
async function createTag(tag: string): Promise<void> {
    const commit = (await capture('git', ['rev-parse', 'HEAD'])).trim();
    const body = JSON.stringify({
        tag,
        message: `Release ${tag}`,
        object: commit,
        type: 'commit',
        tagger: {
            name: 'github-actions[bot]',
            email: '41898282+github-actions[bot]@users.noreply.github.com',
            date: new Date().toISOString(),
        },
    });
    const created = await capture('gh', ['api', 'repos/{owner}/{repo}/git/tags', '--input', '-'], body);
    const { sha } = JSON.parse(created) as { sha: string };
    await run('gh', ['api', 'repos/{owner}/{repo}/git/refs', '-f', `ref=refs/tags/${tag}`, '-f', `sha=${sha}`]);
}

async function createRelease(tag: string, notes: string): Promise<void> {
    const notesPath = await Deno.makeTempFile({ prefix: 'release-notes-', suffix: '.md' });
    await Deno.writeTextFile(notesPath, notes);
    try {
        await run('gh', ['release', 'create', tag, '--draft', '--title', tag, '--notes-file', notesPath]);
    } finally {
        await Deno.remove(notesPath);
    }
}

async function main(): Promise<void> {
    const members = await listPublishableMembers(rootUrl);
    if (members.length === 0) {
        console.log('No publishable workspace members found.');
        return;
    }

    for (const member of members) {
        const tag = `${member.dir}@v${member.version}`;

        if (await tagExists(tag)) {
            console.log(`Tag ${tag} already exists; skipping tag creation.`);
        } else {
            await createTag(tag);
        }

        if (await releaseExists(tag)) {
            console.log(`GitHub release ${tag} already exists; skipping release creation.`);
            continue;
        }
        const notes = await readLatestChangelogEntry(member);
        await createRelease(tag, notes);
    }
}

await main();
