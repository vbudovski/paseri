// @generated from runtime.ts by `deno task generate_runtime`. Do not edit by hand.

const RUNTIME_SOURCE = `// biome-ignore-all lint/correctness/noUnusedVariables: consumed at codegen time, not via import.

// Incidental utilities spliced into compiled validators. This file is the source of truth; \`deno task
// generate_runtime\` embeds its verbatim text into \`runtime.gen.ts\`, and \`selectRuntimeStatements()\` in
// \`toSource.ts\` parses that string at codegen time, including only the declarations each schema needs. Re-run the
// task after editing this file. The result/issue/message contract is NOT here — generated code imports it from
// \`@paseri/paseri/internal\` so it reuses the runtime's exact machinery (see \`toSource.ts\`).

// Mirrors paseri-lib's \`utils.ts\` isPlainObject exactly — the compiled object/record predicate must accept and reject
// the same values as the runtime. Keep these in lockstep (the \`constructor\` and \`Array.isArray\` branches both matter).
function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }
    if (value.constructor === undefined) {
        return Object.getPrototypeOf(value) === null;
    }
    if (value.constructor !== Object && !Object.hasOwn(value, 'constructor')) {
        return false;
    }
    return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
}

function deepFreeze<T>(value: T): T {
    if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
        return value;
    }
    Object.freeze(value);
    for (const key of Reflect.ownKeys(value)) {
        deepFreeze((value as Record<PropertyKey, unknown>)[key]);
    }
    return value;
}
`;

export { RUNTIME_SOURCE };
