// Test fixture imported by resolver.test.ts. When a refine predicate references one of these, the compiler must
// reproduce the user's import in the generated module — this exercises each import kind (default / named / aliased
// / namespace) through the resolver's `formatImport`.

function isPositive(value: number): boolean {
    return value > 0;
}

function isNonEmpty(value: string): boolean {
    return value.length > 0;
}

export default isPositive;
export { isNonEmpty };
