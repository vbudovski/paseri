import * as p from '@paseri/paseri';

export const User = p.object({
    id: p.number().int().gte(1),
    name: p.string().min(1).max(50),
});
