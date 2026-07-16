import type { Merge, Simplify as TypeFestSimplify } from 'type-fest';
import type {
    AnySchemaType,
    DefaultSchema,
    NullableSchema,
    OptionalSchema,
    RefineSchema,
    Schema,
} from './schemas/schema.ts';

// `Infer` is public, so a direct reference to type-fest's Simplify would leak as a private-type-ref in deno doc.
// Keep this local @internal alias rather than inlining it.
/** @internal */
type Simplify<T> = TypeFestSimplify<T>;

/** @internal */
type InferArray<SchemaType> = {
    [Key in keyof SchemaType]: SchemaType[Key] extends Schema<infer OutputType> ? OutputType : never;
};

// Key optionality mirrors the runtime's `_isOptional`: nominal (an OptionalSchema, seen through the
// delegating wrappers nullable and refine), never structural — a schema merely accepting the value
// `undefined` (e.g. `p.union(p.string(), p.undefined())`) is a required key. Optional values keep
// `undefined`: an explicit undefined passes through, so the key can be present holding it. Chain does not
// delegate `_isOptional`, so a chained field infers as a required key — matching the runtime, never unsound.
type IsOptionalField<SchemaType> =
    SchemaType extends OptionalSchema<unknown>
        ? true
        : SchemaType extends NullableSchema<unknown, infer InnerSchemaType>
          ? IsOptionalField<InnerSchemaType>
          : SchemaType extends RefineSchema<unknown, infer InnerSchemaType>
            ? IsOptionalField<InnerSchemaType>
            : false;

// Mirrors the runtime `_hasDefault`: a DefaultSchema, seen through the delegating wrappers nullable and refine.
type HasDefaultField<SchemaType> =
    SchemaType extends DefaultSchema<unknown>
        ? true
        : SchemaType extends NullableSchema<unknown, infer InnerSchemaType>
          ? HasDefaultField<InnerSchemaType>
          : SchemaType extends RefineSchema<unknown, infer InnerSchemaType>
            ? HasDefaultField<InnerSchemaType>
            : false;

type InferObjectOptional<SchemaType> = {
    [Key in keyof SchemaType as IsOptionalField<SchemaType[Key]> extends true
        ? Key
        : never]?: SchemaType[Key] extends Schema<infer OutputType> ? OutputType : never;
};
type InferObjectRequired<SchemaType> = {
    [Key in keyof SchemaType as IsOptionalField<SchemaType[Key]> extends true
        ? never
        : Key]: SchemaType[Key] extends Schema<infer OutputType> ? OutputType : never;
};
/** @internal */
type InferObject<SchemaType> = Merge<InferObjectOptional<SchemaType>, InferObjectRequired<SchemaType>>;

/**
 * [Infer](https://paseri.dev/reference/schema/common/#infer) the type from a schema.
 */
// `Simplify` wraps only the array/object branches (flattening the tuple map and the key `Merge`). Don't hoist it over
// the whole union: `Simplify<unknown>` is `{}`, which would make `Infer<p.unknown()>` disagree with `safeParse().value`.
type Infer<SchemaType> =
    SchemaType extends Readonly<Array<AnySchemaType>>
        ? Simplify<InferArray<SchemaType>>
        : SchemaType extends Readonly<Record<PropertyKey, AnySchemaType>>
          ? Simplify<InferObject<SchemaType>>
          : SchemaType extends Set<Schema<infer OutputType>>
            ? Set<OutputType>
            : SchemaType extends Map<Schema<infer OutputKeyType>, Schema<infer OutputValueType>>
              ? Map<OutputKeyType, OutputValueType>
              : SchemaType extends Schema<infer OutputType>
                ? OutputType
                : never;

export type { HasDefaultField, Infer, IsOptionalField };
