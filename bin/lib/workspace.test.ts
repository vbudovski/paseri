import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { listPublishableMembers, publishedChanges } from './workspace.ts';

const fixtures = new URL('__fixtures__/', import.meta.url);

describe('listPublishableMembers', () => {
    it('returns only members with name, version, and exports', async () => {
        const result = await listPublishableMembers(new URL('multi-publishable/', fixtures));
        expect(result.map((m) => m.dir)).toEqual(['alpha', 'beta']);
    });

    it('exposes name and version from each published member', async () => {
        const result = await listPublishableMembers(new URL('multi-publishable/', fixtures));
        const beta = result.find((m) => m.dir === 'beta');
        expect(beta?.name).toBe('@scope/beta');
        expect(beta?.version).toBe('0.2.3');
    });

    it('throws when the root deno.json has no workspace array', async () => {
        await expect(listPublishableMembers(new URL('no-workspace/', fixtures))).rejects.toThrow(/workspace/);
    });

    it('throws when a member declares some JSR fields but not all', async () => {
        await expect(listPublishableMembers(new URL('partial-config/', fixtures))).rejects.toThrow(
            /partially JSR-configured/,
        );
    });
});

describe('publishedChanges', () => {
    const root = new URL('publish-rules/', fixtures);

    it('keeps files deno publish ships (in include, not excluded)', async () => {
        expect(await publishedChanges(root, ['pkg/src/index.ts', 'pkg/README.md'])).toEqual([
            'pkg/src/index.ts',
            'pkg/README.md',
        ]);
    });

    it('drops publish-excluded files: tests, named helpers, and generated directories', async () => {
        expect(
            await publishedChanges(root, ['pkg/src/index.test.ts', 'pkg/src/_helper.ts', 'pkg/src/generated/thing.ts']),
        ).toEqual([]);
    });

    it('drops files outside the publish include set', async () => {
        expect(await publishedChanges(root, ['pkg/deno.json', 'pkg/LICENSE.md'])).toEqual([]);
    });

    it('ignores paths not under any publishable member', async () => {
        expect(await publishedChanges(root, ['.github/workflows/ci.yml', 'unrelated/file.ts'])).toEqual([]);
    });

    it('ships everything not excluded when a member declares no publish include', async () => {
        expect(await publishedChanges(root, ['bare/src/index.ts', 'bare/anything.ts'])).toEqual([
            'bare/src/index.ts',
            'bare/anything.ts',
        ]);
    });
});
