import type { Merge, Simplify } from 'type-fest';
import type { AnySchemaType, NullableSchema, OptionalSchema, Schema } from './schemas/schema.ts';

type InferArray<SchemaType> = {
    [Key in keyof SchemaType]: SchemaType[Key] extends Schema<infer OutputType> ? OutputType : never;
};

// Key optionality mirrors the runtime's `_isOptional`: nominal (an OptionalSchema, seen through
// nullable), never structural — a schema merely accepting the value `undefined` (e.g.
// `p.union(p.string(), p.undefined())`) is a required key. Optional values keep `undefined`: an explicit
// undefined passes through, so the key can be present holding it. Class-erasing wrappers (refine, chain)
// infer as required keys — stricter than the runtime, never unsound.
type IsOptionalField<SchemaType> =
    SchemaType extends OptionalSchema<unknown>
        ? true
        : SchemaType extends NullableSchema<unknown, infer InnerSchemaType>
          ? IsOptionalField<InnerSchemaType>
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
type InferObject<SchemaType> = Merge<InferObjectOptional<SchemaType>, InferObjectRequired<SchemaType>>;

/**
 * [Infer](https://paseri.dev/reference/schema/common/#infer) the type from a schema.
 */
type Infer<SchemaType> = Simplify<
    SchemaType extends Readonly<Array<AnySchemaType>>
        ? InferArray<SchemaType>
        : SchemaType extends Readonly<Record<PropertyKey, AnySchemaType>>
          ? InferObject<SchemaType>
          : SchemaType extends Set<Schema<infer OutputType>>
            ? Set<OutputType>
            : SchemaType extends Map<Schema<infer OutputKeyType>, Schema<infer OutputValueType>>
              ? Map<OutputKeyType, OutputValueType>
              : SchemaType extends Schema<infer OutputType>
                ? OutputType
                : never
>;

export type { Infer };
