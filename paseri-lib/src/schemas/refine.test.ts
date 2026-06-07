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

it('invokes the predicate without a `this` receiver', () => {
    let observed: unknown = 'unset';
    const schema = p.number().refine(
        function (this: unknown, value) {
            observed = this;
            return value > 0;
        },
        { code: 'positive' },
    );
    schema.safeParse(1);
    expect(observed).toBeUndefined();
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

it('runs the predicate against a defaulted value, not the original undefined', () => {
    const schema = p
        .string()
        .optional()
        .default('x')
        .refine((value: string) => value.length > 3, { code: 'too_short' });
    const result = schema.safeParse(undefined);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('passes a defaulted value through when the predicate accepts it', () => {
    const schema = p
        .string()
        .optional()
        .default('xxxxx')
        .refine((value: string) => value.length > 3, { code: 'too_short' });
    const result = schema.safeParse(undefined);
    if (result.ok) {
        expect(result.value).toBe('xxxxx');
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('runs the predicate against a provided value over a default base', () => {
    const schema = p
        .string()
        .optional()
        .default('xxxxx')
        .refine((value: string) => value.length > 3, { code: 'too_short' });
    const result = schema.safeParse('ab');
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'too_short' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('runs the predicate against a stripped object, not the original', () => {
    const schema = p
        .object({ a: p.number() })
        .strip()
        .refine((value: { a: number }) => Object.keys(value).length === 1, { code: 'extra_keys' });
    const result = schema.safeParse({ a: 1, b: 2 });
    if (result.ok) {
        expect(result.value).toEqual({ a: 1 });
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('runs a refined array element predicate against the element default', () => {
    const schema = p.array(
        p
            .string()
            .optional()
            .default('xxxxx')
            .refine((value: string) => value.length > 3, { code: 'too_short' }),
    );
    const result = schema.safeParse([undefined]);
    if (result.ok) {
        expect(result.value).toEqual(['xxxxx']);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('fails a refined array element when the element default fails the predicate', () => {
    const schema = p.array(
        p
            .string()
            .optional()
            .default('x')
            .refine((value: string) => value.length > 3, { code: 'too_short' }),
    );
    const result = schema.safeParse([undefined]);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [0], message: 'too_short' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('rejects when a refine over a non-modifying array fails the predicate', () => {
    const schema = p.array(p.number()).refine((value: number[]) => value.length > 2, { code: 'too_few' });
    const result = schema.safeParse([1]);
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'too_few' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});

it('passes when a refine over a non-modifying array accepts the predicate', () => {
    const schema = p.array(p.number()).refine((value: number[]) => value.length > 2, { code: 'too_few' });
    const result = schema.safeParse([1, 2, 3]);
    if (result.ok) {
        expect(result.value).toEqual([1, 2, 3]);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('rejects when a refine over a non-modifying object fails the predicate', () => {
    const schema = p.object({ a: p.number() }).refine((value: { a: number }) => value.a > 5, { code: 'too_small' });
    const result = schema.safeParse({ a: 3 });
    if (!result.ok) {
        expect(result.messages()).toEqual([{ path: [], message: 'too_small' }]);
    } else {
        expect(result.ok).toBeFalsy();
    }
});
