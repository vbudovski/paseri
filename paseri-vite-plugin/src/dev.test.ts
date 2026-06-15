import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { type Alias, createLogger, createServer, type Logger } from 'vite';
import { paseri } from './index.ts';

const lib = (rel: string): string => new URL(`../../paseri-lib/src/${rel}`, import.meta.url).pathname;
const alias: Alias[] = [
    { find: /^@paseri\/paseri\/internal$/, replacement: lib('internal/index.ts') },
    { find: /^@paseri\/paseri\/introspect$/, replacement: lib('introspect/index.ts') },
    { find: /^@paseri\/paseri$/, replacement: lib('index.ts') },
];
const root = new URL('../test-fixture/', import.meta.url).pathname;

async function devTransform(requestId: string) {
    const warn = spy((_message: string): void => {});
    const customLogger: Logger = { ...createLogger('silent'), warn };
    const server = await createServer({
        root,
        configFile: false,
        logLevel: 'silent',
        customLogger,
        resolve: { alias },
        plugins: [paseri()],
        // middlewareMode + hmr:false avoids binding an HMR WebSocket (no localhost DNS,
        // so no net permission needed); transformRequest doesn't need it.
        server: { middlewareMode: true, hmr: false },
    });
    try {
        const result = await server.transformRequest(requestId);
        return { code: result?.code, warn };
    } finally {
        await server.close();
    }
}

describe('vite dev (serve)', () => {
    it('serves the real schema unchanged — transparent, no AOT replacement', async () => {
        const { code, warn } = await devTransform('/user.schema.ts');
        expect(code).toBeDefined();
        // The runtime schema runs in dev; it is NOT swapped for the generated validator.
        expect(code).not.toContain('safeParseUser');
        // A valid schema compiles cleanly in the background check — no warning.
        assertSpyCalls(warn, 0);
    });

    it('warns when a .schema.ts will not AOT-compile', async () => {
        const { warn } = await devTransform('/noexport.schema.ts');
        assertSpyCalls(warn, 1);
        expect(warn.calls[0].args[0]).toContain('noexport.schema.ts');
    });
});
