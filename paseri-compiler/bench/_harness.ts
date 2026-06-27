import type { Schema } from '@paseri/paseri';
import '@paseri/paseri/introspect';
import { toSource } from '../src/index.ts';

interface CompiledResult {
    readonly ok: boolean;
}

type CompiledValidator = (value: unknown) => CompiledResult;

async function compile<OutputType>(schema: Schema<OutputType>, name: string): Promise<CompiledValidator> {
    const source = toSource(schema.toIR(), { name });
    const dataUrl = `data:application/typescript,${encodeURIComponent(source)}`;
    const module = (await import(dataUrl)) as Record<string, { safeParse: CompiledValidator }>;
    return module[name].safeParse;
}

export { type CompiledValidator, compile };
