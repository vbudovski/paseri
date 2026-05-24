// Thin wrapper around @changesets/cli that lets a Deno workspace masquerade
// as an npm workspace just long enough for the CLI to run, then syncs any
// version bump back into deno.json. The shim package.json files are gitignored
// and removed at the end of every invocation — including on signal-driven exits.

const root = new URL('../', import.meta.url);
const rootPkg = new URL('package.json', root);
const libDir = new URL('paseri-lib/', root);
const libDeno = new URL('deno.json', libDir);
const libPkg = new URL('package.json', libDir);

async function readJson<T>(path: URL): Promise<T> {
    return JSON.parse(await Deno.readTextFile(path)) as T;
}

async function writeJson(path: URL, data: unknown): Promise<void> {
    await Deno.writeTextFile(path, `${JSON.stringify(data, null, 2)}\n`);
}

async function exists(path: URL): Promise<boolean> {
    try {
        await Deno.lstat(path);
        return true;
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            return false;
        }
        throw err;
    }
}

async function pre(): Promise<void> {
    const lib = await readJson<{ name?: string; version?: string }>(libDeno);
    if (!lib.name || !lib.version) {
        throw new Error('paseri-lib/deno.json must declare both `name` and `version`.');
    }
    await writeJson(rootPkg, {
        name: 'paseri-root',
        private: true,
        workspaces: ['paseri-lib'],
    });
    await writeJson(libPkg, {
        name: lib.name,
        version: lib.version,
    });
}

// Replace the version field in paseri-lib/deno.json via a targeted text edit
// rather than parse/stringify, so any future comments, key order, or
// formatting quirks survive untouched.
async function sync(): Promise<void> {
    if (!(await exists(libPkg))) {
        return;
    }
    const pkg = await readJson<{ version: string }>(libPkg);
    const text = await Deno.readTextFile(libDeno);
    const versionField = /"version"\s*:\s*"([^"]*)"/;
    const match = text.match(versionField);
    if (!match) {
        throw new Error('Could not find a version field in paseri-lib/deno.json.');
    }
    if (match[1] === pkg.version) {
        return;
    }
    const updated = text.replace(versionField, `"version": "${pkg.version}"`);
    await Deno.writeTextFile(libDeno, updated);
    console.log(`Synced version ${pkg.version} → paseri-lib/deno.json`);
}

function cleanup(): void {
    for (const path of [rootPkg, libPkg]) {
        try {
            Deno.removeSync(path);
        } catch (err) {
            if (!(err instanceof Deno.errors.NotFound)) {
                throw err;
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
        await pre();
        exitCode = await runChangeset(Deno.args);
        if (exitCode === 0 && Deno.args[0] === 'version') {
            await sync();
        }
    } finally {
        cleanup();
    }
    if (exitCode !== 0) {
        Deno.exit(exitCode);
    }
}

await main();
