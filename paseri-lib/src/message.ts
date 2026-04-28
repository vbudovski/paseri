import type { Simplify, UnwrapTagged } from 'type-fest';
import type { IssueCode, LeafNode, Message, TreeNode } from './issue.ts';

type Translations = Simplify<
    {
        [K in IssueCode as UnwrapTagged<K>]: (
            placeholders: Omit<Extract<LeafNode, { code: K }>, 'type' | 'code'>,
        ) => string;
    } & Record<string, ((placeholders: never) => string) | undefined>
>;

type StackItem = [TreeNode, PropertyKey[]];

function messageList(node: TreeNode, locale: Translations | undefined): readonly Message[] {
    const messages: Message[] = [];

    const stack: StackItem[] = [];
    let current: StackItem | undefined = [node, []];
    while (current) {
        const [currentNode, currentPath] = current;

        switch (currentNode.type) {
            case 'leaf': {
                let text: string;
                if (locale === undefined) {
                    text = currentNode.code;
                } else {
                    const fn = locale[currentNode.code] as ((placeholders: object) => string) | undefined;
                    if (fn === undefined) {
                        throw new Error(`No message for code ${currentNode.code}.`);
                    }
                    const { code, type, ...placeholders } = currentNode;
                    text = fn(placeholders);
                }

                messages.push({ path: currentPath, message: text });
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
