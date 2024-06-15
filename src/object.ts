import type { NonEmptyObject, Simplify } from 'npm:type-fest';
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
        value === null ||
        Array.isArray(value) ||
        value instanceof Promise ||
        value instanceof Map ||
        value instanceof Set ||
        value instanceof Date
    );
}

class ObjectSchema<ShapeType extends ObjectSchemaType<ShapeType>> extends Schema<ObjectSchemaOutputType<ShapeType>> {
    private readonly _shape: Map<string, Schema<unknown>>;
    private _strict = false;
    private readonly issues: Record<string, [ValidationError]> = {
        INVALID_TYPE: [{ path: [], message: 'Not an object.' }],
    };

    constructor(shape: ShapeType) {
        super();

        this._shape = new Map(Object.entries(shape));
    }

    _parse(value: unknown): ParseResult<ObjectSchemaOutputType<ShapeType>> {
        if (!isPlainObject(value)) {
            return { ok: false, errors: this.issues.INVALID_TYPE };
        }

        const errors: ValidationError[] = [];
        const sanitisedValue: Record<string, unknown> = {};

        for (const [key, schema] of this._shape) {
            const childValue = value[key];
            if (childValue !== undefined) {
                const result = schema._parse(childValue);
                if (result.ok) {
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

        if (errors.length) {
            return { ok: false, errors };
        }

        return { ok: true, value: sanitisedValue as ObjectSchemaOutputType<ShapeType> };
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
