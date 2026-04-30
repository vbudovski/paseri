import type { InternalParseResult } from '../result.ts';
import { Schema } from './schema.ts';

class OptionalSchema<OutputType> extends Schema<OutputType | undefined> {
    private readonly _schema: Schema<OutputType>;

    constructor(schema: Schema<OutputType>) {
        super();

        this._schema = schema;
    }
    protected _clone(): OptionalSchema<OutputType> {
        return new OptionalSchema(this._schema);
    }
    _parse(value: unknown): InternalParseResult<OutputType | undefined> {
        if (value === undefined) {
            return undefined;
        }

        return this._schema._parse(value);
    }
    override _isOptional(): boolean {
        return true;
    }
}

function optional<OutputType>(schema: Schema<OutputType>): Schema<OutputType | undefined> {
    return new OptionalSchema(schema);
}

export { OptionalSchema, optional };
