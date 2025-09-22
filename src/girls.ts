import fs from 'node:fs';
import path from 'node:path';
import type { GirlTemplate, Spec } from './types.js';

const p = path.resolve('data/girls.json');

export interface GirlsFile {
  version: number;
  updated_at: string;
  girls: GirlTemplate[];
  gacha_pools: Record<Spec, { weights_by_rarity: Record<string, number> }>;
}

export const loadGirlTemplates = (): GirlsFile => JSON.parse(fs.readFileSync(p, 'utf-8'));
