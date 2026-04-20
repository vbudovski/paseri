import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import fc from 'fast-check';
import { isPlainObject } from './utils.ts';

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
                    if (typeof value !== 'object' || value === null) return false;
                    const proto = Object.getPrototypeOf(value);
                    return proto !== Object.prototype && proto !== null;
                }),
                (data) => {
                    expect(isPlainObject(data)).toBe(false);
                },
            ),
        );
    });
});
