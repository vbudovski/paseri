import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class LazySchema<OutputType> extends Schema<OutputType> {
    private readonly _lazy: () => Schema<OutputType>;
    private _schema: Schema<OutputType> | undefined;

    constructor(lazy: () => Schema<OutputType>) {
        super();

        this._lazy = lazy;
    }
    protected _clone(): LazySchema<OutputType> {
        return this;
    }
    _parse(value: unknown): InternalParseResult<OutputType> {
        // Evaluate the schema only once for the entire recursive structure.
        if (this._schema === undefined) {
            this._schema = this._lazy();
        }

        return this._schema._parse(value);
    }
}

function lazy<OutputType>(...args: ConstructorParameters<typeof LazySchema<OutputType>>): LazySchema<OutputType> {
    return new LazySchema(...args);
}

export { lazy };
