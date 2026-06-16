// Virtual-module id scheme for the per-schema generated modules. Each exported schema gets
// its own module, addressed by a specifier pairing the source `.schema.ts` file with the
// export name. The id is intentionally NOT `\0`-prefixed (the usual Rollup virtual-module
// convention): an un-prefixed, `.ts`-suffixed id gets Vite's native TS transform, whereas a
// `\0` id is skipped and the plugin would have to transpile its own output.
const VIRTUAL_PREFIX = 'paseri-schema:';
const NAME_QUERY = '?name=';

function isVirtualId(id: string): boolean {
    return id.startsWith(VIRTUAL_PREFIX);
}

function encodeVirtualId(file: string, name: string): string {
    // The export name is percent-encoded, so it can never contain a literal `?name=`;
    // `parseVirtualId` relies on that to recover the split unambiguously.
    return `${VIRTUAL_PREFIX}${file}${NAME_QUERY}${encodeURIComponent(name)}`;
}

function parseVirtualId(id: string): { file: string; name: string } {
    const body = id.slice(VIRTUAL_PREFIX.length);
    // Split at the LAST `?name=`: the file path may contain one, the encoded name cannot.
    const index = body.lastIndexOf(NAME_QUERY);
    return {
        file: body.slice(0, index),
        name: decodeURIComponent(body.slice(index + NAME_QUERY.length)),
    };
}

export { encodeVirtualId, isVirtualId, parseVirtualId };
