import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import fc from 'fast-check';
import { encodeVirtualId, isVirtualId, parseVirtualId } from './virtual.ts';

describe('encodeVirtualId', () => {
    it('produces the documented `paseri-schema:<file>?name=<name>` shape', () => {
        expect(encodeVirtualId('/abs/user.schema.ts', 'User')).toBe('paseri-schema:/abs/user.schema.ts?name=User');
    });

    it('percent-encodes the export name so it cannot collide with the delimiter', () => {
        // encodeURIComponent maps `?` -> %3F and `=` -> %3D, so an encoded name can never
        // contain a literal `?name=`.
        expect(encodeVirtualId('/x.schema.ts', 'a?name=b')).toBe('paseri-schema:/x.schema.ts?name=a%3Fname%3Db');
    });
});

describe('encode/parse round-trip', () => {
    it('recovers the file and name from any encoded id', () => {
        fc.assert(
            fc.property(fc.string(), fc.string(), (file, name) => {
                expect(parseVirtualId(encodeVirtualId(file, name))).toEqual({ file, name });
            }),
            // fc.string() effectively never generates a literal `?name=`, so the two delimiter
            // cases are seeded explicitly: one in the file path (recovery must split at the LAST
            // occurrence), one in the name (which encodeVirtualId percent-encodes).
            {
                examples: [
                    ['/abs/weird?name=oops.schema.ts', 'User'],
                    ['/x.schema.ts', 'a?name=b'],
                ],
            },
        );
    });
});

describe('isVirtualId', () => {
    it('recognises every encoded id', () => {
        fc.assert(
            fc.property(fc.string(), fc.string(), (file, name) => {
                expect(isVirtualId(encodeVirtualId(file, name))).toBe(true);
            }),
        );
    });

    it('is false for a plain `.schema.ts` module id', () => {
        expect(isVirtualId('/abs/path/user.schema.ts')).toBe(false);
    });

    it("is false for another plugin's `\0` virtual id", () => {
        expect(isVirtualId('\0other-plugin:thing')).toBe(false);
    });
});
