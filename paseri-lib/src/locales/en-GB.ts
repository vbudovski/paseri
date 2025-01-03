import type { Translations } from '../message.ts';

/**
 * English (United Kingdom of Great Britain and Northern Ireland).
 */
const en_GB = {
    invalid_type: 'Invalid type. Expected {expected}.',
    too_short: 'Too short.',
    too_long: 'Too long.',
    invalid_email: 'Invalid email.',
    invalid_emoji: 'Invalid emoji.',
    invalid_uuid: 'Invalid UUID.',
    invalid_nanoid: 'Invalid Nano ID.',
    does_not_include: 'Does not include search string.',
    does_not_start_with: 'Does not start with search string.',
    does_not_end_with: 'Does not end with search string.',
    invalid_date_string: 'Invalid date string.',
    invalid_time_string: 'Invalid time string.',
    invalid_date_time_string: 'Invalid datetime string.',
    invalid_ip_address: 'Invalid IP address.',
    too_small: 'Too small.',
    too_large: 'Too large.',
    invalid_integer: 'Number must be an integer.',
    invalid_finite: 'Number must be finite.',
    invalid_safe_integer: 'Number must be a safe integer.',
    invalid_value: 'Invalid value. Expected {expected}.',
    unrecognized_key: 'Unrecognised key.',
    missing_value: 'Missing value.',
    invalid_date: 'Invalid date.',
    too_dated: 'Too dated.',
    too_recent: 'Too recent.',
} satisfies Translations as Translations;

export { en_GB };
