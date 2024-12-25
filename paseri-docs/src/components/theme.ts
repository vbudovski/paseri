import type { EditorThemeClasses } from 'lexical';
import styles from './theme.module.css';

const theme: EditorThemeClasses = {
    code: styles.code as string,
    codeHighlight: {
        boolean: styles.boolean as string,
        builtin: styles.builtin as string,
        'class-name': 'class-name',
        comment: styles.comment as string,
        constant: 'constant',
        decorator: 'decorator',
        function: styles.function as string,
        'function-variable': 'function-variable',
        'generic-function': 'generic-function',
        hashbang: 'hashbang',
        keyword: styles.keyword as string,
        'literal-property': 'literal-property',
        number: styles.number as string,
        operator: styles.operator as string,
        parameter: 'parameter',
        punctuation: styles.punctuation as string,
        string: styles.string as string,
        'string-property': 'string-property',
        'template-string': 'template-string',
        variable: styles.variable as string,
    },
};

export { theme };
