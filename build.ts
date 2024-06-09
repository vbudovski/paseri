import { build } from 'npm:esbuild';
import ts from 'npm:typescript';

await build({
    entryPoints: ['src/index.ts'],
    outfile: 'dist/index.js',
    format: 'esm',
    bundle: true,
    minify: false,
});

const options: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
    outFile: 'dist/index.d.ts',
    target: ts.ScriptTarget.ES2015,
};

const host = ts.createCompilerHost(options);
host.writeFile = async (fileName: string, contents: string) => {
    await Deno.writeTextFile(fileName, contents);
};

const program = ts.createProgram(['src/index.ts'], options, host);
program.emit();
