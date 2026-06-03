import type { RawCheck } from './_shared.ts';
import type { TemporalCheck } from './ir.ts';

const TAG_MIN = 0;
const TAG_MAX = 1;

function toCheck<ValueType>(check: RawCheck<ValueType>): TemporalCheck<ValueType> {
    switch (check.tag) {
        case TAG_MIN:
            return { name: 'min', value: check.param };
        case TAG_MAX:
            return { name: 'max', value: check.param };
        default:
            throw new Error(`Unrecognised temporal check tag: ${check.tag}`);
    }
}

export { toCheck };
