import { SymbolSchema } from '../schemas/symbol.ts';
import type { IR, IRContext } from './ir.ts';

SymbolSchema.prototype._emit = (_context: IRContext): IR => ({ kind: 'symbol' });
