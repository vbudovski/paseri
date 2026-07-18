import { pattern, regex } from 'regex';

// User part validation adapted from https://github.com/validatorjs/validator.js/blob/master/src/lib/isEmail.js.
// No i flag: combined with the v flag it applies Unicode case folding, letting U+017F (long s, folds to s)
// and U+212A (Kelvin sign, folds to k) into the letter classes. RFC 5321 atext and RFC 1035 domain labels
// are ASCII-only, so case-insensitivity is spelt as explicit A-Z ranges instead.
const emailRegex = (): RegExp => regex`
    ^ \g<email> $

    (?(DEFINE)
        (?<email> \g<user-part> (\. \g<user-part>)* @ \g<domain>)
        # Literal backtick leads to compatibility issues with u flag.
        (?<user-part> [a-zA-Z\d!#$%&'*\-\/=?^_\u0060\{\|\}~+]+)
        # The smallest allowable top-level domain is 2 characters (country codes).
        (?<domain> ([a-zA-Z\d]([a-zA-Z\d\-]*[a-zA-Z\d])?\.)+ [a-zA-Z]{2,})
    )
`;
// `\p{RGI_Emoji}` (a property of strings, v-mode) matches whole emoji including sequences, so bare
// `Emoji_Component` code points (digits, `#`, `*`, a lone regional indicator) are not accepted on their own.
const emojiRegex = (): RegExp => /^\p{RGI_Emoji}+$/v;
// Conversion of UUID regex from https://github.com/validatorjs/validator.js/blob/master/src/lib/isUUID.js.
const uuidRegex = (): RegExp => regex('i')`
    ^ (\g<uuid> | \g<uuid-min> | \g<uuid-max>) $

    (?(DEFINE)
        (?<uuid> \p{AHex}{8}-\p{AHex}{4}-[1-8]\p{AHex}{3}-[89ab]\p{AHex}{3}-\p{AHex}{12})
        (?<uuid-min> 00000000-0000-0000-0000-000000000000)
        (?<uuid-max> ffffffff-ffff-ffff-ffff-ffffffffffff)
    )
`;
const nanoidRegex = (): RegExp => /^[a-z\d_-]{21}$/i;
// Conservative fast-accept pre-filter for `string().url()`: matches only strings the WHATWG URL parser
// (https://url.spec.whatwg.org/) is guaranteed to accept, short-circuiting the `URL.canParse` fall-through.
// Two branches, mirroring the spec's parser:
//   - authority-url: the special schemes (except file, whose host rules differ) require a host, share one
//     authority grammar, and cap the port at 65535. The host is a conservative subset of the allowed domain
//     code points, written as a possessive class (no backtracking) bounded by the `:` `/` `?` `#` that follow.
//     An all-digits-and-dots host is an IPv4 candidate the WHATWG parser may reject (overflow, out-of-range
//     octet, wrong part count), so the leading lookahead requires at least one non-digit char and defers such
//     hosts to `URL.canParse`.
//   - opaque-url: a non-special scheme with no `//` takes the spec's opaque-path state, which accepts any
//     content. Special schemes are excluded (they always parse an authority, e.g. `http:foo bar` is rejected).
// Anything not matched (file:, IPv6 literals, userinfo, IDN hosts, non-special schemes with an authority)
// falls through to `URL.canParse`. Soundness — never accepting a string canParse rejects — and ReDoS-safety
// are both pinned by property tests.
// No i flag: combined with the v flag it applies Unicode case folding, letting U+017F (long s, folds to s)
// and U+212A (Kelvin sign, folds to k) match the scheme's letter classes. A scheme is ASCII-only per
// the WHATWG spec, so canParse rejects them and a fast-accept match would be unsound. Scheme
// case-insensitivity is spelt as per-character ASCII classes instead.
const urlRegex = (): RegExp => regex`
    ^ (\g<authority-url> | \g<opaque-url>) $

    (?(DEFINE)
        (?<authority-url> \g<authority-scheme> :// \g<host> (: \g<port>)? \g<tail>)
        (?<authority-scheme> [hH][tT][tT][pP][sS]? | [fF][tT][pP] | [wW][sS][sS]?)
        (?<opaque-url> (?!\g<special>) [a-zA-Z] [a-zA-Z\d+.\-]*+ : (?!//) .*)
        (?<special> (\g<authority-scheme> | [fF][iI][lL][eE]) :)
        (?<host> (?=[a-zA-Z\d._\-]*?[a-zA-Z_\-]) [a-zA-Z\d._\-]++)
        (?<port> 6553[0-5] | 655[0-2]\d | 65[0-4]\d\d | 6[0-4]\d{3} | [1-5]\d{4} | \d{1,4})
        (?<tail> ([\/?#] .*)?)
    )
`;
const dateRegex = (): RegExp => regex`
    ^ \g<date> $

    (?(DEFINE)
        # The 29 February case comes last: almost no dates match it, so checking it first
        # would slow down all the rest.
        (?<date> (\d{4}-(\g<with-31> | \g<with-30> | \g<february>) | \g<leap-date>))
        (?<leap-date> (\d\d[2468][048] | \d\d[13579][26] | \d\d0[48] | [02468][048]00 | [13579][26]00)-02-29)
        (?<with-31> (0[13578] | 1[02])-(0[1-9] | [12]\d | 3[01]))
        (?<with-30> (0[469] | 11)-(0[1-9] | [12]\d|30))
        (?<february> 02-(0[1-9] | 1\d | 2[0-8]))
    )
`;
const timeRegex = (precision?: number, offset?: boolean, local: boolean = true): RegExp => regex`
    ^ \g<time> $

    (?(DEFINE)
        (?<time> \g<hours> : \g<minutes> : \g<seconds> \g<fractional-seconds> \g<timezone>)
        (?<hours> ([01]\d | 2[0-3]))
        (?<minutes> [0-5]\d)
        (?<seconds> [0-5]\d)
        (?<fractional-seconds> ${precision === undefined ? pattern`(?:\.\d+)?` : precision === 0 ? pattern`` : pattern`\.\d{${String(precision)}}`})
        (?<timezone> ${offset && local ? pattern`(?:\g<offset> | Z?)` : offset ? pattern`(?:\g<offset> | Z)` : local ? pattern`Z?` : pattern`Z`})
        (?<offset> [+\-]\g<hours>:\g<minutes>)
    )
`;
const datetimeRegex = (precision?: number, offset?: boolean, local?: boolean): RegExp => regex`
    ^ \g<datetime> $

    (?(DEFINE)
        (?<datetime> \g<date> T \g<time> \g<timezone>)
        # The 29 February case comes last: see dateRegex.
        (?<date> (\d{4}-(\g<with-31> | \g<with-30> | \g<february>) | \g<leap-date>))
        (?<leap-date> (\d\d[2468][048] | \d\d[13579][26] | \d\d0[48] | [02468][048]00 | [13579][26]00)-02-29)
        (?<with-31> (0[13578] | 1[02])-(0[1-9] | [12]\d | 3[01]))
        (?<with-30> (0[469] | 11)-(0[1-9] | [12]\d|30))
        (?<february> 02-(0[1-9] | 1\d | 2[0-8]))
        (?<time> \g<hours> : \g<minutes> : \g<seconds> \g<fractional-seconds>)
        (?<hours> ([01]\d | 2[0-3]))
        (?<minutes> [0-5]\d)
        (?<seconds> [0-5]\d)
        (?<fractional-seconds> ${precision === undefined ? pattern`(?:\.\d+)?` : precision === 0 ? pattern`` : pattern`\.\d{${String(precision)}}`})
        (?<timezone> ${offset && local ? pattern`(?:\g<offset> | Z?)` : offset ? pattern`(?:\g<offset> | Z)` : local ? pattern`Z?` : pattern`Z`})
        (?<offset> [+\-]\g<hours>:\g<minutes>)
    )
`;
// Adapted IP regex from https://github.com/validatorjs/validator.js/blob/master/src/lib/isIP.js.
const ipRegex = (version?: 4 | 6): RegExp => regex('i')`
    ^ \g<ip> $

    (?(DEFINE)
        (?<ip> ${version === undefined ? pattern`(?:\g<ipv4> | \g<ipv6>)` : version === 4 ? pattern`\g<ipv4>` : pattern`\g<ipv6>`})
        (?<ipv6>
            (
                (\g<segment> :){7} (\g<segment> | :) |
                (\g<segment> :){6} (\g<ipv4> | : \g<segment> | :) |
                (\g<segment> :){5} (: \g<ipv4> | (: \g<segment>){1,2} | :) |
                (\g<segment> :){4} ((: \g<segment>){0,1} : \g<ipv4> | (: \g<segment>){1,3} | :) |
                (\g<segment> :){3} ((: \g<segment>){0,2} : \g<ipv4> | (: \g<segment>){1,4} | :) |
                (\g<segment> :){2} ((: \g<segment>){0,3} : \g<ipv4> | (: \g<segment>){1,5} | :) |
                (\g<segment> :){1} ((: \g<segment>){0,4} : \g<ipv4> | (: \g<segment>){1,6} | :) |
                (: ((: \g<segment>){0,5} : \g<ipv4> | (: \g<segment>){1,7} | :))
            )
            (% [\da-z]+)?
        )
        (?<segment> \p{AHex}{1,4})
        (?<ipv4> (\g<byte> \.){3} \g<byte>)
        (?<byte> 25[0-5] | 2[0-4]\d | 1\d\d | [1-9]\d | \d)
    )
`;
const ipCidrRegex = (version?: 4 | 6): RegExp => regex('i')`
    ^ \g<ip-range> $

    (?(DEFINE)
        (?<ip-range> ${version === undefined ? pattern`(?:\g<ipv4-range> | \g<ipv6-range>)` : version === 4 ? pattern`\g<ipv4-range>` : pattern`\g<ipv6-range>`})
        (?<ipv6-range> \g<ipv6> / \g<ipv6-bits>)
        (?<ipv6>
            (
                (\g<segment> :){7} (\g<segment> | :) |
                (\g<segment> :){6} (\g<ipv4> | : \g<segment> | :) |
                (\g<segment> :){5} (: \g<ipv4> | (: \g<segment>){1,2} | :) |
                (\g<segment> :){4} ((: \g<segment>){0,1} : \g<ipv4> | (: \g<segment>){1,3} | :) |
                (\g<segment> :){3} ((: \g<segment>){0,2} : \g<ipv4> | (: \g<segment>){1,4} | :) |
                (\g<segment> :){2} ((: \g<segment>){0,3} : \g<ipv4> | (: \g<segment>){1,5} | :) |
                (\g<segment> :){1} ((: \g<segment>){0,4} : \g<ipv4> | (: \g<segment>){1,6} | :) |
                (: ((: \g<segment>){0,5} : \g<ipv4> | (: \g<segment>){1,7} | :))
            )
            (% [\da-z]+)?
        )
        (?<ipv6-bits> (12[0-8] | 1[01]\d | \d{1,2}))
        (?<segment> \p{AHex}{1,4})
        (?<ipv4-range> \g<ipv4> / \g<ipv4-bits>)
        (?<ipv4> (\g<byte> \.){3} \g<byte>)
        (?<ipv4-bits> (3[0-2] | 2\d | 1\d | \d))
        (?<byte> 25[0-5] | 2[0-4]\d | 1\d\d | [1-9]\d | \d)
    )
`;

export {
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
};
