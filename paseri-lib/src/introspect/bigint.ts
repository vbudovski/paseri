import { BigIntSchema } from '../schemas/bigint.ts';
import { convertChecks, type RawCheck, type WithChecks } from './_shared.ts';
import type { BigIntCheck, IR, IRContext } from './ir.ts';

const TAG_GTE = 0;
const TAG_GT = 1;
const TAG_LTE = 2;
const TAG_LT = 3;

function toCheck(check: RawCheck<bigint>): BigIntCheck {
    switch (check.tag) {
        case TAG_GTE:
            return { name: 'gte', value: check.param };
        case TAG_GT:
            return { name: 'gt', value: check.param };
        case TAG_LTE:
            return { name: 'lte', value: check.param };
        case TAG_LT:
            return { name: 'lt', value: check.param };
        default:
            throw new Error(`Unrecognised bigint check tag: ${check.tag}`);
    }
}

BigIntSchema.prototype._emit = function (_context: IRContext): IR {
    return { kind: 'bigint', checks: convertChecks((this as unknown as WithChecks<bigint>)._checks, toCheck) };
};
