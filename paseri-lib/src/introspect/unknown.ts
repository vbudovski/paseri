import { UnknownSchema } from '../schemas/unknown.ts';
import type { IR, IRContext } from './ir.ts';

UnknownSchema.prototype._emit = (_context: IRContext): IR => ({ kind: 'unknown' });
