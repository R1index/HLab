import fs from 'node:fs';
import path from 'node:path';
import type { Config } from './types.js';

const p = path.resolve('data/config.json');
export const loadConfig = (): Config => JSON.parse(fs.readFileSync(p, 'utf-8'));
