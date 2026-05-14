import * as p from '@vbudovski/paseri';
import { en } from '@vbudovski/paseri/locales';
import { formatResult } from './format.ts';

self.onmessage = (event: MessageEvent<{ schema: string; data: string }>) => {
    const { schema, data } = event.data;

    try {
        // codeql[js/code-injection] Playground REPL evaluates user-authored Paseri schemas in a sandboxed Web Worker.
        const parsed = new Function('p', `return ${schema}.parse(${data})`)(p);
        self.postMessage({ ok: true, parsedData: formatResult(parsed) });
    } catch (e) {
        if (e instanceof p.PaseriError) {
            self.postMessage({ ok: false, errors: e.messages(en).map((message) => JSON.stringify(message)) });
        } else {
            self.postMessage({ ok: false, errors: ['Malformed input.'] });
        }
    }
};
