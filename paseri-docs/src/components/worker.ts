import * as p from '../../../paseri-lib/src/index';

self.onmessage = (event: MessageEvent<{ schema: string; data: string }>) => {
    const { schema, data } = event.data;

    try {
        self.postMessage({
            ok: true,
            parsedData: new Function('p', `return ${schema}.parse(${data})`)(p),
        });
    } catch (e) {
        if (e instanceof p.PaseriError) {
            self.postMessage({ ok: false, errors: e.messages().map((message) => JSON.stringify(message)) });
        } else {
            self.postMessage({ ok: false, errors: ['Malformed input.'] });
        }
    }
};
