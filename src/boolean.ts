import { Schema, type ValidationError } from './schema.ts';

class BooleanSchema extends Schema<boolean> {
    override _parse(value: unknown): ValidationError[] {
        if (typeof value !== 'boolean') {
            return [{ path: [], message: 'Not a boolean.' }];
        }

        return super._parse(value);
    }
}

function boolean() {
    return new BooleanSchema();
}

export { boolean };
