# HLab – Corporate Breach & Breeding Lab Sim

HLab is a single-page Vite + React management game about running a covert research lab. Build a squad of specialists, infiltrate rival factions through grid-based hacking missions, harvest data from bio-mechanical creatures, and invest your spoils into endless research trees. The game saves automatically to `localStorage` and supports offline resource accrual.

## Core Gameplay
- **Resources:** Credits, Data, and Gems drive upgrades and recruiting. Manual hacks provide quick bursts of Credits, while passive creature production and mission rewards scale Data and Gems. 【F:types.ts†L5-L44】【F:state/gameStore.ts†L109-L167】
- **Contracts & Mini-Game:** Each faction posts expiring missions with modifiers, deposits, and tiered rewards. Launching a contract opens the full-screen `MiniGame` where you clear a grid with hazards (tough cells, traps, time bombs, viruses, shielded cores) to meet the quota before stability drops. Trade contracts alternatively sell qualifying creatures. 【F:constants.ts†L116-L204】【F:App.tsx†L40-L92】
- **Factions & Reputation:** Six core factions (OmniCorp, Red Cell, Neural Net, Void Syndicate, Aegis Systems, BioSyn, Neon Covenant) unlock mission pools and passive bonuses as reputation levels rise from Neutral to Legend. 【F:constants.ts†L67-L97】【F:constants.ts†L177-L186】
- **Staff Management:** Recruit from a roster with rarities (R → UR), toggle up to three active staff for contract bonuses, and track individual XP, health, fatigue, arousal, corruption, and fertility cycles. Staff can fall ill or be treated, and leaders link to specific factions. 【F:types.ts†L16-L94】【F:constants.ts†L188-L253】
- **Creatures & Breeding:** Own biological, mechanical, mutant, or eldritch creatures that generate passive Data. Breed compatible staff and creatures to create custom offspring with inherited stats and fertility levels, then deploy them to fulfill trade orders or boost production. 【F:types.ts†L96-L155】【F:constants.ts†L34-L66】【F:screens/BreedingScreen.tsx†L1-L180】
- **Infinite Research Lab:** Spend Credits or Data on five endlessly scaling research lines (Computing, Finance, Cognition, Security, Efficiency) that boost mission payouts, stability, XP gain, and click power. 【F:constants.ts†L255-L271】
- **Gacha & Recruitment:** Burn Gems for staff or creature rolls, including batch pulls and a free recruit flag. Recruit quality influences passive bonuses and combat performance in missions. 【F:constants.ts†L10-L14】【F:screens/GachaScreen.tsx†L1-L200】
- **Simulation Mode:** Start auto-resolving protocols for streamlined progression with the same reward structure, letting you stockpile resources while focusing on lab management. 【F:screens/SimulationScreen.tsx†L1-L220】

## Controls & Flow
1. **Home:** Monitor resource income, faction alignment theme, and cooldown-limited manual hacks (`HomeScreen`). Hidden command `DEVRINDEX` toggles dev mode. 【F:screens/HomeScreen.tsx†L17-L116】
2. **Contracts:** Browse faction missions and trade orders, pay deposits, and enter the `MiniGame` to clear targets. 【F:screens/ContractsScreen.tsx†L1-L220】
3. **Lab:** Purchase infinite research, inspect effects, and view costs that scale per level. 【F:screens/LabScreen.tsx†L1-L200】
4. **Staff:** Activate or bench staff, heal or treat conditions, deliver creatures tied to staff actions, and review stat sheets. 【F:screens/StaffScreen.tsx†L1-L240】
5. **Creatures:** Inspect owned base and bred creatures, view production bonuses, and track fatigue/arousal. 【F:screens/CreatureScreen.tsx†L1-L180】
6. **Breeding:** Pair staff with creatures, validate fertility windows, and generate hybrid offspring with new IDs. 【F:screens/BreedingScreen.tsx†L80-L180】
7. **Gacha:** Roll staff or creatures with single/batch options; free recruits honor the `freeRecruitAvailable` flag. 【F:screens/GachaScreen.tsx†L40-L120】
8. **Simulation:** Queue automated missions that resolve over time without the interactive grid. 【F:screens/SimulationScreen.tsx†L20-L140】

## Persistence & Offline Progress
- Game state saves every second to `localStorage` under `PRIVATE_LAB_SAVE_V1` and reloads on boot. 【F:state/gameStore.ts†L1-L75】【F:state/gameStore.ts†L169-L219】
- Passive income and fatigue recovery accrue while offline; upon return, time elapsed is converted into Data and rest before resuming loops. 【F:state/gameStore.ts†L109-L167】

## Tech Stack
- **Frontend:** React 18 with functional components and hooks.
- **Build Tooling:** Vite 6, TypeScript 5, and lucide-react iconography. 【F:package.json†L1-L21】
- **Audio:** Lightweight sound hooks with music theme toggles and volume control at the layout level. 【F:App.tsx†L60-L84】【F:state/gameStore.ts†L222-L234】

## Local Development
1. Install dependencies: `npm install`
2. Create `.env.local` and set `GEMINI_API_KEY` if required by your AI Studio deployment.
3. Run the dev server: `npm run dev` (defaults to Vite).
4. Optional: build for production with `npm run build`.

## Deployment
- Vite static output in `dist/` can be hosted on any static file server.
- The app is optimized for single-page hosting and expects browser `localStorage` for saves.

## Notes
- The app is intended for a desktop viewport; the interactive mini-game uses a full-screen overlay with Tailwind utility classes.
- Audio is enabled by default but can be toggled or volume-adjusted from the main layout controls.
