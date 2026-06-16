import { expect } from '@std/expect';
import { afterAll, describe, it } from '@std/testing/bdd';
import '@paseri/paseri/introspect';
import * as p from '@paseri/paseri';
import { buildAggregator, collectSchemaExports, compileSchema, type SchemaLike } from './compile.ts';

// Generated modules import `@paseri/paseri/internal` (a bare specifier), so they must
// live inside the workspace to resolve. Emit into a temp dir at the package root (NOT under
// src/, which is the coverage-scoped path) and import via file URL; clean up afterwards.
const genDir = new URL('../__gen__/', import.meta.url);
await Deno.mkdir(genDir, { recursive: true });

async function writeAndImport(name: string, source: string): Promise<Record<string, SchemaLike>> {
    const target = new URL(`${name}.ts`, genDir);
    await Deno.writeTextFile(target, source);
    return await import(target.href);
}

afterAll(async () => {
    await Deno.remove(genDir, { recursive: true });
});

describe('compileSchema', () => {
    it('compiles multiple schemas from one file into independent, collision-free modules', async () => {
        // Both use the email regex + object shape; separate modules must not collide
        // on the shared `@paseri/paseri/internal` import, inlined helpers, or name counter.
        const Account = p.object({ email: p.string().email() });
        const Place = p.object({ contact: p.string().email() });
        const account = await writeAndImport('Account', compileSchema('Account', Account));
        const place = await writeAndImport('Place', compileSchema('Place', Place));

        expect(JSON.stringify(account.Account.safeParse({ email: 'a@b.com' }))).toBe(
            JSON.stringify(Account.safeParse({ email: 'a@b.com' })),
        );
        expect(JSON.stringify(place.Place.safeParse({ contact: 'x' }))).toBe(
            JSON.stringify(Place.safeParse({ contact: 'x' })),
        );
    });
});

describe('collectSchemaExports', () => {
    it('keeps only schema-like exports', () => {
        const schema = p.string();
        const found = collectSchemaExports({
            Schema: schema,
            notASchema: { foo: 1 },
            alsoNot: () => {},
            primitive: 7,
        });
        expect(found.map((entry) => entry.name)).toEqual(['Schema']);
    });
});

describe('buildAggregator', () => {
    it('re-exports each schema from its own specifier', () => {
        const source = buildAggregator([
            { name: 'User', specifier: 'paseri-schema:/abs/x.schema.ts?name=User' },
            { name: 'Post', specifier: 'paseri-schema:/abs/x.schema.ts?name=Post' },
        ]);
        expect(source).toBe(
            'export { User } from "paseri-schema:/abs/x.schema.ts?name=User";\n' +
                'export { Post } from "paseri-schema:/abs/x.schema.ts?name=Post";\n',
        );
    });
});
