import { issueCodes, type LeafNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class LazySchema<OutputType> extends Schema<OutputType> {
    private readonly _lazy: () => Schema<OutputType>;
    private _schema: Schema<OutputType> | undefined;

    private readonly issues = {
        TOO_DEEP: { type: 'leaf', code: issueCodes.TOO_DEEP },
    } as const satisfies Record<string, LeafNode>;

    constructor(lazy: () => Schema<OutputType>) {
        super();

        this._lazy = lazy;
    }
    protected _clone(): LazySchema<OutputType> {
        return this;
    }
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<OutputType> {
        // Evaluate the schema only once for the entire recursive structure.
        if (this._schema === undefined) {
            this._schema = this._lazy();
        }

        if (_depth >= _maxDepth) {
            return this.issues.TOO_DEEP;
        }

        return this._schema._parse(value, _depth + 1, _maxDepth);
    }
}

/**
 * [Lazy](https://paseri.dev/reference/schema/others/lazy/) schema.
 *
 * Recursion depth is capped by the `maxDepth` option on `safeParse` / `parse` (default `1000`).
 */
const lazy = /* @__PURE__ */ <OutputType>(
    ...args: ConstructorParameters<typeof LazySchema<OutputType>>
): LazySchema<OutputType> => new LazySchema(...args);

export { lazy };
