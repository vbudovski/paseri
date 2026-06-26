// Thin wrapper around @changesets/cli that lets a Deno workspace masquerade
// as an npm workspace just long enough for the CLI to run, then syncs any
// version bump back into each member's deno.json. The shim package.json
// files are gitignored and removed at the end of every invocation —
// including on signal-driven exits.

import { listPublishableMembers, type PublishableMember, readJson } from './lib/workspace.ts';

const rootUrl = new URL('../', import.meta.url);
const rootPackageUrl = new URL('package.json', rootUrl);

async function writeJson(path: URL, data: unknown): Promise<void> {
    await Deno.writeTextFile(path, `${JSON.stringify(data, null, 2)}\n`);
}

async function exists(path: URL): Promise<boolean> {
    try {
        await Deno.lstat(path);
        return true;
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            return false;
        }
        throw error;
    }
}

async function pre(): Promise<PublishableMember[]> {
    const members = await listPublishableMembers(rootUrl);
    if (members.length === 0) {
        throw new Error('No publishable workspace members found.');
    }

    await writeJson(rootPackageUrl, {
        name: 'paseri-root',
        private: true,
        workspaces: members.map((m) => m.dir),
    });

    for (const member of members) {
        await writeJson(member.packageJsonUrl, {
            name: member.name,
            version: member.version,
        });
    }

    return members;
}

// Replace the version field in each member's deno.json via a targeted text
// edit rather than parse/stringify, so any future comments, key order, or
// formatting quirks survive untouched.
async function sync(members: PublishableMember[]): Promise<void> {
    for (const member of members) {
        if (!(await exists(member.packageJsonUrl))) {
            continue;
        }
        const packageJson = await readJson<{ version: string }>(member.packageJsonUrl);
        const text = await Deno.readTextFile(member.denoJsonUrl);
        const versionField = /"version"\s*:\s*"([^"]*)"/;
        const match = text.match(versionField);
        if (!match) {
            throw new Error(`Could not find a version field in ${member.dir}/deno.json.`);
        }
        if (match[1] === packageJson.version) {
            continue;
        }
        const updated = text.replace(versionField, `"version": "${packageJson.version}"`);
        await Deno.writeTextFile(member.denoJsonUrl, updated);
        console.log(`Synced version ${packageJson.version} → ${member.dir}/deno.json`);
    }
}

// Cleanup runs from signal handlers and the finally block, so it must be
// resilient to any partial state pre() may have left behind. Iterate every
// workspace member rather than just the publishable ones, in case a shim
// was somehow written before pre() classified the member.
function cleanup(): void {
    const candidates = [rootPackageUrl];
    try {
        const rootDenoText = Deno.readTextFileSync(new URL('deno.json', rootUrl));
        const rootDeno = JSON.parse(rootDenoText) as { workspace?: string[] };
        if (Array.isArray(rootDeno.workspace)) {
            for (const dir of rootDeno.workspace) {
                candidates.push(new URL(`${dir}/package.json`, rootUrl));
            }
        }
    } catch {
        // Best-effort.
    }

    for (const path of candidates) {
        try {
            Deno.removeSync(path);
        } catch (error) {
            if (!(error instanceof Deno.errors.NotFound)) {
                throw error;
            }
        }
    }
}

function onSignal() {
    cleanup();
    Deno.exit(1);
}
Deno.addSignalListener('SIGINT', onSignal);
Deno.addSignalListener('SIGTERM', onSignal);

async function runChangeset(args: string[]): Promise<number> {
    const command = new Deno.Command('deno', {
        args: ['run', '-A', '@changesets/cli', ...args],
        stdin: 'inherit',
        stdout: 'inherit',
        stderr: 'inherit',
    });
    const { code } = await command.output();
    return code;
}

async function main(): Promise<void> {
    let exitCode = 0;
    try {
        const members = await pre();
        exitCode = await runChangeset(Deno.args);
        if (exitCode === 0 && Deno.args[0] === 'version') {
            await sync(members);
        }
    } finally {
        cleanup();
    }
    if (exitCode !== 0) {
        Deno.exit(exitCode);
    }
}

await main();
