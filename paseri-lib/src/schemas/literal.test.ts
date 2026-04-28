import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

describe('String', () => {
    it('accepts valid values', () => {
        const schema = p.literal('apple');
        const result = schema.safeParse('apple');
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<'apple'>;
            expect(result.value).toBe('apple');
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('rejects invalid values', () => {
        const schema = p.literal('apple');
        const result = schema.safeParse('banana');
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'invalid_value' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('exposes the literal value type', () => {
        const schema = p.literal('apple');
        expectTypeOf(schema.value).toEqualTypeOf<'apple'>;
    });
});

describe('Number', () => {
    it('accepts valid values', () => {
        const schema = p.literal(123);
        const result = schema.safeParse(123);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<123>;
            expect(result.value).toBe(123);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('rejects invalid values', () => {
        const schema = p.literal(123);
        const result = schema.safeParse(456);
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'invalid_value' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('exposes the literal value type', () => {
        const schema = p.literal(123);
        expectTypeOf(schema.value).toEqualTypeOf<123>;
    });
});

describe('BigInt', () => {
    it('accepts valid values', () => {
        const schema = p.literal(123n);
        const result = schema.safeParse(123n);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<123n>;
            expect(result.value).toBe(123n);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('rejects invalid values', () => {
        const schema = p.literal(123n);
        const result = schema.safeParse(456n);
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'invalid_value' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('exposes the literal value type', () => {
        const schema = p.literal(123n);
        expectTypeOf(schema.value).toEqualTypeOf<123n>;
    });
});

describe('Boolean', () => {
    it('accepts valid values', () => {
        const schema = p.literal(true);
        const result = schema.safeParse(true);
        if (result.ok) {
            expectTypeOf(result.value).toEqualTypeOf<true>;
            expect(result.value).toBe(true);
        } else {
            expect(result.ok).toBeTruthy();
        }
    });

    it('rejects invalid values', () => {
        const schema = p.literal(true);
        const result = schema.safeParse(false);
        if (!result.ok) {
            expect(result.messages()).toEqual([{ path: [], message: 'invalid_value' }]);
        } else {
            expect(result.ok).toBeFalsy();
        }
    });

    it('exposes the literal value type', () => {
        const schema = p.literal(true);
        expectTypeOf(schema.value).toEqualTypeOf<true>;
    });
});

it('accepts optional values', () => {
    const schema = p.literal('apple').optional();

    fc.assert(
        fc.property(fc.option(fc.constant('apple'), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<'apple' | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.literal('apple').nullable();

    fc.assert(
        fc.property(fc.option(fc.constant('apple'), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<'apple' | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
