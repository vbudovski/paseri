// The RGI (recommended for general interchange) emoji set — the same set `\p{RGI_Emoji}` matches. Each data
// line's first field is a single code point, a `start..end` range of code points, or a space-separated code
// point sequence (keycap, flag, tag, modifier, or ZWJ sequence).
const sources = [
    'https://www.unicode.org/Public/emoji/16.0/emoji-sequences.txt',
    'https://www.unicode.org/Public/emoji/16.0/emoji-zwj-sequences.txt',
];

function expand(field: string): string[] {
    if (field.includes('..')) {
        const [start, end] = field.split('..').map((hex) => Number.parseInt(hex, 16));
        const emoji: string[] = [];
        for (let codePoint = start; codePoint <= end; codePoint++) {
            emoji.push(String.fromCodePoint(codePoint));
        }
        return emoji;
    }
    const codePoints = field
        .trim()
        .split(/\s+/)
        .map((hex) => Number.parseInt(hex, 16));
    return [String.fromCodePoint(...codePoints)];
}

const emoji: string[] = [];
for (const source of sources) {
    const text = await fetch(source).then((response) => response.text());
    for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) {
            continue;
        }
        emoji.push(...expand(trimmed.split(';')[0]));
    }
}

await Deno.writeFile('src/emoji.json', new TextEncoder().encode(JSON.stringify(emoji)));
