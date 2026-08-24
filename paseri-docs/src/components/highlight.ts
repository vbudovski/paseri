import { parse, render } from 'sugar-high/core';
import * as javascript from 'sugar-high/lang/javascript';

// The `sugar-high` entry point pulls in tokenizers for all 25 languages, so
// compose the highlighter from `core` plus the one we need. The imports live
// here rather than in the editor so they stay static and collapse into one
// lazily loaded chunk instead of three.
//
// `javascript`, not `typescript`: the editors hold expressions, and the
// typescript tokenizer demotes `property` to `identifier` for member names that
// collide with type keywords, recolouring every `p.string()`.
function highlight(code: string): string {
    return render(parse(code, javascript));
}

export { highlight };
