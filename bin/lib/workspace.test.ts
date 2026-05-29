import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { listPublishableMembers } from './workspace.ts';

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
