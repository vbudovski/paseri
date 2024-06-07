import { Schema, type ValidationError } from './schema';

class BooleanSchema extends Schema<boolean> {
    override _parse(value: unknown): ValidationError[] {
        if (typeof value !== 'boolean') {
            return [{ path: [], message: 'Not a boolean.' }];
        }

        return super._parse(value);
    }
}

export { BooleanSchema };
