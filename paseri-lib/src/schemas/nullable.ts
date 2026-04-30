import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class NullableSchema<OutputType> extends Schema<OutputType | null> {
    private readonly _schema: Schema<OutputType>;

    constructor(schema: Schema<OutputType>) {
        super();

        this._schema = schema;
    }
    protected _clone(): NullableSchema<OutputType> {
        return new NullableSchema(this._schema);
    }
    _parse(value: unknown): InternalParseResult<OutputType | null> {
        if (value === null) {
            return undefined;
        }

        return this._schema._parse(value);
    }
    override _isOptional(): boolean {
        return this._schema._isOptional();
    }
}

function nullable<OutputType>(schema: Schema<OutputType>): Schema<OutputType | null> {
    return new NullableSchema(schema);
}

export { nullable };
