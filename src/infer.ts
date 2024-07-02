import type { Simplify } from 'type-fest';
import type { AnySchemaType, Schema } from './schemas/schema.ts';

type InferMapped<SchemaType> = {
    [Key in keyof SchemaType]: SchemaType[Key] extends Schema<infer OutputType> ? OutputType : never;
};

type Infer<SchemaType> = Simplify<
    SchemaType extends Readonly<Array<AnySchemaType>>
        ? InferMapped<SchemaType>
        : SchemaType extends Readonly<Record<string | number | symbol, AnySchemaType>>
          ? InferMapped<SchemaType>
          : SchemaType extends Schema<infer OutputType>
            ? OutputType
            : never
>;

export type { Infer };
