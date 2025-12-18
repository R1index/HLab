
import React, { useEffect, useState, useMemo } from 'react';
import { GameState } from '../types';
import { STAFF_DB, getAnimeAvatarUrl, getFactionRank, FACTION_TEMPLATES, INFINITE_RESEARCH_DEFS, FACTION_STYLES, CREATURE_DB } from '../constants';
import { Activity, Server, Cpu, Users, Palette, CheckCircle, Terminal, ShieldCheck, Zap, Biohazard, HeartPulse, HardDrive, Waves, Globe } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { useFloatingText } from '../components/ui/FloatingTextOverlay';
import { playSound } from '../utils/audio';

interface Props {
  state: GameState;
  onSetTheme: (theme: string) => void;
  onManualHack?: () => void;
  onDevMode?: () => void;
}

const SystemLog = () => {
    const [lines, setLines] = useState<string[]>([
        "> Initializing system core...",
        "> Connection established.",
        "> Awaiting input."
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            const msgs = [
                "Scanning network traffic...",
                "Optimizing algorithms...",
                "Ping: 24ms",
                "Firewall integrity: 98%",
                "Updating cache...",
                "Resyncing database...",
                "Monitoring biometrics...",
                "Decrypting remote assets...",
                "System stable."
            ];
            const msg = `> ${msgs[Math.floor(Math.random() * msgs.length)]}`;
            setLines(prev => [msg, ...prev].slice(0, 5));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="font-mono text-[10px] text-emerald-500 space-y-1 h-full overflow-hidden opacity-90 p-1">
            {lines.map((l, i) => (
                <div key={i} className={`${i === 0 ? "text-emerald-300 font-bold border-l-2 border-emerald-500 pl-2 animate-pulse" : "text-emerald-700/80"}`}>
                    {l}
                </div>
            ))}
        </div>
    );
};

export const HomeScreen: React.FC<Props> = ({ state, onSetTheme, onManualHack, onDevMode }) => {
  const activeStaff = STAFF_DB.filter(s => state.activeStaffIds.includes(s.id));
  const styles = FACTION_STYLES[state.activeTheme] || FACTION_STYLES['omnicorp']; 
  const { spawnText } = useFloatingText();
  const [onCooldown, setOnCooldown] = useState(false);
  const [cmdInput, setCmdInput] = useState("");
  
  const totalResearchLevels = Object.values(state.researchLevels).reduce((acc, lvl) => acc + lvl, 0);

  const researchDataBonus = INFINITE_RESEARCH_DEFS.reduce((acc, def) => {
      if (def.effectType === 'data_mult') {
          return acc + ((state.researchLevels[def.id] || 0) * def.baseEffect);
      }
      return acc;
  }, 0);

  const passiveRates = useMemo(() => {
        let dataPerSec = 0;
        let dataMult = 1;
        if (state.researchLevels['computing']) dataMult += (state.researchLevels['computing'] * 0.05);
        if (state.factions['neural_net'] && state.factions['neural_net'].level >= 2) dataMult += 0.05;

        activeStaff.forEach(s => {
            const p = state.staffProgress[s.id];
            if (p && (p.health ?? 100) > 0) {
                 const lvlMult = 1 + ((p.level - 1) * 0.1);
                 if (s.bonusType === 'data_mult') dataMult += (s.bonusValue * lvlMult);
            }
        });

        const allCreatures = [...CREATURE_DB, ...state.customCreatures];
        state.ownedCreatures.forEach(cId => {
            const c = allCreatures.find(def => def.id === cId);
            if(c) dataPerSec += (c.productionBonus || 0);
        });

        return {
            data: Math.floor(dataPerSec * dataMult)
        };
  }, [state.ownedCreatures, state.customCreatures, state.activeStaffIds, state.researchLevels, state.factions, state.staffProgress, activeStaff]);

  const diseasedStaffCount = state.ownedStaffIds.filter(id => state.staffProgress[id]?.disease).length;
  const criticalStaffCount = state.ownedStaffIds.filter(id => (state.staffProgress[id]?.health ?? 100) <= 20).length;

  useEffect(() => {
    if (Date.now() - state.lastHackTime < 500) {
        setOnCooldown(true);
        const timeout = setTimeout(() => setOnCooldown(false), 500 - (Date.now() - state.lastHackTime));
        return () => clearTimeout(timeout);
    }
  }, [state.lastHackTime]);

  const handleHack = (e: React.MouseEvent) => {
      if (onManualHack && !onCooldown) {
          playSound('click');
          onManualHack();
          spawnText(e.clientX, e.clientY, "+1", "text-cyan-400", "sm");
          setOnCooldown(true);
      }
  };

  const handleCmdInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.toUpperCase();
      setCmdInput(val);
      if (val === 'DEVRINDEX') {
          if (onDevMode) {
              onDevMode();
              playSound('success');
              spawnText(window.innerWidth / 2, window.innerHeight / 2, "DEV MODE ACCESS GRANTED", "text-green-500", "lg");
          }
          setCmdInput('');
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Main Dashboard Card */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-0 shadow-2xl overflow-hidden relative group shrink-0">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Globe size={200} className="animate-spin-slow" />
        </div>
        
        {/* Header Bar */}
        <div className="bg-slate-950/60 p-3 border-b border-white/5 flex justify-between items-center backdrop-blur-sm">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <h2 className="text-sm font-bold text-slate-200 tracking-[0.2em] uppercase font-mono">Command Center</h2>
            </div>
            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                <Server size={10} /> SYS.VER.2.4.1
            </div>
        </div>
        
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* Left Col: Main Stats */}
            <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-3">
                     <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 flex flex-col justify-between h-24">
                         <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Efficiency</span>
                         <span className="text-3xl font-bold text-cyan-400 font-mono tracking-tighter drop-shadow-sm">
                             {((1 + researchDataBonus) * 100).toFixed(0)}%
                         </span>
                         <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-cyan-500 w-full animate-[shimmer_2s_infinite]"></div>
                         </div>
                     </div>
                     <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/20 flex flex-col justify-between h-24 relative overflow-hidden">
                         <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>
                         <span className="text-[10px] text-emerald-400/80 font-mono uppercase tracking-wider flex items-center gap-1">
                             <Waves size={10} /> Passive
                         </span>
                         <span className="text-2xl font-bold text-emerald-400 font-mono tracking-tighter">
                             +{passiveRates.data}/s
                         </span>
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-950/40 p-2 rounded-lg border border-white/5 flex flex-col items-center hover:bg-white/5 transition-colors">
                        <Terminal size={16} className="text-slate-500 mb-1" />
                        <div className="text-lg font-bold text-white leading-none">{state.contractsCompleted}</div>
                        <div className="text-[9px] text-slate-500 uppercase font-mono">Ops</div>
                    </div>
                    <div className="bg-slate-950/40 p-2 rounded-lg border border-white/5 flex flex-col items-center hover:bg-white/5 transition-colors">
                        <Cpu size={16} className="text-slate-500 mb-1" />
                        <div className="text-lg font-bold text-white leading-none">{totalResearchLevels}</div>
                        <div className="text-[9px] text-slate-500 uppercase font-mono">Tech</div>
                    </div>
                    <div className="bg-slate-950/40 p-2 rounded-lg border border-white/5 flex flex-col items-center hover:bg-white/5 transition-colors">
                        <Users size={16} className="text-slate-500 mb-1" />
                        <div className="text-lg font-bold text-white leading-none">{state.ownedStaffIds.length}</div>
                        <div className="text-[9px] text-slate-500 uppercase font-mono">Units</div>
                    </div>
                 </div>

                 {/* Alerts Section */}
                 {(diseasedStaffCount > 0 || criticalStaffCount > 0) && (
                     <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                         {diseasedStaffCount > 0 && (
                             <div className="flex-1 bg-purple-950/40 border border-purple-500/50 rounded p-2 flex items-center gap-2 text-purple-200 animate-pulse">
                                 <Biohazard size={16} />
                                 <div className="flex flex-col">
                                     <span className="text-[9px] font-bold uppercase tracking-wider">Biohazard</span>
                                     <span className="text-xs">{diseasedStaffCount} Infected</span>
                                 </div>
                             </div>
                         )}
                         {criticalStaffCount > 0 && (
                             <div className="flex-1 bg-red-950/40 border border-red-500/50 rounded p-2 flex items-center gap-2 text-red-200 animate-pulse">
                                 <HeartPulse size={16} />
                                 <div className="flex flex-col">
                                     <span className="text-[9px] font-bold uppercase tracking-wider">Critical</span>
                                     <span className="text-xs">{criticalStaffCount} Dying</span>
                                 </div>
                             </div>
                         )}
                     </div>
                 )}
            </div>

            {/* Right Col: Console & Manual Hack */}
            <div className="flex flex-col gap-3 h-full">
                <div className="bg-black/60 rounded-xl p-3 border border-white/10 font-mono text-xs relative overflow-hidden flex flex-col flex-1 shadow-inner">
                    <div className="absolute top-0 right-0 p-2 flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                    </div>
                    <div className="text-slate-600 text-[9px] mb-2 uppercase tracking-wider font-bold">/var/log/syslog</div>
                    <SystemLog />
                    
                    {/* Hidden Dev Mode Input */}
                    <div className="mt-2 flex items-center border-t border-white/10 pt-2">
                        <span className="text-emerald-500 font-bold mr-2 text-[10px] animate-pulse">{'>'}</span>
                        <input 
                            type="text" 
                            value={cmdInput}
                            onChange={handleCmdInput}
                            className="bg-transparent border-none outline-none text-emerald-400 text-[10px] font-mono w-full placeholder-emerald-800/50 uppercase"
                            placeholder="EXECUTE_CMD..."
                            spellCheck={false}
                        />
                    </div>
                </div>
                
                {onManualHack && (
                    <button 
                        onClick={handleHack}
                        disabled={onCooldown}
                        className={`
                            relative h-14 rounded-xl border flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-wider shadow-lg overflow-hidden group transition-all
                            ${onCooldown 
                                ? 'bg-slate-900 border-slate-700 text-slate-600 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border-slate-600 text-slate-200 hover:text-white hover:border-cyan-500/50 hover:shadow-cyan-900/20'}
                        `}
                    >
                        <HardDrive size={18} className={`${onCooldown ? '' : 'text-cyan-500 group-hover:text-cyan-400'}`} />
                        <span>{onCooldown ? 'Recharging...' : 'Manual Mining Override'}</span>
                        {/* Progress Bar for cooldown */}
                        {onCooldown && <div className="absolute bottom-0 left-0 h-1 bg-cyan-500 animate-[width_0.5s_linear_forwards] w-full origin-left" />}
                        {/* Shimmer effect when active */}
                        {!onCooldown && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />}
                    </button>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 flex-1 min-h-0">
        {/* Active Squad Panel */}
        <div className="flex flex-col min-h-0 bg-slate-900/30 border border-white/5 rounded-xl p-3 md:p-4">
            <h3 className="text-xs font-bold text-slate-400 mb-3 flex items-center uppercase tracking-wider">
                <Users className="mr-2 text-cyan-500" size={14} /> 
                Deployed Squad
            </h3>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {Array.from({ length: 3 }).map((_, i) => {
                    const staff = activeStaff[i];
                    return (
                        <div key={i} className={`
                            relative overflow-hidden rounded-lg border flex items-center p-2 h-16 transition-all group
                            ${staff 
                                ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-800/60' 
                                : 'bg-slate-900/20 border-slate-800 border-dashed'}
                        `}>
                            {staff ? (
                                <>
                                    <div className={`
                                        w-12 h-12 rounded border-2 bg-slate-950 overflow-hidden shrink-0 mr-3 relative shadow-md
                                        ${staff.rarity === 'SSR' ? 'border-yellow-500/50' : staff.rarity === 'SR' ? 'border-purple-500/50' : 'border-blue-500/50'}
                                    `}>
                                      <Avatar 
                                          src={getAnimeAvatarUrl(staff.imageSeed)} 
                                          alt={staff.name} 
                                          className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start">
                                            <div className={`font-bold text-sm truncate ${staff.rarity === 'SSR' ? 'text-yellow-200' : 'text-white'}`}>
                                                {staff.name}
                                            </div>
                                            <div className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                                staff.rarity === 'SSR' ? 'bg-yellow-950 text-yellow-500 border border-yellow-900' : 'bg-slate-950 text-slate-500 border border-slate-800'
                                            }`}>
                                                LVL {state.staffProgress[staff.id]?.level || 1}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate font-mono uppercase tracking-wide">{staff.role}</div>
                                    </div>
                                    <div className="flex items-center text-cyan-500 animate-pulse ml-2">
                                        <Activity size={14} />
                                    </div>
                                </>
                            ) : (
                                <div className="w-full flex items-center justify-center text-slate-700 gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                                    <span className="text-[10px] font-mono uppercase tracking-widest">Empty Socket</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* System Theme Selector */}
        <div className="flex flex-col min-h-0 bg-slate-900/30 border border-white/5 rounded-xl p-3 md:p-4">
            <h3 className="text-xs font-bold text-slate-400 mb-3 flex items-center uppercase tracking-wider">
                <Palette className="mr-2 text-purple-500" size={14} /> 
                Interface Skin
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                <div 
                    onClick={() => onSetTheme('default')}
                    className={`
                        p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all
                        ${state.activeTheme === 'default' 
                            ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                            : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:bg-slate-800'}
                    `}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_5px_currentColor]`}></div>
                        <span className="text-xs font-bold font-mono uppercase">Standard OS</span>
                    </div>
                    {state.activeTheme === 'default' && <CheckCircle size={14} className="text-cyan-500" />}
                </div>

                {FACTION_TEMPLATES.map(faction => {
                    const factionState = state.factions[faction.id];
                    const level = factionState ? factionState.level : 1;
                    const rank = getFactionRank(level);
                    const isUnlocked = ['Partner', 'Elite', 'Legend'].includes(rank);
                    
                    const isActive = state.activeTheme === faction.id;
                    const fStyles = FACTION_STYLES[faction.id];

                    return (
                        <div 
                            key={faction.id}
                            onClick={() => {
                                if (isUnlocked) onSetTheme(faction.id);
                            }}
                            className={`
                                p-3 rounded-lg border flex items-center justify-between transition-all relative overflow-hidden group
                                ${!isUnlocked 
                                    ? 'opacity-50 grayscale cursor-not-allowed bg-slate-950 border-slate-800' 
                                    : 'cursor-pointer'}
                                ${isActive 
                                    ? `${fStyles.bgTransHover} ${fStyles.border} text-white shadow-lg` 
                                    : isUnlocked ? 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800' : ''}
                            `}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`w-3 h-3 rounded-full ${fStyles.dot} ${isActive ? 'shadow-[0_0_8px_currentColor]' : ''}`}></div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold font-mono uppercase">{faction.name}</span>
                                    {!isUnlocked && (
                                        <span className="text-[9px] text-red-500 flex items-center gap-1 font-bold">
                                            <ShieldCheck size={8} /> LOCKED
                                        </span>
                                    )}
                                </div>
                            </div>
                            {isActive && <CheckCircle size={14} className={fStyles.text} />}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};
