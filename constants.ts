
import { Staff, Contract, Faction, ContractModifier, FactionRank, ResearchDefinition, Creature, CyclePhase, FertilityLevel } from './types';

export const INITIAL_RESOURCES = {
  credits: 1000, 
  data: 300,     
  gems: 10,      
};

export const GACHA_COST = 25;
export const CREATURE_GACHA_COST = 50; 
export const MAX_ACTIVE_STAFF = 3;
export const getAnimeAvatarUrl = (seed: number) => `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;

export const XP_PER_LEVEL_BASE = 100; 

export const getXpForNextLevel = (currentLevel: number) => {
    // Polynomial growth is smoother for high levels (Level 100 approx 2.5M XP total, reachable)
    return Math.floor(XP_PER_LEVEL_BASE * Math.pow(currentLevel, 2.2));
};

export const getFactionRank = (reputation: number): FactionRank => {
    // Rank is now based on Level, not raw reputation number (since rep resets)
    return 'Neutral'; 
};

// --- Cycle & Fertility Logic ---

export const getCyclePhase = (progress: number): CyclePhase => {
    if (progress < 15) return 'Menstruation';
    if (progress < 45) return 'Follicular';
    if (progress < 55) return 'Ovulation';
    return 'Luteal';
};

export const getFertilityValue = (level: FertilityLevel): number => {
    switch(level) {
        case 'High': return 1.5;
        case 'Medium': return 1.0;
        case 'Low': return 0.5;
        case 'None': return 0;
        default: return 0;
    }
};

export const getCurrentFertility = (base: FertilityLevel, cycleProgress: number): FertilityLevel => {
    // Sterile staff (e.g. Androids) never have fertility cycles
    if (base === 'None') return 'None';

    const phase = getCyclePhase(cycleProgress);
    if (phase === 'Menstruation') return 'None';
    if (phase === 'Ovulation') return 'High';
    
    // During Follicular/Luteal, revert to base, but cap at Medium if base is High (unless Ovulating)
    if (base === 'High') return 'Medium';
    
    return base; // Low or Medium stays as is
};

export const CREATURE_DB: Creature[] = [
    // Biological -> Canid
    { id: 'c_dog_doberman', type: 'Biological', subtype: 'Canid', variant: 'Doberman', rarity: 'R', description: 'Loyal guard dog.', productionBonus: 1, strength: 60, size: 50, wildness: 20, arousal: 40, creepiness: 5, fertility: 'High' },
    { id: 'c_dog_wolf', type: 'Biological', subtype: 'Canid', variant: 'Grey Wolf', rarity: 'SR', description: 'Wild instincts intact.', productionBonus: 2, strength: 75, size: 60, wildness: 80, arousal: 50, creepiness: 10, fertility: 'Medium' },
    { id: 'c_dog_cerberus', type: 'Biological', subtype: 'Canid', variant: 'Cyber-Cerberus', rarity: 'SSR', description: 'Three heads, three times the bite.', productionBonus: 5, strength: 95, size: 90, wildness: 90, arousal: 80, creepiness: 40, fertility: 'Low' },
    
    // Biological -> Feline
    { id: 'c_cat_sphinx', type: 'Biological', subtype: 'Feline', variant: 'Sphinx', rarity: 'R', description: 'Hairless and judging.', productionBonus: 1, strength: 20, size: 30, wildness: 40, arousal: 30, creepiness: 20, fertility: 'Medium' },
    { id: 'c_cat_panther', type: 'Biological', subtype: 'Feline', variant: 'Void Panther', rarity: 'SR', description: 'Melds with shadows.', productionBonus: 3, strength: 70, size: 60, wildness: 70, arousal: 60, creepiness: 25, fertility: 'Medium' },
    
    // Mutant -> Amorphous
    { id: 'c_mut_ooze', type: 'Mutant', subtype: 'Amorphous', variant: 'Green Ooze', rarity: 'R', description: 'Radioactive waste byproduct.', productionBonus: 1, strength: 30, size: 40, wildness: 10, arousal: 20, creepiness: 60, fertility: 'High' },
    { id: 'c_mut_shoggoth', type: 'Mutant', subtype: 'Amorphous', variant: 'Proto-Shoggoth', rarity: 'UR', description: 'Tekeli-li!', productionBonus: 10, strength: 100, size: 100, wildness: 100, arousal: 90, creepiness: 100, fertility: 'Low' },

    // Mechanical -> Drone (Mechanics can't breed biologically usually, but for game logic let's say "Replication Protocol")
    { id: 'c_mech_spider', type: 'Mechanical', subtype: 'Drone', variant: 'Spider Bot', rarity: 'R', description: 'Crawls in vents.', productionBonus: 1, strength: 40, size: 20, wildness: 0, arousal: 0, creepiness: 30, fertility: 'None' },
    { id: 'c_mech_sentinel', type: 'Mechanical', subtype: 'Drone', variant: 'Heavy Sentinel', rarity: 'SR', description: 'Armed and dangerous.', productionBonus: 3, strength: 85, size: 80, wildness: 10, arousal: 10, creepiness: 15, fertility: 'None' },
    
    // Eldritch -> Tentacle
    { id: 'c_eld_spawn', type: 'Eldritch', subtype: 'Tentacle', variant: 'Abyssal Spawn', rarity: 'SR', description: 'Reaches from the dark.', productionBonus: 4, strength: 60, size: 70, wildness: 90, arousal: 100, creepiness: 85, fertility: 'High' },
];

export const FACTION_TEMPLATES: Faction[] = [
  // ... (No changes to Factions, keeping brevity)
  { id: 'omnicorp', name: 'OmniCorp', description: 'The standard for corporate research.', color: 'blue', reputation: 0, maxReputation: 100, level: 1, unlocked: true },
  { id: 'red_cell', name: 'Red Cell', description: 'Rogue paramilitary science division.', color: 'red', reputation: 0, maxReputation: 100, level: 1, unlocked: true },
  { id: 'neural_net', name: 'Neural Net', description: 'A collective of AI enthusiasts.', color: 'emerald', reputation: 0, maxReputation: 100, level: 1, unlocked: true },
  { id: 'void_syndicate', name: 'The Void', description: 'Black market research collective.', color: 'violet', reputation: 0, maxReputation: 100, level: 1, unlocked: true },
  { id: 'aegis_systems', name: 'Aegis Systems', description: 'High-tech defense contractors.', color: 'orange', reputation: 0, maxReputation: 100, level: 1, unlocked: true },
  { id: 'bio_syn', name: 'BioSyn Labs', description: 'Merging flesh and silicon.', color: 'lime', reputation: 0, maxReputation: 100, level: 1, unlocked: true },
  { id: 'neon_covenant', name: 'Neon Covenant', description: 'Techno-religious fanatics.', color: 'fuchsia', reputation: 0, maxReputation: 100, level: 1, unlocked: true }
];

export const FACTION_STYLES: Record<string, any> = {
    // ... (Keeping existing styles, omitting for brevity as they don't change)
    omnicorp: { bgTrans: 'bg-blue-950/40', bgTransHover: 'bg-blue-900/30', border: 'border-blue-500', borderDim: 'border-blue-500/30', text: 'text-blue-500', textLight: 'text-blue-100', textHighlight: 'text-blue-400', btn: 'bg-blue-700', btnHover: 'hover:bg-blue-600', dot: 'bg-blue-500' },
    red_cell: { bgTrans: 'bg-red-950/40', bgTransHover: 'bg-red-900/30', border: 'border-red-500', borderDim: 'border-red-500/30', text: 'text-red-500', textLight: 'text-red-100', textHighlight: 'text-red-400', btn: 'bg-red-700', btnHover: 'hover:bg-red-600', dot: 'bg-red-500' },
    neural_net: { bgTrans: 'bg-emerald-950/40', bgTransHover: 'bg-emerald-900/30', border: 'border-emerald-500', borderDim: 'border-emerald-500/30', text: 'text-emerald-500', textLight: 'text-emerald-100', textHighlight: 'text-emerald-400', btn: 'bg-emerald-700', btnHover: 'hover:bg-emerald-600', dot: 'bg-emerald-500' },
    void_syndicate: { bgTrans: 'bg-violet-950/40', bgTransHover: 'bg-violet-900/30', border: 'border-violet-500', borderDim: 'border-violet-500/30', text: 'text-violet-500', textLight: 'text-violet-100', textHighlight: 'text-violet-400', btn: 'bg-violet-700', btnHover: 'hover:bg-violet-600', dot: 'bg-violet-500' },
    aegis_systems: { bgTrans: 'bg-orange-950/40', bgTransHover: 'bg-orange-900/30', border: 'border-orange-500', borderDim: 'border-orange-500/30', text: 'text-orange-500', textLight: 'text-orange-100', textHighlight: 'text-orange-400', btn: 'bg-orange-700', btnHover: 'hover:bg-orange-600', dot: 'bg-orange-500' },
    bio_syn: { bgTrans: 'bg-lime-950/40', bgTransHover: 'bg-lime-900/30', border: 'border-lime-500', borderDim: 'border-lime-500/30', text: 'text-lime-500', textLight: 'text-lime-100', textHighlight: 'text-lime-400', btn: 'bg-lime-700', btnHover: 'hover:bg-lime-600', dot: 'bg-lime-500' },
    neon_covenant: { bgTrans: 'bg-fuchsia-950/40', bgTransHover: 'bg-fuchsia-900/30', border: 'border-fuchsia-500', borderDim: 'border-fuchsia-500/30', text: 'text-fuchsia-500', textLight: 'text-fuchsia-100', textHighlight: 'text-fuchsia-400', btn: 'bg-fuchsia-700', btnHover: 'hover:bg-fuchsia-600', dot: 'bg-fuchsia-500' }
};

export const FACTION_LEADERS: Staff[] = [
  { id: 'd1', name: 'Anastasia', role: 'OmniCorp Director', rarity: 'UR', description: 'Profit is the ultimate logic.', bonusType: 'credit_mult', bonusValue: 2.00, imageSeed: 5001, associatedFactionId: 'omnicorp', age: 34, bodyType: 'Fit', breastSize: 'C', baseStamina: 8, baseIntelligence: 10, fetish: 'Drone', baseFertility: 'Medium' },
  { id: 'd2', name: 'Scarlet', role: 'Red Cell General', rarity: 'UR', description: 'The revolution requires sacrifice.', bonusType: 'click_power', bonusValue: 10, imageSeed: 5002, associatedFactionId: 'red_cell', age: 29, bodyType: 'Athletic', breastSize: 'D', baseStamina: 10, baseIntelligence: 7, fetish: 'Canid', baseFertility: 'High' },
  { id: 'd3', name: 'Cortex', role: 'Neural Net Prime', rarity: 'UR', description: 'We are all connected.', bonusType: 'data_mult', bonusValue: 2.00, imageSeed: 5003, associatedFactionId: 'neural_net', age: 22, bodyType: 'Petite', breastSize: 'B', baseStamina: 5, baseIntelligence: 10, fetish: 'Drone', baseFertility: 'Low' },
  { id: 'd4', name: 'Nyx', role: 'Void Queen', rarity: 'UR', description: 'Stare into the abyss.', bonusType: 'credit_mult', bonusValue: 3.00, imageSeed: 5004, associatedFactionId: 'void_syndicate', age: 100, bodyType: 'Voluptuous', breastSize: 'E', baseStamina: 9, baseIntelligence: 9, fetish: 'Amorphous', baseFertility: 'Medium' },
  { id: 'd5', name: 'Valkyrie', role: 'Aegis Warden', rarity: 'UR', description: 'The absolute wall.', bonusType: 'life_extension', bonusValue: 1.00, imageSeed: 5005, associatedFactionId: 'aegis_systems', age: 31, bodyType: 'Muscular', breastSize: 'D', baseStamina: 10, baseIntelligence: 6, fetish: 'Canid', baseFertility: 'Medium' },
  { id: 'd6', name: 'Dr. Spore', role: 'BioSyn Labs Lead', rarity: 'UR', description: 'Evolution is mandatory.', bonusType: 'life_extension', bonusValue: 1.50, imageSeed: 5006, associatedFactionId: 'bio_syn', age: 45, bodyType: 'Slim', breastSize: 'C', baseStamina: 7, baseIntelligence: 10, fetish: 'Tentacle', baseFertility: 'High' },
  { id: 'd7', name: 'Prophet Glitch', role: 'Neon High Priest', rarity: 'UR', description: 'The code is divine.', bonusType: 'data_mult', bonusValue: 1.50, imageSeed: 5007, associatedFactionId: 'neon_covenant', age: 19, bodyType: 'Cybernetic', breastSize: 'B', baseStamina: 10, baseIntelligence: 8, fetish: 'Drone', baseFertility: 'Low' },
];

export const STAFF_DB: Staff[] = [
    ...FACTION_LEADERS,
    { id: 's_r1', name: 'Kaito', role: 'Script Kiddie', rarity: 'R', description: 'Fast typer, low accuracy.', bonusType: 'click_power', bonusValue: 1, imageSeed: 1001, age: 19, bodyType: 'Slim', breastSize: 'A', baseStamina: 4, baseIntelligence: 5, fetish: 'Feline', baseFertility: 'Medium' },
    { id: 's_r2', name: 'Lena', role: 'Data Analyst', rarity: 'R', description: 'Finds patterns in noise.', bonusType: 'data_mult', bonusValue: 0.05, imageSeed: 1002, age: 24, bodyType: 'Average', breastSize: 'B', baseStamina: 5, baseIntelligence: 7, fetish: 'Tentacle', baseFertility: 'Medium' },
    { id: 's_r3', name: 'Marcus', role: 'Sysadmin', rarity: 'R', description: 'Keeps the servers cold.', bonusType: 'stability_regen', bonusValue: 1, imageSeed: 1003, age: 35, bodyType: 'Heavy', breastSize: 'N/A', baseStamina: 6, baseIntelligence: 6, fetish: 'Canid', baseFertility: 'Low' },
    { id: 's_r4', name: 'Sarah', role: 'Accountant', rarity: 'R', description: 'Pennypincher.', bonusType: 'credit_mult', bonusValue: 0.05, imageSeed: 1004, age: 28, bodyType: 'Curvy', breastSize: 'D', baseStamina: 3, baseIntelligence: 8, fetish: 'Drone', baseFertility: 'High' },
    { id: 's_r5', name: 'Unit 734', role: 'Android Helper', rarity: 'R', description: 'Does not sleep.', bonusType: 'life_extension', bonusValue: 0.05, imageSeed: 1005, age: 1, bodyType: 'Synthetic', breastSize: 'C', baseStamina: 10, baseIntelligence: 4, fetish: 'Drone', baseFertility: 'None' },
    { id: 's_sr1', name: 'Cipher', role: 'White Hat', rarity: 'SR', description: 'Security expert.', bonusType: 'stability_regen', bonusValue: 3, imageSeed: 2001, age: 26, bodyType: 'Athletic', breastSize: 'B', baseStamina: 7, baseIntelligence: 8, fetish: 'Canid', baseFertility: 'Medium' },
    { id: 's_sr2', name: 'Viper', role: 'Penetration Tester', rarity: 'SR', description: 'Breaks things to fix them.', bonusType: 'click_power', bonusValue: 2, imageSeed: 2002, age: 23, bodyType: 'Fit', breastSize: 'C', baseStamina: 8, baseIntelligence: 7, fetish: 'Amorphous', baseFertility: 'Medium' },
    { id: 's_sr3', name: 'Nova', role: 'AI Researcher', rarity: 'SR', description: 'Pushing boundaries.', bonusType: 'data_mult', bonusValue: 0.15, imageSeed: 2003, age: 21, bodyType: 'Petite', breastSize: 'B', baseStamina: 4, baseIntelligence: 9, fetish: 'Tentacle', baseFertility: 'High' },
    { id: 's_sr4', name: 'Midas', role: 'Crypto Broker', rarity: 'SR', description: 'Turns data to gold.', bonusType: 'credit_mult', bonusValue: 0.15, imageSeed: 2004, age: 40, bodyType: 'Average', breastSize: 'N/A', baseStamina: 5, baseIntelligence: 9, fetish: 'Feline', baseFertility: 'Low' },
    { id: 's_ssr1', name: 'Ghost', role: 'Legendary Hacker', rarity: 'SSR', description: 'Does not exist.', bonusType: 'click_power', bonusValue: 5, imageSeed: 3001, age: 30, bodyType: 'Slim', breastSize: 'C', baseStamina: 9, baseIntelligence: 10, fetish: 'Drone', baseFertility: 'Medium' },
    { id: 's_ssr2', name: 'Oracle', role: 'Predictive AI', rarity: 'SSR', description: 'Sees the future.', bonusType: 'data_mult', bonusValue: 0.30, imageSeed: 3002, age: 1000, bodyType: 'Hologram', breastSize: 'DD', baseStamina: 10, baseIntelligence: 10, fetish: 'Amorphous', baseFertility: 'None' },
    { id: 's_ssr3', name: 'Titan', role: 'Infrastructure Lead', rarity: 'SSR', description: 'Unbreakable.', bonusType: 'stability_regen', bonusValue: 8, imageSeed: 3003, age: 45, bodyType: 'Muscular', breastSize: 'N/A', baseStamina: 10, baseIntelligence: 7, fetish: 'Canid', baseFertility: 'Low' },
];

export const INFINITE_RESEARCH_DEFS: ResearchDefinition[] = [
    { id: 'computing', name: 'Quantum Processing', description: 'Boosts Data yield from contracts.', baseCost: 150, costType: 'credits', costScaling: 1.45, baseEffect: 0.05, effectType: 'data_mult', icon: 'cpu' },
    { id: 'finance', name: 'Algorithmic Trading', description: 'Boosts Credit yield from contracts.', baseCost: 150, costType: 'data', costScaling: 1.45, baseEffect: 0.05, effectType: 'credit_mult', icon: 'dollar' },
    { id: 'cognition', name: 'Deep Learning', description: 'Increases Staff XP gain.', baseCost: 300, costType: 'data', costScaling: 1.5, baseEffect: 0.10, effectType: 'xp_mult', icon: 'brain' },
    { id: 'security', name: 'Firewall Hardening', description: 'Increases Max Stability.', baseCost: 200, costType: 'credits', costScaling: 1.4, baseEffect: 10, effectType: 'stability_max', icon: 'shield' },
    { id: 'efficiency', name: 'Overclocking', description: 'Increases Manual Click Power.', baseCost: 500, costType: 'data', costScaling: 1.6, baseEffect: 1, effectType: 'click_power', icon: 'zap' },
];

export const FACTION_RANK_BONUSES = {
    omnicorp: { Associate: 'Unlock Lv2', Partner: '+10% Credits', Elite: '+20% Credits' },
    red_cell: { Associate: '+5% Crit', Partner: '+10% Crit', Elite: '+20% Crit' },
    neural_net: { Associate: '+5% Data', Partner: '+15% Data', Elite: '+30% Data' },
    void_syndicate: { Associate: '+5% Gems', Partner: '+10% Gems', Elite: '+20% Gems' },
    aegis_systems: { Associate: '+1 Stab. Regen', Partner: '+2 Stab. Regen', Elite: '+4 Stab. Regen' },
    bio_syn: { Associate: '+10% Time', Partner: '+20% Time', Elite: '+40% Time' },
    neon_covenant: { Associate: '+5% Glitch', Partner: '+10% Glitch', Elite: '+25% Glitch' }
};

export const generateContract = (faction: Faction, totalCompleted: number): Contract => {
  const now = Date.now();
  const baseTier = Math.floor(totalCompleted / 5) + 1; 
  const tierVariation = Math.floor(Math.random() * 3) - 1; 
  const tier = Math.max(1, baseTier + tierVariation);
  
  const isTrade = Math.random() < 0.20;

  if (isTrade) {
      const types = ['Biological', 'Mechanical', 'Mutant', 'Eldritch'];
      const stats: Array<'strength' | 'size' | 'wildness' | 'creepiness'> = ['strength', 'size', 'wildness', 'creepiness'];
      
      const reqType = types[Math.floor(Math.random() * types.length)];
      const reqStat = stats[Math.floor(Math.random() * stats.length)];
      const reqValue = Math.min(90, 20 + (tier * 2) + Math.floor(Math.random() * 20));
      
      const basePrice = 500 + (tier * 150);
      const rewardCredits = Math.floor(basePrice * (0.8 + Math.random() * 0.4));

      return {
          id: `t_${faction.id}_${now}_${Math.random().toString(36).substring(2, 7)}`,
          kind: 'TRADE',
          factionId: faction.id,
          title: `Acquisition: ${reqType} Asset`,
          difficulty: 'Low',
          tier,
          description: `Looking for ${reqType} specimen with ${reqStat} > ${reqValue}.`,
          deposit: 0,
          rewardCredits,
          rewardData: 0,
          rewardGems: 0,
          durationSeconds: 0,
          quota: 0,
          gridSize: 0,
          modifiers: [],
          expiresAt: now + (300 * 1000),
          tradeReqType: reqType,
          tradeReqStat: reqStat,
          tradeReqValue: reqValue
      };
  }

  let difficulty: Contract['difficulty'] = 'Low';
  if (tier >= 60) difficulty = 'Omega';
  else if (tier >= 40) difficulty = 'Black Ops';
  else if (tier >= 25) difficulty = 'Extreme';
  else if (tier >= 12) difficulty = 'High';
  else if (tier >= 5) difficulty = 'Medium';
  else difficulty = 'Low';

  const scalingFactor = Math.pow(1.15, tier - 1);
  let baseCredits = 180 * scalingFactor;
  let baseData = 100 * scalingFactor;
  
  let baseTime = 30;
  if (difficulty === 'Omega') baseTime = 60; 
  else if (difficulty === 'Black Ops') baseTime = 55;
  else if (difficulty === 'Extreme') baseTime = 50;
  else if (difficulty === 'High') baseTime = 45;
  else if (difficulty === 'Medium') baseTime = 40;
  
  // Adjusted Quota Logic: 30 base + linear tier scaling + small exponential factor
  // Smoother curve: T1=35, T50=1370, T100=7200.
  let baseQuota = Math.max(30, Math.floor(30 + (tier * 5) * Math.pow(1.04, tier))); 
  let gridSize = 4;
  if (tier > 50) gridSize = 7;
  else if (tier > 30) gridSize = 6;
  else if (tier > 10) gridSize = 5;

  let modifiers: ContractModifier[] = [];
  const numModifiers = Math.min(6, Math.floor(tier / 6));
  const pool: ContractModifier[] = ['volatile', 'hardened', 'rushed', 'dense', 'fragile', 'chaos', 'precision', 'glitch', 'bureaucracy', 'bombardment', 'replicator', 'stealth', 'shielded'];
  
  for(let i=0; i<numModifiers; i++) {
      modifiers.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  if (faction.id === 'red_cell') { baseCredits *= 1.5; baseData *= 0.7; modifiers.push('volatile'); } 
  else if (faction.id === 'neural_net') { baseCredits *= 0.8; baseData *= 1.5; modifiers.push('dense'); } 
  else if (faction.id === 'void_syndicate') { baseCredits *= 2.0; baseData *= 0.5; modifiers.push('chaos'); } 
  else if (faction.id === 'aegis_systems') { modifiers.push('hardened'); } 
  else if (faction.id === 'bio_syn') { baseTime += 10; modifiers.push('replicator'); } 
  else if (faction.id === 'neon_covenant') { baseCredits *= 1.2; baseData *= 1.2; modifiers.push('glitch'); }

  const repMultiplier = Math.max(0.5, 1 + (faction.level * 0.1));
  const finalCredits = Math.floor(baseCredits * repMultiplier * (0.9 + Math.random() * 0.2)); 
  const finalData = Math.floor(baseData * repMultiplier * (0.9 + Math.random() * 0.2));
  
  let gemCount = 0;
  if (difficulty === 'Omega') gemCount = 15 + Math.floor(Math.random() * 15);
  else if (difficulty === 'Black Ops') gemCount = 8 + Math.floor(Math.random() * 8);
  else if (difficulty === 'Extreme') gemCount = 3 + Math.floor(Math.random() * 5);
  else if (difficulty === 'High') gemCount = 1 + Math.floor(Math.random() * 2);
  
  if ((faction.id === 'void_syndicate' || faction.id === 'neon_covenant') && Math.random() < 0.2) gemCount += 1;

  const deposit = Math.floor(finalCredits * 0.10); 
  const titles = ['Data Extraction', 'Security Override', 'Pattern Analysis', 'Asset Recovery', 'Firewall Breach', 'Quantum Stabilization', 'Neural Mapping', 'Hazard Cleanup', 'Protocol Omega', 'Void Stare', 'Core Dump', 'System Shock', 'Mainframe Dive', 'Ghost Hunt', 'Logic Bomb', 'Zero Day', 'Encryption Break', 'Satellite Uplink', 'Memory Retrieval', 'Code Injection', 'Server Farm Raid', 'Bioshack Defense', 'AI Containment', 'Algorithm Training', 'Dark Web Scan', 'Signal Intercept'];
  let title = `${titles[Math.floor(Math.random() * titles.length)]} ${Math.floor(Math.random() * 999)}`;
  if (tier > 10) title += ` MK-${tier}`;

  const expirationSeconds = 60 + Math.floor(Math.random() * 120);

  return {
      id: `c_${faction.id}_${now}_${Math.floor(Math.random()*1000000)}_${Math.random().toString(36).substring(2, 7)}`,
      kind: 'MISSION',
      factionId: faction.id,
      title,
      difficulty,
      tier,
      description: `Scaling contract. Tier ${tier}.`,
      deposit,
      rewardCredits: finalCredits,
      rewardData: finalData,
      rewardGems: gemCount,
      durationSeconds: baseTime,
      quota: baseQuota,
      gridSize,
      modifiers: [...new Set(modifiers)],
      expiresAt: now + (expirationSeconds * 1000)
  };
};
