/**
 * Locale translations for [Paseri](https://paseri.dev) validation error messages.
 *
 * @example Apply a locale to parse error messages
 *
 * ```typescript
 * import * as p from '@vbudovski/paseri';
 * import { en_AU } from '@vbudovski/paseri/locales';
 *
 * const result = p.string().safeParse(123);
 * if (!result.ok) {
 *     console.error(result.messages(en_AU));
 * }
 * ```
 *
 * @module
 */

export type { Translations } from '../message.ts';
export { en } from './en.ts';
export { en_AU } from './en-AU.ts';
export { en_GB } from './en-GB.ts';
export { en_US } from './en-US.ts';
