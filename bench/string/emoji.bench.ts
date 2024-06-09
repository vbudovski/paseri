import { z } from 'npm:zod';
import { StringSchema } from '../../src/string.ts';

const { bench } = Deno;

const mySchema = new StringSchema().emoji();
const zodSchema = z.string().emoji();

const dataValid = '🥳';
const dataInvalid = 'a';

bench('This', { group: 'Emoji valid' }, () => {
    mySchema.safeParse(dataValid);
});

bench('Zod', { group: 'Emoji valid' }, () => {
    zodSchema.safeParse(dataValid);
});

bench('This', { group: 'Emoji invalid' }, () => {
    mySchema.safeParse(dataInvalid);
});

bench('Zod', { group: 'Emoji invalid' }, () => {
    zodSchema.safeParse(dataInvalid);
});
