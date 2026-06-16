import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { checkSchemaImportUsage } from './guard.ts';

// The guard runs on post-esbuild JS in the plugin, so these inputs are plain JS.
describe('checkSchemaImportUsage', () => {
    it('allows .safeParse and .parse on a schema import', () => {
        const code = `import { User } from './user.schema.ts';
            export const a = User.safeParse(x);
            export const b = User.parse(y);`;
        expect(() => checkSchemaImportUsage(code, 'app.js')).not.toThrow();
    });

    it('throws on a derivation method like .optional()', () => {
        const code = `import { User } from './user.schema.ts'; export const o = User.optional();`;
        expect(() => checkSchemaImportUsage(code, 'app.js')).toThrow('User.optional');
    });

    it('tracks aliased named imports', () => {
        const code = `import { User as U } from './user.schema.ts'; export const a = U.array();`;
        expect(() => checkSchemaImportUsage(code, 'app.js')).toThrow('U.array');
    });

    it('does not false-positive on namespace-import member access', () => {
        const code = `import * as s from './user.schema.ts'; export const a = s.User.safeParse(x);`;
        expect(() => checkSchemaImportUsage(code, 'app.js')).not.toThrow();
    });

    it('ignores bindings imported from non-schema files', () => {
        const code = `import { User } from './user.schema.ts';
            import { Helper } from './helper.ts';
            export const a = User.safeParse(x);
            export const b = Helper.whatever();`;
        expect(() => checkSchemaImportUsage(code, 'app.js')).not.toThrow();
    });

    it('throws on a string-literal computed derivation like User["optional"]', () => {
        const code = `import { User } from './user.schema.ts'; export const o = User['optional']();`;
        expect(() => checkSchemaImportUsage(code, 'app.js')).toThrow('User.optional');
    });

    it('allows a string-literal computed safeParse like User["safeParse"]', () => {
        const code = `import { User } from './user.schema.ts'; export const a = User['safeParse'](x);`;
        expect(() => checkSchemaImportUsage(code, 'app.js')).not.toThrow();
    });

    it('throws on a dynamic computed member access it cannot verify', () => {
        const code = `import { User } from './user.schema.ts';
            const key = cond ? 'optional' : 'array';
            export const o = User[key]();`;
        expect(() => checkSchemaImportUsage(code, 'app.js')).toThrow('statically verified');
    });

    it('throws on destructuring a derivation method', () => {
        const code = `import { User } from './user.schema.ts'; const { optional } = User;`;
        expect(() => checkSchemaImportUsage(code, 'app.js')).toThrow('optional');
    });

    it('allows destructuring safeParse/parse', () => {
        const code = `import { User } from './user.schema.ts'; const { safeParse, parse } = User;`;
        expect(() => checkSchemaImportUsage(code, 'app.js')).not.toThrow();
    });

    it('throws on derivation via a namespace import', () => {
        const code = `import * as s from './user.schema.ts'; export const o = s.User.optional();`;
        expect(() => checkSchemaImportUsage(code, 'app.js')).toThrow('s.User.optional');
    });
});
