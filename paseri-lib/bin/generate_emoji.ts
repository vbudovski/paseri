const emojiData = await fetch('https://www.unicode.org/Public/16.0.0/ucd/emoji/emoji-data.txt').then((response) =>
    response.text(),
);

const emojiLine = /^(?<start>[A-Z0-9]+).+\[(?<count>\d+)].+$/gm;
const matches = emojiData.matchAll(emojiLine);
if (!matches) {
    throw Error('Unable to extract emoji data.');
}

const emojiCodePoints = [...matches].map((match) => ({
    // biome-ignore lint/style/noNonNullAssertion: This can't happen.
    start: Number.parseInt(`${match!.groups!.start}`, 16),
    // biome-ignore lint/style/noNonNullAssertion: This can't happen.
    count: Number.parseInt(match!.groups!.count, 10),
}));

await Deno.writeFile('src/emoji.json', new TextEncoder().encode(JSON.stringify(emojiCodePoints)));
