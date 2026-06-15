import * as p from '@paseri/paseri';
import { Comment } from './comment.schema.ts';

// Composes the recursive Comment schema from another `.schema.ts` file.
export const Thread = p.object({
    title: p.string().min(1),
    comments: p.array(Comment),
});
