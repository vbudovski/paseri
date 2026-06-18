// Side-effect module: wraps `Schema.prototype.refine` and
// `Schema.prototype.chain` to capture the user's call-site URL on every
// refine/chain construction performed after this module is imported. The
// AOT compiler reads `_callSiteFile` off the resulting schemas to resolve
// the source file containing the user's predicate / transformer.
//
// Lives in `./introspect` (not `../schemas/schema.ts`) so that callers who
// never import introspect don't pay for the stack-trace capture.

import type { ParseResult } from '../result.ts';
import { type ChainSchema, type RefineSchema, Schema } from '../schemas/schema.ts';

// URL of this module itself — used to skip the wrapper's own stack frames
// when extracting the user's call site. Works for both local file://
// installs and JSR https:// URLs.
const SELF_URL = import.meta.url;

/**
 * Pulls the URL of the first stack frame outside this wrapper. Eager-parsed
 * at construction time so we can discard the Error itself and retain just a
 * short string per refine/chain schema. Returns undefined when the host
 * doesn't expose .stack (some embedded engines).
 *
 * The frame regex matches the suffix `URL:line:col[)]` and ignores the
 * prefix, so it works on both V8 ("    at fn (URL:L:C)" / "    at URL:L:C")
 * and SpiderMonkey / JavaScriptCore ("fn@URL:L:C" / "@URL:L:C") formats.
 */
function captureCallerFile(): string | undefined {
    const stack = new Error().stack;
    if (stack === undefined) {
        return undefined;
    }
    const framePattern = /([a-z][a-z+\-.]*:\/\/[^\s()]+|\/[^\s()]+):\d+:\d+\)?\s*$/i;
    for (const line of stack.split('\n')) {
        const match = framePattern.exec(line);
        if (match === null) {
            continue;
        }
        const file = match[1];
        if (file === SELF_URL) {
            continue;
        }
        return file;
    }
    return undefined;
}

const baseRefine = Schema.prototype.refine;
Schema.prototype.refine = function <OutputType>(
    this: Schema<OutputType>,
    predicate: (value: OutputType) => boolean,
    options: { code: string; path?: (string | number)[]; params?: Record<string, unknown> },
): RefineSchema<OutputType> {
    const callSiteFile = captureCallerFile();
    const result = baseRefine.call(this, predicate, options) as RefineSchema<OutputType>;
    result._callSiteFile = callSiteFile;
    return result;
};

const baseChain = Schema.prototype.chain;
Schema.prototype.chain = function <FromOutputType, ToOutputType>(
    this: Schema<FromOutputType>,
    schema: Schema<ToOutputType>,
    transformer: (value: FromOutputType) => ParseResult<ToOutputType>,
): Schema<ToOutputType> {
    const callSiteFile = captureCallerFile();
    const result = baseChain.call(this, schema, transformer) as ChainSchema<FromOutputType, ToOutputType>;
    result._callSiteFile = callSiteFile;
    return result;
};
