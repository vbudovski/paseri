import { expect } from '@std/expect';
import type { Tagged } from 'type-fest';
import { type Issue, type TreeNode, addIssue, issueList } from './issue.ts';

const { test } = Deno;

test('Leaf', () => {
    const issues = issueList({
        type: 'leaf',
        code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'>,
    });
    expect(issues).toEqual([{ path: [], code: 'bad_leaf' }] satisfies Issue[]);
});

test('Join leaves', () => {
    const issues = issueList({
        type: 'join',
        left: { type: 'leaf', code: 'bad_leaf1' as Tagged<string, 'CustomIssueCode'> },
        right: { type: 'leaf', code: 'bad_leaf2' as Tagged<string, 'CustomIssueCode'> },
    });

    expect(issues).toEqual([
        { path: [], code: 'bad_leaf1' },
        { path: [], code: 'bad_leaf2' },
    ] satisfies Issue[]);
});

test('Nest single level', () => {
    const issues = issueList({
        type: 'nest',
        key: 'level1',
        child: { type: 'leaf', code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'> },
    });

    expect(issues).toEqual([{ path: ['level1'], code: 'bad_leaf' }] satisfies Issue[]);
});

test('Nest multiple levels', () => {
    const issues = issueList({
        type: 'nest',
        key: 'level1',
        child: {
            type: 'nest',
            key: 'level2',
            child: {
                type: 'nest',
                key: 'level3',
                child: {
                    type: 'leaf',
                    code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'>,
                },
            },
        },
    });

    expect(issues).toEqual([{ path: ['level1', 'level2', 'level3'], code: 'bad_leaf' }] satisfies Issue[]);
});

test('Join leaf left nested right', () => {
    const issues = issueList({
        type: 'join',
        left: {
            type: 'leaf',
            code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'>,
        },
        right: {
            type: 'nest',
            key: 'right',
            child: {
                type: 'leaf',
                code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'>,
            },
        },
    });

    expect(issues).toEqual([
        { path: [], code: 'bad_leaf' },
        { path: ['right'], code: 'bad_leaf' },
    ] satisfies Issue[]);
});

test('Join nested left leaf right', () => {
    const issues = issueList({
        type: 'join',
        left: {
            type: 'nest',
            key: 'left',
            child: {
                type: 'leaf',
                code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'>,
            },
        },
        right: {
            type: 'leaf',
            code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'>,
        },
    });

    expect(issues).toEqual([
        { path: ['left'], code: 'bad_leaf' },
        { path: [], code: 'bad_leaf' },
    ] satisfies Issue[]);
});

test('Join nested left nested right', () => {
    const issues = issueList({
        type: 'join',
        left: {
            type: 'nest',
            key: 'left',
            child: {
                type: 'leaf',
                code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'>,
            },
        },
        right: {
            type: 'nest',
            key: 'right',
            child: {
                type: 'leaf',
                code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'>,
            },
        },
    });

    expect(issues).toEqual([
        { path: ['left'], code: 'bad_leaf' },
        { path: ['right'], code: 'bad_leaf' },
    ] satisfies Issue[]);
});

test('Add leaf node to empty', () => {
    let tree: TreeNode | undefined = undefined;
    tree = addIssue(tree, { type: 'leaf', code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'> });

    expect(tree).toEqual({ type: 'leaf', code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'> } satisfies TreeNode);
});

test('Add leaf node to existing leaf node', () => {
    let tree: TreeNode = { type: 'leaf', code: 'bad_leaf1' as Tagged<string, 'CustomIssueCode'> };
    tree = addIssue(tree, { type: 'leaf', code: 'bad_leaf2' as Tagged<string, 'CustomIssueCode'> });

    expect(tree).toEqual({
        type: 'join',
        left: { type: 'leaf', code: 'bad_leaf1' as Tagged<string, 'CustomIssueCode'> },
        right: { type: 'leaf', code: 'bad_leaf2' as Tagged<string, 'CustomIssueCode'> },
    } satisfies TreeNode);
});

test('Add nest node to empty', () => {
    let tree: TreeNode | undefined = undefined;
    tree = addIssue(tree, {
        type: 'nest',
        key: 'child',
        child: {
            type: 'leaf',
            code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'>,
        },
    });

    expect(tree).toEqual({
        type: 'nest',
        key: 'child',
        child: {
            type: 'leaf',
            code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'>,
        },
    } satisfies TreeNode);
});

test('Add nest node to leaf node', () => {
    let tree: TreeNode = { type: 'leaf', code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'> };
    tree = addIssue(tree, {
        type: 'nest',
        key: 'child',
        child: {
            type: 'leaf',
            code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'>,
        },
    });

    expect(tree).toEqual({
        type: 'join',
        left: { type: 'leaf', code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'> },
        right: {
            type: 'nest',
            key: 'child',
            child: { type: 'leaf', code: 'bad_leaf' as Tagged<string, 'CustomIssueCode'> },
        },
    } satisfies TreeNode);
});
