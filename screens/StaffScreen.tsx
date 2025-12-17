
import React, { useState, useEffect } from 'react';
import { GameState, Creature } from '../types';
import { STAFF_DB, MAX_ACTIVE_STAFF, getAnimeAvatarUrl, getXpForNextLevel, getCyclePhase, getCurrentFertility } from '../constants';
import { Briefcase, Star, TrendingUp, ShieldCheck, Database, DollarSign, Hourglass, UserCheck, Zap, X, Power, Lock, Heart, Brain, Activity, Battery, Skull, Baby, Link, Clock, Biohazard, PlusCircle, Droplets, Signal, Thermometer } from 'lucide-react';
import { playSound } from '../utils/audio';
import { Avatar } from '../components/ui/Avatar';
import { useFloatingText } from '../components/ui/FloatingTextOverlay';

interface Props {
  state: GameState;
  onToggleStaff: (id: string) => void;
  onDeliverCreature: (id: string) => Creature | null;
  onTreatStaff: (id: string, type: 'HEAL' | 'CURE') => void;
}

export const StaffScreen: React.FC<Props> = ({ state, onToggleStaff, onDeliverCreature, onTreatStaff }) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const { spawnText } = useFloatingText();

  useEffect(() => {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
  }, []);

  const ownedStaff = STAFF_DB.filter(s => state.ownedStaffIds.includes(s.id));
  const activeStaff = ownedStaff.filter(s => state.activeStaffIds.includes(s.id));

  // Optimized Squad Bonuses Calculation
  const squadStats = activeStaff.reduce((acc, s) => {
      const progress = state.staffProgress[s.id] || { level: 1, xp: 0 };
      const levelMult = 1 + ((progress.level - 1) * 0.10);
      const value = s.bonusValue * levelMult;
      
      if (s.bonusType === 'credit_mult') acc.creditMult += value;
      else if (s.bonusType === 'data_mult') acc.dataMult += value;
      else if (s.bonusType === 'stability_regen') acc.stabilityRegen += value;
      else if (s.bonusType === 'click_power') acc.clickPower += value;
      else if (s.bonusType === 'life_extension') acc.lifeExtension += value;
      
      return acc;
  }, { creditMult: 0, dataMult: 0, stabilityRegen: 0, clickPower: 0, lifeExtension: 0 });

  const StatBadge = ({ icon: Icon, value, label, colorClass }: { icon: any, value: string, label: string, colorClass: string }) => (
      <div className="flex flex-col items-center p-2 rounded bg-slate-950/40 border border-slate-800 min-w-[60px]">
          <Icon size={14} className={`${colorClass} mb-1`} />
          <span className={`text-xs font-bold ${colorClass}`}>{value}</span>
          <span className="text-[8px] text-slate-500 uppercase">{label}</span>
      </div>
  );

  const renderStars = (rarity: string) => {
    const count = rarity === 'UR' ? 5 : rarity === 'SSR' ? 3 : rarity === 'SR' ? 2 : 1;
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: count }).map((_, i) => (
                <Star key={i} size={12} className={`fill-current ${rarity === 'UR' ? 'text-red-500' : 'text-yellow-400'}`} />
            ))}
        </div>
    );
  };

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
        case 'UR': return {
            border: 'border-red-500/50',
            shadow: 'shadow-red-900/20',
            bgTint: 'bg-red-900',
            text: 'text-red-100',
            badge: 'border-red-500 text-red-400 bg-red-950/30',
            button: 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]'
        };
        case 'SSR': return {
            border: 'border-yellow-500/50',
            shadow: 'shadow-yellow-900/20',
            bgTint: 'bg-yellow-900',
            text: 'text-yellow-100',
            badge: 'border-yellow-500 text-yellow-400 bg-yellow-950/30',
            button: 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-[0_0_20px_rgba(234,179,8,0.4)]'
        };
        case 'SR': return {
            border: 'border-purple-500/50',
            shadow: 'shadow-purple-900/20',
            bgTint: 'bg-purple-900',
            text: 'text-purple-100',
            badge: 'border-purple-500 text-purple-400 bg-purple-950/30',
            button: 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
        };
        default: return {
            border: 'border-cyan-700/50',
            shadow: 'shadow-cyan-900/20',
            bgTint: 'bg-cyan-900',
            text: 'text-white',
            badge: 'border-cyan-600 text-cyan-400 bg-cyan-950/30',
            button: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(8,145,178,0.4)]'
        };
    }
  };

  // Selected Data for Modal
  const selectedStaff = ownedStaff.find(s => s.id === selectedStaffId);
  const selectedProgress = selectedStaff ? (state.staffProgress[selectedStaff.id] || { 
      level: 1, 
      xp: 0,
      fatigue: 0,
      arousal: 0,
      corruption: 0,
      isPregnant: false,
      health: 100,
      cycleProgress: 0
  }) : null;
  const isSelectedActive = selectedStaff ? state.activeStaffIds.includes(selectedStaff.id) : false;
  const rarityStyles = selectedStaff ? getRarityStyles(selectedStaff.rarity) : getRarityStyles('R');
  
  // Incapacitation Check
  const isIncapacitated = selectedProgress ? (selectedProgress.health || 100) <= 0 : false;

  // Cycle Phase Logic for Selected Staff
  const cyclePhase = selectedProgress ? getCyclePhase(selectedProgress.cycleProgress || 0) : 'Follicular';
  const effectiveFertility = selectedStaff && selectedProgress ? getCurrentFertility(selectedStaff.baseFertility, selectedProgress.cycleProgress || 0) : 'Low';

  const handleDelivery = () => {
      if (selectedStaff) {
          const creature = onDeliverCreature(selectedStaff.id);
          if (creature) {
              playSound('success');
              spawnText(window.innerWidth/2, window.innerHeight/2, "SPECIMEN BORN!", "text-yellow-400", "lg");
              setSelectedStaffId(null); 
          }
      }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-300 relative">
      
      {/* Header & Squad Stats */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-lg relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-cyan-500 pointer-events-none">
              <UserCheck size={120} />
          </div>

          <div className="flex flex-col gap-4 relative z-10">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h2 className="text-lg font-bold text-white flex items-center tracking-widest">
                      ACTIVE SQUAD
                      <span className="ml-3 text-xs bg-cyan-950/50 text-cyan-400 px-2 py-0.5 rounded border border-cyan-900/50 font-mono">
                          {state.activeStaffIds.length}/{MAX_ACTIVE_STAFF}
                      </span>
                  </h2>
                  <div className="text-[10px] text-slate-500 font-mono">PERSONNEL MANAGEMENT</div>
              </div>

              <div className="flex flex-wrap gap-2 justify-between">
                  <StatBadge icon={DollarSign} value={`+${Math.round(squadStats.creditMult * 100)}%`} label="Credits" colorClass="text-yellow-400" />
                  <StatBadge icon={Database} value={`+${Math.round(squadStats.dataMult * 100)}%`} label="Data" colorClass="text-cyan-400" />
                  <StatBadge icon={Zap} value={`+${squadStats.clickPower.toFixed(1)}`} label="Click Power" colorClass="text-red-400" />
                  <StatBadge icon={Hourglass} value={`+${Math.round(squadStats.lifeExtension * 100)}%`} label="Time" colorClass="text-orange-400" />
                  <StatBadge icon={ShieldCheck} value={`+${squadStats.stabilityRegen}/s`} label="Stability" colorClass="text-green-400" />
              </div>
          </div>
      </div>

      {/* Roster Grid */}
      <div className="flex-1 overflow-y-auto pr-1 pb-20">
          {ownedStaff.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                  <Briefcase size={48} className="text-slate-700 mb-4" />
                  <p className="text-slate-500 font-mono text-sm">NO PERSONNEL RECORD FOUND</p>
                  <div className="text-xs text-slate-600 mt-2">Visit Recruitment Center to hire staff.</div>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {ownedStaff.map(staff => {
                      const isActive = state.activeStaffIds.includes(staff.id);
                      const isUR = staff.rarity === 'UR';
                      const isSSR = staff.rarity === 'SSR';
                      const isSR = staff.rarity === 'SR';
                      const progress = state.staffProgress[staff.id] || { level: 1, xp: 0, health: 100, fatigue: 0, arousal: 0, corruption: 0, isPregnant: false, cycleProgress: 0 };
                      const nextLevelXp = getXpForNextLevel(progress.level);
                      const xpPercent = Math.min(100, (progress.xp / nextLevelXp) * 100);
                      const isDead = (progress.health || 100) <= 0;
                      
                      const phase = getCyclePhase(progress.cycleProgress || 0);
                      const isMenstruating = phase === 'Menstruation' && !progress.isPregnant;
                      const isOvulating = phase === 'Ovulation' && !progress.isPregnant;

                      const borderColor = isUR ? 'border-red-500' : isSSR ? 'border-yellow-500/40' : isSR ? 'border-purple-500/40' : 'border-slate-700';
                      const glowClass = isUR ? 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' : isSSR ? 'shadow-yellow-900/10' : isSR ? 'shadow-purple-900/10' : 'shadow-none';
                      const textColor = isUR ? 'text-red-200' : isSSR ? 'text-yellow-100' : isSR ? 'text-purple-100' : 'text-slate-200';
                      const subTextColor = isUR ? 'text-red-500' : isSSR ? 'text-yellow-500/70' : isSR ? 'text-purple-500/70' : 'text-slate-500';

                      return (
                          <div 
                              key={staff.id}
                              onClick={() => {
                                  playSound('click');
                                  setSelectedStaffId(staff.id);
                              }}
                              className={`
                                  relative overflow-hidden rounded-lg border transition-all duration-200 cursor-pointer group
                                  ${isDead ? 'bg-red-950/20 grayscale border-slate-800' : 'bg-slate-900/50'}
                                  ${borderColor} ${isActive ? 'ring-1 ring-cyan-500/50 bg-slate-900' : 'hover:bg-slate-800/50'}
                                  ${glowClass} shadow-lg
                              `}
                          >
                              {/* Holographic BG */}
                              {isActive && <div className="absolute inset-0 bg-cyan-900/5 z-0 pointer-events-none" />}
                              {isUR && <div className="absolute inset-0 bg-red-900/5 animate-pulse z-0 pointer-events-none" />}
                              
                              <div className="p-2 flex gap-3 relative z-10">
                                  {/* ID Photo */}
                                  <div className={`w-16 h-16 rounded overflow-hidden shrink-0 border relative ${borderColor} bg-slate-950`}>
                                      <Avatar 
                                          src={getAnimeAvatarUrl(staff.imageSeed)}
                                          alt={staff.name}
                                          className={`w-full h-full object-cover transition-transform duration-500 ${isActive ? 'scale-110' : 'grayscale group-hover:grayscale-0'}`}
                                      />
                                      {isActive && (
                                          <div className="absolute top-0 right-0 bg-cyan-500 text-[8px] font-bold text-slate-950 px-1">
                                              ON DUTY
                                          </div>
                                      )}
                                      {progress.isPregnant && (
                                          <div className="absolute bottom-0 right-0 bg-pink-500 text-white p-0.5 rounded-tl">
                                              <Baby size={10} />
                                          </div>
                                      )}
                                      {isMenstruating && (
                                          <div className="absolute top-0 left-0 bg-red-900 text-white p-0.5 rounded-br border-b border-r border-red-500 z-10" title="Menstruation">
                                              <Droplets size={10} />
                                          </div>
                                      )}
                                      {isOvulating && (
                                          <div className="absolute top-0 left-0 bg-green-900 text-green-100 p-0.5 rounded-br border-b border-r border-green-500 z-10 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]" title="Ovulation">
                                              <Thermometer size={10} />
                                          </div>
                                      )}
                                      {progress.disease && (
                                          <div className="absolute bottom-0 left-0 bg-purple-600 text-white p-0.5 rounded-tr animate-pulse z-10">
                                              <Biohazard size={10} />
                                          </div>
                                      )}
                                      {isDead && (
                                          <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center font-bold text-[10px] text-white">
                                              CRITICAL
                                          </div>
                                      )}
                                  </div>

                                  {/* Data Block */}
                                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                                      <div className="flex justify-between items-start">
                                          <div>
                                              <div className={`font-bold text-sm leading-tight ${textColor}`}>{staff.name}</div>
                                              <div className={`text-[10px] uppercase font-mono ${subTextColor}`}>{staff.role}</div>
                                          </div>
                                          <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border bg-slate-950/50 ${borderColor} ${textColor}`}>
                                              {staff.rarity}
                                          </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono bg-slate-950/30 p-1 rounded border border-slate-800/50">
                                            {staff.bonusType === 'credit_mult' && <DollarSign size={10} className="text-yellow-400" />}
                                            {staff.bonusType === 'data_mult' && <Database size={10} className="text-cyan-400" />}
                                            {staff.bonusType === 'stability_regen' && <ShieldCheck size={10} className="text-green-400" />}
                                            {staff.bonusType === 'click_power' && <Zap size={10} className="text-red-400" />}
                                            {staff.bonusType === 'life_extension' && <Hourglass size={10} className="text-orange-400" />}
                                            <span className="text-slate-300">
                                                +{staff.bonusType.includes('mult') || staff.bonusType.includes('life') ? Math.round(staff.bonusValue * 100) + '%' : (staff.bonusValue).toFixed(1)}
                                            </span>
                                      </div>
                                  </div>
                              </div>

                              {/* Footer: Level & XP */}
                              <div className="bg-slate-950/50 px-2 py-1 flex items-center gap-2 border-t border-slate-800/50">
                                  <div className="text-[9px] font-mono text-slate-500 w-8">LVL {progress.level}</div>
                                  <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-slate-500" style={{ width: `${xpPercent}%` }} />
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>

      {/* DETAILED PROFILE MODAL */}
      {selectedStaff && selectedProgress && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedStaffId(null)}>
              <div 
                className={`
                    w-full max-w-4xl h-[85vh] bg-slate-950 border-2 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative
                    ${rarityStyles.border} ${rarityStyles.shadow}
                `}
                onClick={(e) => e.stopPropagation()}
              >
                  {/* Close Button */}
                  <button 
                    onClick={() => setSelectedStaffId(null)}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors border border-white/10"
                  >
                      <X size={20} />
                  </button>

                  {/* Left Column: Big Avatar */}
                  <div className="w-full md:w-5/12 h-1/3 md:h-full relative bg-slate-900 overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10 pointer-events-none" />
                      
                      {/* Background Faction/Rarity Tint */}
                      <div className={`absolute inset-0 opacity-20 z-0 ${rarityStyles.bgTint}`} />

                      <Avatar 
                          src={getAnimeAvatarUrl(selectedStaff.imageSeed)} 
                          alt={selectedStaff.name}
                          className={`w-full h-full object-cover scale-125 translate-y-4 md:translate-y-0 ${isIncapacitated ? 'grayscale contrast-125' : ''}`}
                      />

                      {isIncapacitated && (
                          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
                              <div className="text-3xl font-bold text-red-500 border-4 border-red-500 p-4 transform -rotate-12">
                                  CRITICAL
                              </div>
                          </div>
                      )}

                      {/* Name Overlay on Mobile */}
                      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/80 to-transparent z-20 md:hidden">
                          <h2 className="text-2xl font-bold text-white leading-none">{selectedStaff.name}</h2>
                          <p className="text-xs text-slate-400 font-mono mt-1 uppercase">{selectedStaff.role}</p>
                      </div>
                  </div>

                  {/* Right Column: Info & Actions */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto bg-slate-950/50">
                      
                      {/* Header (Desktop) */}
                      <div className="hidden md:block mb-4 border-b border-slate-800 pb-4">
                           <div className="flex justify-between items-start">
                               <div>
                                   <div className="flex items-center gap-3">
                                       <h2 className={`text-4xl font-bold leading-none ${rarityStyles.text}`}>
                                           {selectedStaff.name}
                                       </h2>
                                       {isSelectedActive && (
                                           <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                               <Zap size={10} fill="currentColor" /> Active Duty
                                           </span>
                                       )}
                                       {selectedStaff.isHybrid && (
                                           <span className="px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded text-[10px] font-bold uppercase tracking-widest">
                                               Hybrid
                                           </span>
                                       )}
                                   </div>
                                   <div className="text-sm text-slate-400 font-mono mt-2 uppercase tracking-widest flex items-center gap-2">
                                       {selectedStaff.role}
                                       <span className="text-slate-600">|</span>
                                       {renderStars(selectedStaff.rarity)}
                                   </div>
                               </div>
                               <div className={`
                                   text-xs font-bold px-3 py-1 rounded border uppercase tracking-wider
                                   ${rarityStyles.badge}
                               `}>
                                   {selectedStaff.rarity} CLASS
                               </div>
                           </div>
                      </div>
                      
                      {/* --- NEW SECTION: PHYSICAL & VITALS --- */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* Physical Attributes */}
                          <div className="p-3 bg-slate-900/50 rounded border border-slate-800">
                              <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
                                  <Activity size={10} /> Physical Profile
                              </h4>
                              <div className="space-y-1">
                                  <div className="flex justify-between text-xs border-b border-slate-800/50 pb-1">
                                      <span className="text-slate-400">Age</span>
                                      <span className="text-slate-200 font-mono">{selectedStaff.age}</span>
                                  </div>
                                  <div className="flex justify-between text-xs border-b border-slate-800/50 pb-1">
                                      <span className="text-slate-400">Body Type</span>
                                      <span className="text-slate-200 font-mono">{selectedStaff.bodyType}</span>
                                  </div>
                                  <div className="flex justify-between text-xs border-b border-slate-800/50 pb-1">
                                      <span className="text-slate-400">Measurements</span>
                                      <span className="text-slate-200 font-mono">Cup: {selectedStaff.breastSize}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                      <span className="text-pink-400 font-bold flex items-center gap-1"><Link size={10} /> Fetish</span>
                                      <span className="text-pink-300 font-mono font-bold">{selectedStaff.fetish}</span>
                                  </div>
                              </div>
                          </div>

                          {/* Base Stats */}
                          <div className="p-3 bg-slate-900/50 rounded border border-slate-800 flex flex-col justify-around">
                                <div className="flex items-center gap-2">
                                    <Brain size={14} className="text-cyan-400" />
                                    <div className="flex-1">
                                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                                            <span>INT</span>
                                            <span>{selectedStaff.baseIntelligence}/10</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-cyan-500" style={{width: `${selectedStaff.baseIntelligence * 10}%`}}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Battery size={14} className="text-yellow-400" />
                                    <div className="flex-1">
                                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                                            <span>STM</span>
                                            <span>{selectedStaff.baseStamina}/10</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-yellow-500" style={{width: `${selectedStaff.baseStamina * 10}%`}}></div>
                                        </div>
                                    </div>
                                </div>
                          </div>
                      </div>

                      {/* --- BIOLOGICAL STATUS (Fertility/Cycle) --- */}
                      <div className="mb-4">
                          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                              <div className="flex justify-between items-center mb-3">
                                   <h4 className="text-[10px] text-pink-400 uppercase font-bold flex items-center gap-2">
                                        <Activity size={12} /> Biological Cycle Tracking
                                   </h4>
                                   <div className="text-[9px] font-mono text-slate-500">
                                       DAY {Math.floor((selectedProgress.cycleProgress || 0) * 0.28)} / 28
                                   </div>
                              </div>
                              
                              {/* Cycle Bar */}
                              <div className="relative h-6 bg-slate-950 rounded border border-slate-700 mb-2 overflow-hidden flex">
                                  {/* Menstruation (0-15) */}
                                  <div className="h-full bg-red-900/40 border-r border-red-500/20 relative group" style={{ width: '15%' }}>
                                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-red-900/80 text-[8px] text-red-200 transition-opacity">MENS</div>
                                  </div>
                                  {/* Follicular (15-45 -> 30%) */}
                                  <div className="h-full bg-blue-900/10 border-r border-blue-500/10 relative group" style={{ width: '30%' }}>
                                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-blue-900/80 text-[8px] text-blue-200 transition-opacity">FOLL</div>
                                  </div>
                                  {/* Ovulation (45-55 -> 10%) */}
                                  <div className="h-full bg-green-500/20 border-r border-green-500/30 relative group shadow-[0_0_10px_rgba(34,197,94,0.1)_inset]" style={{ width: '10%' }}>
                                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-green-900/80 text-[8px] text-green-200 transition-opacity">OVUL</div>
                                  </div>
                                  {/* Luteal (55-100 -> 45%) */}
                                  <div className="h-full bg-yellow-900/10 relative group" style={{ width: '45%' }}>
                                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-yellow-900/80 text-[8px] text-yellow-200 transition-opacity">LUT</div>
                                  </div>

                                  {/* Indicator */}
                                  <div 
                                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 transition-all duration-300"
                                      style={{ left: `${selectedProgress.cycleProgress || 0}%` }}
                                  >
                                      <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                                  </div>
                              </div>

                              <div className="flex justify-between items-start mt-3 gap-4">
                                   {/* Current Status Block */}
                                   <div className="flex-1 p-2 bg-slate-950/50 rounded border border-slate-800">
                                       <div className="text-[9px] text-slate-500 uppercase mb-1">Current Phase</div>
                                       <div className={`text-sm font-bold flex items-center gap-2 ${
                                          cyclePhase === 'Menstruation' ? 'text-red-400' :
                                          cyclePhase === 'Ovulation' ? 'text-green-400' :
                                          cyclePhase === 'Follicular' ? 'text-blue-300' : 'text-yellow-300'
                                       }`}>
                                          {cyclePhase === 'Menstruation' && <Droplets size={14} />}
                                          {cyclePhase === 'Ovulation' && <Thermometer size={14} />}
                                          {cyclePhase === 'Follicular' && <Activity size={14} />}
                                          {cyclePhase === 'Luteal' && <Heart size={14} />}
                                          {cyclePhase.toUpperCase()}
                                       </div>
                                       <div className="text-[9px] text-slate-400 mt-1 leading-tight">
                                          {cyclePhase === 'Menstruation' ? 'Low Energy. Breeding Unavailable.' :
                                           cyclePhase === 'Ovulation' ? 'Peak Fertility. High Conception Chance.' :
                                           cyclePhase === 'Follicular' ? 'Building Estrogen. Normal Status.' :
                                           'Progesterone Phase. Base Fertility.'}
                                       </div>
                                   </div>

                                   {/* Fertility Block */}
                                   <div className="flex-1 p-2 bg-slate-950/50 rounded border border-slate-800">
                                       <div className="text-[9px] text-slate-500 uppercase mb-1">Conception Chance</div>
                                       <div className={`text-sm font-bold font-mono ${
                                           effectiveFertility === 'High' ? 'text-green-400' :
                                           effectiveFertility === 'Medium' ? 'text-yellow-400' :
                                           effectiveFertility === 'Low' ? 'text-orange-400' : 'text-red-500'
                                       }`}>
                                           {effectiveFertility.toUpperCase()}
                                       </div>
                                        <div className="text-[9px] text-slate-400 mt-1 leading-tight">
                                           Base Potential: <span className="text-slate-300">{selectedStaff.baseFertility}</span>
                                       </div>
                                   </div>
                              </div>
                          </div>
                      </div>

                      {/* --- DYNAMIC STATUS --- */}
                      <div className="mb-6 p-4 bg-slate-900/90 border border-slate-700/50 rounded-lg shadow-inner relative overflow-hidden">
                            {/* Decorative background pulse */}
                            {(selectedProgress.health || 100) < 30 && <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />}
                            
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                                    <Activity size={14} className="text-cyan-400" /> 
                                    Vitals & Psyche
                                </h4>
                                <div className="flex gap-2">
                                    {selectedProgress.disease && (
                                        <span className="text-[9px] font-bold text-purple-200 bg-purple-900/80 border border-purple-500 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                            <Biohazard size={10} /> INFECTED
                                        </span>
                                    )}
                                    {selectedProgress.isPregnant && (
                                        <span className="text-[9px] font-bold text-pink-200 bg-pink-900/80 border border-pink-500 px-2 py-0.5 rounded flex items-center gap-1">
                                            <Baby size={10} /> PREGNANT
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Health Bar - Wide */}
                                <div>
                                    <div className="flex justify-between text-[10px] mb-1 font-bold">
                                        <span className="text-slate-400 flex items-center gap-1"><Heart size={10} /> HEALTH</span>
                                        <span className={`${(selectedProgress.health || 100) < 30 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                                            {Math.floor(selectedProgress.health || 100)}/100
                                        </span>
                                    </div>
                                    <div className="h-3 bg-slate-950 rounded border border-slate-800 relative overflow-hidden group">
                                        <div 
                                            className={`h-full transition-all duration-300 ${
                                                (selectedProgress.health || 100) < 30 ? 'bg-gradient-to-r from-red-900 to-red-600' : 'bg-gradient-to-r from-red-900 to-emerald-600'
                                            }`} 
                                            style={{width: `${Math.floor(selectedProgress.health || 100)}%`}} 
                                        />
                                        {/* Scanline effect on health bar */}
                                        <div className="absolute inset-0 bg-white/5 w-full h-full animate-[shimmer_2s_infinite]" style={{backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'}}></div>
                                    </div>
                                </div>

                                {/* Grid for other stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    {/* Fatigue */}
                                    <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <Battery size={10} className="text-orange-400" />
                                            <span className="text-[9px] font-mono text-slate-300">{Math.floor(selectedProgress.fatigue || 0)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500" style={{width: `${selectedProgress.fatigue || 0}%`}}></div>
                                        </div>
                                        <div className="text-[8px] text-slate-500 mt-1 uppercase text-center">Fatigue</div>
                                    </div>

                                    {/* Arousal */}
                                    <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <Heart size={10} className="text-pink-400" />
                                            <span className="text-[9px] font-mono text-slate-300">{Math.floor(selectedProgress.arousal || 0)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                            <div className="h-full bg-pink-500" style={{width: `${selectedProgress.arousal || 0}%`}}></div>
                                        </div>
                                        <div className="text-[8px] text-slate-500 mt-1 uppercase text-center">Arousal</div>
                                    </div>

                                    {/* Corruption */}
                                    <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <Skull size={10} className="text-purple-400" />
                                            <span className="text-[9px] font-mono text-slate-300">{Math.floor(selectedProgress.corruption || 0)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-600" style={{width: `${selectedProgress.corruption || 0}%`}}></div>
                                        </div>
                                        <div className="text-[8px] text-slate-500 mt-1 uppercase text-center">Corruption</div>
                                    </div>
                                </div>
                                
                                {/* Pregnancy Progress Bar if Applicable */}
                                {selectedProgress.isPregnant && (
                                    <div className="mt-2 pt-2 border-t border-slate-800/50">
                                        <div className="flex justify-between text-[10px] mb-1">
                                            <span className="text-pink-300 font-bold flex items-center gap-1"><Clock size={10} /> INCUBATION</span>
                                            <span className="text-white font-mono">
                                                {Math.min(100, Math.floor(((now - (selectedProgress.pregnancyStartTime || 0)) / 180000) * 100))}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                                            <div 
                                                className="h-full bg-pink-500 transition-all duration-1000 relative" 
                                                style={{width: `${Math.min(100, ((now - (selectedProgress.pregnancyStartTime || 0)) / 180000) * 100)}%`}} 
                                            >
                                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                           
                           {/* Medical Actions */}
                           {((selectedProgress.health || 100) < 100 || selectedProgress.disease) && (
                               <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800/50">
                                   {(selectedProgress.health || 100) < 100 && (
                                       <button 
                                            onClick={() => { playSound('click'); onTreatStaff(selectedStaff.id, 'HEAL'); }}
                                            className="flex-1 bg-green-900/30 border border-green-500/50 text-green-400 text-xs py-2 rounded flex items-center justify-center gap-2 hover:bg-green-900/50"
                                       >
                                           <PlusCircle size={14} /> 
                                           <span>HEAL ({Math.ceil((100 - (selectedProgress.health || 100)))} CR)</span>
                                       </button>
                                   )}
                                   {selectedProgress.disease && (
                                       <button 
                                            onClick={() => { playSound('click'); onTreatStaff(selectedStaff.id, 'CURE'); }}
                                            className="flex-1 bg-purple-900/30 border border-purple-500/50 text-purple-400 text-xs py-2 rounded flex items-center justify-center gap-2 hover:bg-purple-900/50"
                                       >
                                           <Biohazard size={14} /> 
                                           <span>CURE (300 CR)</span>
                                       </button>
                                   )}
                               </div>
                           )}
                      </div>

                      {/* Action Button Footer */}
                      <div className="mt-auto pt-6 flex gap-2">
                           {selectedProgress.isPregnant && (now - (selectedProgress.pregnancyStartTime || 0)) >= 180000 && (
                               <button 
                                    onClick={handleDelivery}
                                    className="flex-1 py-4 rounded-lg font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] animate-pulse"
                               >
                                   <Baby size={18} /> BIRTH SPECIMEN
                               </button>
                           )}

                           {!selectedProgress.isPregnant && (
                               <button
                                    onClick={() => {
                                        if (isIncapacitated) {
                                            playSound('fail');
                                            return;
                                        }
                                        if (isSelectedActive || state.activeStaffIds.length < MAX_ACTIVE_STAFF) {
                                            playSound(isSelectedActive ? 'click' : 'success');
                                            onToggleStaff(selectedStaff.id);
                                        } else {
                                            playSound('fail');
                                        }
                                    }}
                                    disabled={isIncapacitated}
                                    className={`
                                        flex-1 py-4 rounded-lg font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all
                                        ${isIncapacitated 
                                            ? 'bg-slate-900 border border-slate-800 text-red-700 cursor-not-allowed'
                                            : isSelectedActive 
                                                ? 'bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40' 
                                                : state.activeStaffIds.length >= MAX_ACTIVE_STAFF 
                                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                                    : rarityStyles.button
                                        }
                                    `}
                               >
                                   {isIncapacitated ? (
                                       <>
                                         <X size={18} /> INCAPACITATED
                                       </>
                                   ) : isSelectedActive ? (
                                       <>
                                         <Power size={18} /> Recall from Duty
                                       </>
                                   ) : state.activeStaffIds.length >= MAX_ACTIVE_STAFF ? (
                                       <>
                                         <Lock size={18} /> Squad Full ({MAX_ACTIVE_STAFF}/{MAX_ACTIVE_STAFF})
                                       </>
                                   ) : (
                                       <>
                                         <UserCheck size={18} /> Deploy to Squad
                                       </>
                                   )}
                               </button>
                           )}
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
