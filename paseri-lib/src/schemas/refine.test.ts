import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { expectTypeOf } from 'expect-type';
import * as p from '../index.ts';
import { en } from '../locales/index.ts';

it('passes the value through when the predicate returns true', () => {
    const schema = p.string().refine(() => true, { code: 'never_fires' });
    const result = schema.safeParse('hello');
    if (result.ok) {
        expectTypeOf(result.value).toEqualTypeOf<string>;
        expect(result.value).toBe('hello');
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('emits the issue at the root path by default', () => {
    const schema = p.string().refine(() => false, { code: 'fails' });
    const result = schema.safeParse('hello');
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'fails' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('emits the issue at the configured path, preserving string and number segments', () => {
    const schema = p.string().refine(() => false, { code: 'fails', path: ['items', 3, 'zip'] });
    const result = schema.safeParse('hello');
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: ['items', 3, 'zip'], message: 'fails' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('short-circuits chained refines after the first failure', () => {
    const outerPredicate = spy(() => true);
    const schema = p
        .string()
        .refine(() => false, { code: 'inner_fails' })
        .refine(outerPredicate, { code: 'outer_never_runs' });
    const result = schema.safeParse('hello');
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'inner_fails' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
    assertSpyCalls(outerPredicate, 0);
});

it('renders a custom code via a registered locale entry', () => {
    const schema = p.number().refine((n) => n >= 18, {
        code: 'age_below_min',
        params: { min: 18 },
    });
    const locale = {
        ...en,
        age_below_min: (placeholders: { params?: Record<string, unknown> }) =>
            `Must be at least ${placeholders.params?.min as number} years old.`,
    };
    const result = schema.safeParse(10);
    if (!result.ok) {
        expect(result.messages(locale)).toEqual([{ path: [], message: 'Must be at least 18 years old.' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('allows a refined optional field to be omitted', () => {
    const schema = p.object({
        email: p
            .string()
            .optional()
            .refine(() => true, { code: 'unused' }),
    });
    const result = schema.safeParse({});
    if (result.ok) {
        expect(result.value).toEqual({});
    } else {
        expect(result.ok).toBeTruthy();
    }
});
