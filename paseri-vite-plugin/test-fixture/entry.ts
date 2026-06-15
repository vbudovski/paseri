import { User } from './user.schema.ts';

export function validate(value: unknown): unknown {
    return User.safeParse(value);
}
