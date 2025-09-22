import fs from 'node:fs';
import path from 'node:path';
import { nowIso, rid } from './id.js';
import type { State, Player, Room } from './types.js';
import { loadConfig } from './config.js';

const statePath = path.resolve('data/state.json');

const emptyState: State = {
  players: {},
  girls: {},
  creatures: {},
  assignments: {},
  rooms: {}
};

function save(state: State) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

export function load(): State {
  if (!fs.existsSync(statePath)) {
    const initial: State = JSON.parse(JSON.stringify(emptyState));
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    save(initial);
    return initial;
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
}

export function upsertPlayer(state: State, discordId: string): Player {
  let p = state.players[discordId];
  if (!p) {
    const cfg = loadConfig();
    p = state.players[discordId] = {
      id: discordId,
      money: cfg.player_start.money,
      unique: { ...cfg.player_start.unique },
      lab_level: cfg.player_start.lab_level,
      created_at: nowIso(),
      rooms: { girl: cfg.rooms.start_girl_rooms, creature: cfg.rooms.start_creature_rooms },
      starter_claimed: false
    };
    // Pre-create empty rooms for the player
    for (let i = 0; i < p.rooms.girl; i++) {
      const room: Room = { id: rid(), owner_id: discordId, kind: 'GIRL', occupied: false, occupant_id: null };
      state.rooms[room.id] = room;
    }
    for (let i = 0; i < p.rooms.creature; i++) {
      const room: Room = { id: rid(), owner_id: discordId, kind: 'CREATURE', occupied: false, occupant_id: null };
      state.rooms[room.id] = room;
    }
    save(state);
  }
  return p;
}

export function persist(state: State) { save(state); }
