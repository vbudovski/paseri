import { number, object, string } from '@paseri/paseri';
import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import '@paseri/paseri/introspect';
import { toSource } from '../toSource.ts';

describe('emitObject', () => {
    it('emits required-field strict-mode validators', () => {
        const source = toSource(object({ id: string(), age: number() }).toIR(), { name: 'Test' });
        expect(source).toContain('"id"');
        expect(source).toContain('"age"');
        expect(source).toContain('issueCodes.UNRECOGNIZED_KEY');
    });

    it('emits strip-mode sanitized output', () => {
        const source = toSource(object({ id: string() }).strip().toIR(), { name: 'Test' });
        expect(source).toContain('_sanitized');
    });

    it('emits passthrough-mode output preserving extras', () => {
        const source = toSource(object({ a: string(), b: string(), c: string() }).passthrough().toIR(), {
            name: 'Test',
        });
        expect(source).not.toContain('issueCodes.UNRECOGNIZED_KEY');
    });

    it('emits optional-field iteration', () => {
        const source = toSource(object({ id: string(), age: number().optional() }).toIR(), { name: 'Test' });
        // Optional field is not emitted as missing_value; only the required `id` is.
        const missingValueCount = (source.match(/issueCodes\.MISSING_VALUE/g) ?? []).length;
        expect(missingValueCount).toBe(1);
    });

    it('emits in-object default substitution', () => {
        const source = toSource(object({ id: string(), count: number().optional().default(0) }).toIR(), {
            name: 'Test',
        });
        expect(source).toContain('_default0');
    });
});
