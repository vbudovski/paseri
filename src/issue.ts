type Key = string;

interface LeafNode {
    type: 'leaf';
    code: string;
}

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

type StackItem = [TreeNode, Key[]];

interface Issue {
    path: Key[];
    code: string;
}

function issueList(node: TreeNode): readonly Issue[] {
    const issues: Issue[] = [];

    const stack: StackItem[] = [];
    let current: StackItem | undefined = [node, []];
    while (current) {
        const [currentNode, currentPath] = current;

        switch (currentNode.type) {
            case 'leaf':
                issues.push({ path: currentPath, code: currentNode.code });
                break;
            case 'join':
                stack.push([currentNode.right, currentPath], [currentNode.left, currentPath]);
                break;
            case 'nest':
                stack.push([currentNode.child, [...currentPath, currentNode.key]]);
                break;
        }

        current = stack.pop();
    }

    return issues;
}

function addIssue(node: TreeNode | undefined, newNode: LeafNode | NestNode): TreeNode {
    let tree: TreeNode | undefined = node;
    if (!tree) {
        tree = newNode;
    } else {
        tree = { type: 'join', left: tree, right: newNode };
    }

    return tree;
}

export { issueList, addIssue };
export type { TreeNode, LeafNode, JoinNode, Issue };
