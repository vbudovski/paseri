import * as p from '@paseri/paseri';
import { z } from 'zod';
import { compile } from './_harness.ts';

const { bench } = Deno;

type Comment = { author: string; body: string; reply?: Comment | undefined };

const commentSchema: p.Schema<Comment> = p.lazy(() =>
    p.object({
        author: p.string().min(1).max(50),
        body: p.string().min(1).max(1000),
        reply: commentSchema.optional(),
    }),
);

const objectSchema = p.object({
    username: p.string().min(3).max(20),
    email: p.string().email(),
    age: p.number().gte(13).lte(120).int(),
    isActive: p.boolean(),
    createdAt: p.date(),
    displayName: p.string().min(1).max(100).optional(),
    bio: p.string().max(500).optional(),
    deletedAt: p.date().nullable(),
    role: p.union(p.literal('admin'), p.literal('user'), p.literal('guest')),
    tags: p.array(p.string().min(1).max(30)).min(1).max(10),
    coordinates: p.tuple(p.number(), p.number()),
    metadata: p.record(p.string()),
    externalId: p.bigint().gte(0n).lte(9999999999999999n),
    permissions: p.set(p.string()).min(1).max(20),
    featureFlags: p.map(p.string(), p.boolean()),
    pinnedComment: p.lazy(() => commentSchema),
    address: p.object({
        street: p.string().min(1).max(200),
        city: p.string().min(1).max(100),
        zip: p.string().min(3).max(10),
        country: p.string().length(2),
    }),
    settings: p.object({
        theme: p.string(),
        fontSize: p.number().gte(8).lte(72).int(),
        notifications: p.boolean(),
    }),
});

function buildZodSchema(jitless = false) {
    z.config({ jitless });
    try {
        const commentSchema: z.ZodType<Comment> = z.lazy(() =>
            z.strictObject({
                author: z.string().min(1).max(50),
                body: z.string().min(1).max(1000),
                reply: commentSchema.optional(),
            }),
        );
        return z.strictObject({
            username: z.string().min(3).max(20),
            email: z.email(),
            age: z.number().gte(13).lte(120).int(),
            isActive: z.boolean(),
            createdAt: z.date(),
            displayName: z.string().min(1).max(100).optional(),
            bio: z.string().max(500).optional(),
            deletedAt: z.date().nullable(),
            role: z.union([z.literal('admin'), z.literal('user'), z.literal('guest')]),
            tags: z.array(z.string().min(1).max(30)).min(1).max(10),
            coordinates: z.tuple([z.number(), z.number()]),
            metadata: z.record(z.string(), z.string()),
            externalId: z.bigint().gte(0n).lte(9999999999999999n),
            permissions: z.set(z.string()).min(1).max(20),
            featureFlags: z.map(z.string(), z.boolean()),
            pinnedComment: z.lazy(() => commentSchema),
            address: z.strictObject({
                street: z.string().min(1).max(200),
                city: z.string().min(1).max(100),
                zip: z.string().min(3).max(10),
                country: z.string().length(2),
            }),
            settings: z.strictObject({
                theme: z.string(),
                fontSize: z.number().gte(8).lte(72).int(),
                notifications: z.boolean(),
            }),
        });
    } finally {
        z.config({ jitless: false });
    }
}

const zodJitSchema = buildZodSchema();
const zodSchema = buildZodSchema(true);

const objectAllFields = {
    username: 'yuki_tanaka',
    email: 'yuki@example.jp',
    age: 31,
    isActive: true,
    createdAt: new Date('2024-03-20'),
    displayName: 'Yuki Tanaka',
    bio: 'Backend engineer based in Tokyo. Loves Deno and fermented foods.',
    deletedAt: null,
    role: 'admin',
    tags: ['typescript', 'rust', 'kubernetes'],
    coordinates: [35.6762, 139.6503],
    metadata: { source: 'oauth', locale: 'ja-JP' },
    externalId: 482910573648201n,
    permissions: new Set(['read', 'write', 'deploy']),
    featureFlags: new Map<string, boolean>([
        ['darkMode', true],
        ['experimentalEditor', false],
    ]),
    pinnedComment: {
        author: 'Priya',
        body: 'Welcome to the team!',
        reply: { author: 'Yuki Tanaka', body: 'Thanks, happy to be here!' },
    },
    address: { street: '4-2-8 Shibuya', city: 'Tokyo', zip: '150-0002', country: 'JP' },
    settings: { theme: 'dark', fontSize: 14, notifications: true },
};

const objectRequiredOnly = {
    username: 'anabela_r',
    email: 'anabela@exemplo.pt',
    age: 42,
    isActive: false,
    createdAt: new Date('2023-11-05'),
    deletedAt: null,
    role: 'guest',
    tags: ['python'],
    coordinates: [38.7223, -9.1393],
    metadata: {},
    externalId: 7730019284n,
    permissions: new Set(['read']),
    featureFlags: new Map<string, boolean>(),
    pinnedComment: { author: 'Anabela', body: 'Just browsing.' },
    address: { street: 'Rua Augusta 27', city: 'Lisboa', zip: '1100-048', country: 'PT' },
    settings: { theme: 'light', fontSize: 18, notifications: false },
};

const objectInvalid = {
    username: 'mx',
    email: 'not-an-email',
    age: 10.5,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    deletedAt: null,
    role: 'superadmin',
    tags: [],
    coordinates: [-33.8688, 151.2093],
    metadata: { source: 'cli' },
    externalId: -1n,
    permissions: new Set<string>(),
    featureFlags: new Map<string, boolean>([['beta', true]]),
    pinnedComment: { author: '', body: '' },
    address: { street: '', city: '', zip: 'x', country: 'AUS' },
    settings: { theme: 'solarized', fontSize: 4, notifications: true },
};

const stringSchema = p.string().min(5).max(50).email().endsWith('@gmail.com');
const stringValid = 'foo@gmail.com';
const stringInvalid = 'bar@example.test';

const numberSchema = p.number().gte(18).lte(99).int();
const numberValid = 19;
const numberInvalid = 30.9;

const compiledObject = await compile(objectSchema, 'RealWorld');
const compiledString = await compile(stringSchema, 'RealWorldString');
const compiledNumber = await compile(numberSchema, 'RealWorldNumber');

bench('Paseri', { group: 'Object real-world (all fields, valid)', baseline: true }, () => {
    objectSchema.safeParse(objectAllFields);
});
bench('Paseri (AOT)', { group: 'Object real-world (all fields, valid)' }, () => {
    compiledObject(objectAllFields);
});
bench('Zod 4 (JIT)', { group: 'Object real-world (all fields, valid)' }, () => {
    zodJitSchema.safeParse(objectAllFields);
});
bench('Zod 4', { group: 'Object real-world (all fields, valid)' }, () => {
    zodSchema.safeParse(objectAllFields);
});

bench('Paseri', { group: 'Object real-world (required only, valid)', baseline: true }, () => {
    objectSchema.safeParse(objectRequiredOnly);
});
bench('Paseri (AOT)', { group: 'Object real-world (required only, valid)' }, () => {
    compiledObject(objectRequiredOnly);
});
bench('Zod 4 (JIT)', { group: 'Object real-world (required only, valid)' }, () => {
    zodJitSchema.safeParse(objectRequiredOnly);
});
bench('Zod 4', { group: 'Object real-world (required only, valid)' }, () => {
    zodSchema.safeParse(objectRequiredOnly);
});

bench('Paseri', { group: 'Object real-world (invalid)', baseline: true }, () => {
    objectSchema.safeParse(objectInvalid);
});
bench('Paseri (AOT)', { group: 'Object real-world (invalid)' }, () => {
    compiledObject(objectInvalid);
});
bench('Zod 4 (JIT)', { group: 'Object real-world (invalid)' }, () => {
    zodJitSchema.safeParse(objectInvalid);
});
bench('Zod 4', { group: 'Object real-world (invalid)' }, () => {
    zodSchema.safeParse(objectInvalid);
});

bench('Paseri', { group: 'String real-world (valid)', baseline: true }, () => {
    stringSchema.safeParse(stringValid);
});
bench('Paseri (AOT)', { group: 'String real-world (valid)' }, () => {
    compiledString(stringValid);
});

bench('Paseri', { group: 'String real-world (invalid)', baseline: true }, () => {
    stringSchema.safeParse(stringInvalid);
});
bench('Paseri (AOT)', { group: 'String real-world (invalid)' }, () => {
    compiledString(stringInvalid);
});

bench('Paseri', { group: 'Number real-world (valid)', baseline: true }, () => {
    numberSchema.safeParse(numberValid);
});
bench('Paseri (AOT)', { group: 'Number real-world (valid)' }, () => {
    compiledNumber(numberValid);
});

bench('Paseri', { group: 'Number real-world (invalid)', baseline: true }, () => {
    numberSchema.safeParse(numberInvalid);
});
bench('Paseri (AOT)', { group: 'Number real-world (invalid)' }, () => {
    compiledNumber(numberInvalid);
});
