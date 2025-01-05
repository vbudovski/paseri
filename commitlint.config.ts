import type { UserConfig } from '@commitlint/types';
import { RuleConfigSeverity } from '@commitlint/types';

const config = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [RuleConfigSeverity.Error, 'always', ['feature', 'fix', 'test', 'doc', 'refactor']],
        'subject-case': [RuleConfigSeverity.Error, 'always', ['sentence-case']],
    },
} satisfies UserConfig;

export default config;
