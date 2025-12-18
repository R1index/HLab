
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
    GameState, Resources, Faction, Staff, Contract, Creature, 
    ResearchCategory, StaffProgress, GameBonuses, ResourceType, CreatureStatus, GameEvent
} from '../types';
import { 
    INITIAL_RESOURCES, FACTION_TEMPLATES, generateContract, 
    STAFF_DB, CREATURE_DB, INFINITE_RESEARCH_DEFS, 
    GACHA_COST, CREATURE_GACHA_COST, MAX_ACTIVE_STAFF, 
    getXpForNextLevel, getCyclePhase, FACTION_RANK_BONUSES,
    getFertilityValue,
    getCurrentFertility
} from '../constants';
import { playSound, setAudioVolume, updateMusicTheme } from '../utils/audio';

const STORAGE_KEY = 'PRIVATE_LAB_SAVE_V1';

export const useGameStore = (onGameEvent?: (event: GameEvent) => void) => {
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
      activeProtocol: null, // ALWAYS RESET ON LOAD to prevent stuck states
      lastSaveTime: loadedState.lastSaveTime || Date.now(),
      lastHackTime: loadedState.lastHackTime || 0,
      lastEmergencyFundTime: loadedState.lastEmergencyFundTime || 0
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

    // --- OFFLINE PROGRESS CALCULATION ---
    const now = Date.now();
    const secondsOffline = (now - finalState.lastSaveTime) / 1000;
    
    if (secondsOffline > 60) {
        // Calculate passive rates based on loaded state
        // 1. Research Bonuses
        let dataMult = 1;
        if (finalState.researchLevels['computing']) dataMult += (finalState.researchLevels['computing'] * 0.05);
        if (finalState.factions['neural_net'].level >= 2) dataMult += 0.05;

        // 2. Creature Passive Data
        let passiveDataPerSec = 0;
        const allCreatures = [...CREATURE_DB, ...finalState.customCreatures];
        finalState.ownedCreatures.forEach(cId => {
            const c = allCreatures.find(def => def.id === cId);
            if(c) passiveDataPerSec += (c.productionBonus || 0);
        });

        const totalOfflineData = Math.floor(passiveDataPerSec * dataMult * secondsOffline * 0.5); // 50% efficiency offline
        
        if (totalOfflineData > 0) {
            console.log(`Offline for ${secondsOffline.toFixed(0)}s. Gained ${totalOfflineData} Data.`);
            finalState.resources.data += totalOfflineData;
        }
        
        // Offline Fatigue Recovery
        Object.keys(finalState.staffProgress).forEach(sid => {
            if (!finalState.activeStaffIds.includes(sid)) {
                const s = STAFF_DB.find(st => st.id === sid);
                if (s) {
                    const recRate = 0.5 + (s.baseStamina * 0.1);
                    const recovered = recRate * secondsOffline;
                    const p = finalState.staffProgress[sid];
                    // Fix: Ensure undefined defaults to 0 or 100 correctly, and don't recover if dead
                    const currentHealth = p.health ?? 100;
                    if (p.fatigue && p.fatigue > 0 && currentHealth > 0) {
                        p.fatigue = Math.max(0, p.fatigue - recovered);
                    }
                }
            }
        });
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
      updateMusicTheme(state.activeTheme);
  }, [state.volume, state.activeTheme]);

  // --- PASSIVE GAME LOOP ---
  useEffect(() => {
      const interval = setInterval(() => {
          setState(prev => {
              const now = Date.now();
              const newProgress = { ...prev.staffProgress };
              const newCreatureStatus = { ...prev.creatureStatus };
              let staffToRemoveFromSquad: string[] = [];
              let lastEmergencyFundTime = prev.lastEmergencyFundTime;
              let resources = { ...prev.resources };

              // --- 0. PASSIVE INCOME ---
              
              // A. Calculate Bonuses (Simplified for loop performance)
              let dataMult = 1;
              let creditMult = 1;
              const rLevels = prev.researchLevels;
              if (rLevels['computing'] > 0) dataMult += rLevels['computing'] * 0.05;
              if (rLevels['finance'] > 0) creditMult += rLevels['finance'] * 0.05;

              // B. Staff Bonuses (Active Squad only)
              prev.activeStaffIds.forEach(id => {
                  const s = STAFF_DB.find(st => st.id === id);
                  const p = prev.staffProgress[id];
                  // Use '?? 100' to handle legacy data safely without treating 0 as 100
                  const hp = p ? (p.health ?? 100) : 100;
                  
                  if (s && p && hp > 0) {
                      const lvlMult = 1 + ((p.level - 1) * 0.1);
                      if (s.bonusType === 'data_mult') dataMult += (s.bonusValue * lvlMult);
                      if (s.bonusType === 'credit_mult') creditMult += (s.bonusValue * lvlMult);
                  }
              });

              // C. Creature Production (Data)
              let rawPassiveData = 0;
              const allCreatures = [...CREATURE_DB, ...prev.customCreatures];
              prev.ownedCreatures.forEach(cId => {
                  const c = allCreatures.find(def => def.id === cId);
                  if (c) rawPassiveData += (c.productionBonus || 0);
              });
              
              resources.data += (rawPassiveData * dataMult);

              // --- 0.5 EMERGENCY FUND (Balanced) ---
              // Only trigger if truly broke and haven't triggered recently (5 mins)
              if (resources.credits < 50 && !prev.activeProtocol) {
                  if (now - lastEmergencyFundTime > 300000) {
                      resources.credits += 100; // Bumped to 100
                      lastEmergencyFundTime = now;
                  }
              }

              // --- 1. CONTRACT EXPIRATION & REPLENISHMENT ---
              let newContracts = prev.availableContracts.filter(c => 
                 c.isInfinite || c.expiresAt > now || (prev.activeProtocol && prev.activeProtocol.id === c.id)
              );
              
              if (newContracts.length !== prev.availableContracts.length) {
                  const countsByFaction: Record<string, number> = {};
                  newContracts.forEach(c => {
                      if (!c.isInfinite) {
                          countsByFaction[c.factionId] = (countsByFaction[c.factionId] || 0) + 1;
                      }
                  });

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
                  
                  // Use Nullish Coalescing (??) to prevent 0 being treated as false (which would default to 100)
                  const currentHealth = p.health ?? 100;
                  const currentFatigue = p.fatigue ?? 0;
                  const isActive = prev.activeStaffIds.includes(id);

                  if (!p.isPregnant && staff.baseFertility !== 'None') {
                      p.cycleProgress = (p.cycleProgress || 0) + 0.1; 
                      if (p.cycleProgress >= 100) p.cycleProgress = 0;
                  }

                  // Fatigue recovers only if inactive AND alive
                  if (!isActive && currentFatigue > 0 && currentHealth > 0) {
                      const recRate = 0.5 + (staff.baseStamina * 0.1);
                      p.fatigue = Math.max(0, currentFatigue - recRate);
                  }

                  if ((p.arousal || 0) < 100) {
                      p.arousal = Math.min(100, (p.arousal || 0) + 0.2);
                  }

                  // Health Logic
                  if (p.disease) {
                      // Disease damages regardless of state, until 0
                      p.health = Math.max(0, currentHealth - 0.2); 
                  } else if (!isActive && currentHealth < 100 && currentHealth > 0) {
                      // Passive Healing: Only if inactive, damaged, AND ALIVE (>0)
                      p.health = Math.min(100, currentHealth + 0.2); 
                  }

                  // Auto-unequip if incapacitated
                  if (currentHealth <= 0 && isActive) {
                      staffToRemoveFromSquad.push(id);
                  }

                  newProgress[id] = p;
              });

              // --- 3. CREATURE LOOP ---
              prev.ownedCreatures.forEach(cId => {
                  let status = { ...(newCreatureStatus[cId] || { fatigue: 0, arousal: 50 }) };
                  const creatureDef = [...CREATURE_DB, ...prev.customCreatures].find(c => c.id === cId);
                  
                  if (status.fatigue > 0) {
                      status.fatigue = Math.max(0, status.fatigue - 0.5); // Buffed creature recovery too
                  }

                  const wildMod = creatureDef ? (creatureDef.wildness / 200) : 0.25;
                  if (status.arousal < 100) {
                      status.arousal = Math.min(100, status.arousal + 0.2 + wildMod);
                  }

                  newCreatureStatus[cId] = status;
              });

              let newActiveStaffIds = [...prev.activeStaffIds];
              if (staffToRemoveFromSquad.length > 0) {
                  newActiveStaffIds = newActiveStaffIds.filter(id => !staffToRemoveFromSquad.includes(id));
              }

              return {
                  ...prev,
                  resources,
                  lastEmergencyFundTime,
                  staffProgress: newProgress,
                  activeStaffIds: newActiveStaffIds,
                  creatureStatus: newCreatureStatus,
                  availableContracts: newContracts,
                  lastSaveTime: now
              };
          });
      }, 1000);

      return () => clearInterval(interval);
  }, []);

  // --- Helpers ---

  const getBonuses = useCallback((): GameBonuses => {
      let bonuses: GameBonuses = {
          creditMult: 1, dataMult: 1, xpMult: 1, gemMult: 1,
          stabilityRegen: 1, critChance: 0.05, maxStability: 100,
          clickPower: 1, lifeExtension: 1
      };

      state.activeStaffIds.forEach(id => {
          const staff = STAFF_DB.find(s => s.id === id);
          const progress = state.staffProgress[id];
          const hp = progress ? (progress.health ?? 100) : 100;

          if (staff && progress && hp > 0) {
              const levelMult = 1 + ((progress.level - 1) * 0.1);
              const val = staff.bonusValue * levelMult;
              
              if (staff.bonusType === 'credit_mult') bonuses.creditMult += val;
              else if (staff.bonusType === 'data_mult') bonuses.dataMult += val;
              else if (staff.bonusType === 'stability_regen') bonuses.stabilityRegen += val;
              else if (staff.bonusType === 'click_power') bonuses.clickPower += val;
              else if (staff.bonusType === 'life_extension') bonuses.lifeExtension += val;
          }
      });

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

      Object.values(state.factions).forEach(f => {
           if (f.id === 'omnicorp' && f.level >= 10) bonuses.creditMult += 0.1;
           if (f.id === 'omnicorp' && f.level >= 50) bonuses.creditMult += 0.2;
           if (f.id === 'red_cell' && f.level >= 2) bonuses.critChance += 0.05;
           if (f.id === 'neural_net' && f.level >= 2) bonuses.dataMult += 0.05;
           if (f.id === 'void_syndicate' && f.level >= 2) bonuses.gemMult += 0.10;
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

  const activateDevMode = useCallback(() => {
      setState(prev => {
          const newFactions = { ...prev.factions };
          Object.keys(newFactions).forEach(key => {
              newFactions[key] = {
                  ...newFactions[key],
                  level: 100,
                  reputation: newFactions[key].maxReputation || 100,
                  unlocked: true
              };
          });

          return {
              ...prev,
              resources: {
                  credits: prev.resources.credits + 1000000,
                  data: prev.resources.data + 1000000,
                  gems: prev.resources.gems + 1000000
              },
              factions: newFactions
          };
      });
      if (onGameEvent) onGameEvent({ type: 'RESOURCE_GAIN', resource: 'gems', amount: 1000000 });
  }, [onGameEvent]);

  const manualHack = useCallback(() => {
    setState(prev => {
        const now = Date.now();
        if (now - prev.lastHackTime < 500) return prev;

        // Apply efficiency research to manual hacks
        const efficiencyLevel = prev.researchLevels['efficiency'] || 0;
        // Base 1, +1 per efficiency level
        const clickVal = 1 + efficiencyLevel;
        
        return {
            ...prev,
            lastHackTime: now,
            resources: {
                ...prev.resources,
                credits: prev.resources.credits + clickVal,
                data: prev.resources.data + clickVal
            }
        };
    });
  }, []);

  const startProtocol = useCallback((contract: Contract) => {
      setState(prev => {
          if (prev.activeProtocol) return prev;
          if (prev.resources.credits < contract.deposit) return prev;
          
          return {
              ...prev,
              activeProtocol: contract,
              resources: {
                  ...prev.resources,
                  credits: prev.resources.credits - contract.deposit
              }
          };
      });
  }, []);

  const abandonProtocol = useCallback(() => {
      setState(prev => ({ ...prev, activeProtocol: null }));
  }, []);

  const completeContract = useCallback((success: boolean, score: number) => {
      const bonuses = getBonuses();

      setState(prev => {
          const contract = prev.activeProtocol;
          if (!contract) return prev;

          let newResources = { ...prev.resources };
          let newContractsCompleted = prev.contractsCompleted;
          let newFactions = { ...prev.factions };
          let newStaffProgress = { ...prev.staffProgress };

          if (success) {
              const creditBonus = contract.rewardCredits * (bonuses.creditMult - 1);
              const dataBonus = contract.rewardData * (bonuses.dataMult - 1);
              const baseGems = contract.rewardGems || 0;
              const gemBonus = baseGems * (bonuses.gemMult - 1);
              
              if (contract.isInfinite) {
                   const simDataReward = Math.floor(score * 25 * bonuses.dataMult);
                   newResources.data += simDataReward;
                   if (onGameEvent) onGameEvent({ type: 'RESOURCE_GAIN', resource: 'data', amount: simDataReward });
              } else {
                   const totalCredits = Math.floor(contract.rewardCredits + creditBonus);
                   const totalData = Math.floor(contract.rewardData + dataBonus);
                   const totalGems = Math.floor(baseGems + gemBonus);

                   newResources.credits += totalCredits;
                   newResources.data += totalData;
                   newResources.gems += totalGems;

                   if (onGameEvent) {
                       if (totalCredits > 0) onGameEvent({ type: 'RESOURCE_GAIN', resource: 'credits', amount: totalCredits });
                       if (totalData > 0) onGameEvent({ type: 'RESOURCE_GAIN', resource: 'data', amount: totalData });
                       if (totalGems > 0) onGameEvent({ type: 'RESOURCE_GAIN', resource: 'gems', amount: totalGems });
                   }
              }

              prev.activeStaffIds.forEach(sid => {
                  const staffDef = STAFF_DB.find(s => s.id === sid);
                  const sp = { ...(newStaffProgress[sid] || { 
                      level: 1, xp: 0, health: 100, fatigue: 0, arousal: 0, corruption: 0, 
                      cycleProgress: Math.random() * 100, isPregnant: false 
                  }) };
                  const hp = sp.health ?? 100;

                  if (hp > 0) {
                      const intMult = staffDef ? 1 + (staffDef.baseIntelligence * 0.05) : 1;
                      const xpGain = Math.floor(100 * bonuses.xpMult * (1 + (score / 25)) * intMult);
                      
                      sp.xp = (sp.xp || 0) + xpGain;
                      
                      let nextLevel = getXpForNextLevel(sp.level);
                      while (sp.xp >= nextLevel) {
                          sp.level++;
                          sp.xp -= nextLevel;
                          nextLevel = getXpForNextLevel(sp.level);
                      }
                      
                      const stamReduction = staffDef ? staffDef.baseStamina * 0.2 : 0;
                      const fatigueGain = Math.max(1, 5 - stamReduction);
                      sp.fatigue = Math.min(100, (sp.fatigue || 0) + fatigueGain);
                      
                      newStaffProgress[sid] = sp;
                  }
              });

              if (!contract.isInfinite) {
                const fId = contract.factionId;
                if (newFactions[fId]) {
                    const repGain = 10 + Math.floor(contract.tier);
                    newFactions[fId] = {
                        ...newFactions[fId],
                        reputation: newFactions[fId].reputation + repGain
                    };
                    
                    if (newFactions[fId].reputation >= newFactions[fId].maxReputation) {
                        newFactions[fId].level++;
                        newFactions[fId].reputation = 0;
                        newFactions[fId].maxReputation = Math.floor(newFactions[fId].maxReputation * 1.5);
                    }
                }
                newContractsCompleted++;
              }
          }

          let newContracts = [...prev.availableContracts];
          if (!contract.isInfinite) {
             newContracts = newContracts.filter(c => c.id !== contract.id);
             const f = newFactions[contract.factionId];
             if (f) {
                 newContracts.push(generateContract(f, newContractsCompleted));
             }
          }

          return {
              ...prev,
              activeProtocol: null, 
              resources: newResources,
              contractsCompleted: newContractsCompleted,
              factions: newFactions,
              availableContracts: newContracts,
              staffProgress: newStaffProgress
          };
      });
  }, [getBonuses, onGameEvent]);

  const fulfillTradeContract = useCallback((contractId: string, creatureId: string) => {
      setState(prev => {
          const contract = prev.availableContracts.find(c => c.id === contractId);
          if (!contract) return prev;
          
          if (!prev.ownedCreatures.includes(creatureId)) return prev;

          const newResources = { ...prev.resources };
          newResources.credits += contract.rewardCredits;
          
          const newOwnedCreatures = prev.ownedCreatures.filter(id => id !== creatureId);
          const newCustomCreatures = prev.customCreatures.filter(c => c.id !== creatureId);

          let newContracts = prev.availableContracts.filter(c => c.id !== contractId);
          const f = prev.factions[contract.factionId];
          newContracts.push(generateContract(f, prev.contractsCompleted));

          if (onGameEvent) onGameEvent({ type: 'RESOURCE_GAIN', resource: 'credits', amount: contract.rewardCredits });

          return {
              ...prev,
              resources: newResources,
              ownedCreatures: newOwnedCreatures,
              customCreatures: newCustomCreatures,
              availableContracts: newContracts
          };
      });
  }, [onGameEvent]);

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

  const performGacha = useCallback(() => {
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
              if (onGameEvent) onGameEvent({ type: 'RESOURCE_GAIN', resource: 'data', amount: reward });
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
  }, [state.freeRecruitAvailable, state.resources.gems, state.ownedStaffIds, onGameEvent]);

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
               if (onGameEvent) onGameEvent({ type: 'RESOURCE_GAIN', resource: 'data', amount: reward });
          } else {
               newOwned.push(picked.id);
          }
          
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
  }, [state.resources.gems, state.ownedCreatures, onGameEvent]);

  const performBatchGacha = useCallback((type: 'STAFF' | 'CREATURE', count: number) => {
      const singleCost = type === 'STAFF' ? GACHA_COST : CREATURE_GACHA_COST;
      const totalCost = singleCost * count;

      if (state.resources.gems < totalCost) return null;

      const results: { staff?: Staff, creature?: Creature, isDuplicate: boolean, reward: number }[] = [];
      let totalReward = 0;
      
      let currentOwnedStaffIds = [...state.ownedStaffIds];
      let currentOwnedCreatures = [...state.ownedCreatures];
      let currentStaffProgress = { ...state.staffProgress };
      let currentCreatureStatus = { ...state.creatureStatus };

      for (let i = 0; i < count; i++) {
          const rand = Math.random();
          let rarity = 'R';
          if (rand > 0.995) rarity = 'UR';
          else if (rand > 0.95) rarity = 'SSR';
          else if (rand > 0.70) rarity = 'SR';

          if (type === 'STAFF') {
              const pool = STAFF_DB.filter(s => s.rarity === rarity);
              const picked = pool[Math.floor(Math.random() * pool.length)];
              
              const isDuplicate = currentOwnedStaffIds.includes(picked.id);
              
              let reward = 0;
              if (isDuplicate) {
                  reward = rarity === 'UR' ? 5000 : rarity === 'SSR' ? 1000 : rarity === 'SR' ? 250 : 50;
                  totalReward += reward;
              } else {
                  currentOwnedStaffIds.push(picked.id);
                  if (!currentStaffProgress[picked.id]) {
                      currentStaffProgress[picked.id] = { 
                          level: 1, xp: 0, health: 100, fatigue: 0, arousal: 0, corruption: 0, 
                          cycleProgress: Math.random() * 100, isPregnant: false 
                      };
                  }
              }
              results.push({ staff: picked, isDuplicate, reward });
          } else {
              const pool = CREATURE_DB.filter(c => c.rarity === rarity);
              const picked = pool[Math.floor(Math.random() * pool.length)];
              
              const isDuplicate = currentOwnedCreatures.includes(picked.id);
              
              let reward = 0;
              if (isDuplicate) {
                   reward = rarity === 'UR' ? 2000 : rarity === 'SSR' ? 500 : rarity === 'SR' ? 100 : 20;
                   totalReward += reward;
              } else {
                   currentOwnedCreatures.push(picked.id);
                   if (!currentCreatureStatus[picked.id]) {
                       currentCreatureStatus[picked.id] = { fatigue: 0, arousal: 50 };
                   }
              }
              results.push({ creature: picked, isDuplicate, reward });
          }
      }

      setState(prev => ({
          ...prev,
          resources: {
              ...prev.resources,
              gems: prev.resources.gems - totalCost,
              data: prev.resources.data + totalReward
          },
          ownedStaffIds: currentOwnedStaffIds,
          ownedCreatures: currentOwnedCreatures,
          staffProgress: currentStaffProgress,
          creatureStatus: currentCreatureStatus
      }));

      if (totalReward > 0 && onGameEvent) onGameEvent({ type: 'RESOURCE_GAIN', resource: 'data', amount: totalReward });

      return results;
  }, [state.resources.gems, state.ownedStaffIds, state.ownedCreatures, state.staffProgress, state.creatureStatus, onGameEvent]);

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

  const breedingAction = useCallback((staffId: string, creatureId: string, success: boolean, isInjured: boolean, isInfected: boolean) => {
      setState(prev => {
          const staff = STAFF_DB.find(s => s.id === staffId);
          const creature = [...CREATURE_DB, ...prev.customCreatures].find(c => c.id === creatureId);
          const currentProgress = prev.staffProgress[staffId];
          
          if (!staff || !creature || !currentProgress || (currentProgress.health ?? 100) <= 0) return prev;

          const newProgress = { ...currentProgress };
          const newCreatureStatus = { ...(prev.creatureStatus[creatureId] || { fatigue: 0, arousal: 50 }) };

          // Costs applied regardless of success
          newProgress.arousal = Math.max(0, (newProgress.arousal || 0) - 30);
          newProgress.fatigue = Math.min(100, (newProgress.fatigue || 0) + 15);
          
          if (creature.type === 'Eldritch' || creature.type === 'Mutant') {
              newProgress.corruption = Math.min(100, (newProgress.corruption || 0) + 5);
          }

          newCreatureStatus.fatigue = Math.min(100, newCreatureStatus.fatigue + 30);
          newCreatureStatus.arousal = Math.max(0, newCreatureStatus.arousal - 50);

          // Apply Risks
          if (isInjured) {
              // 25% Health Damage flat
              newProgress.health = Math.max(0, (newProgress.health ?? 100) - 25);
          }

          if (isInfected) {
              // Only apply if not already diseased to avoid overwriting types if we had multiple
              if (!newProgress.disease) {
                  newProgress.disease = "Bio-Rot"; 
                  // Immediate small health hit
                  newProgress.health = Math.max(0, (newProgress.health ?? 100) - 5);
              }
          }

          // Logic - Only set pregnant if success
          if (success) {
            newProgress.isPregnant = true;
            newProgress.pregnancyStartTime = Date.now();
            newProgress.pregnancyPartnerId = creatureId; 
          }

          return {
              ...prev,
              staffProgress: {
                  ...prev.staffProgress,
                  [staffId]: newProgress
              },
              creatureStatus: {
                  ...prev.creatureStatus,
                  [creatureId]: newCreatureStatus
              }
          };
      });
  }, []);

  const deliverCreature = useCallback((staffId: string): Creature | null => {
      let result: Creature | null = null;
      setState(prev => {
          const staffProgress = prev.staffProgress[staffId];
          if (!staffProgress || !staffProgress.isPregnant || !staffProgress.pregnancyPartnerId) return prev;

          const staff = STAFF_DB.find(s => s.id === staffId);
          const parentCreature = [...CREATURE_DB, ...prev.customCreatures].find(c => c.id === staffProgress.pregnancyPartnerId);
          
          if (!staff || !parentCreature) return prev;

          // Genetics Logic
          const isHybrid = Math.random() < 0.2; // 20% chance for pure hybrid variant name
          const generation = (parentCreature.generation || 1) + 1;
          
          // Stat inheritance: Weighted average (60% creature, 40% staff scaled to 100) + mutation
          const mix = (sVal: number, cVal: number) => {
             const base = (sVal * 10 * 0.4) + (cVal * 0.6);
             const mutation = (Math.random() * 0.2) + 0.9; // 0.9 to 1.1 multiplier
             return Math.min(100, Math.floor(base * mutation));
          };

          const newStrength = mix(staff.baseStamina, parentCreature.strength); // Stamina maps to Strength
          const newIntelligence = mix(staff.baseIntelligence, 0); // Intel maps to... well, pure logic rarely breeds true with monsters, mostly RNG mutation on Wildness
          const newWildness = Math.min(100, Math.floor(((parentCreature.wildness || 50) + (staff.baseIntelligence * 5)) / 2));
          
          const newId = `b_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
          
          const newCreature: Creature = {
              id: newId,
              type: parentCreature.type,
              subtype: parentCreature.subtype,
              variant: isHybrid ? `Hybrid ${parentCreature.variant}` : `Bred ${parentCreature.variant}`,
              rarity: Math.random() > 0.9 ? 'SSR' : Math.random() > 0.6 ? 'SR' : 'R',
              description: `Gen ${generation} offspring of ${staff.name}.`,
              productionBonus: parentCreature.productionBonus + Math.floor(Math.random() * 3),
              strength: newStrength,
              size: parentCreature.size,
              wildness: newWildness,
              arousal: 50,
              creepiness: parentCreature.creepiness,
              fertility: 'Medium',
              isBred: true,
              generation: generation
          };

          result = newCreature;

          // Reset Mother
          const newProgress = { ...staffProgress };
          newProgress.isPregnant = false;
          newProgress.pregnancyPartnerId = undefined;
          newProgress.pregnancyStartTime = undefined;
          
          // Small XP bonus for birth
          newProgress.xp = (newProgress.xp || 0) + 500;

          // Update State
          return {
              ...prev,
              staffProgress: {
                  ...prev.staffProgress,
                  [staffId]: newProgress
              },
              customCreatures: [...prev.customCreatures, newCreature],
              ownedCreatures: [...prev.ownedCreatures, newId],
              creatureStatus: {
                  ...prev.creatureStatus,
                  [newId]: { fatigue: 0, arousal: 50 }
              }
          };
      });
      return result;
  }, []);

  const treatStaff = useCallback((id: string, type: 'HEAL' | 'CURE') => {
      setState(prev => {
          const progress = prev.staffProgress[id];
          if (!progress) return prev;

          // Use ?? to properly detect 0 Health
          const currentHealth = progress.health ?? 100;

          const cost = type === 'HEAL' ? Math.ceil(100 - currentHealth) : 300;
          if (prev.resources.credits < cost) return prev;

          const newProgress = { ...progress };
          if (type === 'HEAL') {
              newProgress.health = 100;
          } else {
              newProgress.disease = undefined;
              newProgress.health = Math.min(100, currentHealth + 20);
          }

          return {
              ...prev,
              resources: {
                  ...prev.resources,
                  credits: prev.resources.credits - cost
              },
              staffProgress: {
                  ...prev.staffProgress,
                  [id]: newProgress
              }
          };
      });
  }, []);

  const toggleMusic = useCallback(() => {
      setState(prev => ({ ...prev, musicEnabled: !prev.musicEnabled }));
  }, []);

  const setVolume = useCallback((vol: number) => {
      setState(prev => ({ ...prev, volume: vol }));
  }, []);
  
  const setTheme = useCallback((theme: string) => {
      setState(prev => ({ ...prev, activeTheme: theme }));
  }, []);

  return { 
      state, 
      startProtocol, 
      abandonProtocol, 
      completeContract, 
      updateResources, 
      manualHack, 
      activateStaff, 
      performGacha, 
      performCreatureGacha,
      performBatchGacha,
      buyResearch,
      getBonuses,
      fulfillTradeContract,
      breedingAction,
      deliverCreature,
      treatStaff,
      toggleMusic,
      setVolume,
      setTheme,
      activateDevMode
  };
};
