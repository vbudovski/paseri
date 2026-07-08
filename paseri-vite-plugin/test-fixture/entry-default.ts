import Schema from './default-schema.schema.ts';

export function validate(value: unknown): unknown {
    return Schema.safeParse(value);
}
