// Prepare a release PR. Refreshes main, recreates the release branch,
// bumps versions via changesets, commits, force-pushes (the release
// branch is reused across releases), and opens (or updates) the release
// PR. Re-runnable: until the PR is merged, nothing has been published.

import { listPublishableMembers, type PublishableMember, readLatestChangelogEntry } from './lib/workspace.ts';

const RELEASE_BRANCH = 'changeset-release/main';
const rootUrl = new URL('../', import.meta.url);

// Thrown for expected, user-actionable failures (dirty tree, missing changesets,
// subprocess exit codes). Unexpected exceptions (programming bugs) keep their
// stack trace so the failing line in this file is visible.
class UserError extends Error {}

async function run(cmd: string, args: string[]): Promise<void> {
    const { code } = await new Deno.Command(cmd, {
        args,
        stdout: 'inherit',
        stderr: 'inherit',
    }).output();
    if (code !== 0) {
        throw new UserError(`\`${cmd} ${args.join(' ')}\` exited with code ${code}.`);
    }
}

async function capture(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
    const { code, stdout, stderr } = await new Deno.Command(cmd, {
        args,
        stdout: 'piped',
        stderr: 'piped',
    }).output();
    return {
        code,
        stdout: new TextDecoder().decode(stdout).trim(),
        stderr: new TextDecoder().decode(stderr).trim(),
    };
}

async function git(...args: string[]): Promise<string> {
    const { code, stdout, stderr } = await capture('git', args);
    if (code !== 0) {
        throw new UserError(`git ${args.join(' ')}: ${stderr}`);
    }
    return stdout;
}

async function assertCleanTree(): Promise<void> {
    const status = await git('status', '--porcelain', '--untracked-files=no');
    if (status.length > 0) {
        throw new UserError('Working tree has uncommitted tracked changes. Stash or commit before releasing.');
    }
}

async function refreshMain(): Promise<void> {
    await run('git', ['checkout', 'main']);
    await run('git', ['pull', '--ff-only']);
    // Refresh the release branch's remote-tracking ref so the later
    // --force-with-lease push has an accurate lease (a stale or missing
    // ref — e.g. after the prior PR's branch was deleted on merge —
    // otherwise gets rejected as stale and aborts before the PR step).
    await run('git', ['fetch', '--prune', 'origin']);
}

async function recreateReleaseBranch(): Promise<void> {
    const existing = await git('branch', '--list', RELEASE_BRANCH);
    if (existing.length > 0) {
        await run('git', ['branch', '-D', RELEASE_BRANCH]);
    }
    await run('git', ['checkout', '-b', RELEASE_BRANCH]);
}

async function findExistingPr(): Promise<string | null> {
    // Only an OPEN PR counts as existing. `gh pr view <branch>` also returns
    // the previous release's MERGED PR (the branch name is reused every
    // cycle), which we'd then wrongly edit instead of opening a fresh PR.
    const { code, stdout } = await capture('gh', [
        'pr',
        'list',
        '--head',
        RELEASE_BRANCH,
        '--state',
        'open',
        '--json',
        'url',
        '--jq',
        '.[0].url // empty',
    ]);
    if (code !== 0 || stdout.length === 0) {
        return null;
    }
    return stdout;
}

async function detectChangedMembers(previousVersions: Map<string, string>): Promise<PublishableMember[]> {
    const refreshed = await listPublishableMembers(rootUrl);
    return refreshed.filter((m) => previousVersions.get(m.dir) !== m.version);
}

async function buildPrBody(changed: PublishableMember[]): Promise<string> {
    const sections: string[] = [];
    for (const member of changed) {
        const notes = await readLatestChangelogEntry(member);
        sections.push(`## ${member.dir} ${member.version}\n\n${notes}`);
    }
    return sections.join('\n\n');
}

function buildPrTitle(changed: PublishableMember[]): string {
    return `Release: ${changed.map((m) => `${m.dir}@${m.version}`).join(', ')}`;
}

async function main(): Promise<void> {
    await assertCleanTree();
    await refreshMain();
    await recreateReleaseBranch();

    const before = await listPublishableMembers(rootUrl);
    const previousVersions = new Map(before.map((m) => [m.dir, m.version]));

    await run('deno', ['task', 'changeset:version']);

    const status = await git('status', '--porcelain');
    if (status.length === 0) {
        console.log('No pending changesets — nothing to release.');
        return;
    }

    const changed = await detectChangedMembers(previousVersions);
    if (changed.length === 0) {
        throw new UserError('Changesets produced no publishable version bumps; refusing to open an empty release PR.');
    }

    const filesToAdd = [...changed.flatMap((m) => [`${m.dir}/deno.json`, `${m.dir}/CHANGELOG.md`]), '.changeset'];
    await run('git', ['add', ...filesToAdd]);
    await run('git', ['commit', '-m', 'feature: Bump version']);
    await run('git', ['push', '-u', 'origin', RELEASE_BRANCH, '--force-with-lease']);

    const title = buildPrTitle(changed);
    const body = await buildPrBody(changed);
    const existing = await findExistingPr();
    if (existing) {
        await run('gh', ['pr', 'edit', RELEASE_BRANCH, '--title', title, '--body', body]);
        console.log(`Updated existing release PR: ${existing}`);
        return;
    }

    await run('gh', ['pr', 'create', '--base', 'main', '--head', RELEASE_BRANCH, '--title', title, '--body', body]);
}

try {
    await main();
} catch (err) {
    if (err instanceof UserError) {
        console.error(err.message);
        Deno.exit(1);
    }
    throw err;
}
