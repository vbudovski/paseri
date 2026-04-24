import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

it('accepts valid types', () => {
    const schema = p.bigint();

    fc.assert(
        fc.property(fc.bigInt(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<bigint>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('rejects invalid types', () => {
    const schema = p.bigint();

    fc.assert(
        fc.property(
            fc.anything().filter((value) => typeof value !== 'bigint'),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'invalid_type' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

describe('gte', () => {
    it('accepts valid values', () => {
        const schema = p.bigint(p.gte(10n));

        fc.assert(
            fc.property(fc.bigInt({ min: 10n }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<bigint>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.bigint(p.gte(10n));

        fc.assert(
            fc.property(fc.bigInt({ max: 9n }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_small' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('is immutable', () => {
        const original = p.bigint();
        const modified = p.bigint(p.gte(3n));
        expect(modified).not.toEqual(original);
        const branched = p.bigint(p.gte(3n), p.lte(10n));
        expect(branched).not.toEqual(modified);
    });
});

describe('gt', () => {
    it('accepts valid values', () => {
        const schema = p.bigint(p.gt(10n));

        fc.assert(
            fc.property(fc.bigInt({ min: 11n }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<bigint>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.bigint(p.gt(10n));

        fc.assert(
            fc.property(fc.bigInt({ max: 10n }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_small' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('is immutable', () => {
        const original = p.bigint();
        const modified = p.bigint(p.gt(3n));
        expect(modified).not.toEqual(original);
        const branched = p.bigint(p.gt(3n), p.lt(10n));
        expect(branched).not.toEqual(modified);
    });
});

describe('lte', () => {
    it('accepts valid values', () => {
        const schema = p.bigint(p.lte(10n));

        fc.assert(
            fc.property(fc.bigInt({ max: 10n }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<bigint>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.bigint(p.lte(10n));

        fc.assert(
            fc.property(fc.bigInt({ min: 11n }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_large' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('is immutable', () => {
        const original = p.bigint();
        const modified = p.bigint(p.lte(3n));
        expect(modified).not.toEqual(original);
        const branched = p.bigint(p.lte(3n), p.gte(0n));
        expect(branched).not.toEqual(modified);
    });
});

describe('lt', () => {
    it('accepts valid values', () => {
        const schema = p.bigint(p.lt(10n));

        fc.assert(
            fc.property(fc.bigInt({ max: 9n }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<bigint>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('rejects invalid values', () => {
        const schema = p.bigint(p.lt(10n));

        fc.assert(
            fc.property(fc.bigInt({ min: 10n }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'too_large' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('is immutable', () => {
        const original = p.bigint();
        const modified = p.bigint(p.lt(3n));
        expect(modified).not.toEqual(original);
        const branched = p.bigint(p.lt(3n), p.gt(0n));
        expect(branched).not.toEqual(modified);
    });
});

it('accepts optional values', () => {
    const schema = p.optional(p.bigint());

    fc.assert(
        fc.property(fc.option(fc.bigInt(), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<bigint | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

it('accepts nullable values', () => {
    const schema = p.nullable(p.bigint());

    fc.assert(
        fc.property(fc.option(fc.bigInt(), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<bigint | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});
