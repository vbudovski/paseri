import { DurationSchema } from '../schemas/duration.ts';
import type { IR, IRContext } from './ir.ts';

DurationSchema.prototype._emit = (_context: IRContext): IR => ({ kind: 'duration' });
