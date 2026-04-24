import {
    TAG_ENDS_WITH,
    TAG_INCLUDES,
    TAG_MAX_LENGTH,
    TAG_MIN_LENGTH,
    TAG_REGEX,
    TAG_STARTS_WITH,
} from '../checks/tags.ts';
import { issueCodes, type LeafNode } from '../issue.ts';
import type { InternalParseResult } from '../result.ts';
import type { Check } from './schema.ts';
import { Schema } from './schema.ts';

class StringSchema extends Schema<string> {
    private readonly _checks: readonly Check[] | undefined;

    private readonly issues = {
        INVALID_TYPE: { type: 'leaf', code: issueCodes.INVALID_TYPE, expected: 'string' },
    } as const satisfies Record<string, LeafNode>;

    constructor(checks?: readonly Check[]) {
        super();

        this._checks = checks;
    }
    protected _clone(): StringSchema {
        return new StringSchema(this._checks);
    }
    _parse(value: unknown): InternalParseResult<string> {
        if (typeof value !== 'string') {
            return this.issues.INVALID_TYPE;
        }

        if (this._checks !== undefined) {
            const checks = this._checks;
            for (let i = 0; i < checks.length; i++) {
                const check = checks[i];
                switch (check.tag) {
                    case TAG_MIN_LENGTH:
                        if (value.length < check.param) {
                            return check.issue;
                        }
                        break;
                    case TAG_MAX_LENGTH:
                        if (value.length > check.param) {
                            return check.issue;
                        }
                        break;
                    case TAG_REGEX:
                        check.param.lastIndex = 0;
                        if (!check.param.test(value)) {
                            return check.issue;
                        }
                        break;
                    case TAG_INCLUDES:
                        if (!value.includes(check.param)) {
                            return check.issue;
                        }
                        break;
                    case TAG_STARTS_WITH:
                        if (!value.startsWith(check.param)) {
                            return check.issue;
                        }
                        break;
                    case TAG_ENDS_WITH:
                        if (!value.endsWith(check.param)) {
                            return check.issue;
                        }
                        break;
                }
            }
        }

        return undefined;
    }
}

const singleton = /* @__PURE__ */ new StringSchema();

/**
 * [String](https://paseri.dev/reference/schema/primitives/string/) schema.
 */
const string = /* @__PURE__ */ (...checks: Check[]): StringSchema =>
    checks.length === 0 ? singleton : new StringSchema(checks);

export { string };
