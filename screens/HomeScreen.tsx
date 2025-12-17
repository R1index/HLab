
import React, { useEffect, useState } from 'react';
import { GameState } from '../types';
import { STAFF_DB, getAnimeAvatarUrl, getFactionRank, FACTION_TEMPLATES, INFINITE_RESEARCH_DEFS, FACTION_STYLES } from '../constants';
import { Activity, Server, Cpu, Users, Palette, CheckCircle, Terminal, ShieldCheck, Zap, Biohazard, HeartPulse } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';

interface Props {
  state: GameState;
  onSetTheme: (theme: string) => void;
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
                "Monitoring biometrics..."
            ];
            const msg = `> ${msgs[Math.floor(Math.random() * msgs.length)]}`;
            setLines(prev => [msg, ...prev].slice(0, 4));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="font-mono text-[10px] text-emerald-500/80 space-y-1 h-full overflow-hidden opacity-70">
            {lines.map((l, i) => (
                <div key={i} className={i === 0 ? "text-emerald-400 font-bold" : ""}>{l}</div>
            ))}
        </div>
    );
};

export const HomeScreen: React.FC<Props> = ({ state, onSetTheme }) => {
  const activeStaff = STAFF_DB.filter(s => state.activeStaffIds.includes(s.id));
  const styles = FACTION_STYLES[state.activeTheme] || FACTION_STYLES['omnicorp']; // Fallback
  
  // Calculate total research levels
  const totalResearchLevels = Object.values(state.researchLevels).reduce((acc, lvl) => acc + lvl, 0);

  // Calculate visual multiplier for display
  const researchDataBonus = INFINITE_RESEARCH_DEFS.reduce((acc, def) => {
      if (def.effectType === 'data_mult') {
          return acc + ((state.researchLevels[def.id] || 0) * def.baseEffect);
      }
      return acc;
  }, 0);

  // Check for alerts
  const diseasedStaffCount = state.ownedStaffIds.filter(id => state.staffProgress[id]?.disease).length;
  const criticalStaffCount = state.ownedStaffIds.filter(id => (state.staffProgress[id]?.health || 100) <= 20).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Main Dashboard Card */}
      <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-0 shadow-xl overflow-hidden relative group shrink-0">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Activity size={150} />
        </div>
        {/* Header Bar */}
        <div className="bg-slate-950/50 p-3 border-b border-slate-800 flex justify-between items-center backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                <h2 className="text-sm font-bold text-slate-200 tracking-widest uppercase">Command Center</h2>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">SYS.VER.2.4.0</div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* Left Col: Main Stats */}
            <div className="space-y-4">
                 <div className="flex items-end justify-between border-b border-slate-800 pb-2">
                     <span className="text-xs text-slate-400 font-mono uppercase">Global Data Efficiency</span>
                     <span className="text-2xl font-bold text-cyan-400 font-mono">
                         {((1 + researchDataBonus) * 100).toFixed(0)}%
                     </span>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-950/40 p-2 rounded border border-slate-800/50 flex flex-col items-center">
                        <Terminal size={14} className="text-slate-500 mb-1" />
                        <div className="text-lg font-bold text-white leading-none">{state.contractsCompleted}</div>
                        <div className="text-[9px] text-slate-500 uppercase">Contracts</div>
                    </div>
                    <div className="bg-slate-950/40 p-2 rounded border border-slate-800/50 flex flex-col items-center">
                        <Cpu size={14} className="text-slate-500 mb-1" />
                        <div className="text-lg font-bold text-white leading-none">{totalResearchLevels}</div>
                        <div className="text-[9px] text-slate-500 uppercase">Upgrades</div>
                    </div>
                    <div className="bg-slate-950/40 p-2 rounded border border-slate-800/50 flex flex-col items-center">
                        <Users size={14} className="text-slate-500 mb-1" />
                        <div className="text-lg font-bold text-white leading-none">{state.ownedStaffIds.length}</div>
                        <div className="text-[9px] text-slate-500 uppercase">Staff</div>
                    </div>
                 </div>

                 {/* Alerts Section */}
                 {(diseasedStaffCount > 0 || criticalStaffCount > 0) && (
                     <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                         {diseasedStaffCount > 0 && (
                             <div className="flex-1 bg-purple-950/40 border border-purple-500/50 rounded p-2 flex items-center gap-2 text-purple-200 animate-pulse">
                                 <Biohazard size={16} />
                                 <div className="flex flex-col">
                                     <span className="text-[9px] font-bold uppercase tracking-wider">Biohazard Alert</span>
                                     <span className="text-xs">{diseasedStaffCount} Staff Infected</span>
                                 </div>
                             </div>
                         )}
                         {criticalStaffCount > 0 && (
                             <div className="flex-1 bg-red-950/40 border border-red-500/50 rounded p-2 flex items-center gap-2 text-red-200 animate-pulse">
                                 <HeartPulse size={16} />
                                 <div className="flex flex-col">
                                     <span className="text-[9px] font-bold uppercase tracking-wider">Critical Vitals</span>
                                     <span className="text-xs">{criticalStaffCount} Staff Dying</span>
                                 </div>
                             </div>
                         )}
                     </div>
                 )}
            </div>

            {/* Right Col: Console */}
            <div className="bg-black/40 rounded p-3 border border-slate-800 font-mono text-xs relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 p-1">
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                    </div>
                </div>
                <div className="text-slate-500 text-[10px] mb-2 uppercase tracking-wider">System Log</div>
                <SystemLog />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Active Squad Panel */}
        <div className="flex flex-col min-h-0">
            <h3 className="text-xs font-bold text-slate-400 mb-3 flex items-center uppercase tracking-wider">
                <Users className="mr-2 text-cyan-500" size={14} /> 
                Deployed Squad
            </h3>
            <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                {Array.from({ length: 3 }).map((_, i) => {
                    const staff = activeStaff[i];
                    return (
                        <div key={i} className={`
                            relative overflow-hidden rounded-lg border flex items-center p-2 h-18 transition-all group
                            ${staff 
                                ? 'bg-slate-900/60 border-slate-700 hover:border-slate-500' 
                                : 'bg-slate-950/30 border-slate-800 border-dashed'}
                        `}>
                            {staff ? (
                                <>
                                    <div className={`
                                        w-12 h-12 rounded border bg-slate-800 overflow-hidden shrink-0 mr-3 relative
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
                                            <div className={`text-[9px] px-1 rounded border ${
                                                staff.rarity === 'SSR' ? 'border-yellow-900 bg-yellow-950 text-yellow-500' : 'border-slate-800 bg-slate-900 text-slate-500'
                                            }`}>
                                                LVL {state.staffProgress[staff.id]?.level || 1}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate font-mono uppercase">{staff.role}</div>
                                        <div className="text-[10px] text-cyan-400 mt-0.5 flex items-center gap-1">
                                            <Zap size={10} />
                                            Active
                                        </div>
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
        <div className="flex flex-col min-h-0">
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
                            ? 'bg-cyan-950/30 border-cyan-500 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
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
                    // Fix: Check level directly as getFactionRank is deprecated/broken for UI checks
                    const factionState = state.factions[faction.id];
                    const level = factionState ? factionState.level : 1;
                    // Theme unlocks at Partner rank (Level 10)
                    const isUnlocked = level >= 10;
                    
                    const isActive = state.activeTheme === faction.id;
                    const fStyles = FACTION_STYLES[faction.id];

                    return (
                        <div 
                            key={faction.id}
                            onClick={() => {
                                if (isUnlocked) onSetTheme(faction.id);
                            }}
                            className={`
                                p-3 rounded-lg border flex items-center justify-between transition-all relative overflow-hidden
                                ${!isUnlocked 
                                    ? 'opacity-60 grayscale cursor-not-allowed bg-slate-950 border-slate-800' 
                                    : 'cursor-pointer'}
                                ${isActive 
                                    ? `${fStyles.bgTransHover} ${fStyles.border} text-white shadow-[0_0_10px_rgba(0,0,0,0.3)]` 
                                    : isUnlocked ? 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800' : ''}
                            `}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <div className={`w-3 h-3 rounded-full ${fStyles.dot} ${isActive ? 'shadow-[0_0_8px_currentColor]' : ''}`}></div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold font-mono uppercase">{faction.name}</span>
                                    {!isUnlocked && <span className="text-[9px] text-red-500 flex items-center gap-1"><ShieldCheck size={8}/> LOCKED (REQ: PARTNER)</span>}
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
