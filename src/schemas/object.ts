import type { NonEmptyObject } from 'type-fest';
import type { Infer } from '../infer.ts';
import type { TreeNode } from '../issue.ts';
import { addIssue } from '../issue.ts';
import { type InternalParseResult, isParseSuccess } from '../result.ts';
import { isPlainObject } from '../utils.ts';
import { Schema } from './schema.ts';

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

        let sanitisedValue: Record<string, unknown> = value;
        let seen = 0;

        let issue: TreeNode | undefined = undefined;
        for (const key in value) {
            const schema = this._shape.get(key);
            if (schema) {
                seen++;

                const childValue = value[key];
                const issueOrSuccess = schema._parse(childValue);
                if (issueOrSuccess === undefined) {
                    if (schema instanceof ObjectSchema && schema._mode === 'strip') {
                        if (sanitisedValue === value) {
                            sanitisedValue = { ...value };
                        }
                        sanitisedValue[key] = childValue;
                    }
                } else if (isParseSuccess(issueOrSuccess)) {
                    if (schema instanceof ObjectSchema && schema._mode === 'strip') {
                        if (sanitisedValue === value) {
                            sanitisedValue = { ...value };
                        }
                        sanitisedValue[key] = issueOrSuccess.value;
                    }
                } else {
                    issue = addIssue(issue, {
                        type: 'nest',
                        key,
                        child: issueOrSuccess,
                    });
                }
            } else {
                if (this._mode === 'strict') {
                    issue = addIssue(issue, {
                        type: 'nest',
                        key,
                        child: this.issues.UNRECOGNIZED_KEY,
                    });
                } else if (this._mode === 'strip') {
                    if (sanitisedValue === value) {
                        sanitisedValue = { ...value };
                    }
                    delete sanitisedValue[key];
                }
            }
        }

        if (seen < this._shape.size) {
            for (const key of this._shape.keys()) {
                if (value[key] === undefined) {
                    issue = addIssue(issue, {
                        type: 'nest',
                        key,
                        child: this.issues.MISSING_VALUE,
                    });
                }
            }
        }

        if (issue) {
            return issue;
        }

        return { ok: true, value: sanitisedValue as Infer<ShapeType> };
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
