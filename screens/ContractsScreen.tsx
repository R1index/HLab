
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Contract, GameState, Faction, GameBonuses, Resources, Creature, ContractModifier } from '../types';
import { FACTION_LEADERS, getAnimeAvatarUrl, FACTION_RANK_BONUSES, FACTION_STYLES, CREATURE_DB } from '../constants';
import { 
    Clock, Crosshair, Database, EyeOff, Shield, ShieldAlert, Target, Zap,
    Lock, 
    Skull, ChevronRight, LockKeyhole, Signal, Globe, Radio, Hexagon, X, Briefcase, CheckCircle2,
    TrendingUp, Timer, AlertOctagon, DollarSign, Gem, PackageCheck
} from 'lucide-react';
import { playSound, setMusicIntensity } from '../utils/audio';
import { Avatar } from '../components/ui/Avatar';
import { useFloatingText } from '../components/ui/FloatingTextOverlay';
import { getModifierMeta } from '../utils/modifiers';

interface Props {
  state: GameState;
  onStartContract: (contract: Contract) => void;
  onFulfillTrade: (contractId: string, creatureId: string) => void;
  bonuses: GameBonuses;
}

const FACTION_DIRECTORS: Record<string, string> = {
    'omnicorp': 'd1',      
    'red_cell': 'd2',      
    'neural_net': 'd3',    
    'void_syndicate': 'd4',
    'aegis_systems': 'd5', 
    'bio_syn': 'd6',       
    'neon_covenant': 'd7'  
};

const FACTION_QUOTES: Record<string, string[]> = {
    'omnicorp': [ "Efficiency is our currency.", "The board demands results.", "Building a better tomorrow." ],
    'red_cell': [ "Break the system.", "Revolution isn't free.", "Strike hard, fade away." ],
    'neural_net': [ "The pattern is clear.", "Data is life.", "The singularity awaits." ],
    'void_syndicate': [ "High risk, infinite reward.", "Everything has a price.", "Cash upfront." ],
    'aegis_systems': [ "Hold the line.", "Defense is paramount.", "Secure the asset." ],
    'bio_syn': [ "Flesh is merely hardware.", "Adapt or perish.", "The DNA sequence is complete." ],
    'neon_covenant': [ "Praise the machine god.", "The glitch is divine.", "We are the ghost in the shell." ]
};

const FACTION_GRADIENTS: Record<string, string> = {
    blue: '#0ea5e9',
    red: '#ef4444',
    emerald: '#10b981',
    violet: '#8b5cf6',
    orange: '#f97316',
    lime: '#84cc16',
    fuchsia: '#d946ef'
};

const getModifierIcon = (mod: ContractModifier) => {
    const meta = getModifierMeta(mod);
    const Icon = meta.icon;
    return <Icon size={14} className={meta.textColor} />;
};

const getModifierDetails = (mod: ContractModifier) => getModifierMeta(mod).description;

// --- Components ---

const FactionSelector = ({ 
    factions, 
    selectedId, 
    onSelect 
}: { 
    factions: Faction[], 
    selectedId: string, 
    onSelect: (id: string) => void 
}) => {
    return (
        <div className="flex space-x-2 overflow-x-auto pb-4 px-1 no-scrollbar">
            {factions.map(faction => {
                const isSelected = selectedId === faction.id;
                const styles = FACTION_STYLES[faction.id];
                
                return (
                    <button
                        key={faction.id}
                        onClick={() => onSelect(faction.id)}
                        className={`
                            relative flex flex-col items-center p-3 rounded-2xl border transition-all duration-300 min-w-[100px] group
                            ${isSelected 
                                ? `${styles.bgTrans} ${styles.border} shadow-[0_0_15px_rgba(0,0,0,0.3)] scale-105 z-10 ring-1 ring-white/10` 
                                : 'bg-slate-900/50 border-white/5 opacity-70 hover:opacity-100 hover:bg-slate-800'}
                        `}
                    >
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all shadow-lg
                            ${isSelected ? `${styles.dot} shadow-[0_0_15px_currentColor] text-white` : 'bg-slate-800 text-slate-500'}
                        `}>
                            <Hexagon size={18} fill={isSelected ? "currentColor" : "none"} />
                        </div>
                        
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                            {faction.name}
                        </div>

                        {/* Level Indicator */}
                        <div className={`text-[9px] font-mono px-2 py-0.5 rounded ${isSelected ? 'bg-black/20 text-white' : 'text-slate-600'}`}>
                            LVL {faction.level}
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

const FactionHeader = ({ faction, directorId }: { faction: Faction, directorId: string }) => {
    const styles = FACTION_STYLES[faction.id];
    const bonuses = FACTION_RANK_BONUSES[faction.id as keyof typeof FACTION_RANK_BONUSES];
    const director = useMemo(() => FACTION_LEADERS.find(s => s.id === directorId), [directorId]);
    const [quote, setQuote] = useState("");

    useEffect(() => {
        const quotes = FACTION_QUOTES[faction.id] || ["Transmission incoming..."];
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, [faction.id]);

    const repPercent = Math.min(100, (faction.reputation / faction.maxReputation) * 100);

    return (
        <div className={`
            relative w-full bg-slate-900/60 backdrop-blur-md border ${styles.borderDim} rounded-2xl overflow-hidden mb-6 p-4 md:p-6
            animate-in fade-in slide-in-from-right-4 duration-300 shadow-2xl
        `}>
            {/* Cinematic Background */}
            <div className="absolute inset-0 z-0">
                <div 
                    className="absolute top-0 right-0 w-2/3 h-full opacity-10" 
                    style={{ background: `linear-gradient(90deg, transparent, ${FACTION_GRADIENTS[faction.color] || '#22c55e'})` }}
                />
                 <div className="absolute -bottom-10 -right-10 text-white/5 rotate-12">
                    <Globe size={240} />
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 relative z-10">
                {/* Director & Info */}
                <div className="flex items-start gap-5">
                    <div className={`w-20 h-20 rounded-xl border-2 ${styles.border} overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] shrink-0 bg-slate-950 group relative`}>
                        {director ? (
                            <Avatar src={getAnimeAvatarUrl(director.imageSeed)} alt={director.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : <div className="w-full h-full bg-slate-800" />}
                        <div className="absolute inset-0 border-[3px] border-white/5 pointer-events-none rounded-xl"></div>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className={`text-2xl font-bold text-white leading-none tracking-wide uppercase drop-shadow-md`}>{faction.name}</h2>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${styles.borderDim} ${styles.text} bg-slate-950/80 uppercase tracking-widest shadow-sm`}>
                                LVL {faction.level}
                            </span>
                        </div>
                        <p className={`text-xs ${styles.textLight} font-mono italic opacity-90 mb-4 pl-2 border-l-2 ${styles.borderDim}`}>"{quote}"</p>
                        
                        <div className="space-y-1.5 max-w-sm">
                            <div className="flex justify-between text-[10px] font-mono text-slate-400 font-bold tracking-wider">
                                <span className="flex items-center gap-1"><TrendingUp size={10} /> REPUTATION</span>
                                <span>{faction.reputation.toLocaleString(undefined, { maximumFractionDigits: 0 })} / {faction.maxReputation.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                                 <div className={`h-full ${styles.dot} transition-all duration-500 relative`} style={{ width: `${repPercent}%` }}>
                                     <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                                 </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Bonuses Grid */}
                <div className="flex-1 md:border-l border-white/10 md:pl-6 grid grid-cols-2 md:grid-cols-3 gap-3 content-center">
                     {Object.entries(bonuses).map(([r, bonus]) => {
                         let isUnlocked = false;
                         let isNext = false;
                         
                         if (r === 'Associate') { isUnlocked = faction.level >= 2; isNext = faction.level === 1; }
                         if (r === 'Partner') { isUnlocked = faction.level >= 10; isNext = faction.level >= 2 && faction.level < 10; }
                         if (r === 'Elite') { isUnlocked = faction.level >= 50; isNext = faction.level >= 10 && faction.level < 50; }

                         return (
                             <div key={r} className={`
                                flex items-center gap-2 p-2.5 rounded-lg border transition-all
                                ${isUnlocked 
                                    ? 'bg-slate-900/60 border-white/10 shadow-sm' 
                                    : isNext 
                                        ? 'bg-slate-900/30 border-white/5 opacity-60 grayscale' 
                                        : 'bg-transparent border-transparent opacity-30 grayscale'}
                             `}>
                                 <div className={`w-2 h-2 rounded-full ${isUnlocked ? 'bg-green-400 shadow-[0_0_5px_currentColor]' : 'bg-slate-700'}`} />
                                 <div className="flex flex-col">
                                     <div className="flex items-center gap-1">
                                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{r}</span>
                                        {isNext && <span className="text-[8px] text-cyan-400 bg-cyan-950/50 px-1 rounded border border-cyan-900 font-bold">NEXT</span>}
                                     </div>
                                     <span className={`text-[10px] font-mono font-bold ${isUnlocked ? 'text-white' : 'text-slate-600'}`}>{String(bonus)}</span>
                                 </div>
                             </div>
                         )
                     })}
                </div>
            </div>
        </div>
    );
};

const ContractCard = React.memo(({ 
    contract, 
    canAfford, 
    bonuses, 
    styles, 
    onStart,
    onTradeStart,
    isAccepting,
    onHoverMod,
    currentCredits,
    hasTradeAsset
}: {
    contract: Contract,
    canAfford: boolean,
    bonuses: GameBonuses,
    styles: any,
    onStart: (c: Contract) => void,
    onTradeStart: (c: Contract) => void,
    isAccepting: boolean,
  onHoverMod: (id: string, mod: ContractModifier | null, rect?: DOMRect) => void,
    currentCredits: number,
    hasTradeAsset?: boolean
}) => {
    const isTrade = contract.kind === 'TRADE';
    
    // Mission Logic
    const boostedData = Math.floor(contract.rewardData * bonuses.dataMult);
    const boostedCredits = Math.floor(contract.rewardCredits * bonuses.creditMult);
    const baseGems = contract.rewardGems || 0;
    const boostedGems = Math.floor(baseGems * bonuses.gemMult);
    
    // Difficulty Visuals
    const { icon: DiffIcon, color: diffColor, label: diffLabel } = useMemo(() => {
        if (isTrade) return { icon: Briefcase, color: 'text-white', label: 'Trade Request' };
        switch (contract.difficulty) {
            case 'Low': return { icon: Shield, color: 'text-emerald-400', label: 'Routine' };
            case 'Medium': return { icon: Target, color: styles.text, label: 'Standard' };
            case 'High': return { icon: Crosshair, color: 'text-yellow-400', label: 'High Stakes' };
            case 'Extreme': return { icon: Zap, color: 'text-orange-500', label: 'Extreme' };
            case 'Black Ops': return { icon: EyeOff, color: 'text-red-500', label: 'Black Ops' };
            case 'Omega': return { icon: Skull, color: 'text-fuchsia-500 animate-pulse', label: 'Omega Threat' };
            default: return { icon: Target, color: styles.text, label: 'Unknown' };
        }
    }, [contract.difficulty, styles.text, isTrade]);

    // Danger styling
    const isDangerous = contract.difficulty === 'Black Ops' || contract.difficulty === 'Omega';
    const isExtreme = contract.difficulty === 'Extreme';
    
    let borderClass = styles.borderDim;
    let bgClass = 'bg-slate-900/60 backdrop-blur-sm';
    let shadowClass = '';

    if (isTrade) {
        borderClass = 'border-emerald-500/30';
        bgClass = 'bg-emerald-950/10 backdrop-blur-sm';
        shadowClass = '';
    } else if (isDangerous) {
        borderClass = 'border-red-500/50 animate-pulse';
        bgClass = 'bg-red-950/20 backdrop-blur-sm';
        shadowClass = 'shadow-[0_0_20px_rgba(220,38,38,0.15)]';
    } else if (isExtreme) {
        borderClass = 'border-orange-500/50';
    } else if (!canAfford) {
        borderClass = 'border-slate-800';
        bgClass = 'bg-slate-950/50 opacity-60';
    }

    // Expire Logic
    const [timeLeftMs, setTimeLeftMs] = useState(Math.max(0, contract.expiresAt - Date.now()));

    useEffect(() => {
        setTimeLeftMs(Math.max(0, contract.expiresAt - Date.now())); // Init
        const timer = setInterval(() => {
            const left = Math.max(0, contract.expiresAt - Date.now());
            setTimeLeftMs(left);
        }, 1000);
        return () => clearInterval(timer);
    }, [contract.expiresAt]);

    const formatTime = (ms: number) => {
        if (ms <= 0) return "00:00";
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const missingCredits = Math.max(0, contract.deposit - currentCredits);

    return (
        <div className={`
            relative flex flex-col rounded-xl border overflow-hidden transition-all duration-200 group
            ${borderClass} ${bgClass} ${shadowClass}
            ${canAfford || isTrade ? 'hover:scale-[1.02] hover:bg-slate-900/80 hover:border-opacity-100 hover:shadow-xl' : ''}
        `}>
            {/* Header */}
            <div className="p-3 flex justify-between items-start border-b border-white/5 bg-black/20">
                <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                        <div className={`p-1 rounded bg-slate-950 border ${borderClass} ${diffColor}`}>
                            <DiffIcon size={12} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${diffColor}`}>
                            {diffLabel}
                        </span>
                        {!isTrade && <span className="text-[10px] text-slate-500 font-mono border border-slate-800 px-1 rounded">T-{contract.tier}</span>}
                    </div>
                    <h3 className="text-sm font-bold text-white leading-tight truncate pr-2" title={contract.title}>{contract.title}</h3>
                </div>
                
                {/* Expire Timer */}
                  <div className={`flex items-center gap-1 text-[10px] font-mono border px-1.5 py-0.5 rounded ${timeLeftMs < 30000 ? 'border-red-900 text-red-400 animate-pulse bg-red-950/30' : 'border-slate-800 text-slate-500 bg-slate-950'}`}>
                      <Timer size={10} />
                      {formatTime(timeLeftMs)}
                  </div>
            </div>

            {/* Content Grid */}
            <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                {isTrade ? (
                    <div className="space-y-3">
                          <div className="bg-emerald-900/10 border border-emerald-500/20 p-2 rounded relative overflow-hidden">
                             {hasTradeAsset && <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-bl shadow-sm">ASSET READY</div>}
                            <div className="text-[10px] text-emerald-500 uppercase font-bold mb-1">Required Asset</div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-white font-bold">{contract.tradeReqType}</span>
                                <span className="font-mono text-emerald-300 bg-emerald-950/30 px-1.5 rounded">{contract.tradeReqStat} &gt; {contract.tradeReqValue}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/20 p-2 rounded border border-white/5">
                            <span className="text-[9px] text-slate-500 font-mono uppercase block mb-0.5">Quota</span>
                            <span className="text-sm font-bold text-white block">{contract.quota.toLocaleString()}</span>
                        </div>
                        <div className="bg-black/20 p-2 rounded border border-white/5">
                            <span className="text-[9px] text-slate-500 font-mono uppercase block mb-0.5">Time Limit</span>
                            <span className={`text-sm font-bold block ${contract.durationSeconds < 40 ? 'text-red-400' : 'text-white'}`}>{contract.durationSeconds}s</span>
                        </div>
                    </div>
                )}
                
                {/* Modifiers */}
                {!isTrade && contract.modifiers.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {contract.modifiers.slice(0, 5).map(mod => (
                              <div 
                                key={mod}
                                onMouseEnter={(e) => onHoverMod(contract.id, mod, e.currentTarget.getBoundingClientRect())}
                                onMouseLeave={() => onHoverMod(contract.id, null)}
                                className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 cursor-help transition-colors"
                            >
                                {getModifierIcon(mod)}
                            </div>
                        ))}
                        {contract.modifiers.length > 5 && (
                            <div className="text-[9px] text-slate-600 font-mono flex items-center bg-slate-950 px-1 rounded border border-slate-800">+{contract.modifiers.length - 5}</div>
                        )}
                    </div>
                )}

                {/* Rewards */}
                <div className="mt-auto pt-3 border-t border-white/5 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Projected Yield</span>
                          <div className="flex gap-3">
                              {!isTrade && (
                                <div className={`text-xs font-bold flex items-center gap-1 font-mono ${boostedData > contract.rewardData ? 'text-cyan-300' : 'text-cyan-500'}`}>
                                    <Database size={10} /> {boostedData}
                                </div>
                              )}
                            <div className={`text-xs font-bold flex items-center gap-1 font-mono ${boostedCredits > contract.rewardCredits ? 'text-yellow-300' : 'text-yellow-500'}`}>
                                <DollarSign size={10} /> {boostedCredits}
                            </div>
                          </div>
                      </div>
                      {!isTrade && baseGems > 0 && (
                        <div className="flex justify-end">
                              <div className={`text-xs font-bold flex items-center gap-1 font-mono ${boostedGems > baseGems ? 'text-purple-300' : 'text-purple-400'}`}>
                                <Gem size={10} /> {boostedGems}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Action */}
            <button
                disabled={(!isTrade && !canAfford) || isAccepting}
                onClick={() => isTrade ? onTradeStart(contract) : onStart(contract)}
                className={`
                    w-full py-3 flex items-center justify-center gap-2 text-xs font-bold tracking-wider transition-all
                    ${(isTrade || canAfford) 
                        ? `${isTrade ? 'bg-emerald-700 hover:bg-emerald-600' : styles.btn} ${styles.btnHover} text-white shadow-lg` 
                        : 'bg-slate-900 text-slate-600 cursor-not-allowed border-t border-slate-800'}
                `}
            >
                {isAccepting ? <Clock size={14} className="animate-spin" /> : 
                  isTrade ? (
                    <>
                        <PackageCheck size={14} /> FULFILL ORDER
                    </>
                  ) : canAfford ? (
                    <>
                        <span>INITIATE PROTOCOL</span>
                        <div className="bg-black/20 px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-0.5 ml-1 opacity-90">
                            -{contract.deposit} <DollarSign size={8} />
                        </div>
                        <ChevronRight size={14} className="ml-1 opacity-70 group-hover:translate-x-1 transition-transform" />
                    </>
                    ) : (
                    <div className="flex items-center gap-1 text-red-500/70">
                        <LockKeyhole size={12} />
                        <span>MISSING {missingCredits} CR</span>
                    </div>
                  )}
            </button>
        </div>
    );
});

// --- Main Screen ---

export const ContractsScreen: React.FC<Props> = ({ state, onStartContract, onFulfillTrade, bonuses }) => {
  const [selectedFactionId, setSelectedFactionId] = useState<string>(Object.keys(state.factions)[0]);
  const [hoveredModifier, setHoveredModifier] = useState<{id: string; mod: ContractModifier; rect: DOMRect; meta: ReturnType<typeof getModifierMeta>} | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  
  // Trade Modal State
  const [selectedTradeContract, setSelectedTradeContract] = useState<Contract | null>(null);

  const { spawnText } = useFloatingText();

  // Derived state
  const selectedFaction = state.factions[selectedFactionId];
  const factionContracts = useMemo(() => 
    state.availableContracts.filter(c => c.factionId === selectedFactionId).sort((a,b) => a.tier - b.tier),
    [state.availableContracts, selectedFactionId]
  );

  const handleStart = useCallback((contract: Contract) => {
    if (isAccepting) return;
    
    if (state.resources.credits < contract.deposit) {
        playSound('fail');
        spawnText(window.innerWidth / 2, window.innerHeight / 2, "INSUFFICIENT CREDITS", "text-red-500", "lg");
        return;
    }
    
    setIsAccepting(true);
    // Don't update resources locally, store handles it in startProtocol
    playSound('click'); 
    spawnText(window.innerWidth / 2, window.innerHeight / 2, `-${contract.deposit} CR`, "text-red-400", "md");
    
    setTimeout(() => {
        setMusicIntensity('high'); 
        onStartContract(contract);
        setIsAccepting(false);
    }, 300);
  }, [isAccepting, state.resources.credits, onStartContract, spawnText]);

  const handleHoverMod = useCallback((id: string, mod: ContractModifier | null, rect?: DOMRect) => {
      setHoveredModifier(mod && rect ? { id, mod, rect, meta: getModifierMeta(mod) } : null);
  }, []);

  // --- Trade Logic ---
  const handleTradeStart = (contract: Contract) => {
      playSound('click');
      setSelectedTradeContract(contract);
  };

  const handleTradeConfirm = (creatureId: string) => {
      if (selectedTradeContract) {
          playSound('success');
          onFulfillTrade(selectedTradeContract.id, creatureId);
          setSelectedTradeContract(null);
      }
  };

  const allCreatures = useMemo(() => [...CREATURE_DB, ...state.customCreatures], [state.customCreatures]);
  const ownedCreatures = useMemo(() => allCreatures.filter(c => state.ownedCreatures.includes(c.id)), [allCreatures, state.ownedCreatures]);
  
  const eligibleCreatures = useMemo(() => {
      if (!selectedTradeContract) return [];
      const statKey = (selectedTradeContract.tradeReqStat || 'strength') as keyof Creature;
      const threshold = selectedTradeContract.tradeReqValue || 0;
      return ownedCreatures.filter(c => {
          if (c.type !== selectedTradeContract.tradeReqType) return false;
          const statVal = c[statKey];
          return typeof statVal === 'number' && statVal > threshold;
      });
  }, [selectedTradeContract, ownedCreatures]);

  // Render Dashboard View
  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      
      {/* Top Bar: Network Status */}
      <div className="flex items-center justify-between mb-4 px-2 py-1 bg-slate-900/40 rounded-lg border border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-2">
              <Radio size={14} className="text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-300 tracking-[0.2em] uppercase">Uplink Active</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
              <Lock size={10} /> SECURE
          </div>
      </div>

      {/* 1. Faction Selector (Horizontal Scroll) */}
      <div className="shrink-0 mb-4">
          <FactionSelector 
             factions={Object.values(state.factions)} 
             selectedId={selectedFactionId}
             onSelect={(id) => { playSound('click'); setSelectedFactionId(id); }}
          />
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 pb-20">
          
          {/* 2. Selected Faction Header / Intel */}
          <FactionHeader 
             faction={selectedFaction} 
             directorId={FACTION_DIRECTORS[selectedFactionId]}
          />

          {/* 3. Contract Grid */}
          <div>
                <div className="flex items-center gap-2 mb-3 px-2 border-l-2 border-slate-700 pl-2">
                    <Signal size={14} className="text-slate-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Available Operations ({factionContracts.length})</span>
                </div>
                
                {factionContracts.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-xl bg-slate-900/30 mx-2">
                        <Briefcase size={32} className="mb-2 opacity-50" />
                        <p className="font-mono text-xs">NO SIGNAL</p>
                        <p className="text-[10px] mt-1 opacity-70">Awaiting decryption of new contracts...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 px-1">
                        {factionContracts.map((contract) => {
                            // Check for trade asset availability without iterating inside component (optimization)
                            let hasTradeAsset = false;
                            if (contract.kind === 'TRADE') {
                                const statKey = (contract.tradeReqStat || 'strength') as keyof Creature;
                                const minVal = contract.tradeReqValue || 0;
                                hasTradeAsset = ownedCreatures.some(c => {
                                    if (c.type !== contract.tradeReqType) return false;
                                    const val = c[statKey];
                                    return typeof val === 'number' && val > minVal;
                                });
                            }
                            
                            return (
                                <ContractCard
                                    key={contract.id}
                                    contract={contract}
                                    canAfford={state.resources.credits >= contract.deposit}
                                    bonuses={bonuses}
                                    styles={FACTION_STYLES[contract.factionId]}
                                    onStart={handleStart}
                                    onTradeStart={handleTradeStart}
                                    isAccepting={isAccepting}
                                    onHoverMod={handleHoverMod}
                                    currentCredits={state.resources.credits}
                                    hasTradeAsset={hasTradeAsset}
                                />
                            );
                        })}
                    </div>
                )}
          </div>
      </div>

      {/* Trade Modal */}
      {selectedTradeContract && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedTradeContract(null)}>
              <div className="bg-slate-900 border border-emerald-500/50 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-emerald-950/20">
                      <div className="flex items-center gap-2">
                          <Briefcase size={18} className="text-emerald-400" />
                          <h3 className="text-lg font-bold text-white">SELECT ASSET FOR TRANSFER</h3>
                      </div>
                      <button onClick={() => setSelectedTradeContract(null)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                          <X size={18} />
                      </button>
                  </div>
                  
                  <div className="p-4 bg-slate-950/50 border-b border-slate-800 grid grid-cols-2 gap-4">
                      <div>
                          <div className="text-[10px] text-slate-500 mb-1 font-mono uppercase">Request Type</div>
                          <div className="text-sm font-bold text-emerald-300">{selectedTradeContract.tradeReqType}</div>
                      </div>
                      <div>
                          <div className="text-[10px] text-slate-500 mb-1 font-mono uppercase">Minimum Stat</div>
                          <div className="text-sm font-bold text-emerald-300 uppercase">{selectedTradeContract.tradeReqStat} &gt; {selectedTradeContract.tradeReqValue}</div>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-950">
                      {eligibleCreatures.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center justify-center text-slate-500 font-mono text-xs opacity-70">
                              <AlertOctagon size={32} className="mb-2" />
                              NO MATCHING SPECIMENS FOUND
                              <span className="text-[9px] mt-1">Check Incubation or Gacha for new assets</span>
                          </div>
                      ) : (
                          eligibleCreatures.map(c => (
                              <button 
                                key={c.id} 
                                onClick={() => handleTradeConfirm(c.id)}
                                className="w-full flex items-center justify-between p-3 rounded border border-slate-800 bg-slate-900 hover:bg-emerald-900/20 hover:border-emerald-500 transition-all group relative overflow-hidden"
                              >
                                  <div className="flex flex-col items-start relative z-10">
                                      <div className="font-bold text-white text-sm group-hover:text-emerald-300">{c.variant}</div>
                                      <div className="text-[10px] text-slate-500 font-mono uppercase flex items-center gap-2">
                                          {c.subtype} 
                                          <span className={`px-1 rounded text-[9px] border ${c.rarity === 'UR' ? 'border-red-500 text-red-400' : 'border-slate-700 text-slate-400'}`}>
                                              {c.rarity}
                                          </span>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-3 relative z-10">
                                      <div className="text-right">
                                          <div className="text-[10px] text-slate-500 uppercase">{selectedTradeContract.tradeReqStat}</div>
                                          {/* @ts-ignore */}
                                          <div className="text-sm font-mono font-bold text-emerald-400">{c[selectedTradeContract.tradeReqStat]}</div>
                                      </div>
                                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                                          <CheckCircle2 size={16} />
                                      </div>
                                  </div>
                              </button>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Tooltip Portal */}
      {hoveredModifier && createPortal(
         <div 
             className="fixed z-[9999] w-48 bg-slate-950/95 backdrop-blur-xl border border-slate-700 p-3 rounded-lg shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
             style={{
                 top: Math.max(10, hoveredModifier.rect.top - 50), 
                 left: Math.min(window.innerWidth - 200, Math.max(10, hoveredModifier.rect.left - 100)),
             }}
         >
             <div className="flex items-center gap-2 mb-1.5 border-b border-slate-800 pb-1.5">
                  <hoveredModifier.meta.icon size={14} className={hoveredModifier.meta.textColor} />
                  <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">{hoveredModifier.meta.title}</span>
              </div>
              <div className="text-slate-400 text-[10px] leading-relaxed font-mono">
                  {hoveredModifier.meta.description}
              </div>
         </div>,
         document.body
      )}
    </div>
  );
};
