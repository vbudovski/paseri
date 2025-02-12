import type { Simplify, UnwrapTagged } from 'type-fest';
import type { CustomIssueCode, IssueCode } from './issue.ts';
import type { Message, TreeNode } from './issue.ts';

type Translations = Simplify<{ [Key in UnwrapTagged<IssueCode>]: string } & Record<string, string | undefined>>;

function message(
    locale: Translations,
    code: IssueCode | CustomIssueCode,
    placeholders: Record<string, string | string[]>,
): string {
    let value = locale[code];
    if (value === undefined) {
        throw new Error(`No message for code ${code}.`);
    }

    for (let [placeholder, replacement] of Object.entries(placeholders)) {
        if (Array.isArray(replacement)) {
            replacement = replacement.join(' | ');
        }

        value = value.replaceAll(`{${placeholder}}`, replacement);
    }

    return value;
}

type StackItem = [TreeNode, PropertyKey[]];

function messageList(node: TreeNode, locale: Translations): readonly Message[] {
    const messages: Message[] = [];

    const stack: StackItem[] = [];
    let current: StackItem | undefined = [node, []];
    while (current) {
        const [currentNode, currentPath] = current;

        switch (currentNode.type) {
            case 'leaf': {
                const { code, type, ...placeholders } = currentNode;

                messages.push({ path: currentPath, message: message(locale, currentNode.code, placeholders) });
                break;
            }
            case 'join': {
                stack.push([currentNode.right, currentPath], [currentNode.left, currentPath]);
                break;
            }
            case 'nest': {
                stack.push([currentNode.child, [...currentPath, currentNode.key]]);
                break;
            }
        }

        current = stack.pop();
    }

    return messages;
}

export type { Translations };
export { messageList };
