import * as p from '@paseri/paseri';
import { en } from '@paseri/paseri/locales';
import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import '@paseri/paseri/introspect';
import { compileStandardSync } from './aot-shadow.ts';
import { toSource } from './toSource.ts';

// The compiled module exports a single `${name}` object mirroring the runtime schema: `.safeParse` / `.parse`
// methods and a Standard Schema `~standard` adapter. Deep validation parity is covered by the parity suite
// (aot-shadow); here we check the emitted surface and that the adapter/methods behave like the runtime's.

// `~standard.validate` issues are an unordered set (sibling order is uncontracted), so normalise before comparing.
// Accepts `unknown` because the spec types `validate` as `Result | Promise<Result>`; paseri is always synchronous.
function normalize(result: unknown): unknown {
    const sync = result as { value?: unknown; issues?: unknown };
    if (Array.isArray(sync.issues)) {
        const sorted = [...sync.issues].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        return { issues: sorted };
    }
    return sync;
}

describe('emitted Standard Schema surface', () => {
    it('exports the object under the schema name via an alias, with the methods aliased to internal entries', () => {
        const source = toSource(p.object({ foo: p.string() }).toIR(), { name: 'Greeting' });
        // Surfaced via an export alias (so the name never shadows a global the body uses), not a module-scope binding.
        expect(source).toContain('export { _schema as Greeting };');
        expect(source).toContain('const _schema:');
        // Entry functions are internal (non-exported) and aliased onto the object.
        expect(source).not.toContain('export function safeParseGreeting');
        expect(source).not.toContain('export function parseGreeting');
        expect(source).toContain('safeParse: safeParseGreeting');
        expect(source).toContain('parse: parseGreeting');
        // Standard Schema adapter shape mirrors paseri-lib's `Schema['~standard']`.
        expect(source).toContain('"~standard"');
        expect(source).toContain('version: 1');
        expect(source).toContain('vendor: "paseri"');
    });

    it("doesn't shadow a global the body relies on when named after one (e.g. Set)", () => {
        // `export const Set` would shadow the global `Set` that `value instanceof Set` needs; the alias avoids it.
        const source = toSource(p.set(p.string()).toIR(), { name: 'Set' });
        expect(source).toContain('export { _schema as Set };');
        expect(source).toContain('value instanceof Set');
    });
});

describe('compiled ~standard.validate', () => {
    const schema = p.string();
    const compiled = compileStandardSync(schema as p.Schema<unknown>);
    if (compiled === null) {
        throw new Error('schema did not AOT-compile');
    }

    it('parses valid', () => {
        expect(compiled['~standard'].validate('foo')).toEqual({ value: 'foo' });
    });

    it('parses invalid without locale, returns raw issue codes', () => {
        expect(compiled['~standard'].validate(123)).toEqual({ issues: [{ path: [], message: 'invalid_type' }] });
    });

    it('parses invalid with locale, returns localized messages', () => {
        expect(compiled['~standard'].validate(123, { libraryOptions: { locale: en } })).toEqual({
            issues: [{ path: [], message: 'Invalid type. Expected string.' }],
        });
    });
});

describe('compiled object surface matches the runtime schema', () => {
    const schema = p.object({ name: p.string(), age: p.number() });
    const compiled = compileStandardSync(schema as p.Schema<unknown>);
    if (compiled === null) {
        throw new Error('schema did not AOT-compile');
    }

    const valid = { name: 'Ada', age: 36 };
    const invalid = { name: 42, age: 'old' };

    it('validate agrees with the runtime ~standard for valid and invalid input', () => {
        expect(normalize(compiled['~standard'].validate(valid))).toEqual(
            normalize(schema['~standard'].validate(valid)),
        );
        expect(normalize(compiled['~standard'].validate(invalid))).toEqual(
            normalize(schema['~standard'].validate(invalid)),
        );
    });

    it('safeParse agrees with the runtime', () => {
        expect(compiled.safeParse(valid)).toEqual(schema.safeParse(valid));
        const generated = compiled.safeParse(invalid);
        expect(generated.ok).toBe(false);
        expect(generated.ok).toBe(schema.safeParse(invalid).ok);
    });

    it('parse returns the value on success and throws on failure, like the runtime', () => {
        expect(compiled.parse(valid)).toEqual(schema.parse(valid));
        expect(() => compiled.parse(invalid)).toThrow();
        expect(() => schema.parse(invalid)).toThrow();
    });
});
