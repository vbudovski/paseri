import * as p from '@paseri/paseri';
import { z } from 'zod';
import { compile } from './_harness.ts';

const { bench } = Deno;

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
// `strict` turns a refusal into a throw. Left to itself `z.compile` hands back the schema
// uncompiled, which would benchmark the JIT parser a second time under a "compiled" label.
const zodCompiledSchema = z.compile(buildZodSchema(), { strict: true });

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
bench('Zod 4 (compiled)', { group: 'Object real-world (all fields, valid)' }, () => {
    zodCompiledSchema.safeParse(objectAllFields);
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
bench('Zod 4 (compiled)', { group: 'Object real-world (required only, valid)' }, () => {
    zodCompiledSchema.safeParse(objectRequiredOnly);
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
bench('Zod 4 (compiled)', { group: 'Object real-world (invalid)' }, () => {
    zodCompiledSchema.safeParse(objectInvalid);
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
