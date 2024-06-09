import type { NonEmptyObject, Simplify } from 'type-fest';
import { type ParseResult, Schema, type ValidationError } from './schema.ts';

type ObjectSchemaType<ShapeType> = NonEmptyObject<
    Simplify<{
        [Key in keyof ShapeType]: ShapeType[Key] extends Schema<infer OutputType>
            ? Schema<OutputType>
            : Schema<unknown>;
    }>
>;
type ObjectSchemaOutputType<ShapeType> = Simplify<{
    [Key in keyof ShapeType]: ShapeType[Key] extends Schema<infer OutputType> ? OutputType : never;
}>;

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

class ObjectSchema<ShapeType extends ObjectSchemaType<ShapeType>> extends Schema<ObjectSchemaOutputType<ShapeType>> {
    private readonly _shape: Map<string, Schema<unknown>>;
    private _strict = false;

    constructor(shape: ShapeType) {
        super();

        this._shape = new Map(entries(shape) as Generator<readonly [string, Schema<unknown>]>);
    }

    override _parse(value: unknown): ParseResult<ObjectSchemaOutputType<ShapeType>> {
        if (!isPlainObject(value)) {
            return { status: 'error', errors: [{ path: [], message: 'Not an object.' }] };
        }

        const errors: ValidationError[] = [];
        const sanitisedValue: Record<string, unknown> = {};

        for (const [key, schema] of this._shape) {
            const childValue = value[key];
            if (childValue !== undefined) {
                const result = schema.safeParse(childValue);
                if (result.status === 'success') {
                    sanitisedValue[key] = result.value;
                } else {
                    errors.push(
                        ...result.errors.map((error) => ({
                            path: [key].concat(error.path),
                            message: error.message,
                        })),
                    );
                }
            } else {
                errors.push({ path: [key], message: 'Missing key.' });
            }
        }

        if (this._strict) {
            const unknownKeys = Object.keys(value).filter((key) => !this._shape.has(key));
            if (unknownKeys.length) {
                errors.push({
                    path: [],
                    message: `Unrecognised key(s) in object: ${Array.from(unknownKeys)
                        .map((key) => `'${key}'`)
                        .join(', ')}.`,
                });
            }
        }

        if (!errors.length) {
            return super._parse(sanitisedValue);
        }

        return { status: 'error', errors };
    }

    strict(): this {
        this._strict = true;

        return this;
    }
}

function object<ShapeType extends ObjectSchemaType<ShapeType>>(
    ...args: ConstructorParameters<typeof ObjectSchema<ShapeType>>
) {
    return new ObjectSchema(...args);
}

export { object };
