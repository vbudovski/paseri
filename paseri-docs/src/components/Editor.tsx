import { useEffect, useRef } from 'preact/hooks';
import styles from './Editor.module.css';

interface EditorProps {
    id: string;
    onChange?: (textValue: string) => void;
    defaultValue?: string;
    isEditable?: boolean;
}

function Editor(props: EditorProps) {
    const { id, onChange, defaultValue = '', isEditable = true } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) {
            return;
        }

        let cancelled = false;
        let cleanup: (() => void) | undefined;

        (async () => {
            const [{ CodeJar }, { highlight: sugarHighlight }] = await Promise.all([
                import('codejar'),
                import('sugar-high'),
            ]);
            if (cancelled || !containerRef.current) {
                return;
            }

            const highlight = (editor: HTMLElement) => {
                const code = editor.textContent ?? '';
                editor.innerHTML = sugarHighlight(code);
            };

            if (!isEditable) {
                el.textContent = defaultValue;
                highlight(el);
                return;
            }

            const jar = CodeJar(el, highlight, { tab: '    ' });
            jar.updateCode(defaultValue);
            jar.onUpdate((code) => onChangeRef.current?.(code));

            // Escape releases focus — Codejar traps Tab to insert indentation,
            // so without this users would be unable to leave the editor via
            // the keyboard (WCAG 2.1.2 No Keyboard Trap). We momentarily set
            // tabindex=-1 before blur so the browser resumes Tab/Shift+Tab
            // navigation from the editor's DOM position rather than wrapping;
            // tabindex is restored on the next focusin so the editor remains
            // Tab-reachable.
            const onKeyDown = (event: KeyboardEvent) => {
                if (event.key !== 'Escape') {
                    return;
                }
                el.tabIndex = -1;
                el.blur();
                const restoreTabIndex = () => {
                    el.tabIndex = 0;
                    document.removeEventListener('focusin', restoreTabIndex);
                };
                document.addEventListener('focusin', restoreTabIndex);
            };
            el.addEventListener('keydown', onKeyDown);

            cleanup = () => {
                el.removeEventListener('keydown', onKeyDown);
                jar.destroy();
            };
        })();

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [defaultValue, isEditable]);

    return (
        // biome-ignore lint/a11y/useSemanticElements: a contenteditable code editor cannot be a textarea (no syntax highlighting)
        <div
            ref={containerRef}
            class={styles.editor}
            role="textbox"
            tabIndex={0}
            aria-labelledby={id}
            aria-multiline="true"
            aria-readonly={!isEditable}
            spellcheck={false}
        >
            {defaultValue}
        </div>
    );
}

export { Editor };
