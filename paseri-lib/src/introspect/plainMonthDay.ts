import { PlainMonthDaySchema } from '../schemas/plainMonthDay.ts';
import type { IR, IRContext } from './ir.ts';

PlainMonthDaySchema.prototype._emit = (_context: IRContext): IR => ({ kind: 'plainMonthDay' });
