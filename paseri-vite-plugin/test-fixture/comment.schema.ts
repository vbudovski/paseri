import * as p from '@paseri/paseri';

// Self-recursive: a comment has replies that are themselves comments. The explicit
// `p.Schema<Comment>` annotation is required for the self-reference (and isolatedDeclarations).
type Comment = { body: string; replies: Comment[] };

export const Comment: p.Schema<Comment> = p.lazy(() =>
    p.object({
        body: p.string().min(1),
        replies: p.array(Comment),
    }),
);
