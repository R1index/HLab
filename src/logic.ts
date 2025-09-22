import type { Assignment, Config, Creature, Girl, Player, Spec, State } from './types.js';
import { aid, cid, nowIso } from './id.js';
import { loadConfig } from './config.js';
import { loadGirlTemplates } from './girls.js';

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const choiceWeighted = <T>(items: T[], weights: number[]): T => {
  const total = weights.reduce((a,b)=>a+b,0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length-1];
};

export function sumCreatureStats(c: Creature) { return c.size + c.strength + c.health + c.stamina; }
export function sumGirlStats(g: Girl) { return g.strength + g.health + g.stamina; }

export function ensureGachaAllowed(state: State, player: Player, spec: Spec, cfg: Config) {
  if (cfg.constraints.no_gacha_if_girl_rooms_full) {
    const rooms = Object.values(state.rooms).filter(r => r.owner_id === player.id && r.kind === 'GIRL');
    const occupied = rooms.filter(r => r.occupied).length;
    if (occupied >= rooms.length) throw new Error('All girl rooms are occupied: gacha rolls are disabled.');
  }
  const cost = cfg.gacha.cost[spec];
  if (player.unique[spec] < cost) throw new Error(`Not enough ${spec} currency for gacha (need ${cost}).`);
}

export function performGacha(state: State, player: Player, spec: Spec): Girl {
  const cfg = loadConfig();
  ensureGachaAllowed(state, player, spec, cfg);
  const girlsFile = loadGirlTemplates();
  const pool = girlsFile.gacha_pools[spec];
  const templates = girlsFile.girls.filter(g => g.specialization === spec);
  const rarityWeights = pool.weights_by_rarity;
  const grouped: Record<string, any[]> = { 'SSR':[], 'SR':[], 'R':[], 'N':[] };
  for (const t of templates) grouped[t.rarity].push(t);
  const rarities = Object.keys(rarityWeights);
  const rar = choiceWeighted(rarities, rarities.map(r=>rarityWeights[r]));
  const bucket = grouped[rar] ?? templates;
  const template = bucket[Math.floor(Math.random()*bucket.length)];
  const cost = cfg.gacha.cost[spec];
  player.unique[spec] -= cost;
  // Create girl
  const girl: Girl = {
    id: `G_${cryptoRandomLike()}`,
    owner_id: player.id,
    template_id: template.template_id,
    name: template.name,
    spec: template.specialization,
    health: template.base_stats.health,
    energy: template.base_stats.energy,
    strength: template.base_stats.strength,
    stamina: template.base_stats.stamina,
    status: 'free',
    room_id: null,
    created_at: nowIso()
  };
  state.girls[girl.id] = girl;
  return girl;
}

// lightweight unique string; in production use ulid()
function cryptoRandomLike() {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2,10);
  return (ts + rnd).toUpperCase();
}

export function findFreeRoom(state: State, ownerId: string, kind: 'GIRL' | 'CREATURE') {
  return Object.values(state.rooms).find(r => r.owner_id === ownerId && r.kind === kind && !r.occupied);
}

export function assign(state: State, player: Player, girl: Girl, creature: Creature): Assignment {
  const cfg = loadConfig();
  if (cfg.constraints.must_match_specialization && girl.spec !== creature.spec) {
    throw new Error('Girl and creature specialization must match.');
  }
  if (girl.status !== 'free') throw new Error('Girl is not free.');
  const gr = findFreeRoom(state, player.id, 'GIRL');
  const cr = findFreeRoom(state, player.id, 'CREATURE');
  if (!gr) throw new Error('No free GIRL room.');
  if (!cr && cfg.constraints.one_creature_per_room) throw new Error('No free CREATURE room.');

  if (gr) { gr.occupied = true; gr.occupant_id = girl.id; girl.room_id = gr.id; }
  if (cr) { cr.occupied = true; cr.occupant_id = creature.id; creature.room_id = cr.id; }

  girl.status = 'assigned';
  const a: Assignment = {
    id: aid(),
    owner_id: player.id,
    girl_id: girl.id,
    creature_id: creature.id,
    active: true,
    started_at: nowIso(),
    last_tick_at: nowIso(),
    cached_sum_stats: sumCreatureStats(creature),
    bonus_active: false
  };
  state.assignments[a.id] = a;
  return a;
}

export function doLazyTick(state: State, player: Player, assignment: Assignment) {
  const cfg = loadConfig();
  if (!assignment.active) return;
  const last = new Date(assignment.last_tick_at).getTime();
  const now = Date.now();
  const mins = (now - last) / 60000;
  if (mins < cfg.production.tick_minutes) return;

  const girl = state.girls[assignment.girl_id];
  const creature = state.creatures[assignment.creature_id];
  if (!girl || !creature) { assignment.active = false; return; }

  const hours = mins / 60;
  // currency production
  const base = cfg.production.base_currency_per_hour;
  const bonus = cfg.production.bonus_currency_per_hour;
  const labBonus = 1 + player.lab_level * cfg.lab.effects.currency_mult_per_level;
  const produced = (assignment.bonus_active ? bonus : base) * hours * labBonus;
  player.unique[girl.spec] += Math.floor(produced);

  // energy drain
  const drainBase = (assignment.cached_sum_stats / 200) * hours;
  const labReduction = 1 - player.lab_level * cfg.lab.effects.energy_drain_reduction_per_level;
  const drain = drainBase * labReduction;
  girl.energy -= drain;
  if (girl.energy <= 0 && cfg.energy.auto_rest_on_zero) {
    girl.energy = 0;
    girl.status = 'resting';
    assignment.active = false;
  }

  // pregnancy
  if (cfg.production.pregnancy_roll_per_tick && assignment.active) {
    const baseChance = 0.05;
    const add = player.lab_level * cfg.lab.effects.pregnancy_add_per_level;
    const chance = baseChance + add;
    if (Math.random() < chance) {
      const child: Creature = {
        id: cid(),
        owner_id: player.id,
        spec: girl.spec,
        size: Math.max(1, Math.round(rand(0.4,0.6)*girl.stamina + rand(0.4,0.6)*creature.size + rand(-2,2))),
        strength: Math.max(1, Math.round(rand(0.4,0.6)*girl.strength + rand(0.4,0.6)*creature.strength + rand(-2,2))),
        health: Math.max(1, Math.round(rand(0.4,0.6)*girl.health + rand(0.4,0.6)*creature.health + rand(-2,2))),
        stamina: Math.max(1, Math.round(rand(0.4,0.6)*girl.stamina + rand(0.4,0.6)*creature.stamina + rand(-2,2))),
        room_id: null,
        parents: { girl_id: girl.id, creature_id: creature.id },
        created_at: nowIso()
      };
      const free = Object.values(state.rooms).find(r => r.owner_id === player.id && r.kind === 'CREATURE' && !r.occupied);
      if (!free) {
        if (cfg.economy.auto_sell_on_no_rooms) {
          player.money += sellPrice(child, cfg);
        } else {
          player.money += sellPrice(child, cfg);
        }
      } else {
        state.creatures[child.id] = child;
        free.occupied = true; free.occupant_id = child.id; child.room_id = free.id;
      }
    }
  }

  assignment.last_tick_at = new Date(now).toISOString();
}

export function sellPrice(c: Creature, cfg?: Config) {
  const conf = cfg ?? loadConfig();
  return Math.floor(conf.economy.sell_creature_base_price + sumCreatureStats(c) * conf.economy.sell_price_per_stat_sum);
}
