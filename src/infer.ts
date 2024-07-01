import type { Simplify } from 'type-fest';
import type { Schema } from './schemas/schema.ts';

type InferMapped<SchemaType> = {
    [Key in keyof SchemaType]: SchemaType[Key] extends Schema<infer OutputType> ? OutputType : never;
};

type Infer<SchemaType> = Simplify<
    // biome-ignore lint/suspicious/noExplicitAny: Required to accept any Schema variant.
    SchemaType extends Readonly<Array<Schema<any>>>
        ? InferMapped<SchemaType>
        : // biome-ignore lint/suspicious/noExplicitAny: Required to accept any Schema variant.
          SchemaType extends Readonly<Record<string | number | symbol, Schema<any>>>
          ? InferMapped<SchemaType>
          : SchemaType extends Schema<infer OutputType>
            ? OutputType
            : never
>;

export type { Infer };
