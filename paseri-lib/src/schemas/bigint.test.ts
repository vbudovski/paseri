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
        const schema = p.bigint().gte(10n);

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
        const schema = p.bigint().gte(10n);

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
        const modified = original.gte(3n);
        expect(modified).not.toEqual(original);
        const branched = modified.lte(10n);
        expect(branched).not.toEqual(modified);
    });
});

describe('gt', () => {
    it('accepts valid values', () => {
        const schema = p.bigint().gt(10n);

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
        const schema = p.bigint().gt(10n);

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
        const modified = original.gt(3n);
        expect(modified).not.toEqual(original);
        const branched = modified.lt(10n);
        expect(branched).not.toEqual(modified);
    });
});

describe('lte', () => {
    it('accepts valid values', () => {
        const schema = p.bigint().lte(10n);

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
        const schema = p.bigint().lte(10n);

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
        const modified = original.lte(3n);
        expect(modified).not.toEqual(original);
        const branched = modified.gte(0n);
        expect(branched).not.toEqual(modified);
    });
});

describe('lt', () => {
    it('accepts valid values', () => {
        const schema = p.bigint().lt(10n);

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
        const schema = p.bigint().lt(10n);

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
        const modified = original.lt(3n);
        expect(modified).not.toEqual(original);
        const branched = modified.gt(0n);
        expect(branched).not.toEqual(modified);
    });
});

it('accepts optional values', () => {
    const schema = p.bigint().optional();

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
    const schema = p.bigint().nullable();

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
