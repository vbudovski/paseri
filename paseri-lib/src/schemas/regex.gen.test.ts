import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { generateRegexModule } from '../../bin/generate_regex.ts';
import {
    dateRegex,
    datetimeRegex,
    emailRegex,
    emojiRegex,
    ipCidrRegex,
    ipRegex,
    nanoidRegex,
    timeRegex,
    urlRegex,
    uuidRegex,
} from './regex.gen.ts';

describe('generated output', () => {
    it('matches a fresh regeneration of regex.source.ts', async () => {
        // Guards against editing bin/regex.source.ts without re-running `deno task generate_regex`:
        // the runtime imports the generated file, so a stale copy ships old validators silently.
        const committed = await Deno.readTextFile(new URL('./regex.gen.ts', import.meta.url));
        expect(await generateRegexModule()).toBe(committed);
    });
});

describe('Unicode case folding', () => {
    // U+017F (long s) and U+212A (Kelvin sign) are the only code points that Unicode case folding
    // maps into ASCII a-z, so an `i` flag on a u/v-mode letter class silently accepts them. That bug
    // has been fixed three times (email, url, ip/cidr). These grammars are all ASCII-only, so a fold
    // character must never match, wherever it lands in an otherwise valid string; sweeping every
    // position of every exported regex pins the whole file against a recurrence.
    const longS = String.fromCodePoint(0x017f);
    const kelvinSign = String.fromCodePoint(0x212a);

    function mutations(sample: string): string[] {
        const result: string[] = [];
        for (const character of [longS, kelvinSign]) {
            for (let index = 0; index <= sample.length; index += 1) {
                result.push(sample.slice(0, index) + character + sample.slice(index));
            }
            for (let index = 0; index < sample.length; index += 1) {
                result.push(sample.slice(0, index) + character + sample.slice(index + 1));
            }
        }
        return result;
    }

    function timeSample(precision: number | undefined): string {
        if (precision === 3) {
            return '12:34:56.123Z';
        }
        return '12:34:56Z';
    }

    const precisions = [undefined, 0, 3];
    const booleans = [false, true];
    const versions = [undefined, 4, 6] as const;

    const testCases: { label: string; regex: RegExp; samples: string[] }[] = [
        { label: 'email', regex: emailRegex(), samples: ['foo@example.com'] },
        { label: 'emoji', regex: emojiRegex(), samples: ['\u{1F600}'] },
        { label: 'uuid', regex: uuidRegex(), samples: ['d9428888-122b-11e1-b85c-61cd3cbb3210'] },
        { label: 'nanoid', regex: nanoidRegex(), samples: ['V1StGXR8_Z5jdHi6B-myT'] },
        { label: 'url', regex: urlRegex(), samples: ['https://example.com'] },
        { label: 'date', regex: dateRegex(), samples: ['2024-02-29'] },
        ...precisions.flatMap((precision) =>
            booleans.flatMap((offset) =>
                booleans.map((local) => ({
                    label: `time(${precision}, ${offset}, ${local})`,
                    regex: timeRegex(precision, offset, local),
                    samples: [timeSample(precision)],
                })),
            ),
        ),
        ...precisions.flatMap((precision) =>
            booleans.flatMap((offset) =>
                booleans.map((local) => ({
                    label: `datetime(${precision}, ${offset}, ${local})`,
                    regex: datetimeRegex(precision, offset, local),
                    samples: [`2024-01-01T${timeSample(precision)}`],
                })),
            ),
        ),
        ...versions.map((version) => ({
            label: `ip(${version})`,
            regex: ipRegex(version),
            samples: version === 4 ? ['192.168.1.254'] : ['fe80::1%eth0', '2001:db8:85a3::8a2e:370:7334'],
        })),
        ...versions.map((version) => ({
            label: `cidr(${version})`,
            regex: ipCidrRegex(version),
            samples: version === 4 ? ['192.168.1.254/24'] : ['fe80::1%eth0/64', '2001:db8:85a3::8a2e:370:7334/128'],
        })),
    ];

    for (const { label, regex, samples } of testCases) {
        it(`${label} never matches a fold character`, () => {
            for (const sample of samples) {
                expect(regex.test(sample)).toBe(true);
                const accepted = mutations(sample).filter((mutated) => regex.test(mutated));
                expect(accepted).toEqual([]);
            }
        });
    }
});
