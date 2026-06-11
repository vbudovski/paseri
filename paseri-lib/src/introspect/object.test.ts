import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { number } from '../schemas/number.ts';
import { object } from '../schemas/object.ts';
import { string } from '../schemas/string.ts';
import './index.ts';

describe('object', () => {
    it('emits each field with the default strict mode', () => {
        const schema = object({ id: string(), age: number() });
        expect(schema.toIR()).toEqual({
            entry: {
                kind: 'object',
                fields: {
                    id: { kind: 'string', checks: [] },
                    age: { kind: 'number', checks: [] },
                },
                mode: 'strict',
            },
            named: {},
            cycles: [],
        });
    });

    it('preserves declaration order of fields', () => {
        const schema = object({ z: string(), a: string(), m: string() });
        const ir = schema.toIR().entry;
        if (ir.kind !== 'object') {
            throw new Error('expected object IR');
        }
        expect(Object.keys(ir.fields)).toEqual(['z', 'a', 'm']);
    });

    it('reflects strip mode', () => {
        expect(object({ id: string() }).strip().toIR().entry).toEqual({
            kind: 'object',
            fields: { id: { kind: 'string', checks: [] } },
            mode: 'strip',
        });
    });

    it('reflects strict mode when called explicitly', () => {
        expect(object({ id: string() }).strip().strict().toIR().entry).toEqual({
            kind: 'object',
            fields: { id: { kind: 'string', checks: [] } },
            mode: 'strict',
        });
    });

    it('reflects passthrough mode', () => {
        expect(object({ id: string() }).passthrough().toIR().entry).toEqual({
            kind: 'object',
            fields: { id: { kind: 'string', checks: [] } },
            mode: 'passthrough',
        });
    });
});
