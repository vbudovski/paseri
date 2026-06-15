import { User } from './user.schema.ts';

// Valid in dev/editor (real schema has .optional()), but breaks after AOT compilation
// where User is the parse-only stand-in — the guard should reject this at build time.
export const bad: unknown = User.optional();
