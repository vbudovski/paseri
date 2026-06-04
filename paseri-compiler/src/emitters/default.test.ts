import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { object, string } from '@vbudovski/paseri';
import '@vbudovski/paseri/introspect';
import { toSource } from '../toSource.ts';

describe('emitDefault', () => {
    it('emits return-sink default substitution', () => {
        const source = toSource(string().optional().default('fallback').toIR(), { name: 'Test' });
        expect(source).toContain('value === undefined');
        expect(source).toContain('_default0');
        expect(source).toContain('"fallback"');
    });

    it('emits return-sink default with object-typed default', () => {
        const source = toSource(object({ a: string() }).optional().default({ a: 'preset' }).toIR(), { name: 'Test' });
        expect(source).toContain('value === undefined');
        expect(source).toContain('_default0');
        expect(source).toContain('a: "preset"');
    });
});
