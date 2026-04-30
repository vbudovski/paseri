import path from 'node:path';
import { fileURLToPath } from 'node:url';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';
import { visualizer } from 'rollup-plugin-visualizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
const config: ReturnType<typeof defineConfig> = defineConfig({
    site: 'https://paseri.dev',
    integrations: [
        starlight({
            title: 'Paseri',
            customCss: ['./src/styles/custom.css'],
            social: [
                {
                    icon: 'github',
                    label: 'GitHub',
                    href: 'https://github.com/vbudovski/paseri',
                },
            ],
            sidebar: [
                {
                    label: 'About',
                    items: [
                        // Each item here is one entry in the navigation menu.
                        { label: 'Introduction', slug: 'guides/introduction' },
                        { label: 'Getting Started', slug: 'guides/getting-started' },
                        { label: 'Tutorial: Pokémon API', slug: 'guides/tutorial-pokemon-api' },
                    ],
                },
                {
                    label: 'Reference',
                    autogenerate: { directory: 'reference' },
                },
            ],
        }),
        preact(),
        sitemap(),
    ],
    markdown: {
        rehypePlugins: [
            [
                rehypeExternalLinks,
                {
                    content: { type: 'text', value: '\u00a0🔗' },
                },
            ],
        ],
    },
    vite: {
        resolve: {
            alias: {
                '@vbudovski/paseri/locales': path.resolve(__dirname, '../paseri-lib/src/locales/index.ts'),
                '@vbudovski/paseri': path.resolve(__dirname, '../paseri-lib/src/index.ts'),
            },
            // Dev-time SSR otherwise loads two `preact` instances (one via
            // `@astrojs/preact`'s renderer, one via the page's component
            // graph), so `preact/hooks` runs against a `currentComponent`
            // that was never set, blowing up with `Cannot read … '__H'`.
            dedupe: ['preact', '@preact/signals', '@preact/signals-core'],
        },
        server: {
            fs: {
                allow: [path.resolve(__dirname, '..')],
            },
        },
        plugins: [
            visualizer({
                filename: 'dist/stats.html',
                template: 'treemap',
                gzipSize: true,
                brotliSize: true,
            }),
            {
                // Deno's ESM loader can't resolve Astro's virtual `astro:*`
                // imports that survive into the prerender/SSR chunk, so we
                // inline the renderer there. During build we inline
                // everything; in dev we limit the list because forcing every
                // CJS dep through Vite's SSR transform breaks (e.g. `cookie`).
                name: 'inline-deps-for-deno-prerender',
                enforce: 'post',
                configEnvironment(name, _config, { command }) {
                    if (name === 'prerender' || name === 'ssr') {
                        return {
                            resolve: {
                                noExternal:
                                    command === 'build'
                                        ? true
                                        : [
                                              '@astrojs/preact',
                                              'preact',
                                              'preact/hooks',
                                              'preact/jsx-runtime',
                                              'preact-render-to-string',
                                              '@preact/signals',
                                              '@preact/signals-core',
                                          ],
                            },
                        };
                    }
                },
            },
        ],
    },
});

export default config;
