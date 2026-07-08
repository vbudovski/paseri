import * as p from '@paseri/paseri';

// Exports its schema as the module default — exercises the default-export path.
export default p.object({ id: p.number().int().gte(1) });
