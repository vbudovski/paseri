import type { Translations } from '../message.ts';
import { en_GB } from './en-GB.ts';

const en_US = {
    ...en_GB,
    unrecognized_key: 'Unrecognized key.',
} satisfies Translations as Translations;

export { en_US };
