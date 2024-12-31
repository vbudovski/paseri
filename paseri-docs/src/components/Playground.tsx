import { useMemo, useState } from 'react';
import * as p from '../../../paseri-lib/src/index';
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

interface PlaygroundProps {
    schemaDefaultValue?: string;
    dataDefaultValue?: string;
}

function Playground(props: PlaygroundProps) {
    const { schemaDefaultValue = '', dataDefaultValue = '' } = props;

    const [editorState, setEditorState] = useState<{ schema: string; data: string }>({
        schema: schemaDefaultValue,
        data: dataDefaultValue,
    });

    const result: Result = useMemo(() => {
        try {
            return {
                ok: true,
                parsedData: new Function('p', `return ${editorState.schema}.parse(${editorState.data})`)(p),
            };
        } catch (e) {
            if (e instanceof p.PaseriError) {
                return { ok: false, errors: e.messages().map((message) => JSON.stringify(message)) };
            }

            return { ok: false, errors: ['Malformed input.'] };
        }
    }, [editorState]);

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
                            setEditorState((prevState) => ({
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
                            setEditorState((prevState) => ({
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
                                {result.errors.map((error, index) => (
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
