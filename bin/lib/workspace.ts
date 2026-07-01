import { globToRegExp } from 'jsr:@std/path@^1.1.5';

// Enumerates the JSR-publishable members of the Deno workspace. A member
// is considered publishable iff its deno.json declares all of name,
// version, and exports — the same set of fields JSR requires, so this
// iteration matches `deno publish`'s effective set exactly.

interface PublishableMember {
    readonly dir: string;
    readonly name: string;
    readonly version: string;
    readonly denoJsonUrl: URL;
    readonly changelogUrl: URL;
    readonly packageJsonUrl: URL;
}

async function readJson<T>(path: URL): Promise<T> {
    return JSON.parse(await Deno.readTextFile(path)) as T;
}

async function listPublishableMembers(rootUrl: URL): Promise<PublishableMember[]> {
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
            packageJsonUrl: new URL('package.json', dirUrl),
        });
    }
    return members;
}

// Returns the body of the most recent `## ` section of a member's CHANGELOG.md
// — the entry just written by `changeset version`. Throws if no section is
// found (which means the changeset bump did not produce one).
async function readLatestChangelogEntry(member: PublishableMember): Promise<string> {
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

// A publish include/exclude entry is a glob, a single file, or a directory (matching everything under it) —
// the three shapes `deno publish` accepts.
function matchesPublishEntry(relativePath: string, entry: string): boolean {
    if (/[*?[\]{}]/.test(entry)) {
        return globToRegExp(entry, { globstar: true, extended: true }).test(relativePath);
    }
    return relativePath === entry || relativePath.startsWith(`${entry}/`);
}

// Filters repo-relative changed paths down to those `deno publish` actually ships, applying each member's
// publish include/exclude. Test files, test-only helpers, and generated fixtures are publish-excluded, so a
// change touching only those ships nothing and needs no changeset.
async function publishedChanges(rootUrl: URL, paths: readonly string[]): Promise<string[]> {
    const members = await listPublishableMembers(rootUrl);
    const rules = new Map<string, { include: string[]; exclude: string[] }>();
    for (const member of members) {
        const { publish } = await readJson<{ publish?: { include?: string[]; exclude?: string[] } }>(
            member.denoJsonUrl,
        );
        rules.set(member.dir, { include: publish?.include ?? [], exclude: publish?.exclude ?? [] });
    }

    const published: string[] = [];
    for (const path of paths) {
        const member = members.find((candidate) => path === candidate.dir || path.startsWith(`${candidate.dir}/`));
        if (member === undefined) {
            continue;
        }
        const rule = rules.get(member.dir);
        if (rule === undefined) {
            continue;
        }
        const relativePath = path.slice(member.dir.length + 1);
        // An empty include means `deno publish` ships everything not excluded.
        const included =
            rule.include.length === 0 || rule.include.some((entry) => matchesPublishEntry(relativePath, entry));
        const excluded = rule.exclude.some((entry) => matchesPublishEntry(relativePath, entry));
        if (included && !excluded) {
            published.push(path);
        }
    }
    return published;
}

export type { PublishableMember };
export { listPublishableMembers, publishedChanges, readJson, readLatestChangelogEntry };
