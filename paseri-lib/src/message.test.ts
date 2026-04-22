import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import * as p from './index.ts';

it('throws when locale is missing a message for a custom code', () => {
    const schema = p.string().chain(p.string(), () => p.err('custom_code'));
    const result = schema.safeParse('hello');
    if (!result.ok) {
        expect(() => result.messages()).toThrow('No message for code custom_code.');
    }
});
