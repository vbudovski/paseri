import { NumberSchema } from '../schemas/number.ts';
import { convertChecks, type RawCheck, type WithChecks } from './_shared.ts';
import type { IR, IRContext, NumberCheck } from './ir.ts';

const TAG_GTE = 0;
const TAG_GT = 1;
const TAG_LTE = 2;
const TAG_LT = 3;
const TAG_INT = 4;
const TAG_FINITE = 5;
const TAG_SAFE = 6;

function toCheck(check: RawCheck): NumberCheck {
    switch (check.tag) {
        case TAG_GTE:
            return { name: 'gte', value: check.param as number };
        case TAG_GT:
            return { name: 'gt', value: check.param as number };
        case TAG_LTE:
            return { name: 'lte', value: check.param as number };
        case TAG_LT:
            return { name: 'lt', value: check.param as number };
        case TAG_INT:
            return { name: 'int' };
        case TAG_FINITE:
            return { name: 'finite' };
        case TAG_SAFE:
            return { name: 'safe' };
        default:
            throw new Error(`Unrecognised number check tag: ${check.tag}`);
    }
}

NumberSchema.prototype._emit = function (_context: IRContext): IR {
    return { kind: 'number', checks: convertChecks((this as unknown as WithChecks)._checks, toCheck) };
};
