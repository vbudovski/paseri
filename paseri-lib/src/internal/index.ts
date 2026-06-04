/**
 * Internal runtime support for paseri-compiler-generated output. NOT part of the public API — no
 * stability guarantees, do not import directly. Compiled validators emitted by paseri-compiler import
 * these so they reuse the runtime's exact issue/result/message machinery instead of an inlined copy.
 *
 * @internal
 * @module
 */

export type { CustomIssueCode, Message, TreeNode } from '../issue.ts';
export { addIssue, issueCodes } from '../issue.ts';
export type { Translations } from '../message.ts';
export type { ParseResult } from '../result.ts';
export { ParseErrorResult, PaseriError } from '../result.ts';
