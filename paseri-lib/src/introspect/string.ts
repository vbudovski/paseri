import { issueCodes } from '../issue.ts';
import { StringSchema } from '../schemas/string.ts';
import { convertChecks, type RawCheck, type WithChecks } from './_shared.ts';
import type { IR, IRContext, StringCheck } from './ir.ts';

const TAG_MIN = 0;
const TAG_MAX = 1;
const TAG_REGEX = 2;
const TAG_INCLUDES = 3;
const TAG_STARTS_WITH = 4;
const TAG_ENDS_WITH = 5;
const TAG_URL = 6;

const REGEX_NAME_BY_CODE: Record<string, StringCheck['name']> = {
    [issueCodes.INVALID_EMAIL]: 'email',
    [issueCodes.INVALID_EMOJI]: 'emoji',
    [issueCodes.INVALID_UUID]: 'uuid',
    [issueCodes.INVALID_NANOID]: 'nanoid',
    [issueCodes.INVALID_DATE_STRING]: 'date',
    [issueCodes.INVALID_TIME_STRING]: 'time',
    [issueCodes.INVALID_DATE_TIME_STRING]: 'datetime',
    [issueCodes.INVALID_IP_ADDRESS]: 'ip',
    [issueCodes.INVALID_IP_ADDRESS_RANGE]: 'cidr',
    [issueCodes.DOES_NOT_MATCH_REGEX]: 'regex',
};

function toCheck(check: RawCheck): StringCheck {
    switch (check.tag) {
        case TAG_MIN:
            return { name: 'min', value: check.param as number };
        case TAG_MAX:
            return { name: 'max', value: check.param as number };
        case TAG_INCLUDES:
            return { name: 'includes', value: check.param as string };
        case TAG_STARTS_WITH:
            return { name: 'startsWith', value: check.param as string };
        case TAG_ENDS_WITH:
            return { name: 'endsWith', value: check.param as string };
        case TAG_URL: {
            const regex = check.param as RegExp;
            return { name: 'url', source: regex.source, flags: regex.flags };
        }
        case TAG_REGEX: {
            const regex = check.param as RegExp;
            const name = REGEX_NAME_BY_CODE[check.issue.code];
            if (name === undefined) {
                throw new Error(`Unrecognised string regex check issue code: ${check.issue.code}`);
            }
            return { name, source: regex.source, flags: regex.flags } as StringCheck;
        }
        default:
            throw new Error(`Unrecognised string check tag: ${check.tag}`);
    }
}

StringSchema.prototype._emit = function (_context: IRContext): IR {
    return { kind: 'string', checks: convertChecks((this as unknown as WithChecks)._checks, toCheck) };
};
