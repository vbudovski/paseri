import type { IsEqual, Merge, NonEmptyObject, TupleToUnion } from 'type-fest';
import type { HasDefaultField, Infer, IsOptionalField } from '../infer.ts';
import { addIssue, issueCodes, type LeafNode, type TreeNode } from '../issue.ts';
import { type InternalParseResult, isParseSuccess } from '../result.ts';
import { defineProtoProperty, isPlainObject } from '../utils.ts';
import {
    type AnySchemaType,
    DefaultSchema,
    type NullableSchema,
    type OptionalSchema,
    type RefineSchema,
    Schema,
} from './schema.ts';

type ValidShapeType<ShapeType> = NonEmptyObject<{
    [Key in keyof ShapeType]: Key extends symbol
        ? never
        : ShapeType[Key] extends Schema<infer OutputType>
          ? Schema<OutputType>
          : never;
}>;

type Mode = 'strip' | 'strict' | 'passthrough';

// Don't wrap a field partial() leaves untouched: one already optional or already carrying a default (both
// seen through the delegating wrappers nullable/refine, mirroring the runtime `_isOptional`/`_hasDefault`
// guard). Wrapping such a field would widen its type to OptionalSchema, whose `.default` is absent at runtime.
type WrapOptional<S> =
    IsOptionalField<S> extends true
        ? S
        : HasDefaultField<S> extends true
          ? S
          : S extends Schema<infer T>
            ? OptionalSchema<T, S>
            : S;

// Recover the inner schema's concrete subclass (preserved by `OptionalSchema`), stripping the optional layer
// wherever it sits — including inside the delegating wrappers nullable/refine, which are rebuilt around the
// unwrapped inner so `.required()` matches TS `Required` (drops optionality, keeps null/refinement).
type UnwrapOptional<S> =
    S extends OptionalSchema<infer _OutputType, infer InnerSchemaType>
        ? InnerSchemaType
        : S extends NullableSchema<infer _OutputType, infer InnerSchemaType>
          ? UnwrapOptional<InnerSchemaType> extends Schema<infer InnerOutputType>
              ? NullableSchema<InnerOutputType, UnwrapOptional<InnerSchemaType>>
              : S
          : S extends RefineSchema<infer _OutputType, infer InnerSchemaType>
            ? UnwrapOptional<InnerSchemaType> extends Schema<infer InnerOutputType>
                ? RefineSchema<InnerOutputType, UnwrapOptional<InnerSchemaType>>
                : S
            : S;

type WrapSomeOptional<ShapeType, Keys extends keyof ShapeType> = {
    [K in keyof ShapeType]: K extends Keys ? WrapOptional<ShapeType[K]> : ShapeType[K];
};

type UnwrapSomeOptional<ShapeType, Keys extends keyof ShapeType> = {
    [K in keyof ShapeType]: K extends Keys ? UnwrapOptional<ShapeType[K]> : ShapeType[K];
};

class ObjectSchema<ShapeType extends Record<PropertyKey, AnySchemaType>> extends Schema<Infer<ShapeType>> {
    private readonly _shape: ShapeType;
    // Set for shapes assembled by derivation methods (merge/pick/omit/partial/required): their V8 maps
    // make keyed loads ~4-5 ns/key slower than literal-built shapes, so lookups go through a Map instead.
    private readonly _shapeMap: Map<string, AnySchemaType> | undefined;
    private readonly _shapeKeys: PropertyKey[];
    private readonly _shapeSize: number;
    private readonly _requiredKeys: PropertyKey[];
    private _mode: Mode = 'strict';

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'object' },
        UNRECOGNIZED_KEY: { type: 'leaf', code: issueCodes.UNRECOGNIZED_KEY },
        MISSING_VALUE: { type: 'leaf', code: issueCodes.MISSING_VALUE },
    } as const satisfies Record<string, LeafNode>;

    constructor(shape: ShapeType, isDerivedShape = false) {
        super();

        if (!shape) {
            throw new Error('Object must contain at least one field.');
        }
        // Symbol-keyed fields would be invisible to the string-keyed parse loops and are unrepresentable
        // in compiled validators (a unique symbol has no emittable reference), so reject them up front.
        if (Object.getOwnPropertySymbols(shape).length > 0) {
            throw new Error('Object fields must use string keys.');
        }
        if (Object.keys(shape).length === 0) {
            throw new Error('Object must contain at least one field.');
        }

        this._shape = shape;
        this._shapeMap = isDerivedShape ? new Map(Object.entries(shape)) : undefined;
        this._shapeKeys = [...Object.keys(shape)];
        this._shapeSize = this._shapeKeys.length;
        this._requiredKeys = this._shapeKeys.filter((key) => !shape[key]._isOptional());
    }
    protected _clone(): ObjectSchema<ShapeType> {
        const cloned = new ObjectSchema(this._shape, this._shapeMap !== undefined);
        cloned._mode = this._mode;

        return cloned;
    }
    _parse(value: unknown, _depth: number, _maxDepth: number): InternalParseResult<Infer<ShapeType>> {
        if (!isPlainObject(value)) {
            return this.issues.INVALID_TYPE;
        }

        let seen = 0;
        let enumerated = 0;
        const modifiedValues: Record<PropertyKey, unknown> = {};
        // A Set avoids the __proto__ accessor issue that affects plain objects in browsers/Node.js.
        let unrecognisedKeys: Set<string> | undefined;
        let hasModifiedChildValue = false;
        // Non-enumerable own shape keys are validated below but skipped by the strip rebuild's for...in copy,
        // which would drop them; collect them so it can re-add them. Exotic case only.
        let hiddenOwnKeys: PropertyKey[] | undefined;

        let issue: TreeNode | undefined;
        const shapeMap = this._shapeMap;
        // Branch once per parse, not per key: the two loop bodies are identical apart from the lookup
        // expression — keep them in sync.
        if (shapeMap === undefined) {
            for (const key in value) {
                enumerated++;
                const schema = this._shape[key];
                if (schema?._parse) {
                    seen++;

                    const childValue = value[key];
                    const issueOrSuccess = schema._parse(childValue, _depth, _maxDepth);
                    if (issueOrSuccess === undefined) {
                        // Value is unmodified, so we can take the fast path.
                        continue;
                    }

                    if (isParseSuccess(issueOrSuccess)) {
                        // Success, but childValue was modified.
                        hasModifiedChildValue = true;
                        if (key === '__proto__') {
                            defineProtoProperty(modifiedValues, issueOrSuccess.value);
                        } else {
                            modifiedValues[key] = issueOrSuccess.value;
                        }
                    } else {
                        issue = addIssue(issue, {
                            type: 'nest',
                            key,
                            child: issueOrSuccess,
                        });
                    }
                } else if (this._mode !== 'passthrough') {
                    // Passthrough never consumes the set; skipping it saves the allocation and adds.
                    if (!unrecognisedKeys) {
                        unrecognisedKeys = new Set();
                    }
                    unrecognisedKeys.add(key);
                }
            }
        } else {
            for (const key in value) {
                enumerated++;
                const schema = shapeMap.get(key);
                if (schema?._parse) {
                    seen++;

                    const childValue = value[key];
                    const issueOrSuccess = schema._parse(childValue, _depth, _maxDepth);
                    if (issueOrSuccess === undefined) {
                        // Value is unmodified, so we can take the fast path.
                        continue;
                    }

                    if (isParseSuccess(issueOrSuccess)) {
                        // Success, but childValue was modified.
                        hasModifiedChildValue = true;
                        if (key === '__proto__') {
                            defineProtoProperty(modifiedValues, issueOrSuccess.value);
                        } else {
                            modifiedValues[key] = issueOrSuccess.value;
                        }
                    } else {
                        issue = addIssue(issue, {
                            type: 'nest',
                            key,
                            child: issueOrSuccess,
                        });
                    }
                } else if (this._mode !== 'passthrough') {
                    // Passthrough never consumes the set; skipping it saves the allocation and adds.
                    if (!unrecognisedKeys) {
                        unrecognisedKeys = new Set();
                    }
                    unrecognisedKeys.add(key);
                }
            }
        }

        if (seen < this._shapeSize) {
            // An unseen shape key is either absent or own-but-non-enumerable (hidden from for...in but still
            // readable at the declared key, so it must be validated). Hidden own keys exist iff the own-name
            // count exceeds the enumerated count; the per-key probe below only runs in that exotic case.
            const hasHiddenKeys = Object.getOwnPropertyNames(value).length !== enumerated;
            for (const key of this._requiredKeys) {
                if (!Object.hasOwn(value, key)) {
                    const issueOrSuccess = this._parseMissingKey(key, _depth, _maxDepth);
                    if (issueOrSuccess === undefined) {
                        continue;
                    }
                    if (isParseSuccess(issueOrSuccess)) {
                        hasModifiedChildValue = true;
                        if (key === '__proto__') {
                            defineProtoProperty(modifiedValues, issueOrSuccess.value);
                        } else {
                            modifiedValues[key] = issueOrSuccess.value;
                        }
                    } else {
                        issue = addIssue(issue, {
                            type: 'nest',
                            key,
                            child: issueOrSuccess,
                        });
                    }
                }
            }
            if (hasHiddenKeys) {
                for (const key of this._shapeKeys) {
                    if (Object.hasOwn(value, key) && !Object.prototype.propertyIsEnumerable.call(value, key)) {
                        if (hiddenOwnKeys === undefined) {
                            hiddenOwnKeys = [];
                        }
                        hiddenOwnKeys.push(key);
                        const schema = this._shape[key];
                        const issueOrSuccess = schema._parse(value[key], _depth, _maxDepth);
                        if (issueOrSuccess !== undefined) {
                            if (isParseSuccess(issueOrSuccess)) {
                                hasModifiedChildValue = true;
                                if (key === '__proto__') {
                                    defineProtoProperty(modifiedValues, issueOrSuccess.value);
                                } else {
                                    modifiedValues[key] = issueOrSuccess.value;
                                }
                            } else {
                                issue = addIssue(issue, {
                                    type: 'nest',
                                    key,
                                    child: issueOrSuccess,
                                });
                            }
                        }
                    }
                }
            }
        }

        // Collect any unrecognised key issues, if operating in strict mode.
        if (unrecognisedKeys && this._mode === 'strict') {
            for (const key of unrecognisedKeys) {
                issue = addIssue(issue, {
                    type: 'nest',
                    key,
                    child: this.issues.UNRECOGNIZED_KEY,
                });
            }
        }

        // We have collected all possible errors in the steps above. We either return them, or sanitise the value if
        // there are none.
        if (issue) {
            return issue;
        }

        if (unrecognisedKeys && this._mode === 'strip') {
            const sanitizedValue: Record<PropertyKey, unknown> = {};
            for (const key in value) {
                if (unrecognisedKeys.has(key)) {
                    continue;
                }

                if (hasModifiedChildValue && Object.hasOwn(modifiedValues, key)) {
                    if (key === '__proto__') {
                        defineProtoProperty(sanitizedValue, modifiedValues[key]);
                    } else {
                        sanitizedValue[key] = modifiedValues[key];
                    }
                } else if (key === '__proto__') {
                    defineProtoProperty(sanitizedValue, value[key]);
                } else {
                    sanitizedValue[key] = value[key];
                }
            }

            if (hasModifiedChildValue) {
                // Default fills target keys absent from the input, so the loop above never copies them.
                for (const key in modifiedValues) {
                    if (!Object.hasOwn(value, key)) {
                        if (key === '__proto__') {
                            defineProtoProperty(sanitizedValue, modifiedValues[key]);
                        } else {
                            sanitizedValue[key] = modifiedValues[key];
                        }
                    }
                }
            }

            if (hiddenOwnKeys) {
                // The for...in copy skips non-enumerable keys and the loop above only fills absent ones, so
                // add each validated non-enumerable own field (its modified value if any, else the original).
                for (const key of hiddenOwnKeys) {
                    const source =
                        hasModifiedChildValue && Object.hasOwn(modifiedValues, key) ? modifiedValues[key] : value[key];
                    if (key === '__proto__') {
                        defineProtoProperty(sanitizedValue, source);
                    } else {
                        sanitizedValue[key] = source;
                    }
                }
            }

            return { ok: true, value: sanitizedValue as Infer<ShapeType> };
        }

        if (hasModifiedChildValue) {
            return { ok: true, value: { ...value, ...modifiedValues } as Infer<ShapeType> };
        }

        return undefined;
    }
    /**
     * Resolves a missing required key: substitutes the default (a wrapped default runs the whole wrapper
     * chain, so a missing key behaves exactly like explicit undefined) or reports `missing_value`. Kept
     * out of the fallback loop so its body stays small.
     */
    private _parseMissingKey(key: PropertyKey, _depth: number, _maxDepth: number): InternalParseResult<unknown> {
        const shapeMap = this._shapeMap;
        const schema = shapeMap === undefined ? this._shape[key] : (shapeMap.get(key as string) as AnySchemaType);
        if (schema instanceof DefaultSchema) {
            return { ok: true, value: schema._getDefault() };
        }
        if (schema._hasDefault()) {
            return schema._parse(undefined, _depth, _maxDepth);
        }
        return this.issues.MISSING_VALUE;
    }
    get shape(): ShapeType {
        return this._shape;
    }
    strip(): ObjectSchema<ShapeType> {
        const cloned = this._clone();
        cloned._mode = 'strip';

        return cloned;
    }
    strict(): ObjectSchema<ShapeType> {
        const cloned = this._clone();
        cloned._mode = 'strict';

        return cloned;
    }
    passthrough(): ObjectSchema<ShapeType> {
        const cloned = this._clone();
        cloned._mode = 'passthrough';

        return cloned;
    }
    merge<ShapeTypeOther extends ValidShapeType<ShapeTypeOther>>(
        other: ObjectSchema<ShapeTypeOther>,
    ): ObjectSchema<Merge<ShapeType, ShapeTypeOther>> {
        // Cast required: TS can't reduce `ShapeType & ShapeTypeOther` to type-fest's `Merge` when both are unresolved generics.
        const merged = new ObjectSchema<Merge<ShapeType, ShapeTypeOther>>(
            {
                ...this._shape,
                ...other._shape,
            } as Merge<ShapeType, ShapeTypeOther>,
            true,
        );
        merged._mode = other._mode;

        return merged;
    }
    pick<Keys extends [keyof ShapeType, ...(keyof ShapeType)[]]>(
        ...keys: Keys
    ): ObjectSchema<Pick<ShapeType, TupleToUnion<Keys>>> {
        // A numeric shape key arrives as a number via `keyof`, but runtime object keys are strings; normalise
        // both to strings so they match (same for omit/partial/required below).
        const picked = new Set(keys.map((key) => String(key)));
        const result = new ObjectSchema(
            Object.fromEntries(Object.entries(this._shape).filter(([key]) => picked.has(key))) as Pick<
                ShapeType,
                TupleToUnion<Keys>
            >,
            true,
        );
        result._mode = this._mode;

        return result;
    }
    omit<Keys extends [keyof ShapeType, ...(keyof ShapeType)[]]>(
        // Ensure at least one key remains in schema.
        ...keys: IsEqual<TupleToUnion<Keys>, keyof ShapeType> extends true ? never : Keys
    ): ObjectSchema<Omit<ShapeType, TupleToUnion<Keys>>> {
        const omitted = new Set(keys.map((key) => String(key)));
        const result = new ObjectSchema(
            Object.fromEntries(Object.entries(this._shape).filter(([key]) => !omitted.has(key))) as Omit<
                ShapeType,
                TupleToUnion<Keys>
            >,
            true,
        );
        result._mode = this._mode;

        return result;
    }
    partial<Keys extends (keyof ShapeType)[]>(
        ...keys: Keys
    ): ObjectSchema<
        Keys extends [] ? WrapSomeOptional<ShapeType, keyof ShapeType> : WrapSomeOptional<ShapeType, TupleToUnion<Keys>>
    > {
        const requested = keys.length === 0 ? null : new Set(keys.map((key) => String(key)));
        const matchesKey = requested === null ? () => true : (key: string) => requested.has(key);

        const newShape: Record<PropertyKey, AnySchemaType> = {};
        for (const [key, field] of Object.entries(this._shape)) {
            if (matchesKey(key) && !field._isOptional() && !field._hasDefault()) {
                newShape[key] = field.optional();
            } else {
                newShape[key] = field;
            }
        }

        const result = new ObjectSchema(newShape as ShapeType, true);
        result._mode = this._mode;

        return result as unknown as ObjectSchema<
            Keys extends []
                ? WrapSomeOptional<ShapeType, keyof ShapeType>
                : WrapSomeOptional<ShapeType, TupleToUnion<Keys>>
        >;
    }
    required<Keys extends (keyof ShapeType)[]>(
        ...keys: Keys
    ): ObjectSchema<
        Keys extends []
            ? UnwrapSomeOptional<ShapeType, keyof ShapeType>
            : UnwrapSomeOptional<ShapeType, TupleToUnion<Keys>>
    > {
        const requested = keys.length === 0 ? null : new Set(keys.map((key) => String(key)));
        const matchesKey = requested === null ? () => true : (key: string) => requested.has(key);

        const newShape: Record<PropertyKey, AnySchemaType> = {};
        for (const [key, field] of Object.entries(this._shape)) {
            if (matchesKey(key)) {
                newShape[key] = field._unwrapOptional();
            } else {
                newShape[key] = field;
            }
        }

        const result = new ObjectSchema(newShape as ShapeType, true);
        result._mode = this._mode;

        return result as unknown as ObjectSchema<
            Keys extends []
                ? UnwrapSomeOptional<ShapeType, keyof ShapeType>
                : UnwrapSomeOptional<ShapeType, TupleToUnion<Keys>>
        >;
    }
}

/**
 * [Object](https://paseri.dev/reference/schema/collections/object/) schema.
 */
const object = /* @__PURE__ */ <ShapeType extends ValidShapeType<ShapeType>>(
    ...args: ConstructorParameters<typeof ObjectSchema<ShapeType>>
): ObjectSchema<ShapeType> => new ObjectSchema(...args);

export { ObjectSchema, object };
