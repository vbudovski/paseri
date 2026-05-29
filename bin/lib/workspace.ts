// Enumerates the JSR-publishable members of the Deno workspace. A member
// is considered publishable iff its deno.json declares all of name,
// version, and exports — the same set of fields JSR requires, so this
// iteration matches `deno publish`'s effective set exactly.

export interface PublishableMember {
    readonly dir: string;
    readonly name: string;
    readonly version: string;
    readonly denoJsonUrl: URL;
    readonly changelogUrl: URL;
    readonly pkgJsonUrl: URL;
}

export async function readJson<T>(path: URL): Promise<T> {
    return JSON.parse(await Deno.readTextFile(path)) as T;
}

export async function listPublishableMembers(rootUrl: URL): Promise<PublishableMember[]> {
    const rootDeno = await readJson<{ workspace?: string[] }>(new URL('deno.json', rootUrl));
    if (!Array.isArray(rootDeno.workspace)) {
        throw new Error('Root deno.json must declare a `workspace` array.');
    }

    const members: PublishableMember[] = [];
    for (const dir of rootDeno.workspace) {
        const dirUrl = new URL(`${dir}/`, rootUrl);
        const denoJsonUrl = new URL('deno.json', dirUrl);
        const { name, version, exports } = await readJson<{
            name?: string;
            version?: string;
            exports?: string | Record<string, string>;
        }>(denoJsonUrl);

        if (name === undefined && version === undefined && exports === undefined) {
            continue;
        }
        if (name === undefined || version === undefined || exports === undefined) {
            throw new Error(
                `${dir}/deno.json is partially JSR-configured. ` +
                    'Either declare all of `name`, `version`, and `exports`, or none of them.',
            );
        }

        members.push({
            dir,
            name,
            version,
            denoJsonUrl,
            changelogUrl: new URL('CHANGELOG.md', dirUrl),
            pkgJsonUrl: new URL('package.json', dirUrl),
        });
    }
    return members;
}

// Returns the body of the most recent `## ` section of a member's CHANGELOG.md
// — the entry just written by `changeset version`. Throws if no section is
// found (which means the changeset bump did not produce one).
export async function readLatestChangelogEntry(member: PublishableMember): Promise<string> {
    const text = await Deno.readTextFile(member.changelogUrl);
    const lines = text.split('\n');
    const start = lines.findIndex((line) => line.startsWith('## '));
    if (start === -1) {
        throw new Error(`Could not find a release section in ${member.dir}/CHANGELOG.md.`);
    }
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => line.startsWith('## '));
    return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}
