// Prepare a release PR. Refreshes main, recreates the release branch,
// bumps the version via changesets, commits, force-pushes (the release
// branch is reused across releases), and opens (or updates) the release
// PR. Re-runnable: until the PR is merged, nothing has been published.

const RELEASE_BRANCH = 'changeset-release/main';
const LIB_DENO_JSON = new URL('../paseri-lib/deno.json', import.meta.url);
const LIB_CHANGELOG = new URL('../paseri-lib/CHANGELOG.md', import.meta.url);

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
}

async function recreateReleaseBranch(): Promise<void> {
    const existing = await git('branch', '--list', RELEASE_BRANCH);
    if (existing.length > 0) {
        await run('git', ['branch', '-D', RELEASE_BRANCH]);
    }
    await run('git', ['checkout', '-b', RELEASE_BRANCH]);
}

async function readVersion(): Promise<string> {
    const text = await Deno.readTextFile(LIB_DENO_JSON);
    const match = text.match(/"version"\s*:\s*"([^"]+)"/);
    if (!match) {
        throw new UserError('Could not read version from paseri-lib/deno.json.');
    }
    return match[1];
}

// Extract the body of the most recent `## ` section from CHANGELOG.md — the
// entry just written by `changeset version`. Matches release.yml's awk
// extraction, which is what GitHub release notes will use.
async function readReleaseNotes(): Promise<string> {
    const text = await Deno.readTextFile(LIB_CHANGELOG);
    const lines = text.split('\n');
    const start = lines.findIndex((line) => line.startsWith('## '));
    if (start === -1) {
        throw new UserError('Could not find a release section in CHANGELOG.md.');
    }
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => line.startsWith('## '));
    const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
    return body;
}

async function findExistingPr(): Promise<string | null> {
    const { code, stdout } = await capture('gh', ['pr', 'view', RELEASE_BRANCH, '--json', 'url', '--jq', '.url']);
    if (code !== 0 || stdout.length === 0) {
        return null;
    }
    return stdout;
}

async function main(): Promise<void> {
    await assertCleanTree();
    await refreshMain();
    await recreateReleaseBranch();
    await run('deno', ['task', 'changeset:version']);

    const status = await git('status', '--porcelain');
    if (status.length === 0) {
        console.log('No pending changesets — nothing to release.');
        return;
    }

    await run('git', ['add', 'paseri-lib/deno.json', 'paseri-lib/CHANGELOG.md', '.changeset']);
    await run('git', ['commit', '-m', 'feature: Bump version']);
    await run('git', ['push', '-u', 'origin', RELEASE_BRANCH, '--force-with-lease']);

    const version = await readVersion();
    const body = await readReleaseNotes();
    const title = `Release ${version}`;
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
