// Writes the committed fixtures in `src/generated-fixtures/`: one `<name>.gen.ts` per matrix entry plus the
// `index.gen.ts` barrel. Run `deno task generate_fixtures` after changing the emitters or the matrix; the test
// asserts the committed output stays byte-identical, so skipping this fails CI. Mirrors `bin/generate_runtime.ts`.

import { barrelSource, fixtureSource, MATRIX } from '../src/generated-fixtures/matrix.ts';

const directory = new URL('../src/generated-fixtures/', import.meta.url);

for (const entry of MATRIX) {
    await Deno.writeTextFile(new URL(`${entry.name}.gen.ts`, directory), fixtureSource(entry));
}
await Deno.writeTextFile(new URL('index.gen.ts', directory), barrelSource());

console.log(`Wrote ${MATRIX.length} fixtures + barrel to ${directory.pathname}`);
