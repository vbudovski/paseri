// Embeds the verbatim text of `src/runtime.ts` into `src/runtime.gen.ts` as a string constant, so the runtime
// helper source travels with the published module. `toSource.ts` cannot read `runtime.ts` off `import.meta.url` at
// runtime — that breaks when the package is loaded from a remote JSR URL — so the source is baked in here instead.
// Run `deno task generate_runtime` after editing `runtime.ts`.

const inputUrl = new URL('../src/runtime.ts', import.meta.url);
const outputUrl = new URL('../src/runtime.gen.ts', import.meta.url);

const source = await Deno.readTextFile(inputUrl);

// Escape the source so it survives as a template literal verbatim: backslashes first, then backticks and the
// `${` interpolation opener. Decoding the literal reproduces `source` exactly (asserted by `runtime.gen.test.ts`).
const escaped = source.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const generated = `// @generated from runtime.ts by \`deno task generate_runtime\`. Do not edit by hand.

const RUNTIME_SOURCE = \`${escaped}\`;

export { RUNTIME_SOURCE };
`;

await Deno.writeTextFile(outputUrl, generated);

console.log(`Wrote ${outputUrl.pathname}`);
