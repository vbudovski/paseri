import type { NonEmptyObject } from 'type-fest';
import { Schema, type ValidationError } from './schema.ts';

type ChildOutputType<OutputType> = OutputType extends Schema<OutputType> ? OutputType : never;
type ObjectOutput<ShapeType> = { [Key in keyof ShapeType]: ChildOutputType<ShapeType[Key]> };
// biome-ignore lint/suspicious/noExplicitAny: We don't know the output type of the child schemas, and unknown is too restrictive.
type SchemaType<ShapeType> = NonEmptyObject<{ [Key in keyof ShapeType]: Schema<any> }>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return !(
        typeof value !== 'object' ||
        Array.isArray(value) ||
        value instanceof Promise ||
        value instanceof Map ||
        value instanceof Set ||
        value instanceof Date ||
        value === null
    );
}

function* entries<T>(obj: T): Generator<readonly [keyof T, T[keyof T]]> {
    /**
     * Get entries of an object without constructing a temporary array.
     */
    for (const key in obj) {
        yield [key, obj[key]];
    }
}

class ObjectSchema<ShapeType extends SchemaType<ShapeType>> extends Schema<ObjectOutput<ShapeType>> {
    private readonly _shape: Map<string, Schema<unknown>>;
    private _strict = false;

    constructor(shape: ShapeType) {
        super();

        this._shape = new Map(entries(shape) as Generator<readonly [string, Schema<unknown>]>);
    }

    override _parse(value: unknown): ValidationError[] {
        if (!isPlainObject(value)) {
            return [{ path: [], message: 'Not an object.' }];
        }

        const errors: ValidationError[] = [];
        const sanitisedValue: Record<string, unknown> = {};
        const unknownKeys: string[] = [];

        for (const [key, childValue] of entries(value)) {
            const schema = this._shape.get(key);
            if (schema) {
                const result = schema.safeParse(childValue);
                if (result.status === 'success') {
                    sanitisedValue[key] = result.value;
                } else {
                    errors.push(
                        ...result.errors.map((error) => ({
                            path: [key as string, ...error.path],
                            message: error.message,
                        })),
                    );
                }
            } else {
                if (this._strict) {
                    unknownKeys.push(key);
                }
            }
        }

        if (this._strict && unknownKeys.length > 0) {
            errors.push({
                path: [],
                message: `Unrecognised key(s) in object: ${unknownKeys.map((key) => `'${key}'`).join(', ')}.`,
            });
        }

        return errors.concat(super._parse(sanitisedValue));
    }

    strict(): this {
        this._strict = true;

        return this;
    }
}

export { ObjectSchema };
