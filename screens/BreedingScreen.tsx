
import React, { useState, useMemo } from 'react';
import { GameState } from '../types';
import { STAFF_DB, CREATURE_DB, getAnimeAvatarUrl, getCurrentFertility, getCyclePhase, getFertilityValue } from '../constants';
import { Heart, Dna, Activity, Lock, FlaskConical, Skull, AlertTriangle, Link, Zap, Droplets, Biohazard } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { playSound } from '../utils/audio';

interface Props {
  state: GameState;
  onBreed: (staffId: string, creatureId: string) => void;
}

export const BreedingScreen: React.FC<Props> = ({ state, onBreed }) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedCreatureId, setSelectedCreatureId] = useState<string | null>(null);
  const [isBreeding, setIsBreeding] = useState(false);

  const ownedStaff = STAFF_DB.filter(s => state.ownedStaffIds.includes(s.id));
  
  // Merge static DB with custom bred creatures to allow breeding them back
  const allCreatures = [...CREATURE_DB, ...state.customCreatures];
  const ownedCreatures = allCreatures.filter(c => state.ownedCreatures.includes(c.id));
  
  const eligibleStaff = ownedStaff.filter(s => {
      const progress = state.staffProgress[s.id];
      // Can't breed if pregnant or incapacitated (0 HP)
      return progress && !progress.isPregnant && (progress.health || 100) > 0;
  });

  const selectedStaff = ownedStaff.find(s => s.id === selectedStaffId);
  const selectedCreature = ownedCreatures.find(c => c.id === selectedCreatureId);
  
  const staffProgress = selectedStaff ? state.staffProgress[selectedStaff.id] : null;
  const creatureStatus = selectedCreature ? (state.creatureStatus[selectedCreature.id] || { fatigue: 0, arousal: 50 }) : null;

  // Validation
  const arousalCost = 30;
  const fatigueCost = 15;
  const currentStaffArousal = staffProgress?.arousal || 0;
  
  // Cycle Calculations
  const cyclePhase = staffProgress ? getCyclePhase(staffProgress.cycleProgress || 0) : 'Follicular';
  const effectiveFertility = selectedStaff && staffProgress ? getCurrentFertility(selectedStaff.baseFertility, staffProgress.cycleProgress || 0) : 'None';
  const isMenstruating = cyclePhase === 'Menstruation';
  const creatureFertility = selectedCreature?.fertility || 'Medium';

  // Breeding fails if Staff Arousal is 0 OR Menstruating OR Fertility is None
  // Also check creature fatigue? For now just display it as penalty
  const canBreed = selectedStaff && selectedCreature && !isBreeding && currentStaffArousal > 0 && !isMenstruating && effectiveFertility !== 'None';

  // Probability Calculation Logic
  const stats = useMemo(() => {
      if (!selectedStaff || !selectedCreature || !staffProgress || !creatureStatus) return null;

      const baseChance = 10;
      
      const currentStaffArousal = staffProgress.arousal || 0;
      const currentStaffFatigue = staffProgress.fatigue || 0;
      const currentHealth = staffProgress.health || 100;

      const currentCreatureArousal = creatureStatus.arousal;
      const currentCreatureFatigue = creatureStatus.fatigue;

      // Arousal Bonus: (Staff*0.6 + Creature*0.4) * 0.5. Max +50%.
      const arousalFactor = ((currentStaffArousal * 0.6) + (currentCreatureArousal * 0.4)) * 0.5;
      
      // Fatigue Penalty: Combined
      const fatiguePenalty = (currentStaffFatigue + currentCreatureFatigue) * 0.3;

      // Health Penalty: (100 - HP) * 0.5. e.g. 0 HP = -50%
      const healthPenalty = (100 - currentHealth) * 0.5;

      // Fetish Bonus
      const isFetishMatch = selectedStaff.fetish === selectedCreature.subtype;
      const fetishBonus = isFetishMatch ? 25 : 0;

      // Creepiness Logic
      let creepinessMod = 0;
      const staffCorruption = staffProgress.corruption || 0;
      const isCreepy = selectedCreature.creepiness > 50;
      let creepinessStatus: 'NEUTRAL' | 'FEAR' | 'KINK' = 'NEUTRAL';

      if (isCreepy) {
          if (staffCorruption < 30) {
              creepinessMod = -50;
              creepinessStatus = 'FEAR';
          } else if (staffCorruption > 60) {
              creepinessMod = 25;
              creepinessStatus = 'KINK';
          }
      }

      // Base calc before fertility multiplier
      let chance = Math.max(0, baseChance + arousalFactor - fatiguePenalty - healthPenalty + fetishBonus + creepinessMod);

      // Fertility Logic
      const staffMult = getFertilityValue(effectiveFertility);
      const creatureMult = getFertilityValue(creatureFertility);
      const combinedMult = (staffMult + creatureMult) / 2;
      
      // Apply multiplier
      chance *= combinedMult;

      const totalChance = Math.min(100, chance);

      // Risks Calculation (Visual Only)
      const damageRisk = Math.min(100, (selectedCreature.wildness || 0) / 2 + (currentStaffFatigue / 4));
      const diseaseRisk = Math.min(100, (selectedCreature.creepiness || 0) / 3);
      
      // New: Corruption Logic Preview
      let corruptionGain = 0;
      if (selectedCreature.type === 'Eldritch') corruptionGain += 10;
      if (selectedCreature.type === 'Mutant') corruptionGain += 5;
      if (selectedCreature.creepiness > 50) corruptionGain += 5;

      return {
          totalChance,
          damageRisk,
          diseaseRisk,
          baseChance,
          arousalFactor,
          fatiguePenalty,
          healthPenalty,
          fetishBonus,
          creepinessMod,
          creepinessStatus,
          isFetishMatch,
          combinedMult,
          corruptionGain
      };
  }, [selectedStaff, selectedCreature, staffProgress, creatureStatus, effectiveFertility, creatureFertility]);

  const executeBreeding = () => {
      if (!canBreed) return;
      setIsBreeding(true);
      playSound('spawn');
      
      // Animation Delay
      setTimeout(() => {
          onBreed(selectedStaffId!, selectedCreatureId!);
          setSelectedStaffId(null);
          setSelectedCreatureId(null);
          setIsBreeding(false);
          playSound('success');
      }, 2000);
  };

  return (
      <div className="h-full flex flex-col p-4 animate-in fade-in space-y-4">
          
          {/* Header */}
          <div className="shrink-0 flex items-center gap-3 p-3 bg-pink-950/30 border border-pink-500/30 rounded-lg">
              <div className="p-2 bg-pink-900/50 rounded-full animate-pulse">
                  <Heart className="text-pink-400" size={24} />
              </div>
              <div>
                  <h2 className="text-lg font-bold text-white">XENOGENETICS LAB</h2>
                  <p className="text-[10px] text-pink-300/70 font-mono">CROSS-SPECIES COMPATIBILITY PROTOCOL</p>
              </div>
          </div>

          {/* Breeding Chamber / Stats */}
          <div className="shrink-0 bg-slate-900/80 border border-slate-700 rounded-xl p-4 shadow-xl relative overflow-hidden">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(#ec4899 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>

                {isBreeding && (
                    <div className="absolute inset-0 bg-pink-500/10 z-20 flex items-center justify-center backdrop-blur-sm">
                        <Dna size={64} className="text-pink-400 animate-spin-slow" />
                        <span className="absolute mt-24 font-bold text-pink-200 tracking-widest animate-pulse">INCUBATING...</span>
                    </div>
                )}

                <div className="flex items-center justify-between relative z-10">
                    {/* Slot 1: Staff */}
                    <div className="flex flex-col items-center gap-2 w-24">
                        <div className={`w-20 h-20 rounded-full border-2 overflow-hidden bg-slate-950 ${selectedStaffId ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'border-slate-700 border-dashed'}`}>
                            {selectedStaff ? (
                                <Avatar src={getAnimeAvatarUrl(selectedStaff.imageSeed)} alt={selectedStaff.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600"><Lock size={24}/></div>
                            )}
                        </div>
                        <div className="text-[10px] font-bold text-slate-300 truncate w-full text-center">
                            {selectedStaff ? selectedStaff.name : 'SELECT STAFF'}
                        </div>
                        {selectedStaff && (
                            <div className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${isMenstruating ? 'bg-red-950 border-red-500 text-red-400' : 'bg-pink-950/50 border-pink-800 text-pink-300'}`}>
                                {cyclePhase}
                            </div>
                        )}
                    </div>

                    {/* Middle: Stats or Vs */}
                    <div className="flex-1 px-4 flex flex-col items-center justify-center h-full min-h-[100px]">
                        {stats ? (
                            <div className="w-full space-y-2">
                                <div className="flex flex-col items-center">
                                    <span className="text-xs text-slate-400 font-mono uppercase">Success Probability</span>
                                    <div className={`text-3xl font-bold font-mono ${stats.totalChance > 70 ? 'text-green-400' : stats.totalChance > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {Math.floor(stats.totalChance)}%
                                    </div>
                                    {isMenstruating && <span className="text-[10px] text-red-500 font-bold uppercase animate-pulse">CYCLE MISMATCH</span>}
                                    {!isMenstruating && effectiveFertility === 'None' && <span className="text-[10px] text-red-500 font-bold uppercase">INFERTILE</span>}
                                </div>
                                <div className="space-y-1 text-[9px] font-mono text-slate-400">
                                    <div className="flex justify-between border-b border-slate-800 pb-1 mb-1">
                                        <span className="text-red-400 font-bold flex items-center gap-1"><AlertTriangle size={8} /> Injury Risk</span>
                                        <span>{Math.floor(stats.damageRisk)}%</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-800 pb-1 mb-1">
                                        <span className="text-purple-400 font-bold flex items-center gap-1"><Biohazard size={8} /> Infection Risk</span>
                                        <span>{Math.floor(stats.diseaseRisk)}%</span>
                                    </div>

                                    {stats.corruptionGain > 0 && (
                                        <div className="flex justify-between border-b border-slate-800 pb-1 mb-1">
                                            <span className="text-fuchsia-400 font-bold flex items-center gap-1"><Skull size={8} /> Corruption Gain</span>
                                            <span>+{stats.corruptionGain}%</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-pink-400">
                                        <span>Fertility Multiplier</span>
                                        <span>x{stats.combinedMult.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-orange-400">
                                        <span>Fatigue Penalty</span>
                                        <span>-{Math.floor(stats.fatiguePenalty)}%</span>
                                    </div>
                                    {stats.healthPenalty > 0 && (
                                        <div className="flex justify-between text-red-500 font-bold">
                                            <span>Low Health Penalty</span>
                                            <span>-{Math.floor(stats.healthPenalty)}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-600">
                                <Activity size={32} className="opacity-20 animate-pulse" />
                            </div>
                        )}
                    </div>

                    {/* Slot 2: Creature */}
                    <div className="flex flex-col items-center gap-2 w-24">
                        <div className={`w-20 h-20 rounded-full border-2 overflow-hidden bg-slate-950 flex items-center justify-center ${selectedCreatureId ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-slate-700 border-dashed'}`}>
                            {selectedCreature ? (
                                <div className="text-center">
                                    <div className="text-[10px] font-mono uppercase text-slate-500 mb-1">{selectedCreature.subtype}</div>
                                    <FlaskConical size={24} className="text-purple-400 mx-auto" />
                                </div>
                            ) : (
                                <div className="text-slate-600"><Dna size={24}/></div>
                            )}
                        </div>
                        <div className="text-[10px] font-bold text-slate-300 truncate w-full text-center">
                            {selectedCreature ? selectedCreature.variant : 'SELECT SPECIMEN'}
                        </div>
                        {selectedCreature && (
                            <div className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border bg-purple-950/50 border-purple-800 text-purple-300`}>
                                Fert: {selectedCreature.fertility || 'Medium'}
                            </div>
                        )}
                    </div>
                </div>
          </div>

          <div className="flex gap-2">
              <button
                onClick={executeBreeding}
                disabled={!canBreed}
                className={`flex-1 py-4 rounded-lg font-bold tracking-widest uppercase transition-all flex flex-col items-center justify-center
                    ${canBreed
                        ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)]' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                `}
              >
                  <div className="flex items-center gap-2">
                      <Zap size={16} fill="currentColor" /> INITIATE PROTOCOL
                  </div>
                  {selectedStaff && selectedCreature && (
                      <div className="text-[10px] mt-1 font-mono flex flex-col items-center gap-1">
                          <div className='flex gap-2'>
                              <span className='text-orange-200'>STAFF FATIGUE +{fatigueCost}</span>
                              <span className='text-pink-200'>STAFF AROUSAL -{arousalCost}</span>
                          </div>
                          <div className='flex gap-2 opacity-80'>
                              <span className='text-orange-200'>SPECIMEN FATIGUE +30</span>
                              <span className='text-pink-200'>SPECIMEN AROUSAL -50</span>
                          </div>
                      </div>
                  )}
              </button>
          </div>

          {/* Selection Lists */}
          <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
              {/* Left: Staff */}
              <div className="flex flex-col bg-slate-950/30 rounded-lg border border-slate-800/50 overflow-hidden">
                  <div className="p-2 bg-slate-900/50 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                      Personnel ({eligibleStaff.length})
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {eligibleStaff.map(staff => {
                          const isActive = selectedStaffId === staff.id;
                          const progress = state.staffProgress[staff.id];
                          const phase = getCyclePhase(progress?.cycleProgress || 0);
                          
                          return (
                              <div 
                                key={staff.id}
                                onClick={() => { playSound('click'); setSelectedStaffId(staff.id); }}
                                className={`
                                    p-2 rounded border flex items-center gap-2 cursor-pointer transition-all
                                    ${isActive ? 'bg-pink-900/20 border-pink-500 ring-1 ring-pink-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}
                                `}
                              >
                                  <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 shrink-0 relative">
                                      <Avatar src={getAnimeAvatarUrl(staff.imageSeed)} alt={staff.name} className="w-full h-full object-cover" />
                                      {phase === 'Menstruation' && <div className="absolute top-0 right-0 w-3 h-3 bg-red-600 rounded-full border border-slate-900"></div>}
                                  </div>
                                  <div className="min-w-0 w-full">
                                      <div className="text-xs font-bold text-slate-200 truncate">{staff.name}</div>
                                      
                                      {/* Mini Stats */}
                                      <div className="grid grid-cols-2 gap-1 mt-1">
                                          <div className="flex items-center gap-1 text-[8px]">
                                              <span className="text-pink-400 w-3">ARO</span>
                                              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                  <div className={`h-full ${progress?.arousal! >= arousalCost ? 'bg-pink-500' : 'bg-red-500'}`} style={{width: `${progress?.arousal || 0}%`}}></div>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-1 text-[8px]">
                                              <span className="text-orange-400 w-3">FAT</span>
                                              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                  <div className={`h-full ${progress?.fatigue! > (100 - fatigueCost) ? 'bg-red-500' : 'bg-orange-500'}`} style={{width: `${progress?.fatigue || 0}%`}}></div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* Right: Creatures */}
              <div className="flex flex-col bg-slate-950/30 rounded-lg border border-slate-800/50 overflow-hidden">
                  <div className="p-2 bg-slate-900/50 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                      Specimens ({ownedCreatures.length})
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {ownedCreatures.map(creature => {
                          const isActive = selectedCreatureId === creature.id;
                          const cStatus = state.creatureStatus[creature.id] || { fatigue: 0, arousal: 50 }; // Dynamic check
                          
                          return (
                              <div 
                                key={creature.id}
                                onClick={() => { playSound('click'); setSelectedCreatureId(creature.id); }}
                                className={`
                                    p-2 rounded border flex flex-col gap-1 cursor-pointer transition-all
                                    ${isActive ? 'bg-purple-900/20 border-purple-500 ring-1 ring-purple-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}
                                `}
                              >
                                  <div className="flex justify-between items-center">
                                      <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                                          {creature.variant}
                                          {creature.isBred && <span className="text-[8px] bg-purple-900 px-1 rounded">BRED</span>}
                                      </div>
                                      <div className={`w-2 h-2 rounded-full ${creature.creepiness > 50 ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-slate-600'}`}></div>
                                  </div>
                                  <div className="text-[9px] text-slate-500 font-mono uppercase truncate">{creature.subtype}</div>
                                  
                                  {/* Mini Stats (Dynamic) */}
                                  <div className="space-y-0.5 mt-1">
                                      <div className="flex items-center gap-1 text-[8px] text-slate-500">
                                          <span className="w-3">ARO</span>
                                          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                              <div className="h-full bg-pink-500 transition-all duration-500" style={{width: `${cStatus.arousal}%`}}></div>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-1 text-[8px] text-slate-500">
                                          <span className="w-3">FAT</span>
                                          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                              <div className="h-full bg-orange-500 transition-all duration-500" style={{width: `${cStatus.fatigue}%`}}></div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

          </div>
      </div>
  );
};
