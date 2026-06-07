import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { RUNTIME_SOURCE } from './runtime.gen.ts';

describe('RUNTIME_SOURCE', () => {
    it('matches runtime.ts verbatim', async () => {
        // Guards against editing runtime.ts without re-running `deno task generate_runtime`.
        const source = await Deno.readTextFile(new URL('./runtime.ts', import.meta.url));
        expect(RUNTIME_SOURCE).toBe(source);
    });
});
