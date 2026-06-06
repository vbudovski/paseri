import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { analyzeCallback, CallbackAnalysisError } from './_callback.ts';

describe('analyzeCallback', () => {
    it('handles a self-contained arrow', () => {
        const predicate = (n: number) => n > 0;
        const callback = analyzeCallback(predicate);
        expect(callback.name).toBe('predicate');
        expect(callback.arity).toBe(1);
        expect(callback.parameterNames).toEqual(['n']);
        expect(callback.freeIdentifiers).toEqual([]);
    });

    it('handles a block-body arrow', () => {
        const predicate = (n: number): boolean => {
            return n > 0;
        };
        const callback = analyzeCallback(predicate);
        expect(callback.parameterNames).toEqual(['n']);
        expect(callback.freeIdentifiers).toEqual([]);
    });

    it('reports a captured top-level reference as free', () => {
        const limit = 10;
        const predicate = (n: number) => n > limit;
        const callback = analyzeCallback(predicate);
        expect(callback.freeIdentifiers).toEqual(['limit']);
    });

    it('does not report property names as free', () => {
        const predicate = (s: { length: number }) => s.length > 0;
        const callback = analyzeCallback(predicate);
        expect(callback.freeIdentifiers).toEqual([]);
    });

    it('reports computed property keys as free', () => {
        const key = 'foo';
        const predicate = (s: Record<string, unknown>) => s[key] !== undefined;
        const callback = analyzeCallback(predicate);
        // `undefined` is a parser Identifier (not a keyword) so it surfaces here too.
        expect(callback.freeIdentifiers).toEqual(['key', 'undefined']);
    });

    it('reports globals (e.g., Number) as free identifiers', () => {
        const predicate = (n: number) => Number.isFinite(n);
        const callback = analyzeCallback(predicate);
        expect(callback.freeIdentifiers).toEqual(['Number']);
    });

    it('handles destructured parameters', () => {
        const predicate = ({ a, b }: { a: number; b: number }) => a + b > 0;
        const callback = analyzeCallback(predicate);
        expect(callback.parameterNames).toEqual(['a', 'b']);
        expect(callback.freeIdentifiers).toEqual([]);
    });

    it('handles nested destructuring with renaming', () => {
        const predicate = ({ a: x, b: { c: y } }: { a: number; b: { c: number } }) => x + y > 0;
        const callback = analyzeCallback(predicate);
        expect(callback.parameterNames).toEqual(['x', 'y']);
        expect(callback.freeIdentifiers).toEqual([]);
    });

    it('handles default values in parameters that reference outer bindings', () => {
        const fallback = 5;
        const predicate = (n: number, m: number = fallback) => n > m;
        const callback = analyzeCallback(predicate);
        expect(callback.parameterNames).toEqual(['n', 'm']);
        expect(callback.freeIdentifiers).toEqual(['fallback']);
    });

    it('treats hoisted function declarations inside the body as bound', () => {
        const predicate = (n: number) => {
            return helper(n);
            function helper(x: number): boolean {
                return x > 0;
            }
        };
        const callback = analyzeCallback(predicate);
        expect(callback.freeIdentifiers).toEqual([]);
    });

    it('does not treat block-scoped let/const before declaration as bound across blocks', () => {
        const predicate = (n: number) => {
            if (n > 0) {
                const inner = n * 2;
                return inner > 5;
            }
            return false;
        };
        const callback = analyzeCallback(predicate);
        expect(callback.freeIdentifiers).toEqual([]);
    });

    it('binds a var referenced before its declaration', () => {
        const predicate = (n: number) => {
            const read = () => doubled;
            var doubled = n;
            return read() >= 0 && doubled >= 0;
        };
        const callback = analyzeCallback(predicate);
        expect(callback.freeIdentifiers).toEqual([]);
    });

    it('binds nested-arrow params and reports its outer references as free', () => {
        const threshold = 4;
        const predicate = (values: number[]) => values.every((value) => value > threshold);
        const callback = analyzeCallback(predicate);
        expect(callback.parameterNames).toEqual(['values']);
        expect(callback.freeIdentifiers).toEqual(['threshold']);
    });

    it('binds object-method params and reports its free references', () => {
        const factor = 3;
        const predicate = (n: number) =>
            ({
                scale(x: number): number {
                    return x * factor;
                },
            }).scale(n) > 0;
        const callback = analyzeCallback(predicate);
        expect(callback.freeIdentifiers).toEqual(['factor']);
    });

    it('binds a class name and its method params, reporting only outer references as free', () => {
        const base = 10;
        const predicate = (n: number) => {
            class Adder {
                add(x: number): number {
                    return x + base;
                }
            }
            return new Adder().add(n) > 0;
        };
        const callback = analyzeCallback(predicate);
        expect(callback.freeIdentifiers).toEqual(['base']);
    });

    it('binds a catch-clause parameter within its block', () => {
        const predicate = (n: number) => {
            try {
                return n > 0;
            } catch (error) {
                return error !== undefined;
            }
        };
        const callback = analyzeCallback(predicate);
        expect(callback.freeIdentifiers).toEqual(['undefined']);
    });

    it('reports a free reference in a destructured parameter default', () => {
        const fallback = 2;
        const predicate = ({ a = fallback }: { a?: number }) => a > 0;
        const callback = analyzeCallback(predicate);
        expect(callback.parameterNames).toEqual(['a']);
        expect(callback.freeIdentifiers).toEqual(['fallback']);
    });

    it('reports object-shorthand references as free', () => {
        const value = 7;
        const predicate = (n: number) => ({ n, value }).n === n;
        const callback = analyzeCallback(predicate);
        expect(callback.freeIdentifiers).toEqual(['value']);
    });

    it('does not report quoted-string property keys as free', () => {
        const predicate = (n: number) => ({ foo: n }).foo > 0;
        const callback = analyzeCallback(predicate);
        expect(callback.freeIdentifiers).toEqual([]);
    });

    it('handles a named function expression — its own name is bound', () => {
        const predicate = function self(n: number): boolean {
            return n > 0 && self(n - 1);
        };
        const callback = analyzeCallback(predicate);
        expect(callback.freeIdentifiers).toEqual([]);
    });

    it('captures the function name from .name', () => {
        function isPositive(n: number): boolean {
            return n > 0;
        }
        const callback = analyzeCallback(isPositive);
        expect(callback.name).toBe('isPositive');
    });

    it('captures arity from .length', () => {
        const predicate = (a: number, b: number, c: number) => a + b + c > 0;
        const callback = analyzeCallback(predicate);
        expect(callback.arity).toBe(3);
    });

    it('throws for native code', () => {
        expect(() => analyzeCallback(Math.max)).toThrow(CallbackAnalysisError);
    });

    it('throws for bound functions', () => {
        const original = (n: number) => n > 0;
        const bound = original.bind(null);
        expect(() => analyzeCallback(bound)).toThrow(CallbackAnalysisError);
    });
});
