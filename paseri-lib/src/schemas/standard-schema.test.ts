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
});
