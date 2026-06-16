// A `.schema.ts` with no Paseri schema exports — the dev compile-check should warn
// (and the build would error).
export const notASchema: { value: number } = { value: 1 };
