
export type ResourceType = 'credits' | 'data' | 'gems';

export interface Resources {
  credits: number;
  data: number;
  gems: number;
}

export type StaffRarity = 'R' | 'SR' | 'SSR' | 'UR';
export type FertilityLevel = 'None' | 'Low' | 'Medium' | 'High';
export type CyclePhase = 'Menstruation' | 'Follicular' | 'Ovulation' | 'Luteal';

export interface Staff {
  id: string;
  name: string;
  role: string;
  rarity: StaffRarity;
  description: string;
  bonusType: 'stability_regen' | 'credit_mult' | 'data_mult' | 'click_power' | 'life_extension';
  bonusValue: number; // e.g., 0.1 for 10%
  imageSeed: number;
  associatedFactionId?: string; // New: Link leader to faction
  
  // New Physical Attributes
  age: number;
  bodyType: string; // e.g. "Slim", "Curvy", "Athletic"
  breastSize: string; // e.g. "B", "C", "DD"
  baseStamina: number; // 1-10 scale
  baseIntelligence: number; // 1-10 scale
  fetish: string; // New: Preferred creature subtype
  baseFertility: FertilityLevel; // New: Base potential
  
  // Hybrid Tracking
  isHybrid?: boolean;
  hybridParentId?: string;
}

export interface StaffProgress {
    level: number;
    xp: number;
    
    // New Dynamic Status
    health: number; // 0-100 (New)
    fatigue: number; // 0-100
    arousal: number; // 0-100
    corruption: number; // 0-100
    
    // Cycle Tracking
    cycleProgress: number; // 0 to 100. 0-15 (Menses), 15-45 (Follicular), 45-55 (Ovulation), 55-100 (Luteal)
    
    isPregnant: boolean;
    pregnancyStartTime?: number; // Timestamp when breeding occurred
    pregnancyPartnerId?: string; // ID of the creature father
    disease?: string; // Name of infection if present
}

export interface Creature {
    id: string;
    type: 'Biological' | 'Mechanical' | 'Eldritch' | 'Mutant';
    subtype: string; // e.g., 'Canid', 'Feline', 'Insectoid'
    variant: string; // e.g., 'Doberman', 'Sphinx', 'Huntsman'
    rarity: StaffRarity;
    description: string;
    productionBonus: number; // Passive resource generation
    
    // New Creature Stats (0-100 scale usually)
    strength: number;
    size: number;     
    wildness: number; 
    arousal: number;  
    creepiness: number;
    fertility: FertilityLevel; // New
    
    // Bred status
    isBred?: boolean;
    generation?: number;
}

export interface CreatureStatus {
    fatigue: number;
    arousal: number;
}

export interface GameBonuses {
    creditMult: number;
    dataMult: number;
    xpMult: number;
    gemMult: number;
    stabilityRegen: number;
    critChance: number;
    maxStability: number;
    clickPower: number;
    lifeExtension: number;
    // Helper property often used in UI but calculated derived
    passiveIncomeMult?: number; 
}

// New Infinite Research Types
export type ResearchCategory = 'computing' | 'finance' | 'cognition' | 'security' | 'efficiency';

export interface ResearchDefinition {
    id: ResearchCategory;
    name: string;
    description: string;
    baseCost: number; 
    costType: 'data' | 'credits'; // New: Split economy
    costScaling: number;
    baseEffect: number; // Effect per level
    effectType: 'data_mult' | 'credit_mult' | 'xp_mult' | 'stability_max' | 'click_power';
    icon: string;
}

export type ContractModifier = 
  'volatile' | 'hardened' | 'rushed' | 'dense' | 'lucky' | 'fragile' | 'chaos' | 'precision' | 'glitch' |
  'bureaucracy' | 'bombardment' | 'replicator' | 'stealth' | 'shielded';

export type MiniGameCellType = 'normal' | 'tough' | 'critical' | 'trap' | 'red_tape' | 'time_bomb' | 'virus' | 'shielded_core' | 'gem_node';

export interface Contract {
  id: string;
  kind: 'MISSION' | 'TRADE'; // New: Distinguish between playable missions and sell orders
  factionId: string;
  title: string;
  difficulty: 'Low' | 'Medium' | 'High' | 'Extreme' | 'Black Ops' | 'Omega' | 'Simulation';
  tier: number; // Infinite Tier
  description: string;
  deposit: number; // Credits to start
  rewardData: number;
  rewardCredits: number;
  rewardGems?: number;
  durationSeconds: number;
  quota: number;
  gridSize: number; // 3 to 6
  modifiers: ContractModifier[];
  expiresAt: number; // Timestamp when contract disappears
  isInfinite?: boolean; // New Flag for Infinite Mode mechanics
  
  // Trade Specifics
  tradeReqType?: string; // e.g. "Biological"
  tradeReqStat?: 'strength' | 'size' | 'wildness' | 'creepiness';
  tradeReqValue?: number;
}

export type FactionRank = 'Neutral' | 'Associate' | 'Partner' | 'Elite' | 'Legend';

export interface Faction {
  id: string;
  name: string;
  description: string;
  color: string; // Tailwind color class snippet e.g. "cyan"
  reputation: number; 
  maxReputation: number; // New: Scales x2
  level: number; // New: 1 to 100
  unlocked: boolean;
}

export type ScreenState = 'HOME' | 'CONTRACTS' | 'SIMULATION' | 'LAB' | 'STAFF' | 'CREATURES' | 'GACHA' | 'BREEDING';

export interface GameState {
  resources: Resources;
  ownedStaffIds: string[];
  activeStaffIds: string[]; // Max 3
  staffProgress: Record<string, StaffProgress>;
  
  // New Creature Logic
  ownedCreatures: string[]; // IDs of owned creatures (base DB IDs)
  customCreatures: Creature[]; // Generated offspring
  creatureStatus: Record<string, CreatureStatus>; // Dynamic stats for creatures
  creatureHarvestTimes: Record<string, number>; // Deprecated

  // Replaced unlockedResearchIds with researchLevels
  researchLevels: Record<ResearchCategory, number>; 
  
  activeTheme: string; // 'default' or factionId
  contractsCompleted: number;
  unlockedGacha: boolean;
  freeRecruitAvailable: boolean; 
  musicEnabled: boolean;
  volume: number; // New: 0.0 to 1.0
  factions: Record<string, Faction>;
  availableContracts: Contract[]; 
  lastSaveTime: number; 
}
