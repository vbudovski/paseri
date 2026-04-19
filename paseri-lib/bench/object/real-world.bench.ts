import * as p from '../../src/index.ts';

const { bench } = Deno;

type Comment = { author: string; body: string; reply?: Comment };

const commentSchema: p.Schema<Comment> = p.lazy(() =>
    p.object({
        author: p.string().min(1).max(50),
        body: p.string().min(1).max(1000),
        reply: commentSchema.optional(),
    }),
);

const schema = p.object({
    // Primitives with refinements.
    username: p.string().min(3).max(20),
    email: p.string().email(),
    age: p.number().gte(13).lte(120).int(),
    isActive: p.boolean(),
    createdAt: p.date(),
    // Optional fields.
    displayName: p.string().min(1).max(100).optional(),
    bio: p.string().max(500).optional(),
    deletedAt: p.date().nullable(),
    // Literal and union.
    role: p.union(p.literal('admin'), p.literal('user'), p.literal('guest')),
    // Array with element validation and length constraint.
    tags: p.array(p.string().min(1).max(30)).min(1).max(10),
    // Tuple.
    coordinates: p.tuple(p.number(), p.number()),
    // Record.
    metadata: p.record(p.string()),
    // BigInt with refinements.
    externalId: p.bigint().gte(0n).lte(9999999999999999n),
    // Set with size constraint.
    permissions: p.set(p.string()).min(1).max(20),
    // Map with key/value validation.
    featureFlags: p.map(p.string(), p.boolean()),
    // Lazy (deferred schema evaluation).
    pinnedComment: p.lazy(() => commentSchema),
    // Nested objects.
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

const dataAllFields = {
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
    address: {
        street: '4-2-8 Shibuya',
        city: 'Tokyo',
        zip: '150-0002',
        country: 'JP',
    },
    settings: {
        theme: 'dark',
        fontSize: 14,
        notifications: true,
    },
};

const dataRequiredOnly = {
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
    address: {
        street: 'Rua Augusta 27',
        city: 'Lisboa',
        zip: '1100-048',
        country: 'PT',
    },
    settings: {
        theme: 'light',
        fontSize: 18,
        notifications: false,
    },
};

const dataInvalidNested = {
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
    address: {
        street: '',
        city: '',
        zip: 'x',
        country: 'AUS',
    },
    settings: {
        theme: 'solarized',
        fontSize: 4,
        notifications: true,
    },
};

bench('All fields (valid)', () => {
    schema.safeParse(dataAllFields);
});

bench('Required only (valid)', () => {
    schema.safeParse(dataRequiredOnly);
});

bench('Invalid nested', () => {
    schema.safeParse(dataInvalidNested);
});
