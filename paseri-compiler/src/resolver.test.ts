import { expect } from '@std/expect';
import { it } from '@std/testing/bdd';
import * as p from '@vbudovski/paseri';
import './aot-shadow.ts';

// Helpers live at top level so the resolver finds them when it scans this file as the refine call site. Each exercises
// a way the resolver can mis-resolve a callback's free identifiers and emit a validator that diverges from the runtime.

// H7: the matched helper is one declarator of a multi-declarator `const` whose sibling references another top-level
// binding. The whole statement is hoisted, so the sibling's dependency must be resolved too.
const H7_NEEDED = 7;
// biome-ignore lint/correctness/noUnusedVariables: the sibling must reference H7_NEEDED without being referenced by h7Helper, to exercise the multi-declarator resolver gap.
const h7Sibling = H7_NEEDED,
    h7Helper = (value: number): boolean => value > 0;

// H8: a helper whose parameter destructures with a default referencing a top-level binding.
const H8_FALLBACK = 3;
const h8Helper = ({ limit = H8_FALLBACK }: { limit?: number }): boolean => limit > 0;

// H9: a captured binding whose name collides with one the generated module reserves (the `addIssue` runtime import).
const addIssue = 5;

it('resolves a free identifier from a sibling declarator of a multi-declarator const', () => {
    const schema = p.number().refine((value) => h7Helper(value), { code: 'h7' });
    const result = schema.safeParse(5);
    if (result.ok) {
        expect(result.value).toBe(5);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('resolves a destructuring-default identifier in a hoisted helper', () => {
    const schema = p.number().refine(() => h8Helper({}), { code: 'h8' });
    const result = schema.safeParse(5);
    if (result.ok) {
        expect(result.value).toBe(5);
    } else {
        expect(result.ok).toBeTruthy();
    }
});

it('does not emit broken code when a captured identifier collides with a reserved name', () => {
    const schema = p.number().refine((value) => value > addIssue, { code: 'h9' });
    const result = schema.safeParse(6);
    if (result.ok) {
        expect(result.value).toBe(6);
    } else {
        expect(result.ok).toBeTruthy();
    }
});
