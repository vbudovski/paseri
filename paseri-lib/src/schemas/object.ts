import type { NonEmptyObject } from 'type-fest';
import type { Infer } from '../infer.ts';
import type { TreeNode } from '../issue.ts';
import { addIssue } from '../issue.ts';
import { type InternalParseResult, isParseSuccess } from '../result.ts';
import { isPlainObject } from '../utils.ts';
import { OptionalSchema, Schema } from './schema.ts';

type ValidShapeType<ShapeType> = NonEmptyObject<{
    [Key in keyof ShapeType]: ShapeType[Key] extends Schema<infer OutputType> ? Schema<OutputType> : never;
}>;

type Mode = 'strip' | 'strict' | 'passthrough';

class ObjectSchema<ShapeType extends ValidShapeType<ShapeType>> extends Schema<Infer<ShapeType>> {
    private readonly _shape: Map<string, Schema<unknown>>;
    private _mode: Mode = 'strip';

    readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: 'invalid_type' },
        UNRECOGNIZED_KEY: { type: 'leaf', code: 'unrecognized_key' },
        MISSING_VALUE: { type: 'leaf', code: 'missing_value' },
    } as const;

    constructor(shape: ShapeType) {
        super();

        this._shape = new Map(Object.entries(shape));
    }
    _parse(value: unknown): InternalParseResult<Infer<ShapeType>> {
        if (!isPlainObject(value)) {
            return this.issues.INVALID_TYPE;
        }

        let seen = 0;
        const modifiedValues: Record<string, unknown> = {};
        const unrecognisedKeys: Record<string, boolean> = {};
        let hasUnrecognisedKey = false;
        let hasModifiedChildValue = false;

        let issue: TreeNode | undefined = undefined;
        for (const key in value) {
            const schema = this._shape.get(key);
            if (schema) {
                seen++;

                const childValue = value[key];
                const issueOrSuccess = schema._parse(childValue);
                if (issueOrSuccess === undefined) {
                    // Value is unmodified, so we can take the fast path.
                    continue;
                }

                if (isParseSuccess(issueOrSuccess)) {
                    // Success, but childValue was modified.
                    hasModifiedChildValue = true;
                    modifiedValues[key] = issueOrSuccess.value;
                } else {
                    issue = addIssue(issue, {
                        type: 'nest',
                        key,
                        child: issueOrSuccess,
                    });
                }
            } else {
                hasUnrecognisedKey = true;
                unrecognisedKeys[key] = true;
            }
        }

        if (seen < this._shape.size) {
            for (const [key, schema] of this._shape.entries()) {
                if (schema instanceof OptionalSchema) {
                    continue;
                }

                if (value[key] === undefined) {
                    issue = addIssue(issue, {
                        type: 'nest',
                        key,
                        child: this.issues.MISSING_VALUE,
                    });
                }
            }
        }

        // Collect any unrecognised key issues, if operating in strict mode.
        if (hasUnrecognisedKey && this._mode === 'strict') {
            for (const key in value) {
                if (unrecognisedKeys[key]) {
                    issue = addIssue(issue, {
                        type: 'nest',
                        key,
                        child: this.issues.UNRECOGNIZED_KEY,
                    });
                }
            }
        }

        // We have collected all possible errors in the steps above. We either return them, or sanitise the value if
        // there are none.
        if (issue) {
            return issue;
        }

        if (hasUnrecognisedKey && this._mode === 'strip' && hasModifiedChildValue) {
            const sanitizedValue: Record<string, unknown> = {};
            for (const key in value) {
                if (unrecognisedKeys[key]) {
                    continue;
                }

                if (modifiedValues[key] === undefined) {
                    sanitizedValue[key] = value[key];
                } else {
                    sanitizedValue[key] = modifiedValues[key];
                }
            }

            return { ok: true, value: sanitizedValue as Infer<ShapeType> };
        }

        if (hasUnrecognisedKey && this._mode === 'strip' && !hasModifiedChildValue) {
            const sanitizedValue: Record<string, unknown> = {};
            for (const key in value) {
                if (unrecognisedKeys[key]) {
                    continue;
                }

                sanitizedValue[key] = value[key];
            }

            return { ok: true, value: sanitizedValue as Infer<ShapeType> };
        }

        if (hasModifiedChildValue) {
            return { ok: true, value: { ...value, ...modifiedValues } as Infer<ShapeType> };
        }

        return undefined;
    }

    strict(): this {
        this._mode = 'strict';

        return this;
    }
    passthrough(): this {
        this._mode = 'passthrough';

        return this;
    }
}

function object<ShapeType extends ValidShapeType<ShapeType>>(
    ...args: ConstructorParameters<typeof ObjectSchema<ShapeType>>
) {
    return new ObjectSchema(...args);
}

export { object };
