import './schema-viewer.css';
import { User } from './user.schema.ts';

export const validate = (value: unknown): unknown => User.safeParse(value);
