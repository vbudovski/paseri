import { BooleanSchema } from '../schemas/boolean.ts';
import type { IR, IRContext } from './ir.ts';

BooleanSchema.prototype._emit = (_context: IRContext): IR => ({ kind: 'boolean' });
