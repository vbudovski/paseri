import { dirname, fromFileUrl, resolve } from '@std/path';
import { tsPlugin } from '@sveltejs/acorn-typescript';
import { regexTransformPlugin } from '@vbudovski/rollup-plugin-transform-regex';
import { Parser } from 'acorn';
import type { TransformPluginContext } from 'rollup';

const TsParser = Parser.extend(tsPlugin());

const plugin = regexTransformPlugin({ optimize: false, removeImport: true });

const context = {
    parse(code: string): unknown {
        return TsParser.parse(code, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            locations: true,
        });
    },
};

const __dirname = dirname(fromFileUrl(import.meta.url));
const inputPath = resolve(__dirname, 'regex.source.ts');
const outputPath = resolve(__dirname, '..', 'src', 'schemas', 'regex.gen.ts');

async function generateRegexModule(): Promise<string> {
    const source = await Deno.readTextFile(inputPath);

    const { transform } = plugin;
    if (typeof transform !== 'function') {
        throw new Error('regexTransformPlugin.transform is not a function');
    }

    const result = await transform.call(context as TransformPluginContext, source, inputPath);
    if (!result || typeof result !== 'object' || typeof result.code !== 'string') {
        throw new Error('regexTransformPlugin.transform returned no code');
    }

    return result.code;
}

if (import.meta.main) {
    await Deno.writeTextFile(outputPath, await generateRegexModule());
    console.log(`Wrote ${outputPath}`);
}

export { generateRegexModule };
