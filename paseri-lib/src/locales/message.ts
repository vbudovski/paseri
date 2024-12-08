import type { Simplify, UnwrapTagged } from 'type-fest';
import type { CustomIssueCode, IssueCode } from '../issue.ts';

type Translations = Simplify<{ [Key in UnwrapTagged<IssueCode>]: string } & Record<string, string | undefined>>;

function message(
    locale: Translations,
    code: IssueCode | CustomIssueCode,
    placeholders: Record<string, string>,
): string {
    let value = locale[code];
    if (value === undefined) {
        throw new Error(`No message for code ${code}.`);
    }

    for (const [placeholder, replacement] of Object.entries(placeholders)) {
        value = value.replaceAll(`{${placeholder}}`, replacement);
    }

    return value;
}

export type { Translations };
export { message };
