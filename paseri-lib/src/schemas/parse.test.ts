import { expect } from '@std/expect';
import * as p from '../index.ts';

const { test } = Deno;

test('Success', () => {
    const schema = p.string();
    const result = schema.parse('foo');
    expect(result).toBe('foo');
});

test('Failure', () => {
    const schema = p.string();
    expect(() => {
        schema.parse(123);
    }).toThrow('Failed to parse {"type":"leaf","code":"invalid_type"}.');
});
