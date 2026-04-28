import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import * as p from '../index.ts';
import { en } from '../locales/en.ts';

describe('Standard Schema', () => {
    const schema = p.string();

    it('parses valid', () => {
        const result = schema['~standard'].validate('foo');
        expect(result).toEqual({ value: 'foo' });
    });

    it('parses invalid without locale, returns raw issue codes', () => {
        const result = schema['~standard'].validate(123);
        expect(result).toEqual({ issues: [{ path: [], message: 'invalid_type' }] });
    });

    it('parses invalid with locale, returns localized messages', () => {
        const result = schema['~standard'].validate(123, { libraryOptions: { locale: en } });
        expect(result).toEqual({ issues: [{ path: [], message: 'Invalid type. Expected string.' }] });
    });
});
