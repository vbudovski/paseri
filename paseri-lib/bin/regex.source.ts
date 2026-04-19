import { pattern, regex } from 'regex';

// User part validation adapted from https://github.com/validatorjs/validator.js/blob/master/src/lib/isEmail.js.
const emailRegex = (): RegExp => regex('i')`
    ^ \g<email> $

    (?(DEFINE)
        (?<email> \g<user-part> (\. \g<user-part>)* @ \g<domain>)
        # Literal backtick leads to compatibility issues with u flag.
        (?<user-part> [a-z\d!#$%&'*\-\/=?^_\u0060\{\|\}~+]+)
        # The smallest allowable top-level domain is 2 characters (country codes).
        (?<domain> ([a-z\d][a-z\d\-]*\.)+ [a-z]{2,})
    )
`;
// Atomic group here to prevent ReDoS.
const emojiRegex = (): RegExp => regex`^(\p{Extended_Pictographic} | \p{Emoji_Component})++$`;
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
const dateRegex = (): RegExp => regex`
    ^ \g<date> $

    (?(DEFINE)
        (?<date> (\g<leap-date> | \d{4}-(\g<with-31> | \g<with-30> | \g<february>)))
        (?<leap-date> (\d\d[2468][048] | \d\d[13579][26] | \d\d0[48] | [02468][048]00 | [13579][26]00)-02-29)
        (?<with-31> (0[13578] | 1[02])-(0[1-9] | [12]\d | 3[01]))
        (?<with-30> (0[469] | 11)-(0[1-9] | [12]\d|30))
        (?<february> 02-(0[1-9] | 1\d | 2[0-8]))
    )
`;
const timeRegex = (precision?: number): RegExp => regex`
    ^ \g<time> $

    (?(DEFINE)
        (?<time> \g<hours> : \g<minutes> : \g<seconds> \g<fractional-seconds>)
        (?<hours> ([01]\d | 2[0-3]))
        (?<minutes> [0-5]\d)
        (?<seconds> [0-5]\d)
        (?<fractional-seconds> ${precision === undefined ? pattern`(\.\d+)?` : pattern`\.\d{${String(precision)}}`})
    )
`;
const datetimeRegex = (precision?: number, offset?: boolean, local?: boolean): RegExp => regex`
    ^ \g<datetime> $

    (?(DEFINE)
        (?<datetime> \g<date> T \g<time> \g<timezone>)
        (?<date> (\g<leap-date> | \d{4}-(\g<with-31> | \g<with-30> | \g<february>)))
        (?<leap-date> (\d\d[2468][048] | \d\d[13579][26] | \d\d0[48] | [02468][048]00 | [13579][26]00)-02-29)
        (?<with-31> (0[13578] | 1[02])-(0[1-9] | [12]\d | 3[01]))
        (?<with-30> (0[469] | 11)-(0[1-9] | [12]\d|30))
        (?<february> 02-(0[1-9] | 1\d | 2[0-8]))
        (?<time> \g<hours> : \g<minutes> : \g<seconds> \g<fractional-seconds>)
        (?<hours> ([01]\d | 2[0-3]))
        (?<minutes> [0-5]\d)
        (?<seconds> [0-5]\d)
        (?<fractional-seconds> ${precision === undefined ? pattern`(\.\d+)?` : pattern`\.\d{${String(precision)}}`})
        (?<timezone> ${offset && local ? pattern`(\g<offset> | Z?)` : offset ? pattern`(\g<offset> | Z)` : local ? pattern`Z?` : pattern`Z`})
        (?<offset> [+\-][0-5]\d:[0-5]\d)
    )
`;
// Adapted IP regex from https://github.com/validatorjs/validator.js/blob/master/src/lib/isIP.js.
const ipRegex = (version?: 4 | 6): RegExp => regex('i')`
    ^ \g<ip> $

    (?(DEFINE)
        (?<ip> ${version === undefined ? pattern`(\g<ipv4> | \g<ipv6>)` : version === 4 ? pattern`\g<ipv4>` : pattern`\g<ipv6>`})
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
        (?<ip-range> ${version === undefined ? pattern`(\g<ipv4-range> | \g<ipv6-range>)` : version === 4 ? pattern`\g<ipv4-range>` : pattern`\g<ipv6-range>`})
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

export { dateRegex, datetimeRegex, emailRegex, emojiRegex, ipCidrRegex, ipRegex, nanoidRegex, timeRegex, uuidRegex };
