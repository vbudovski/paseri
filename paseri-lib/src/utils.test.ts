import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import fc from 'fast-check';
import { deepFreeze, isPlainObject } from './utils.ts';

describe('isPlainObject', () => {
    it('accepts plain objects', () => {
        fc.assert(
            fc.property(
                fc.oneof(fc.record({ key: fc.string() }), fc.constant(Object.create(null) as object)),
                (data) => {
                    expect(isPlainObject(data)).toBe(true);
                },
            ),
        );
    });

    it('rejects non-object types', () => {
        fc.assert(
            fc.property(
                fc
                    .anything({ withDate: true, withSet: true, withMap: true })
                    .filter((value) => typeof value !== 'object' || value === null || Array.isArray(value)),
                (data) => {
                    expect(isPlainObject(data)).toBe(false);
                },
            ),
        );
    });

    it('rejects objects with constructor set to undefined but non-null prototype', () => {
        const obj = Object.create({ injected: 'value' });
        obj.constructor = undefined;

        expect(isPlainObject(obj)).toBe(false);
    });

    it('rejects non-plain objects', () => {
        fc.assert(
            fc.property(
                fc.anything({ withDate: true, withSet: true, withMap: true }).filter((value) => {
                    if (typeof value !== 'object' || value === null) {
                        return false;
                    }
                    const prototype = Object.getPrototypeOf(value);
                    return prototype !== Object.prototype && prototype !== null;
                }),
                (data) => {
                    expect(isPlainObject(data)).toBe(false);
                },
            ),
        );
    });
});

describe('deepFreeze', () => {
    it('returns primitives unchanged', () => {
        expect(deepFreeze(42)).toBe(42);
        expect(deepFreeze('hi')).toBe('hi');
        expect(deepFreeze(true)).toBe(true);
        expect(deepFreeze(null)).toBe(null);
        expect(deepFreeze(undefined)).toBe(undefined);
    });

    it('freezes plain objects', () => {
        const obj = deepFreeze({ a: 1, b: 'x' });
        expect(Object.isFrozen(obj)).toBe(true);
    });

    it('freezes arrays', () => {
        const arr = deepFreeze([1, 2, 3]);
        expect(Object.isFrozen(arr)).toBe(true);
    });

    it('freezes every reachable object via property traversal', () => {
        fc.assert(
            fc.property(fc.anything(), (data) => {
                deepFreeze(data);
                const visited = new WeakSet<object>();
                function check(value: unknown): void {
                    if (value === null || typeof value !== 'object' || visited.has(value as object)) {
                        return;
                    }
                    visited.add(value as object);
                    expect(Object.isFrozen(value)).toBe(true);
                    for (const key of Reflect.ownKeys(value)) {
                        check((value as Record<PropertyKey, unknown>)[key]);
                    }
                }
                check(data);
            }),
        );
    });

    it('freezes symbol-keyed properties', () => {
        const tag = Symbol.for('tag');
        const inner = { value: 1 };
        const obj = { [tag]: inner };
        deepFreeze(obj);
        expect(Object.isFrozen(obj)).toBe(true);
        expect(Object.isFrozen(inner)).toBe(true);
    });

    it('handles cyclic references without infinite recursion', () => {
        const a: Record<string, unknown> = {};
        const b: Record<string, unknown> = {};
        a.ref = b;
        b.ref = a;
        expect(() => deepFreeze(a)).not.toThrow();
        expect(Object.isFrozen(a)).toBe(true);
        expect(Object.isFrozen(b)).toBe(true);
    });
});
