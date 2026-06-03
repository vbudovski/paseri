import { NeverSchema } from '../schemas/never.ts';
import type { IR, IRContext } from './ir.ts';

NeverSchema.prototype._emit = (_context: IRContext): IR => ({ kind: 'never' });
