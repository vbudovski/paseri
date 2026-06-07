import { UndefinedSchema } from '../schemas/undefined.ts';
import type { IR, IRContext } from './ir.ts';

UndefinedSchema.prototype._emit = (_context: IRContext): IR => ({ kind: 'undefined' });
