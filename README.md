# Discord Creature Lab (English)

Discord game bot with mechanics:
- Collect girls (gacha) and creatures (breeding)
- Assignment by specialization (INSECT / BEAST / MONSTER / CREATURE)
- Unique currency production, pregnancy chance, auto-sell if no rooms
- Laboratory upgrades, exchange money → unique currency (2:1)
- Pagination & compact UI

## Quick start
1. **Node 18+**
2. Copy `.env.example` → `.env` and set `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`
3. Install deps:
   ```bash
   npm i
   ```
4. Register slash commands:
   ```bash
   npm run register
   ```
5. Run (dev):
   ```bash
   npm run dev
   ```

## Structure
- `src/` — bot code
- `data/girls.json` — girl templates for gacha
- `data/config.json` — starting values & global rules
- `data/state.json` — runtime state (auto-created)

## Commands
- `/profile` — show player profile
- `/summon <spec>` — gacha roll for a girl (by specialization)
- `/girls` — list girls (paginated)
- `/creatures` — list creatures (paginated)
- `/assign <girl_id> <creature_id>` — assign girl to creature (spec must match)
- `/rooms` — show rooms
- `/sell <creature_id>` — sell a creature for money
- `/exchange <money>` — convert money to unique currency (2:1)
- `/lab` — lab status
- `/rest <girl_id>` — send girl to rest

> Production & energy are calculated **lazily** on command via `last_tick_at`.
