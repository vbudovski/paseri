import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';

// https://astro.build/config
export default defineConfig({
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
        react(),
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
});
