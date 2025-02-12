import type { ConditionalExcept, Merge, Simplify } from 'type-fest';
import type { AnySchemaType, Schema } from './schemas/schema.ts';

type InferArray<SchemaType> = {
    [Key in keyof SchemaType]: SchemaType[Key] extends Schema<infer OutputType> ? OutputType : never;
};

type InferObjectOptional<SchemaType> = ConditionalExcept<
    {
        [Key in keyof SchemaType]?: SchemaType[Key] extends Schema<infer OutputType | undefined>
            ? Exclude<OutputType, undefined>
            : never;
    },
    never
>;
type InferObjectRequired<SchemaType> = ConditionalExcept<
    {
        [Key in keyof SchemaType]: SchemaType[Key] extends Schema<Exclude<infer OutputType, undefined>>
            ? OutputType
            : never;
    },
    never
>;
// There doesn't seem to be a way to create a mapped type where some keys are optional (`?`, not `| undefined`) and
// some are not.
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
