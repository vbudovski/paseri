import type { Translations } from '../message.ts';
import { en_GB } from './en-GB.ts';

/**
 * English (default).
 */
const en = en_GB satisfies Translations as Translations;

export { en };
