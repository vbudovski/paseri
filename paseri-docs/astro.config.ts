import path from 'node:path';
import { fileURLToPath } from 'node:url';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';

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
        preact({ compat: true }),
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
        },
        server: {
            fs: {
                allow: [path.resolve(__dirname, '..')],
            },
        },
        plugins: [
            {
                name: 'force-noexternal-prerender',
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
                                              'react',
                                              'react-dom',
                                              'react-dom/test-utils',
                                              'react/jsx-runtime',
                                              /^@lexical\//,
                                              'lexical',
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
