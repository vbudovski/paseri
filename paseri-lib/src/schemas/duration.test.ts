import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const durationArb = fc
    .record({
        hours: fc.integer({ min: 0, max: 1000 }),
        minutes: fc.integer({ min: 0, max: 59 }),
        seconds: fc.integer({ min: 0, max: 59 }),
    })
    .map((d) => Temporal.Duration.from(d));

it('accepts valid types', () => {
    const schema = p.duration();

    fc.assert(
        fc.property(durationArb, (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.Duration>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.duration();

    fc.assert(
        fc.property(fc.anything(), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'invalid_type' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

it('accepts optional values', () => {
    const schema = p.duration().optional();

    fc.assert(
        fc.property(fc.option(durationArb, { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.Duration | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.duration().nullable();

    fc.assert(
        fc.property(fc.option(durationArb, { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<Temporal.Duration | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
