
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
    GameState, Resources, Faction, Staff, Contract, Creature, 
    ResearchCategory, StaffProgress, GameBonuses, ResourceType, CreatureStatus
} from '../types';
import { 
    INITIAL_RESOURCES, FACTION_TEMPLATES, generateContract, 
    STAFF_DB, CREATURE_DB, INFINITE_RESEARCH_DEFS, 
    GACHA_COST, CREATURE_GACHA_COST, MAX_ACTIVE_STAFF, 
    getXpForNextLevel, getCyclePhase, FACTION_RANK_BONUSES
} from '../constants';
import { playSound, setAudioVolume } from '../utils/audio';

const STORAGE_KEY = 'PRIVATE_LAB_SAVE_V1';

export const useGameStore = () => {
  const [state, setState] = useState<GameState>(() => {
    const saved = (typeof window !== 'undefined' && window.localStorage)
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    let loadedState: Partial<GameState> = {};
    if (saved) {
      try {
        loadedState = JSON.parse(saved);
      } catch (e) { console.error("Save file corrupted"); }
    }

    const baseFactions: Record<string, Faction> = {};
    FACTION_TEMPLATES.forEach(f => baseFactions[f.id] = f);

    const mergedFactions = { ...baseFactions };
    if (loadedState.factions) {
        Object.keys(baseFactions).forEach(key => {
            const savedFaction = loadedState.factions![key];
            if (savedFaction) {
                mergedFactions[key] = {
                    ...baseFactions[key],
                    reputation: savedFaction.reputation || 0,
                    maxReputation: savedFaction.maxReputation || 100,
                    level: savedFaction.level || 1,
                    unlocked: savedFaction.unlocked ?? baseFactions[key].unlocked
                };
            }
        });
    }

    let researchLevels = loadedState.researchLevels || {
        'computing': 0, 'finance': 0, 'security': 0, 'cognition': 0, 'efficiency': 0
    };

    const mergedStaffProgress = { ...(loadedState.staffProgress || {}) };
    Object.keys(mergedStaffProgress).forEach(id => {
        if (mergedStaffProgress[id].cycleProgress === undefined) {
            mergedStaffProgress[id].cycleProgress = Math.random() * 100;
        }
    });

    const mergedResources = { ...INITIAL_RESOURCES, ...(loadedState.resources || {}) };

    const finalState: GameState = {
      resources: mergedResources,
      ownedStaffIds: loadedState.ownedStaffIds || [],
      activeStaffIds: loadedState.activeStaffIds || [],
      staffProgress: mergedStaffProgress,
      ownedCreatures: loadedState.ownedCreatures || ['c_dog_doberman'], 
      customCreatures: loadedState.customCreatures || [], 
      creatureStatus: loadedState.creatureStatus || {},
      creatureHarvestTimes: {}, 
      researchLevels,
      activeTheme: loadedState.activeTheme || 'default',
      contractsCompleted: loadedState.contractsCompleted || 0,
      unlockedGacha: loadedState.unlockedGacha ?? true,
      freeRecruitAvailable: loadedState.freeRecruitAvailable ?? true,
      musicEnabled: loadedState.musicEnabled ?? true,
      volume: loadedState.volume ?? 0.3,
      factions: mergedFactions,
      availableContracts: loadedState.availableContracts || [], 
      lastSaveTime: loadedState.lastSaveTime || Date.now(),
    };

    if (finalState.availableContracts.length === 0 || (finalState.availableContracts[0] && !finalState.availableContracts[0].expiresAt)) {
        let newContracts: any[] = [];
        Object.values(mergedFactions).forEach(f => {
            for(let i=0; i<4; i++) {
                newContracts.push(generateContract(f, finalState.contractsCompleted));
            }
        });
        finalState.availableContracts = newContracts;
    }

    return finalState;
  });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    }, 1000);
  }, [state]);

  useEffect(() => {
      setAudioVolume(state.volume);
  }, [state.volume]);

  // --- PASSIVE GAME LOOP ---
  // Handles Stats Regeneration, Cycle Progress, Disease AND Contract Expiration
  useEffect(() => {
      const interval = setInterval(() => {
          setState(prev => {
              const now = Date.now();
              const newProgress = { ...prev.staffProgress };
              const newCreatureStatus = { ...prev.creatureStatus };
              let changed = false;
              let staffToRemoveFromSquad: string[] = [];

              // --- 1. CONTRACT EXPIRATION & REPLENISHMENT ---
              // Filter out expired contracts (unless they are Infinite Simulation contracts which don't auto-expire in list)
              let newContracts = prev.availableContracts.filter(c => c.isInfinite || c.expiresAt > now);
              
              // Detect if we lost any contracts
              if (newContracts.length !== prev.availableContracts.length) {
                  changed = true;
                  
                  // Count contracts per faction
                  const countsByFaction: Record<string, number> = {};
                  newContracts.forEach(c => {
                      if (!c.isInfinite) {
                          countsByFaction[c.factionId] = (countsByFaction[c.factionId] || 0) + 1;
                      }
                  });

                  // Replenish to minimum 4 per faction
                  Object.values(prev.factions).forEach(f => {
                      const currentCount = countsByFaction[f.id] || 0;
                      if (currentCount < 4) {
                          const needed = 4 - currentCount;
                          for(let i = 0; i < needed; i++) {
                              newContracts.push(generateContract(f, prev.contractsCompleted));
                          }
                      }
                  });
              }

              // --- 2. STAFF LOOP ---
              prev.ownedStaffIds.forEach(id => {
                  const staff = STAFF_DB.find(s => s.id === id);
                  if (!staff) return;
                  
                  let p = { ...(newProgress[id] || { 
                      level: 1, xp: 0, health: 100, fatigue: 0, arousal: 0, corruption: 0, 
                      cycleProgress: Math.random() * 100, isPregnant: false 
                  }) };
                  
                  const isActive = prev.activeStaffIds.includes(id);

                  // Cycle Progression (Only if not pregnant and not sterile)
                  if (!p.isPregnant && staff.baseFertility !== 'None') {
                      p.cycleProgress = (p.cycleProgress || 0) + 0.1; 
                      if (p.cycleProgress >= 100) p.cycleProgress = 0;
                      changed = true;
                  }

                  // Fatigue Recovery (Inactive only)
                  if (!isActive && (p.fatigue || 0) > 0) {
                      const recRate = 0.5 + (staff.baseStamina * 0.1);
                      p.fatigue = Math.max(0, (p.fatigue || 0) - recRate);
                      changed = true;
                  }

                  // Arousal Accumulation
                  if ((p.arousal || 0) < 100) {
                      p.arousal = Math.min(100, (p.arousal || 0) + 0.2);
                      changed = true;
                  }

                  // Health Logic & Incapacitation
                  // Disease prevents regeneration and drains health
                  if (p.disease) {
                      p.health = Math.max(0, (p.health || 100) - 0.2); 
                      changed = true;
                  } else if (!isActive && (p.health || 100) < 100) {
                      // Only regen if inactive AND not diseased
                      p.health = Math.min(100, (p.health || 100) + 0.1); 
                      changed = true;
                  }

                  // Auto-unequip if health is 0 (Incapacitated)
                  if ((p.health || 100) <= 0 && isActive) {
                      staffToRemoveFromSquad.push(id);
                      changed = true;
                  }

                  newProgress[id] = p;
              });

              // --- 3. CREATURE LOOP ---
              prev.ownedCreatures.forEach(cId => {
                  let status = { ...(newCreatureStatus[cId] || { fatigue: 0, arousal: 50 }) };
                  const creatureDef = [...CREATURE_DB, ...prev.customCreatures].find(c => c.id === cId);
                  
                  // Fatigue Recovery
                  if (status.fatigue > 0) {
                      status.fatigue = Math.max(0, status.fatigue - 0.3);
                      changed = true;
                  }

                  // Arousal Accumulation
                  const wildMod = creatureDef ? (creatureDef.wildness / 200) : 0.25;
                  if (status.arousal < 100) {
                      status.arousal = Math.min(100, status.arousal + 0.2 + wildMod);
                      changed = true;
                  }

                  newCreatureStatus[cId] = status;
              });

              if (!changed) return prev;

              // Handle auto-unequip
              let newActiveStaffIds = [...prev.activeStaffIds];
              if (staffToRemoveFromSquad.length > 0) {
                  newActiveStaffIds = newActiveStaffIds.filter(id => !staffToRemoveFromSquad.includes(id));
              }

              return {
                  ...prev,
                  staffProgress: newProgress,
                  activeStaffIds: newActiveStaffIds,
                  creatureStatus: newCreatureStatus,
                  availableContracts: newContracts
              };
          });
      }, 1000); // 1 Second Tick

      return () => clearInterval(interval);
  }, []);

  // --- Helpers ---

  const getBonuses = useCallback((): GameBonuses => {
      let bonuses: GameBonuses = {
          creditMult: 1, dataMult: 1, xpMult: 1, gemMult: 1,
          stabilityRegen: 1, critChance: 0.05, maxStability: 100,
          clickPower: 1, lifeExtension: 1
      };

      // Staff Bonuses
      state.activeStaffIds.forEach(id => {
          const staff = STAFF_DB.find(s => s.id === id);
          const progress = state.staffProgress[id];
          // Only apply bonuses if alive (Health > 0)
          if (staff && progress && (progress.health || 100) > 0) {
              const levelMult = 1 + ((progress.level - 1) * 0.1);
              const val = staff.bonusValue * levelMult;
              
              if (staff.bonusType === 'credit_mult') bonuses.creditMult += val;
              else if (staff.bonusType === 'data_mult') bonuses.dataMult += val;
              else if (staff.bonusType === 'stability_regen') bonuses.stabilityRegen += val;
              else if (staff.bonusType === 'click_power') bonuses.clickPower += val;
              else if (staff.bonusType === 'life_extension') bonuses.lifeExtension += val;
          }
      });

      // Research Bonuses
      Object.entries(state.researchLevels).forEach(([cat, level]) => {
          const def = INFINITE_RESEARCH_DEFS.find(d => d.id === cat);
          if (def && level > 0) {
              const val = level * def.baseEffect;
              if (def.effectType === 'data_mult') bonuses.dataMult += val;
              else if (def.effectType === 'credit_mult') bonuses.creditMult += val;
              else if (def.effectType === 'xp_mult') bonuses.xpMult += val;
              else if (def.effectType === 'stability_max') bonuses.maxStability += val;
              else if (def.effectType === 'click_power') bonuses.clickPower += val;
          }
      });

      // Faction Bonuses
      Object.values(state.factions).forEach(f => {
           if (f.id === 'omnicorp' && f.level >= 10) bonuses.creditMult += 0.1;
           if (f.id === 'omnicorp' && f.level >= 50) bonuses.creditMult += 0.2;
           if (f.id === 'red_cell' && f.level >= 2) bonuses.critChance += 0.05;
           if (f.id === 'neural_net' && f.level >= 2) bonuses.dataMult += 0.05;
           // ... others can be added similarly
      });

      return bonuses;
  }, [state.activeStaffIds, state.staffProgress, state.researchLevels, state.factions]);

  // --- Actions ---

  const updateResources = useCallback((delta: Partial<Resources>) => {
      setState(prev => ({
          ...prev,
          resources: {
              credits: Math.max(0, prev.resources.credits + (delta.credits || 0)),
              data: Math.max(0, prev.resources.data + (delta.data || 0)),
              gems: Math.max(0, prev.resources.gems + (delta.gems || 0))
          }
      }));
  }, []);

  const completeContract = useCallback((contractIdOrObj: string | Contract, success: boolean, score: number) => {
      const bonuses = getBonuses();

      setState(prev => {
          let contract = typeof contractIdOrObj === 'string' 
              ? prev.availableContracts.find(c => c.id === contractIdOrObj)
              : contractIdOrObj;
              
          if (!contract) return prev;

          let newResources = { ...prev.resources };
          let newContractsCompleted = prev.contractsCompleted;
          let newFactions = { ...prev.factions };
          let newStaffProgress = { ...prev.staffProgress };

          if (success) {
              // XP Logic
              prev.activeStaffIds.forEach(sid => {
                  const staffDef = STAFF_DB.find(s => s.id === sid);
                  const sp = { ...(newStaffProgress[sid] || { 
                      level: 1, 
                      xp: 0, 
                      health: 100,
                      fatigue: 0,
                      arousal: 0,
                      corruption: 0,
                      cycleProgress: Math.random() * 100,
                      isPregnant: false
                  }) };

                  // Only gain XP if alive
                  if ((sp.health || 100) > 0) {
                      const intMult = staffDef ? 1 + (staffDef.baseIntelligence * 0.05) : 1;
                      
                      // Scale XP logic for 1-pt score system.
                      // Base 100 XP + Bonus based on score (which is effectively clicks * power)
                      // Divisor 25 means every 25 points = +100% XP bonus
                      const xpGain = Math.floor(100 * bonuses.xpMult * (1 + (score / 25)) * intMult);
                      
                      sp.xp = (sp.xp || 0) + xpGain;
                      
                      const nextLevel = getXpForNextLevel(sp.level);
                      if (sp.xp >= nextLevel) {
                          sp.level++;
                          sp.xp -= nextLevel;
                      }
                      
                      const stamReduction = staffDef ? staffDef.baseStamina * 0.2 : 0;
                      const fatigueGain = Math.max(1, 5 - stamReduction);
                      sp.fatigue = Math.min(100, (sp.fatigue || 0) + fatigueGain);
                      
                      newStaffProgress[sid] = sp;
                  }
              });

              // Faction Reputation
              if (!contract.isInfinite) {
                const fId = contract.factionId;
                if (newFactions[fId]) {
                    const repGain = 10 + Math.floor(contract.tier);
                    newFactions[fId] = {
                        ...newFactions[fId],
                        reputation: newFactions[fId].reputation + repGain
                    };
                    
                    // Level Up Faction
                    if (newFactions[fId].reputation >= newFactions[fId].maxReputation) {
                        newFactions[fId].level++;
                        newFactions[fId].reputation = 0;
                        newFactions[fId].maxReputation = Math.floor(newFactions[fId].maxReputation * 1.5);
                    }
                }
                newContractsCompleted++;
              }
          }

          // Replace Contract if mission
          let newContracts = [...prev.availableContracts];
          if (!contract.isInfinite) {
             newContracts = newContracts.filter(c => c.id !== contract.id);
             // Generate replacement if needed
             const f = newFactions[contract.factionId];
             if (f) {
                 newContracts.push(generateContract(f, newContractsCompleted));
             }
          }

          return {
              ...prev,
              resources: newResources,
              contractsCompleted: newContractsCompleted,
              factions: newFactions,
              availableContracts: newContracts,
              staffProgress: newStaffProgress
          };
      });
  }, [getBonuses]);

  const fulfillTradeContract = useCallback((contractId: string, creatureId: string) => {
      setState(prev => {
          const contract = prev.availableContracts.find(c => c.id === contractId);
          if (!contract) return prev;
          
          if (!prev.ownedCreatures.includes(creatureId)) return prev;

          // Reward
          const newResources = { ...prev.resources };
          newResources.credits += contract.rewardCredits;
          
          // Remove Creature
          const newOwnedCreatures = prev.ownedCreatures.filter(id => id !== creatureId);
          // Also remove from custom if it was custom
          const newCustomCreatures = prev.customCreatures.filter(c => c.id !== creatureId);

          // Update Contracts
          let newContracts = prev.availableContracts.filter(c => c.id !== contractId);
          const f = prev.factions[contract.factionId];
          newContracts.push(generateContract(f, prev.contractsCompleted));

          return {
              ...prev,
              resources: newResources,
              ownedCreatures: newOwnedCreatures,
              customCreatures: newCustomCreatures,
              availableContracts: newContracts
          };
      });
  }, []);

  const activateStaff = useCallback((id: string) => {
      setState(prev => {
          const isActive = prev.activeStaffIds.includes(id);
          let newActive = [...prev.activeStaffIds];
          if (isActive) {
              newActive = newActive.filter(sid => sid !== id);
          } else {
              if (newActive.length >= MAX_ACTIVE_STAFF) return prev;
              newActive.push(id);
          }
          return { ...prev, activeStaffIds: newActive };
      });
  }, []);

  // Sync Logic: Calculate result first, then update state
  const performGacha = useCallback(() => {
      // Logic based on current state
      if (!state.freeRecruitAvailable && state.resources.gems < GACHA_COST) return null;

      const rand = Math.random();
      let rarity = 'R';
      if (rand > 0.995) rarity = 'UR';
      else if (rand > 0.95) rarity = 'SSR';
      else if (rand > 0.70) rarity = 'SR';

      const pool = STAFF_DB.filter(s => s.rarity === rarity);
      const picked = pool[Math.floor(Math.random() * pool.length)];
      
      const isDuplicate = state.ownedStaffIds.includes(picked.id);
      let reward = 0;
      
      if (isDuplicate) {
          reward = rarity === 'UR' ? 5000 : rarity === 'SSR' ? 1000 : rarity === 'SR' ? 250 : 50;
      }

      const result = { staff: picked, isDuplicate, reward };

      setState(prev => {
          let newOwned = [...prev.ownedStaffIds];
          let newResources = { ...prev.resources };

          if (isDuplicate) {
              newResources.data += reward;
          } else {
              newOwned.push(picked.id);
          }

          if (!prev.freeRecruitAvailable) {
              newResources.gems -= GACHA_COST;
          }

          return {
              ...prev,
              ownedStaffIds: newOwned,
              resources: newResources,
              freeRecruitAvailable: false,
              staffProgress: {
                  ...prev.staffProgress,
                  [picked.id]: prev.staffProgress[picked.id] || { 
                      level: 1, 
                      xp: 0, 
                      health: 100,
                      fatigue: 0,
                      arousal: 0,
                      corruption: 0,
                      cycleProgress: Math.random() * 100,
                      isPregnant: false
                  }
              }
          };
      });

      return result;
  }, [state.freeRecruitAvailable, state.resources.gems, state.ownedStaffIds]);

  // Sync Logic: Calculate result first, then update state
  const performCreatureGacha = useCallback(() => {
      if (state.resources.gems < CREATURE_GACHA_COST) return null;

      const rand = Math.random();
      let rarity = 'R';
      if (rand > 0.995) rarity = 'UR';
      else if (rand > 0.95) rarity = 'SSR';
      else if (rand > 0.70) rarity = 'SR';

      const pool = CREATURE_DB.filter(c => c.rarity === rarity);
      const picked = pool[Math.floor(Math.random() * pool.length)];
      
      const isDuplicate = state.ownedCreatures.includes(picked.id);
      let reward = 0;

      if (isDuplicate) {
           reward = rarity === 'UR' ? 2000 : rarity === 'SSR' ? 500 : rarity === 'SR' ? 100 : 20;
      }

      const result = { creature: picked, isDuplicate, reward };

      setState(prev => {
          let newOwned = [...prev.ownedCreatures];
          let newResources = { ...prev.resources };

          if (isDuplicate) {
               newResources.data += reward;
          } else {
               newOwned.push(picked.id);
          }
          
          // Init status
          const newStatus = { ...prev.creatureStatus };
          if (!newStatus[picked.id]) {
              newStatus[picked.id] = { fatigue: 0, arousal: 50 };
          }

          newResources.gems -= CREATURE_GACHA_COST;

          return {
              ...prev,
              ownedCreatures: newOwned,
              resources: newResources,
              creatureStatus: newStatus
          };
      });

      return result;
  }, [state.resources.gems, state.ownedCreatures]);

  const buyResearch = useCallback((id: ResearchCategory) => {
      setState(prev => {
          const level = prev.researchLevels[id] || 0;
          const def = INFINITE_RESEARCH_DEFS.find(d => d.id === id);
          if (!def) return prev;

          const cost = Math.floor(def.baseCost * Math.pow(def.costScaling, level));
          if (def.costType === 'credits' && prev.resources.credits < cost) return prev;
          if (def.costType === 'data' && prev.resources.data < cost) return prev;

          return {
              ...prev,
              resources: {
                  ...prev.resources,
                  credits: def.costType === 'credits' ? prev.resources.credits - cost : prev.resources.credits,
                  data: def.costType === 'data' ? prev.resources.data - cost : prev.resources.data,
              },
              researchLevels: {
                  ...prev.researchLevels,
                  [id]: level + 1
              }
          };
      });
  }, []);

  const breedingAction = useCallback((staffId: string, creatureId: string) => {
      setState(prev => {
          const staff = STAFF_DB.find(s => s.id === staffId);
          const creature = [...CREATURE_DB, ...prev.customCreatures].find(c => c.id === creatureId);
          
          if (!staff || !creature) return prev;

          const newProgress = { ...prev.staffProgress[staffId] };
          newProgress.isPregnant = true;
          newProgress.pregnancyStartTime = Date.now();
          newProgress.pregnancyPartnerId = creatureId; // Store Father ID
          newProgress.arousal = Math.max(0, (newProgress.arousal || 0) - 30);
          newProgress.fatigue = Math.min(100, (newProgress.fatigue || 0) + 15);
          
          // Update Creature Status (Consume Arousal, Add Fatigue)
          const newCreatureStatus = { ...(prev.creatureStatus || {}) };
          const cStatus = { ...(newCreatureStatus[creatureId] || { fatigue: 0, arousal: 50 }) };
          cStatus.arousal = Math.max(0, cStatus.arousal - 50); // Spend arousal
          cStatus.fatigue = Math.min(100, cStatus.fatigue + 30); // Get tired
          newCreatureStatus[creatureId] = cStatus;

          // Corruption Logic
          let corruptionGain = 0;
          if (creature.type === 'Eldritch') corruptionGain += 10;
          if (creature.type === 'Mutant') corruptionGain += 5;
          if (creature.creepiness > 50) corruptionGain += 5;
          if (creature.creepiness > 80) corruptionGain += 5;
          
          newProgress.corruption = Math.min(100, (newProgress.corruption || 0) + corruptionGain);

          // Disease Risk
          if (creature.wildness > 70 && Math.random() < 0.25) {
             newProgress.disease = 'Xenovirus';
          }

          return {
              ...prev,
              staffProgress: {
                  ...prev.staffProgress,
                  [staffId]: newProgress
              },
              creatureStatus: newCreatureStatus
          };
      });
  }, []);

  const deliverCreature = useCallback((staffId: string) => {
       const staff = STAFF_DB.find(s => s.id === staffId);
       const progress = state.staffProgress[staffId];

       // Time & Validity Check (180 seconds / 3 minutes)
       if (!staff || !progress || !progress.isPregnant || !progress.pregnancyStartTime) return null;
       
       const now = Date.now();
       const incubationTime = 180000;
       if (now - progress.pregnancyStartTime < incubationTime) return null;

       // Find Father
       const fatherId = progress.pregnancyPartnerId;
       const father = [...CREATURE_DB, ...state.customCreatures].find(c => c.id === fatherId);
       
       // Fallback if father data is missing (e.g. from old save)
       const baseStrength = father ? father.strength : 50;
       const baseSize = father ? father.size : 50;
       const baseWildness = father ? father.wildness : 50;
       const baseVariant = father ? father.variant : 'Unknown';
       const baseType = father ? father.type : 'Mutant';
       const baseSubtype = father ? father.subtype : 'Hybrid';
       
       // Calculate Child Stats
       // Strength: Average of Creature STR and Staff Stamina (mapped 1-10 -> 10-100)
       const childStrength = Math.floor((baseStrength + (staff.baseStamina * 10)) / 2) + Math.floor(Math.random() * 10 - 5);
       
       // Size: Average of Creature Size and Body Type modifier
       let bodyMod = 50;
       if (staff.bodyType === 'Petite') bodyMod = 30;
       if (staff.bodyType === 'Athletic') bodyMod = 70;
       if (staff.bodyType === 'Muscular') bodyMod = 90;
       if (staff.bodyType === 'Voluptuous') bodyMod = 80;
       const childSize = Math.floor((baseSize + bodyMod) / 2) + Math.floor(Math.random() * 10 - 5);

       // Wildness: Average of Creature Wildness and (Inverse of Staff Intelligence)
       // High Int staff produce less wild offspring (better training/genes)
       const intMod = 100 - (staff.baseIntelligence * 10);
       const childWildness = Math.floor((baseWildness + intMod) / 2) + Math.floor(Math.random() * 10 - 5);

       // Generate Child
       const childId = `c_bred_${Date.now()}`;
       const newborn: Creature = {
           id: childId,
           type: baseType,
           subtype: baseSubtype,
           variant: `Hybrid ${baseVariant}`,
           rarity: 'SR', // Hybrids default to SR for now
           description: `Offspring of ${staff.name} and ${baseVariant}.`,
           productionBonus: Math.floor(Math.random() * 5) + 3,
           strength: Math.max(0, Math.min(100, childStrength)),
           size: Math.max(0, Math.min(100, childSize)),
           wildness: Math.max(0, Math.min(100, childWildness)),
           arousal: 50,
           creepiness: Math.floor((father?.creepiness || 50) * 0.8), // Slightly less creepy than father?
           fertility: 'Medium',
           isBred: true,
           generation: (father?.generation || 1) + 1
       };

      setState(prev => {
           const newProgress = { ...prev.staffProgress[staffId] };
           newProgress.isPregnant = false;
           newProgress.pregnancyStartTime = undefined;
           newProgress.pregnancyPartnerId = undefined;
           newProgress.cycleProgress = 0; // Reset cycle to Menstruation start after birth

           // Init dynamic status for new child
           const newCreatureStatus = { ...prev.creatureStatus };
           newCreatureStatus[childId] = { fatigue: 0, arousal: 50 };

           return {
               ...prev,
               staffProgress: {
                   ...prev.staffProgress,
                   [staffId]: newProgress
               },
               customCreatures: [...prev.customCreatures, newborn],
               ownedCreatures: [...prev.ownedCreatures, childId],
               creatureStatus: newCreatureStatus
           };
      });

      return newborn;
  }, [state.staffProgress, state.customCreatures]);

  const treatStaff = useCallback((staffId: string, type: 'HEAL' | 'CURE') => {
      setState(prev => {
          const progress = prev.staffProgress[staffId];
          if (!progress) return prev;
          
          let cost = 0;
          let newProgress = { ...progress };

          if (type === 'HEAL') {
              if ((progress.health || 100) >= 100) return prev;
              cost = Math.ceil(100 - (progress.health || 100));
              if (prev.resources.credits < cost) return prev;
              newProgress.health = 100;
          } else if (type === 'CURE') {
              if (!progress.disease) return prev;
              cost = 300;
              if (prev.resources.credits < cost) return prev;
              newProgress.disease = undefined;
          }

          return {
              ...prev,
              resources: {
                  ...prev.resources,
                  credits: prev.resources.credits - cost
              },
              staffProgress: {
                  ...prev.staffProgress,
                  [staffId]: newProgress
              }
          };
      });
  }, []);

  const setTheme = useCallback((theme: string) => setState(p => ({ ...p, activeTheme: theme })), []);
  const toggleMusic = useCallback(() => setState(p => ({ ...p, musicEnabled: !p.musicEnabled })), []);
  const setVolume = useCallback((vol: number) => setState(p => ({ ...p, volume: vol })), []);

  return {
    state,
    getBonuses,
    updateResources,
    completeContract,
    fulfillTradeContract,
    activateStaff,
    performGacha,
    performCreatureGacha,
    buyResearch,
    breedingAction,
    deliverCreature,
    treatStaff,
    setTheme,
    toggleMusic,
    setVolume
  };
};
