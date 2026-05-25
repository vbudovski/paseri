import * as p from '../../src/index.ts';

const { bench } = Deno;

type Tree = string | Tree[];

const schema: p.Schema<Tree> = p.lazy(() => p.union(p.string(), p.array(schema)));

function buildDeepTree(depth: number): Tree {
    let node: Tree = 'leaf';
    for (let i = 0; i < depth; i++) {
        node = [node];
    }
    return node;
}

const deepTree200 = buildDeepTree(200);

bench('Paseri', { group: 'Deep tree, depth 200', baseline: true }, () => {
    schema.safeParse(deepTree200);
});
