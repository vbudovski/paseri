import { expect } from '@std/expect';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

function numberToString(value: number): string {
    // As per the ECMA specification
    // (https://262.ecma-international.org/8.0/index.html#sec-tostring-applied-to-the-number-type), -0 will be
    // converted to "0", losing the sign. Use special handling for this case.

    return 1 / value === Number.NEGATIVE_INFINITY ? `-${String(value)}` : String(value);
}

test('Chain from schema fail', () => {
    const schema = p.string().chain(p.number(), (value) => {
        return p.ok(Number(value));
    });

    fc.assert(
        fc.property(
            fc.anything().filter((value) => typeof value !== 'string'),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_type' });
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Chain to schema fail', () => {
    const schema = p.string().chain(p.number(), (value) => {
        // We're lying about the type here, as we want to simulate failure of chained schema.
        return p.ok(value as unknown as number);
    });

    fc.assert(
        fc.property(fc.string(), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_type' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Chain transform fail', () => {
    const schema = p.string().chain(p.number(), (value) => {
        return p.err('foo');
    });

    fc.assert(
        fc.property(fc.string(), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.issue).toEqual({ type: 'leaf', code: 'foo' });
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Chain primitive to primitive', () => {
    const schema = p.string().chain(p.number(), (value) => {
        return p.ok(Number(value));
    });

    fc.assert(
        fc.property(fc.float(), (data) => {
            const dataAsString = numberToString(data);

            const result = schema.safeParse(dataAsString);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Chain primitive to Array', () => {
    const schema = p.string().chain(p.array(p.number()), (value) => {
        return p.ok(value.split(',').map((v) => Number(v)));
    });

    fc.assert(
        fc.property(fc.array(fc.float(), { minLength: 1 }), (data) => {
            const dataAsString = data.map((d) => numberToString(d)).join(',');

            const result = schema.safeParse(dataAsString);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number[]>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Chain Array to primitive', () => {
    const schema = p.array(p.number()).chain(p.string(), (value) => {
        return p.ok(value.map((v) => numberToString(v)).join(','));
    });

    fc.assert(
        fc.property(fc.array(fc.float(), { minLength: 1 }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string>;
                const expectedResult = data.map((d) => numberToString(d)).join(',');
                expect(result.value).toBe(expectedResult);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Chain primitive to Object with unrecognised keys', () => {
    const schema = p.string().chain(p.object({ foo: p.number(), bar: p.number() }), (value) => {
        const [foo, bar, ...other] = value.split(',');
        const extra = Object.fromEntries(other.map((o) => [o, Number(o)]));

        return p.ok({ foo: Number(foo), bar: Number(bar), ...extra });
    });

    fc.assert(
        fc.property(fc.array(fc.float(), { minLength: 2 }), (data) => {
            const dataAsString = data.map((d) => numberToString(d)).join(',');

            const result = schema.safeParse(dataAsString);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<{ foo: number; bar: number }>;
                expect(result.value).toEqual({ foo: data[0], bar: data[1] });
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Chain Object with unrecognised keys to primitive', () => {
    const schema = p.object({ foo: p.number(), bar: p.number() }).chain(p.string(), ({ foo, bar }) => {
        return p.ok(`${numberToString(foo)},${numberToString(bar)}`);
    });

    fc.assert(
        fc.property(fc.record({ foo: fc.float(), bar: fc.float(), extra: fc.anything() }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<string>;
                expect(result.value).toBe(`${numberToString(data.foo)},${numberToString(data.bar)}`);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
