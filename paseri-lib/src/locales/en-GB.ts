import type { Translations } from '../message.ts';

const en_GB = {
    invalid_type: 'Invalid type. Expected {expected}.',
    too_short: 'Too short.',
    too_long: 'Too long.',
    invalid_email: 'Invalid email.',
    invalid_emoji: 'Invalid emoji.',
    invalid_uuid: 'Invalid UUID.',
    invalid_nanoid: 'Invalid Nano ID.',
    too_small: 'Too small.',
    too_large: 'Too large.',
    invalid_integer: 'Number must be an integer.',
    invalid_finite: 'Number must be finite.',
    invalid_safe_integer: 'Number must be a safe integer.',
    invalid_value: 'Invalid value. Expected {expected}.',
    unrecognized_key: 'Unrecognised key.',
    missing_value: 'Missing value.',
} satisfies Translations;

export { en_GB };
