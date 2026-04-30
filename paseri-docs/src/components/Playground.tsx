import type { Signal } from '@preact/signals';
import { useSignal, useSignalEffect } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { Editor } from './Editor.tsx';
import styles from './Playground.module.css';

type Result = { ok: true; parsedData: string } | { ok: false; errors: string[] };
type WorkerInput = { schema: string; data: string };

function useWorker(result: Signal<Result>) {
    const runRef = useRef<((m: WorkerInput) => void) | undefined>(undefined);

    useEffect(() => {
        let worker: Worker | undefined;
        let isRunning = false;

        const start = () => {
            console.debug(`[${Date.now()}] Starting worker.`);
            worker = new Worker(new URL('worker.ts', import.meta.url), { type: 'module' });
            worker.onmessage = (event: MessageEvent<Result>) => {
                result.value = event.data;
                isRunning = false;
            };
        };
        const terminate = () => {
            console.debug(`[${Date.now()}] Terminating worker.`);
            worker?.terminate();
            isRunning = false;
        };

        start();

        runRef.current = (message) => {
            isRunning = true;
            worker?.postMessage(message);

            setTimeout(() => {
                if (isRunning) {
                    console.debug(`[${Date.now()}] Restarting worker due to timeout.`);
                    terminate();
                    result.value = { ok: false, errors: ['Aborted due to excessive run time.'] };
                    start();
                }
            }, 1_000);
        };

        return terminate;
    }, [result]);

    return (message: WorkerInput) => runRef.current?.(message);
}

interface PlaygroundProps {
    schemaDefaultValue?: string;
    dataDefaultValue?: string;
}

function Playground(props: PlaygroundProps) {
    const { schemaDefaultValue = '', dataDefaultValue = '' } = props;

    const result = useSignal<Result>({ ok: true, parsedData: '' });
    const schema = useSignal(schemaDefaultValue);
    const data = useSignal(dataDefaultValue);

    const run = useWorker(result);

    useSignalEffect(() => {
        run({ schema: schema.value, data: data.value });
    });

    return (
        <div class={['not-content', styles.queryContainer].join(' ')}>
            <form class={styles.container}>
                <div>
                    <div id="schema" class={styles.label}>
                        Schema
                    </div>
                    <Editor
                        id="schema"
                        onChange={(textValue) => {
                            schema.value = textValue;
                        }}
                        defaultValue={schemaDefaultValue}
                    />
                </div>
                <div>
                    <div id="data" class={styles.label}>
                        Data
                    </div>
                    <Editor
                        id="data"
                        onChange={(textValue) => {
                            data.value = textValue;
                        }}
                        defaultValue={dataDefaultValue}
                    />
                </div>
                <div class={styles.result}>
                    <div id="result" class={styles.label}>
                        Result
                    </div>
                    <div role="note" aria-labelledby="result" aria-live="polite">
                        {result.value.ok ? (
                            <Editor id="result" isEditable={false} defaultValue={result.value.parsedData} />
                        ) : (
                            <ul class={styles.errors}>
                                {result.value.errors.map((error: string, index: number) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}

export { Playground };
