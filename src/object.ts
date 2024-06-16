import type { NonEmptyObject, Simplify } from 'npm:type-fest';
import type { TreeNode } from './issue.ts';
import { addIssue } from './issue.ts';
import { type ParseResult, Schema } from './schema.ts';

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
    private readonly _shape: ShapeType;
    private _strict = false;

    private readonly INVALID_TYPE = 'invalid_type';
    private readonly MISSING_VALUE = 'missing_value';
    private readonly UNRECOGNIZED_KEY = 'unrecognized_key';

    constructor(shape: ShapeType) {
        super();

        this._shape = shape;
    }

    _parse(value: unknown): ParseResult<ObjectSchemaOutputType<ShapeType>> {
        if (!isPlainObject(value)) {
            return { ok: false, issue: { type: 'leaf', code: this.INVALID_TYPE } };
        }

        const sanitisedValue: Record<string, unknown> = {};

        let issue: TreeNode | undefined = undefined;
        for (const key in this._shape) {
            const schema = this._shape[key];
            const childValue = value[key];
            if (childValue !== undefined) {
                const result = schema._parse(childValue);
                if (result.ok) {
                    sanitisedValue[key] = result.value;
                } else {
                    issue = addIssue(issue, {
                        type: 'nest',
                        key,
                        child: result.issue,
                    });
                }
            } else {
                issue = addIssue(issue, {
                    type: 'nest',
                    key,
                    child: { type: 'leaf', code: this.MISSING_VALUE },
                });
            }
        }

        if (this._strict) {
            for (const key in value) {
                if (this._shape[key as keyof ShapeType] === undefined) {
                    issue = addIssue(issue, {
                        type: 'nest',
                        key,
                        child: { type: 'leaf', code: this.UNRECOGNIZED_KEY },
                    });
                }
            }
        }

        if (issue) {
            return { ok: false, issue };
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
