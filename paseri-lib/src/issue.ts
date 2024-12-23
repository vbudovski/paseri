import type { Tagged } from 'type-fest';

const issueCodes = {
    // Common.
    INVALID_TYPE: 'invalid_type' as Tagged<'invalid_type', 'IssueCode'>,
    // Array/Tuple/Map/Set/String.
    TOO_SHORT: 'too_short' as Tagged<'too_short', 'IssueCode'>,
    TOO_LONG: 'too_long' as Tagged<'too_long', 'IssueCode'>,
    // String.
    INVALID_EMAIL: 'invalid_email' as Tagged<'invalid_email', 'IssueCode'>,
    INVALID_EMOJI: 'invalid_emoji' as Tagged<'invalid_emoji', 'IssueCode'>,
    INVALID_UUID: 'invalid_uuid' as Tagged<'invalid_uuid', 'IssueCode'>,
    INVALID_NANOID: 'invalid_nanoid' as Tagged<'invalid_nanoid', 'IssueCode'>,
    // BigInt/Number.
    TOO_SMALL: 'too_small' as Tagged<'too_small', 'IssueCode'>,
    TOO_LARGE: 'too_large' as Tagged<'too_large', 'IssueCode'>,
    // Number.
    INVALID_INTEGER: 'invalid_integer' as Tagged<'invalid_integer', 'IssueCode'>,
    INVALID_FINITE: 'invalid_finite' as Tagged<'invalid_finite', 'IssueCode'>,
    INVALID_SAFE_INTEGER: 'invalid_safe_integer' as Tagged<'invalid_safe_integer', 'IssueCode'>,
    // Literal/Null/Undefined/Union.
    INVALID_VALUE: 'invalid_value' as Tagged<'invalid_value', 'IssueCode'>,
    // Object.
    UNRECOGNIZED_KEY: 'unrecognized_key' as Tagged<'unrecognized_key', 'IssueCode'>,
    MISSING_VALUE: 'missing_value' as Tagged<'missing_value', 'IssueCode'>,
} as const;

type IssueCode = (typeof issueCodes)[keyof typeof issueCodes];
type CustomIssueCode = Tagged<string, 'CustomIssueCode'>;

type Key = string | number;

type LeafNode =
    | {
          type: 'leaf';
          code: typeof issueCodes.INVALID_TYPE;
          expected: string;
      }
    | {
          type: 'leaf';
          code: typeof issueCodes.INVALID_VALUE;
          expected: string;
      }
    | {
          type: 'leaf';
          code: Exclude<IssueCode, typeof issueCodes.INVALID_TYPE | typeof issueCodes.INVALID_VALUE>;
      }
    | {
          type: 'leaf';
          code: CustomIssueCode;
      };

interface JoinNode {
    type: 'join';
    left: TreeNode;
    right: TreeNode;
}

interface NestNode {
    type: 'nest';
    key: Key;
    child: TreeNode;
}

type TreeNode = LeafNode | JoinNode | NestNode;

interface Issue {
    path: Key[];
    code: string;
}

interface Message {
    path: Key[];
    message: string;
}

function addIssue(node: TreeNode | undefined, newNode: TreeNode): TreeNode {
    let tree: TreeNode | undefined = node;
    if (!tree) {
        tree = newNode;
    } else {
        tree = { type: 'join', left: tree, right: newNode };
    }

    return tree;
}

export { addIssue, issueCodes };
export type { TreeNode, LeafNode, JoinNode, Issue, IssueCode, CustomIssueCode, Message, Key };
