import { expect } from '@std/expect';
import * as p from '../index.ts';

const { test } = Deno;

test('Parse fail', () => {
    const schema = p.string();
    expect(() => {
        schema.parse(123);
    }).toThrow('Failed to parse {"type":"leaf","code":"invalid_type"}.');
});

test('Safe parse fail', () => {
    const schema = p.string();
    const result = schema.safeParse(123);
    if (!result.ok) {
        expect(result.issue).toEqual({ type: 'leaf', code: 'invalid_type' });
    } else {
        expect(result.ok).toBeFalsy();
    }
});
