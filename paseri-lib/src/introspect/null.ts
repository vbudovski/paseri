import { NullSchema } from '../schemas/null.ts';
import type { IR, IRContext } from './ir.ts';

NullSchema.prototype._emit = (_context: IRContext): IR => ({ kind: 'null' });
