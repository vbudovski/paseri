// Per-package tagging and GitHub release creation, invoked from release.yml
// after `deno publish` succeeds. Idempotent — skips any package whose tag
// or GitHub release already exists.

import { listPublishableMembers, readLatestChangelogEntry } from './lib/workspace.ts';

const rootUrl = new URL('../', import.meta.url);

async function capture(cmd: string, args: string[]): Promise<{ code: number; stdout: string }> {
    const { code, stdout } = await new Deno.Command(cmd, {
        args,
        stdout: 'piped',
        stderr: 'inherit',
    }).output();
    return { code, stdout: new TextDecoder().decode(stdout).trim() };
}

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

async function tagExists(tag: string): Promise<boolean> {
    const { code } = await capture('git', ['rev-parse', '--verify', `refs/tags/${tag}`]);
    return code === 0;
}

async function releaseExists(tag: string): Promise<boolean> {
    const { code } = await capture('gh', ['release', 'view', tag]);
    return code === 0;
}

async function configureGit(): Promise<void> {
    await run('git', ['config', 'user.name', 'github-actions[bot]']);
    await run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
}

async function createTag(tag: string): Promise<void> {
    await run('git', ['tag', '-a', tag, '-m', `Release ${tag}`]);
    await run('git', ['push', 'origin', tag]);
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

    let gitConfigured = false;

    for (const member of members) {
        const tag = `${member.dir}@v${member.version}`;

        if (await tagExists(tag)) {
            console.log(`Tag ${tag} already exists; skipping tag creation.`);
        } else {
            if (!gitConfigured) {
                await configureGit();
                gitConfigured = true;
            }
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
