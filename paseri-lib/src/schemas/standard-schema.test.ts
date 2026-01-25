import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import * as p from '../index.ts';

describe('Standard Schema', () => {
    const schema = p.string();

    it('parses valid', () => {
        const result = schema['~standard'].validate('foo');
        expect(result).toEqual({ value: 'foo' });
    });

    it('parses invalid', () => {
        const result = schema['~standard'].validate(123);
        expect(result).toEqual({ issues: [{ path: [], message: 'Invalid type. Expected string.' }] });
    });
});
