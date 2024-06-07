import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'Schema Validator',
            fileName: 'schema-validator',
            formats: ['es'],
        },
    },
});
