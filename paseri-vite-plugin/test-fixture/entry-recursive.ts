import { Thread } from './thread.schema.ts';

export function validate(value: unknown): unknown {
    return Thread.safeParse(value);
}
