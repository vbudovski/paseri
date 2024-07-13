import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';

// https://astro.build/config
export default defineConfig({
    integrations: [
        starlight({
            title: 'Paseri',
            customCss: ['./src/styles/custom.css'],
            social: {
                github: 'https://github.com/vbudovski/paseri',
            },
            sidebar: [
                {
                    label: 'About',
                    items: [
                        // Each item here is one entry in the navigation menu.
                        { label: 'Introduction', slug: 'guides/introduction' },
                        { label: 'Getting Started', slug: 'guides/getting-started' },
                    ],
                },
                {
                    label: 'Reference',
                    autogenerate: { directory: 'reference' },
                },
            ],
        }),
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
