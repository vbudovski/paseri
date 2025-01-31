import { useCallback, useEffect, useRef, useState } from 'react';
import { Editor } from './Editor.tsx';
import styles from './Playground.module.css';

type Result = { ok: true; parsedData: unknown } | { ok: false; errors: string[] };

function formatResult(value: unknown): string {
    if (typeof value === 'bigint') {
        return `${value}n`;
    }

    if (typeof value === 'string') {
        return `'${value}'`;
    }

    if (typeof value === 'undefined') {
        return 'undefined';
    }

    if (typeof value === 'symbol') {
        return value.description === 'undefined' ? 'Symbol()' : `Symbol('${value.description}')`;
    }

    if (value instanceof Date) {
        return String(value);
    }

    if (value === null) {
        return 'null';
    }

    if (Array.isArray(value)) {
        return `[${value.map((v) => formatResult(v)).join(', ')}]`;
    }

    if (value instanceof Set) {
        return `Set(${value.size}) {${value
            .keys()
            .map((k) => formatResult(k))
            .toArray()
            .join(', ')}}`;
    }

    if (value instanceof Map) {
        return `Map(${value.size}) {${value
            .entries()
            .map(([k, v]) => `${formatResult(k)} => ${formatResult(v)}`)
            .toArray()
            .join(', ')}}`;
    }

    if (typeof value === 'object') {
        return `{${Object.entries(value)
            .map(([k, v]) => `${k}: ${formatResult(v)}`)
            .join(', ')}}`;
    }

    return JSON.stringify(value);
}

type EditorState = { schema: string; data: string };

function useWorker() {
    const isRunning = useRef<boolean>(false);
    const worker = useRef<Worker>(undefined);
    const [result, setResult] = useState<Result>({ ok: true, parsedData: '' });

    const startWorker = useCallback(() => {
        console.debug(`[${new Date().getTime()}] Starting worker.`);
        worker.current = new Worker(new URL('worker.ts', import.meta.url), { type: 'module' });
        worker.current.onmessage = (event: MessageEvent<Result>) => {
            setResult(event.data);
            isRunning.current = false;
        };
    }, []);

    const terminateWorker = useCallback(() => {
        console.debug(`[${new Date().getTime()}] Terminating worker.`);
        worker.current?.terminate();
        isRunning.current = false;
    }, []);

    useEffect(() => {
        startWorker();

        return () => {
            terminateWorker();
        };
    }, [startWorker, terminateWorker]);

    const run = useCallback(
        (message: EditorState) => {
            isRunning.current = true;
            worker.current?.postMessage(message);

            setTimeout(() => {
                if (isRunning.current) {
                    console.debug(`[${new Date().getTime()}] Restarting worker due to timeout.`);
                    terminateWorker();
                    setResult({ ok: false, errors: ['Aborted due to excessive run time.'] });
                    startWorker();
                }
            }, 1_000);
        },
        [startWorker, terminateWorker],
    );

    return { run, result };
}

interface PlaygroundProps {
    schemaDefaultValue?: string;
    dataDefaultValue?: string;
}

function Playground(props: PlaygroundProps) {
    const { schemaDefaultValue = '', dataDefaultValue = '' } = props;

    const { run, result } = useWorker();

    const [editorState, setEditorState] = useState<EditorState>({
        schema: schemaDefaultValue,
        data: dataDefaultValue,
    });

    useEffect(() => {
        run(editorState);
    }, [run, editorState]);

    return (
        <div className={['not-content', styles.queryContainer].join(' ')}>
            <form className={styles.container}>
                <div>
                    <div id="schema" className={styles.label}>
                        Schema
                    </div>
                    <Editor
                        id="schema"
                        onChange={(textValue) => {
                            setEditorState((prevState: EditorState) => ({
                                ...prevState,
                                schema: textValue,
                            }));
                        }}
                        defaultValue={schemaDefaultValue}
                    />
                </div>
                <div>
                    <div id="data" className={styles.label}>
                        Data
                    </div>
                    <Editor
                        id="data"
                        onChange={(textValue) => {
                            setEditorState((prevState: EditorState) => ({
                                ...prevState,
                                data: textValue,
                            }));
                        }}
                        defaultValue={dataDefaultValue}
                    />
                </div>
                <div className={styles.result}>
                    <div id="result" className={styles.label}>
                        Result
                    </div>
                    <div aria-labelledby="result">
                        {result.ok ? (
                            <Editor
                                id="result"
                                isEditable={false}
                                defaultValue={`\`\`\`typescript\n${formatResult(result.parsedData)}\`\`\``}
                            />
                        ) : (
                            <ul className={styles.errors}>
                                {result.errors.map((error: string, index: number) => (
                                    // biome-ignore lint/suspicious/noArrayIndexKey: No better key.
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
