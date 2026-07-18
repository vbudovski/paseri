import type { StandardSchemaV1 } from '@standard-schema/spec';
import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';
import { en } from '../locales/en.ts';

describe('Standard Schema', () => {
    const schema = p.string();

    it('infers unknown input and the output type', () => {
        // Paseri validates `unknown` input, so InferInput must be `unknown` (matching `safeParse(value: unknown)`),
        // and InferOutput the parsed type. A transforming schema (input type != output type) is the discriminating
        // case: a broken `Props<OutputType>` reports the output type as the input.
        expectTypeOf<StandardSchemaV1.InferInput<typeof schema>>().toEqualTypeOf<unknown>();
        expectTypeOf<StandardSchemaV1.InferOutput<typeof schema>>().toEqualTypeOf<string>();

        const transform = p.string().chain(p.number(), (value) => ({ ok: true as const, value: Number(value) }));
        expectTypeOf<StandardSchemaV1.InferInput<typeof transform>>().toEqualTypeOf<unknown>();
        expectTypeOf<StandardSchemaV1.InferOutput<typeof transform>>().toEqualTypeOf<number>();
    });

    it('parses valid', () => {
        const result = schema['~standard'].validate('foo');
        expect(result).toEqual({ value: 'foo' });
    });

    it('parses invalid without locale, returns raw issue codes', () => {
        const result = schema['~standard'].validate(123);
        expect(result).toEqual({ issues: [{ path: [], message: 'invalid_type' }] });
    });

    it('parses invalid with locale, returns localized messages', () => {
        const result = schema['~standard'].validate(123, { libraryOptions: { locale: en } });
        expect(result).toEqual({ issues: [{ path: [], message: 'Invalid type. Expected string.' }] });
    });

    it('returns the same props object on every access', () => {
        // The props object is built once per schema and reused on every later read; rebuilding it
        // on each access is measurably slower.
        expect(schema['~standard']).toBe(schema['~standard']);

        const { validate } = schema['~standard'];
        expect(validate('foo')).toEqual({ value: 'foo' });
    });

    it('keeps props independent across schema instances', () => {
        const other = p.number();
        expect(other['~standard']).not.toBe(schema['~standard']);
        expect(other['~standard'].validate(1)).toEqual({ value: 1 });
        expect(schema['~standard'].validate('foo')).toEqual({ value: 'foo' });
    });

    it('builds fresh props for a schema derived after access', () => {
        // The cache must never travel through derivation: a leaked copy would validate against the
        // base schema via its captured self, silently dropping the derived checks.
        const base = p.string();
        const baseProps = base['~standard'];
        const derived = base.min(5);
        expect(derived['~standard']).not.toBe(baseProps);
        expect(derived['~standard'].validate('ab')).toEqual({ issues: [{ path: [], message: 'too_short' }] });
    });

    it('works on a frozen schema', () => {
        // An app that deep-freezes a config object freezes any schema held inside it; a frozen
        // instance can't store the cached props, so `~standard` must still build and validate.
        // A derived instance, not a `p.string()` singleton: freezing the shared singleton would leak
        // into every other test in this process.
        const frozen = p.string().min(1);
        Object.freeze(frozen);
        expect(frozen['~standard'].validate('foo')).toEqual({ value: 'foo' });
        expect(frozen['~standard'].validate('')).toEqual({ issues: [{ path: [], message: 'too_short' }] });
    });

    it('works on a sealed or non-extensible schema', () => {
        // Sealing, like freezing, stops new properties being added, so the schema can't store the
        // cached props on itself. Access must still work rather than throw.
        const sealed = p.string().min(1);
        Object.seal(sealed);
        expect(sealed['~standard'].validate('foo')).toEqual({ value: 'foo' });

        const nonExtensible = p.string().min(1);
        Object.preventExtensions(nonExtensible);
        expect(nonExtensible['~standard'].validate('')).toEqual({ issues: [{ path: [], message: 'too_short' }] });
    });

    it('keeps stable identity and frozen props on a frozen schema', () => {
        // A frozen schema can't store the cached props on itself, so they live in a separate map.
        // That copy must behave the same way as the normal cache: the same frozen object on every
        // read, and assigning to it throws.
        const frozen = p.string().min(1);
        Object.freeze(frozen);
        expect(frozen['~standard']).toBe(frozen['~standard']);

        const props = frozen['~standard'] as { validate: unknown };
        expect(() => {
            props.validate = () => ({ value: 'hijacked' });
        }).toThrow(TypeError);
        expect(frozen['~standard'].validate('foo')).toEqual({ value: 'foo' });
    });

    it('rejects mutation of the props object', () => {
        // The props object is shared across all consumers of the schema, so one consumer patching
        // `validate` must fail loudly rather than silently rewiring everyone else's validation.
        const props = schema['~standard'] as { validate: unknown };
        expect(() => {
            props.validate = () => ({ value: 'hijacked' });
        }).toThrow(TypeError);
        expect(schema['~standard'].validate('foo')).toEqual({ value: 'foo' });
    });
});
