import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { expectTypeOf } from 'expect-type';
import fc from 'fast-check';
import * as p from '../index.ts';

const { test } = Deno;

test('Valid type', () => {
    const schema = p.number();

    fc.assert(
        fc.property(fc.float({ noNaN: true }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid type', () => {
    const schema = p.number();

    fc.assert(
        fc.property(
            fc.oneof(
                fc.anything().filter((value) => typeof value !== 'number'),
                fc.constant(Number.NaN),
            ),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Invalid type. Expected number.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

describe('gte', () => {
    it('Valid', () => {
        const schema = p.number().gte(10);

        fc.assert(
            fc.property(fc.float({ noNaN: true, min: 10 }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('Invalid', () => {
        const schema = p.number().gte(10);

        fc.assert(
            fc.property(fc.float({ noNaN: true, max: 10, maxExcluded: true }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Too small.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('NaN boundary', () => {
        expect(() => p.number().gte(NaN)).toThrow();
    });

    it('Immutable', () => {
        const original = p.number();
        const modified = original.gte(3);
        expect(modified).not.toEqual(original);
        const branched = modified.lte(10);
        expect(branched).not.toEqual(modified);
    });
});

describe('gt', () => {
    it('Valid', () => {
        const schema = p.number().gt(10);

        fc.assert(
            fc.property(fc.float({ noNaN: true, min: 10, minExcluded: true }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('Invalid', () => {
        const schema = p.number().gt(10);

        fc.assert(
            fc.property(fc.float({ noNaN: true, max: 10 }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Too small.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('NaN boundary', () => {
        expect(() => p.number().gt(NaN)).toThrow();
    });

    it('Immutable', () => {
        const original = p.number();
        const modified = original.gt(3);
        expect(modified).not.toEqual(original);
        const branched = modified.lt(10);
        expect(branched).not.toEqual(modified);
    });
});

describe('lte', () => {
    it('Valid', () => {
        const schema = p.number().lte(10);

        fc.assert(
            fc.property(fc.float({ noNaN: true, max: 10 }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('Invalid', () => {
        const schema = p.number().lte(10);

        fc.assert(
            fc.property(fc.float({ noNaN: true, min: 10, minExcluded: true }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Too large.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('NaN boundary', () => {
        expect(() => p.number().lte(NaN)).toThrow();
    });

    it('Immutable', () => {
        const original = p.number();
        const modified = original.lte(3);
        expect(modified).not.toEqual(original);
        const branched = modified.gte(0);
        expect(branched).not.toEqual(modified);
    });
});

describe('lt', () => {
    it('Valid', () => {
        const schema = p.number().lt(10);

        fc.assert(
            fc.property(fc.float({ noNaN: true, max: 10, maxExcluded: true }), (data) => {
                const result = schema.safeParse(data);
                if (result.ok) {
                    expectTypeOf(result.value).toEqualTypeOf<number>;
                    expect(result.value).toBe(data);
                } else {
                    expect(result.ok).toBeTruthy();
                }
            }),
        );
    });

    it('Invalid', () => {
        const schema = p.number().lt(10);

        fc.assert(
            fc.property(fc.float({ noNaN: true, min: 10 }), (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Too large.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            }),
        );
    });

    it('NaN boundary', () => {
        expect(() => p.number().lt(NaN)).toThrow();
    });

    it('Immutable', () => {
        const original = p.number();
        const modified = original.lt(3);
        expect(modified).not.toEqual(original);
        const branched = modified.gt(0);
        expect(branched).not.toEqual(modified);
    });
});

test('Valid int', () => {
    const schema = p.number().int();

    fc.assert(
        fc.property(fc.integer(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid int', () => {
    const schema = p.number().int();

    fc.assert(
        fc.property(fc.float({ noNaN: true, noInteger: true }), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'Number must be an integer.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid finite', () => {
    const schema = p.number().finite();

    fc.assert(
        fc.property(fc.float({ noNaN: true, noDefaultInfinity: true }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid finite', () => {
    const schema = p.number().finite();

    fc.assert(
        fc.property(fc.oneof(fc.constant(Number.POSITIVE_INFINITY), fc.constant(Number.NEGATIVE_INFINITY)), (data) => {
            const result = schema.safeParse(data);
            if (!result.ok) {
                expect(result.messages()).toEqual([{ path: [], message: 'Number must be finite.' }]);
            } else {
                expect(result.ok).toBeFalsy();
            }
        }),
    );
});

test('Valid safe', () => {
    const schema = p.number().safe();

    fc.assert(
        fc.property(fc.maxSafeInteger(), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number>;
                expect(result.value).toBe(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Invalid safe', () => {
    const schema = p.number().safe();

    fc.assert(
        fc.property(
            fc.oneof(fc.constant(Number.MAX_SAFE_INTEGER + 1), fc.constant(Number.MIN_SAFE_INTEGER - 1)),
            (data) => {
                const result = schema.safeParse(data);
                if (!result.ok) {
                    expect(result.messages()).toEqual([{ path: [], message: 'Number must be a safe integer.' }]);
                } else {
                    expect(result.ok).toBeFalsy();
                }
            },
        ),
    );
});

test('Optional', () => {
    const schema = p.number().optional();

    fc.assert(
        fc.property(fc.option(fc.float({ noNaN: true }), { nil: undefined }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number | undefined>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

test('Nullable', () => {
    const schema = p.number().nullable();

    fc.assert(
        fc.property(fc.option(fc.float({ noNaN: true }), { nil: null }), (data) => {
            const result = schema.safeParse(data);
            if (result.ok) {
                expectTypeOf(result.value).toEqualTypeOf<number | null>;
                expect(result.value).toEqual(data);
            } else {
                expect(result.ok).toBeTruthy();
            }
        }),
    );
});

describe('Immutable', () => {
    it('int', () => {
        const original = p.number();
        const modified = original.int();
        expect(modified).not.toEqual(original);
        const branched = modified.gte(0);
        expect(branched).not.toEqual(modified);
    });

    it('finite', () => {
        const original = p.number();
        const modified = original.finite();
        expect(modified).not.toEqual(original);
        const branched = modified.gte(0);
        expect(branched).not.toEqual(modified);
    });

    it('safe', () => {
        const original = p.number();
        const modified = original.safe();
        expect(modified).not.toEqual(original);
        const branched = modified.gte(0);
        expect(branched).not.toEqual(modified);
    });
});
