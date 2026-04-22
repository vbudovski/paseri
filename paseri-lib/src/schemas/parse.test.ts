import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import * as p from '../index.ts';

it('returns the parsed value on success', () => {
    const schema = p.string();
    const result = schema.parse('foo');
    expect(result).toBe('foo');
});

it('throws on failure', () => {
    const schema = p.string();
    expect(() => {
        schema.parse(123);
    }).toThrow('Failed to parse. See `e.messages()` for details.');
});
