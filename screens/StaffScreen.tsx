
import React, { useState, useEffect } from 'react';
import { GameState, Creature } from '../types';
import { STAFF_DB, MAX_ACTIVE_STAFF, getAnimeAvatarUrl, getXpForNextLevel, getCyclePhase, getCurrentFertility, CREATURE_DB } from '../constants';
import { Briefcase, Star, TrendingUp, ShieldCheck, Database, DollarSign, Hourglass, UserCheck, Zap, X, Power, Lock, Heart, Brain, Activity, Battery, Skull, Baby, Link, Clock, Biohazard, PlusCircle, Droplets, Signal, Thermometer, User, Dna } from 'lucide-react';
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
      <div className="flex flex-col items-center p-2 rounded-lg bg-slate-900/50 border border-white/5 min-w-[70px] backdrop-blur-sm">
          <Icon size={16} className={`${colorClass} mb-1`} />
          <span className={`text-xs font-bold ${colorClass}`}>{value}</span>
          <span className="text-[9px] text-slate-500 uppercase font-mono">{label}</span>
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
            badge: 'border-red-500 text-red-400 bg-red-950/50',
            button: 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]'
        };
        case 'SSR': return {
            border: 'border-yellow-500/50',
            shadow: 'shadow-yellow-900/20',
            bgTint: 'bg-yellow-900',
            text: 'text-yellow-100',
            badge: 'border-yellow-500 text-yellow-400 bg-yellow-950/50',
            button: 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-[0_0_20px_rgba(234,179,8,0.4)]'
        };
        case 'SR': return {
            border: 'border-purple-500/50',
            shadow: 'shadow-purple-900/20',
            bgTint: 'bg-purple-900',
            text: 'text-purple-100',
            badge: 'border-purple-500 text-purple-400 bg-purple-950/50',
            button: 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
        };
        default: return {
            border: 'border-cyan-700/50',
            shadow: 'shadow-cyan-900/20',
            bgTint: 'bg-cyan-900',
            text: 'text-white',
            badge: 'border-cyan-600 text-cyan-400 bg-cyan-950/50',
            button: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(8,145,178,0.4)]'
        };
    }
  };

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
  
  const currentHealth = selectedProgress ? (selectedProgress.health ?? 100) : 100;
  const isIncapacitated = currentHealth <= 0;
  const cyclePhase = selectedProgress ? getCyclePhase(selectedProgress.cycleProgress || 0) : 'Follicular';
  const effectiveFertility = selectedStaff && selectedProgress ? getCurrentFertility(selectedStaff.baseFertility, selectedProgress.cycleProgress || 0) : 'Low';

  const pregnancyDuration = 180000;
  const pregnancyElapsed = (selectedProgress && selectedProgress.isPregnant && selectedProgress.pregnancyStartTime) 
      ? now - selectedProgress.pregnancyStartTime 
      : 0;
  const pregnancyPercent = Math.min(100, (pregnancyElapsed / pregnancyDuration) * 100);
  
  const partnerCreature = (selectedProgress && selectedProgress.pregnancyPartnerId) 
    ? [...CREATURE_DB, ...state.customCreatures].find(c => c.id === selectedProgress.pregnancyPartnerId)
    : null;

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
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-xl relative overflow-hidden shrink-0">
          <div className="absolute -top-10 -right-10 p-8 opacity-5 text-cyan-500 pointer-events-none animate-pulse-slow">
              <UserCheck size={180} />
          </div>

          <div className="flex flex-col gap-4 relative z-10">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h2 className="text-sm font-bold text-white flex items-center tracking-[0.2em] uppercase">
                      Active Squad
                      <span className="ml-3 text-xs bg-cyan-950/80 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 font-mono">
                          {state.activeStaffIds.length}/{MAX_ACTIVE_STAFF}
                      </span>
                  </h2>
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                       <Signal size={12} className="text-green-500 animate-pulse" /> ONLINE
                  </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-between">
                  <StatBadge icon={DollarSign} value={`+${Math.round(squadStats.creditMult * 100)}%`} label="Credits" colorClass="text-yellow-400" />
                  <StatBadge icon={Database} value={`+${Math.round(squadStats.dataMult * 100)}%`} label="Data" colorClass="text-cyan-400" />
                  <StatBadge icon={Zap} value={`+${squadStats.clickPower.toFixed(1)}`} label="Click Pwr" colorClass="text-red-400" />
                  <StatBadge icon={Hourglass} value={`+${Math.round(squadStats.lifeExtension * 100)}%`} label="Time" colorClass="text-orange-400" />
                  <StatBadge icon={ShieldCheck} value={`+${squadStats.stabilityRegen}/s`} label="Stability" colorClass="text-green-400" />
              </div>
          </div>
      </div>

      {/* Roster Grid */}
      <div className="flex-1 overflow-y-auto pr-1 pb-20">
          {ownedStaff.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                  <Briefcase size={48} className="text-slate-700 mb-4 opacity-50" />
                  <p className="text-slate-500 font-mono text-sm uppercase tracking-widest">No Personnel Record Found</p>
                  <div className="text-xs text-slate-600 mt-2">Visit Recruitment Center</div>
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
                      
                      const hp = progress.health ?? 100;
                      const isDead = hp <= 0;
                      
                      const phase = getCyclePhase(progress.cycleProgress || 0);
                      
                      const borderColor = isUR ? 'border-red-500/50' : isSSR ? 'border-yellow-500/40' : isSR ? 'border-purple-500/40' : 'border-slate-700';
                      const glowClass = isUR ? 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' : isSSR ? 'shadow-yellow-900/10' : isSR ? 'shadow-purple-900/10' : 'shadow-none';
                      const textColor = isUR ? 'text-red-200' : isSSR ? 'text-yellow-100' : isSR ? 'text-purple-100' : 'text-slate-200';
                      const subTextColor = isUR ? 'text-red-500' : isSSR ? 'text-yellow-500/70' : isSR ? 'text-purple-500/70' : 'text-slate-500';
                      const animDelay = `${(staff.imageSeed % 10) * -0.5}s`;

                      return (
                          <div 
                              key={staff.id}
                              onClick={() => {
                                  playSound('click');
                                  setSelectedStaffId(staff.id);
                              }}
                              className={`
                                  relative overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer group hover:scale-[1.01]
                                  ${isDead ? 'bg-red-950/20 grayscale border-red-900/50' : 'bg-slate-900/60 backdrop-blur-sm'}
                                  ${borderColor} ${isActive ? 'ring-1 ring-cyan-500/50 bg-slate-800/80' : 'hover:bg-slate-800/80'}
                                  ${glowClass} shadow-lg
                              `}
                          >
                              {isActive && <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none" />}
                              
                              <div className="p-3 flex gap-4 relative z-10">
                                  {/* ID Photo */}
                                  <div 
                                    className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 relative ${borderColor} bg-slate-950 ${!isDead ? 'animate-bob' : ''}`}
                                    style={{ animationDelay: animDelay }}
                                  >
                                      <Avatar 
                                          src={getAnimeAvatarUrl(staff.imageSeed)}
                                          alt={staff.name}
                                          className={`w-full h-full object-cover transition-transform duration-500 ${isActive ? 'scale-110' : 'grayscale group-hover:grayscale-0'}`}
                                      />
                                      {/* Status Overlays */}
                                      <div className="absolute bottom-0 right-0 flex flex-col-reverse">
                                          {progress.isPregnant && (
                                              <div className="bg-pink-500 text-white p-0.5 rounded-tl-lg shadow-sm">
                                                  <Baby size={10} />
                                              </div>
                                          )}
                                          {progress.disease && (
                                              <div className="bg-purple-600 text-white p-0.5 rounded-tl-lg shadow-sm animate-pulse">
                                                  <Biohazard size={10} />
                                              </div>
                                          )}
                                      </div>
                                      
                                      {isDead && (
                                          <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center font-bold text-[8px] text-white tracking-widest border-2 border-red-500">
                                              CRITICAL
                                          </div>
                                      )}
                                  </div>

                                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                                      <div className="flex justify-between items-start">
                                          <div>
                                              <div className={`font-bold text-sm leading-tight ${textColor}`}>{staff.name}</div>
                                              <div className={`text-[10px] uppercase font-mono tracking-wide ${subTextColor}`}>{staff.role}</div>
                                          </div>
                                          <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border backdrop-blur-md ${borderColor} ${textColor}`}>
                                              {staff.rarity}
                                          </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono bg-black/20 p-1.5 rounded border border-white/5">
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
                              <div className="bg-black/30 px-3 py-1.5 flex items-center gap-3 border-t border-white/5">
                                  <div className="text-[9px] font-mono text-slate-500">LVL {progress.level}</div>
                                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                      <div className={`h-full ${isUR ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${xpPercent}%` }} />
                                  </div>
                                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_currentColor] animate-pulse"></div>}
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>

      {/* DETAILED PROFILE MODAL */}
      {selectedStaff && selectedProgress && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200" onClick={() => setSelectedStaffId(null)}>
              <div 
                className={`
                    w-full max-w-4xl h-[85vh] bg-slate-950/95 border-2 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative
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
                  <div className="w-full md:w-5/12 h-1/3 md:h-full relative bg-slate-900 overflow-hidden border-b md:border-b-0 md:border-r border-slate-800 group">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10 pointer-events-none" />
                      <div className={`absolute inset-0 opacity-20 z-0 ${rarityStyles.bgTint}`} />

                      <Avatar 
                          src={getAnimeAvatarUrl(selectedStaff.imageSeed)} 
                          alt={selectedStaff.name}
                          className={`w-full h-full object-cover md:scale-125 md:translate-y-4 md:group-hover:scale-110 transition-transform duration-700 ${isIncapacitated ? 'grayscale contrast-125' : ''}`}
                      />

                      {isIncapacitated && (
                          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                              <div className="text-3xl font-bold text-red-500 border-4 border-red-500 p-4 transform -rotate-12 animate-pulse">
                                  CRITICAL
                              </div>
                          </div>
                      )}
                      
                      <div className="absolute bottom-4 left-4 z-20 md:hidden">
                           <h2 className="text-2xl font-bold text-white leading-none shadow-black drop-shadow-md">{selectedStaff.name}</h2>
                           <p className="text-xs text-slate-300">{selectedStaff.role}</p>
                      </div>
                  </div>

                  {/* Right Column: Info & Actions */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto bg-gradient-to-br from-slate-950 to-slate-900">
                      
                      {/* Header (Desktop) */}
                      <div className="hidden md:block mb-6 border-b border-white/10 pb-4">
                           <div className="flex justify-between items-start">
                               <div>
                                   <div className="flex items-center gap-3">
                                       <h2 className={`text-4xl font-bold leading-none tracking-tight ${rarityStyles.text}`}>
                                           {selectedStaff.name}
                                       </h2>
                                       {isSelectedActive && (
                                           <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                               <Zap size={10} fill="currentColor" /> Active
                                           </span>
                                       )}
                                   </div>
                                   <div className="text-sm text-slate-400 font-mono mt-2 uppercase tracking-widest flex items-center gap-2">
                                       <Briefcase size={12} /> {selectedStaff.role}
                                       <span className="text-slate-700">|</span>
                                       {renderStars(selectedStaff.rarity)}
                                   </div>
                               </div>
                               <div className={`
                                   text-xs font-bold px-3 py-1 rounded border uppercase tracking-wider backdrop-blur-md
                                   ${rarityStyles.badge}
                               `}>
                                   {selectedStaff.rarity} CLASS
                               </div>
                           </div>
                      </div>
                      
                      {/* --- Stats Grid --- */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="p-4 bg-slate-900/40 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                              <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
                                  <User size={12} /> Biometrics
                              </h4>
                              <div className="space-y-2 text-xs">
                                  <div className="flex justify-between border-b border-white/5 pb-1">
                                      <span className="text-slate-400">Age</span>
                                      <span className="text-slate-200 font-mono">{selectedStaff.age}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-white/5 pb-1">
                                      <span className="text-slate-400">Body Type</span>
                                      <span className="text-slate-200 font-mono">{selectedStaff.bodyType}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-white/5 pb-1">
                                      <span className="text-slate-400">Measurements</span>
                                      <span className="text-slate-200 font-mono">Cup: {selectedStaff.breastSize}</span>
                                  </div>
                                  <div className="flex justify-between">
                                      <span className="text-pink-400 font-bold flex items-center gap-1"><Link size={10} /> Fetish</span>
                                      <span className="text-pink-300 font-mono font-bold">{selectedStaff.fetish}</span>
                                  </div>
                              </div>
                          </div>

                          <div className="p-4 bg-slate-900/40 rounded-xl border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-center space-y-4">
                                <div>
                                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                        <span className="flex items-center gap-1"><Brain size={10} className="text-cyan-400"/> INTELLIGENCE</span>
                                        <span>{selectedStaff.baseIntelligence}/10</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-cyan-500" style={{width: `${selectedStaff.baseIntelligence * 10}%`}}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                        <span className="flex items-center gap-1"><Battery size={10} className="text-yellow-400"/> STAMINA</span>
                                        <span>{selectedStaff.baseStamina}/10</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-yellow-500" style={{width: `${selectedStaff.baseStamina * 10}%`}}></div>
                                    </div>
                                </div>
                          </div>
                      </div>

                      {/* --- Biological / Pregnancy Section --- */}
                      <div className={`mb-6 p-4 rounded-xl border ${selectedProgress.isPregnant ? 'bg-pink-950/20 border-pink-500/30' : 'bg-slate-900/40 border-white/5'}`}>
                            <div className="flex justify-between items-center mb-3">
                                   <h4 className={`text-[10px] uppercase font-bold flex items-center gap-2 ${selectedProgress.isPregnant ? 'text-pink-400' : 'text-slate-400'}`}>
                                        {selectedProgress.isPregnant ? <Baby size={12} /> : <Activity size={12} />} 
                                        {selectedProgress.isPregnant ? 'Gestation Monitor' : 'Biological Tracking'}
                                   </h4>
                                   <div className="text-[9px] font-mono text-slate-500">
                                       {selectedProgress.isPregnant ? 
                                           `${Math.floor(pregnancyPercent)}% COMPLETE` : 
                                           `DAY ${Math.floor((selectedProgress.cycleProgress || 0) * 0.28)} / 28`
                                       }
                                   </div>
                              </div>
                              
                              {selectedProgress.isPregnant ? (
                                  <div className="space-y-4">
                                      <div className="relative h-4 bg-slate-950 rounded-full border border-slate-700 overflow-hidden">
                                          <div 
                                              className="h-full bg-gradient-to-r from-pink-900 to-pink-500 relative transition-all duration-1000"
                                              style={{ width: `${pregnancyPercent}%` }}
                                          >
                                              <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                          </div>
                                      </div>
                                      <div className="flex justify-between items-end text-xs font-mono">
                                          <div>
                                              <div className="text-[10px] text-slate-500 uppercase mb-0.5">Partner DNA</div>
                                              <div className="text-pink-300 font-bold flex items-center gap-1">
                                                  <Dna size={12} />
                                                  {partnerCreature ? partnerCreature.variant : 'Unknown Specimen'}
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <div className="text-[10px] text-slate-500 uppercase mb-0.5">ETA</div>
                                              <span className="text-white font-bold">{Math.max(0, Math.ceil((pregnancyDuration - pregnancyElapsed)/1000))}s</span>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <>
                                      <div className="relative h-4 bg-slate-950 rounded-full border border-slate-700 mb-4 overflow-hidden flex">
                                          <div className="h-full bg-red-900/60 w-[15%]" title="Menstruation" />
                                          <div className="h-full bg-blue-900/20 w-[30%]" title="Follicular" />
                                          <div className="h-full bg-green-500/20 w-[10%] shadow-[inset_0_0_10px_rgba(34,197,94,0.2)]" title="Ovulation" />
                                          <div className="h-full bg-yellow-900/20 w-[45%]" title="Luteal" />
                                          <div 
                                              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] z-10 transition-all duration-300"
                                              style={{ left: `${selectedProgress.cycleProgress || 0}%` }}
                                          />
                                      </div>

                                      <div className="flex gap-4">
                                           <div className="flex-1">
                                               <div className="text-[9px] text-slate-500 uppercase mb-1">Phase</div>
                                               <div className={`text-sm font-bold flex items-center gap-2 ${
                                                  cyclePhase === 'Menstruation' ? 'text-red-400' :
                                                  cyclePhase === 'Ovulation' ? 'text-green-400' :
                                                  cyclePhase === 'Follicular' ? 'text-blue-300' : 'text-yellow-300'
                                               }`}>
                                                  {cyclePhase.toUpperCase()}
                                               </div>
                                           </div>
                                           <div className="flex-1 border-l border-white/10 pl-4">
                                               <div className="text-[9px] text-slate-500 uppercase mb-1">Fertility</div>
                                               <div className={`text-sm font-bold font-mono ${
                                                   effectiveFertility === 'High' ? 'text-green-400' :
                                                   effectiveFertility === 'Medium' ? 'text-yellow-400' :
                                                   effectiveFertility === 'Low' ? 'text-orange-400' : 'text-red-500'
                                               }`}>
                                                   {effectiveFertility.toUpperCase()}
                                               </div>
                                           </div>
                                      </div>
                                  </>
                              )}
                      </div>

                      {/* --- Health & Vitals --- */}
                      <div className="mb-6 space-y-4">
                            <div>
                                <div className="flex justify-between text-[10px] mb-1 font-bold tracking-wider">
                                    <span className="text-slate-400 flex items-center gap-1"><Heart size={10} /> INTEGRITY</span>
                                    {/* Using Math.ceil to prevent confusion where 0.1 shows as 0 but unit is alive */}
                                    <span className={`${currentHealth < 30 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                                        {Math.ceil(currentHealth)}%
                                    </span>
                                </div>
                                <div className="h-4 bg-slate-950 rounded-full border border-slate-800 relative overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-300 ${
                                            currentHealth < 30 ? 'bg-gradient-to-r from-red-900 to-red-600' : 'bg-gradient-to-r from-emerald-900 to-emerald-500'
                                        }`} 
                                        style={{width: `${Math.floor(currentHealth)}%`}} 
                                    >
                                        <div className="absolute inset-0 bg-white/10 w-full h-full animate-[shimmer_2s_infinite]" style={{backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'}}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {['Fatigue', 'Arousal', 'Corruption'].map(stat => {
                                    let val = 0;
                                    let color = '';
                                    let icon = null;
                                    if(stat==='Fatigue') { val=selectedProgress.fatigue||0; color='bg-orange-500'; icon=<Battery size={10} className="text-orange-400"/>; }
                                    if(stat==='Arousal') { val=selectedProgress.arousal||0; color='bg-pink-500'; icon=<Heart size={10} className="text-pink-400"/>; }
                                    if(stat==='Corruption') { val=selectedProgress.corruption||0; color='bg-purple-600'; icon=<Skull size={10} className="text-purple-400"/>; }

                                    return (
                                        <div key={stat} className="bg-slate-950/30 p-2 rounded border border-white/5">
                                            <div className="flex justify-between items-center mb-1">
                                                {icon}
                                                <span className="text-[9px] font-mono text-slate-300">{Math.floor(val)}%</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                                <div className={`h-full ${color}`} style={{width: `${val}%`}}></div>
                                            </div>
                                            <div className="text-[8px] text-slate-500 mt-1 uppercase text-center font-bold tracking-wider">{stat}</div>
                                        </div>
                                    )
                                })}
                            </div>

                             {/* Medical Actions */}
                           {(currentHealth < 100 || selectedProgress.disease) && (
                               <div className="flex gap-2 pt-3 border-t border-white/10">
                                   {currentHealth < 100 && (
                                       <button 
                                            onClick={() => { playSound('click'); onTreatStaff(selectedStaff.id, 'HEAL'); }}
                                            className={`flex-1 text-xs py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-opacity-80 transition-all font-bold tracking-wider shadow-lg
                                                ${currentHealth <= 0 
                                                    ? 'bg-red-900/80 border border-red-500 text-red-100 animate-pulse' 
                                                    : 'bg-green-600 border border-green-400 text-white'}`}
                                       >
                                           <PlusCircle size={14} /> 
                                           <span>{currentHealth <= 0 ? 'REVIVE (500 CR)' : `HEAL (${Math.ceil((100 - currentHealth))} CR)`}</span>
                                       </button>
                                   )}
                                   {selectedProgress.disease && (
                                       <button 
                                            onClick={() => { playSound('click'); onTreatStaff(selectedStaff.id, 'CURE'); }}
                                            className="flex-1 bg-purple-600 border border-purple-400 text-white text-xs py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-500 shadow-lg font-bold tracking-wider"
                                       >
                                           <Biohazard size={14} /> 
                                           <span>CURE (300 CR)</span>
                                       </button>
                                   )}
                               </div>
                           )}
                      </div>

                      {/* Action Button Footer */}
                      <div className="mt-auto pt-6 flex gap-2 sticky bottom-0 bg-gradient-to-t from-slate-950 to-transparent pb-2">
                           {selectedProgress.isPregnant && (now - (selectedProgress.pregnancyStartTime || 0)) >= 180000 && (
                               <button 
                                    onClick={handleDelivery}
                                    className="flex-1 py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] animate-pulse"
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
                                        flex-1 py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-lg
                                        ${isIncapacitated 
                                            ? 'bg-slate-900 border border-slate-800 text-red-700 cursor-not-allowed'
                                            : isSelectedActive 
                                                ? 'bg-red-900/80 text-white border border-red-500 hover:bg-red-800' 
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
                                         <Lock size={18} /> Squad Full
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
