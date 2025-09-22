export type Spec = 'INSECT' | 'BEAST' | 'MONSTER' | 'CREATURE';
export type Rarity = 'N' | 'R' | 'SR' | 'SSR';
export type GirlStatus = 'free' | 'assigned' | 'resting';

export interface GirlTemplate {
  template_id: string;
  name: string;
  specialization: Spec;
  rarity: Rarity;
  base_stats: { health: number; energy: number; strength: number; stamina: number };
  energy_drain_factor: number;
  pregnancy_chance_base: number;
  bonuses: {
    currency_per_hour_mult: number;
    energy_drain_mult: number;
    pregnancy_chance_add: number;
  };
  profile: { bio: string; tags: string[]; portrait?: string };
}

export interface Girl {
  id: string; // G_<ULID>
  owner_id: string;
  template_id: string;
  name: string;
  spec: Spec;
  health: number;
  energy: number;
  strength: number;
  stamina: number;
  status: GirlStatus;
  room_id?: string | null;
  created_at: string;
}

export interface Creature {
  id: string; // C_<ULID>
  owner_id: string;
  spec: Spec;
  size: number;
  strength: number;
  health: number;
  stamina: number;
  room_id?: string | null;
  parents?: { girl_id: string; creature_id?: string } | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  owner_id: string;
  girl_id: string;
  creature_id: string;
  active: boolean;
  started_at: string;
  last_tick_at: string;
  cached_sum_stats: number;
  bonus_active: boolean;
}

export type RoomKind = 'GIRL' | 'CREATURE';

export interface Room {
  id: string;
  owner_id: string;
  kind: RoomKind;
  occupied: boolean;
  occupant_id?: string | null;
}

export interface Player {
  id: string; // discord id
  money: number;
  unique: Record<Spec, number>;
  lab_level: number;
  created_at: string;
  rooms: { girl: number; creature: number };
}

export interface Config {
  version: number;
  economy: {
    money_to_unique_rate: number;
    sell_creature_base_price: number;
    sell_price_per_stat_sum: number;
    auto_sell_on_no_rooms: boolean;
  };
  production: {
    base_currency_per_hour: number;
    bonus_currency_per_hour: number;
    tick_minutes: number;
    pregnancy_roll_per_tick: boolean;
  };
  energy: {
    drain_formula: string;
    min_energy_to_assign: number;
    rest_regen_per_hour: number;
    auto_rest_on_zero: boolean;
  };
  lab: {
    level_start: number;
    level_max: number;
    upgrade_cost_base: number;
    upgrade_cost_mult: number;
    effects: {
      currency_mult_per_level: number;
      pregnancy_add_per_level: number;
      energy_drain_reduction_per_level: number;
      girls_room_plus_every: number;
      creatures_room_plus_every: number;
    };
  };
  rooms: { start_girl_rooms: number; start_creature_rooms: number; max_rooms_cap: number };
  gacha: {
    cost: Record<Spec, number>;
    pity: { enabled: boolean; pity_at: number; forces_min_rarity: Rarity };
  };
  constraints: {
    must_match_specialization: boolean;
    one_creature_per_room: boolean;
    no_gacha_if_girl_rooms_full: boolean;
  };
  player_start: {
    money: number;
    unique: Record<Spec, number>;
    lab_level: number;
    unlocked_specs: Spec[];
    inventory_caps: { girls: number; creatures: number };
  };
  pagination: { page_size_default: number; page_size_max: number; use_cursor: boolean };
}

export interface State {
  players: Record<string, Player>;
  girls: Record<string, Girl>;
  creatures: Record<string, Creature>;
  assignments: Record<string, Assignment>;
  rooms: Record<string, Room>;
}
