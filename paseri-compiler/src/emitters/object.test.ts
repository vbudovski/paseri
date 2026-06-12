import { literal, number, object, string, union } from '@paseri/paseri';
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

    it('outlines a nested non-modifying object into a hoisted issues-helper', () => {
        const source = toSource(object({ nested: object({ id: string(), age: number() }) }).toIR(), {
            name: 'Test',
        });
        expect(/function _objectIssues\d+\(_val\d+: unknown\): TreeNode \| undefined/.test(source)).toBe(true);
    });

    it('deduplicates structurally-identical nested objects to one helper', () => {
        const source = toSource(
            object({
                home: object({ street: string(), city: string() }),
                work: object({ street: string(), city: string() }),
            }).toIR(),
            { name: 'Test' },
        );
        const helperCount = (source.match(/function _objectIssues\d+/g) ?? []).length;
        expect(helperCount).toBe(1);
    });

    it('keeps a nested object with a default inline (the helper cannot carry modifications)', () => {
        const source = toSource(object({ nested: object({ lang: string().optional().default('en') }) }).toIR(), {
            name: 'Test',
        });
        expect(source).not.toContain('_objectIssues');
    });

    it('outlines the members of a top-level discriminated union', () => {
        const source = toSource(
            union(
                object({ kind: literal('a'), value: string() }),
                object({ kind: literal('b'), value: number() }),
            ).toIR(),
            { name: 'Test' },
        );
        const helperCount = (source.match(/function _objectIssues\d+/g) ?? []).length;
        expect(helperCount).toBe(2);
    });
});
