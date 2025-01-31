import { CodeHighlightNode, CodeNode, registerCodeHighlighting } from '@lexical/code';
import { $convertFromMarkdownString } from '@lexical/markdown';
import { type InitialConfigType, LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { $getRoot, LineBreakNode } from 'lexical';
import { useEffect } from 'react';
import styles from './Editor.module.css';
import { theme } from './theme.ts';

interface OnChangePluginProps {
    onChange?: ((textValue: string) => void) | undefined;
}

function OnChangePlugin(props: OnChangePluginProps) {
    const { onChange } = props;

    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            onChange?.(editorState.read(() => $getRoot().getTextContent()));
        });
    }, [editor, onChange]);

    return null;
}

function CodeHighlightPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return registerCodeHighlighting(editor);
    }, [editor]);

    return null;
}

interface EditorProps {
    id: string;
    onChange?: (textValue: string) => void;
    defaultValue?: string;
    isEditable?: boolean;
}

function Editor(props: EditorProps) {
    const { id, onChange, defaultValue = '', isEditable = true } = props;

    const initialConfig: InitialConfigType = {
        namespace: 'editor',
        theme,
        onError: (error) => {
            console.error(error);
        },
        nodes: [CodeNode, CodeHighlightNode, LineBreakNode],
        editorState: () => $convertFromMarkdownString(defaultValue),
        editable: isEditable,
    };

    return (
        // Set key to force the editor to re-render on value change.
        <LexicalComposer initialConfig={initialConfig} key={isEditable ? undefined : defaultValue}>
            <RichTextPlugin
                contentEditable={<ContentEditable aria-labelledby={id} className={styles.editor} />}
                ErrorBoundary={LexicalErrorBoundary}
            />
            <OnChangePlugin onChange={onChange} />
            <CodeHighlightPlugin />
        </LexicalComposer>
    );
}

export { Editor };
