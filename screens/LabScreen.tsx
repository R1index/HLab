
import React from 'react';
import { GameState, ResearchCategory } from '../types';
import { INFINITE_RESEARCH_DEFS } from '../constants';
import { Zap, Database, DollarSign, Brain, Shield, Star, ChevronRight, Lock, CircuitBoard } from 'lucide-react';
import { playSound } from '../utils/audio';

interface Props {
  state: GameState;
  buyResearch: (id: ResearchCategory) => void;
}

export const LabScreen: React.FC<Props> = ({ state, buyResearch }) => {
  const getIcon = (iconName: string, size=20) => {
      switch(iconName) {
          case 'cpu': return <CircuitBoard size={size} />;
          case 'dollar': return <DollarSign size={size} />;
          case 'brain': return <Brain size={size} />;
          case 'shield': return <Shield size={size} />;
          case 'star': return <Star size={size} />;
          default: return <Zap size={size} />;
      }
  };

  return (
    <div className="space-y-4 h-full flex flex-col animate-in fade-in duration-300">
      <div className="flex items-center justify-between shrink-0 mb-2">
         <div className="flex items-center gap-3">
             <div className="p-2 bg-emerald-950/50 rounded-lg border border-emerald-500/30 text-emerald-400">
                 <CircuitBoard size={20} />
             </div>
             <div>
                <h2 className="text-lg font-bold text-white leading-none">R&D TERMINAL</h2>
                <div className="text-[10px] text-emerald-500/60 font-mono mt-1">INFINITE SCALING PROTOCOLS</div>
             </div>
         </div>
         <div className="text-right flex flex-col items-end">
             <div className="flex items-center gap-2 text-xs">
                 <span className="text-slate-500 uppercase font-mono">Data</span>
                 <span className="font-bold text-cyan-400 font-mono">{state.resources.data.toLocaleString()}</span>
             </div>
             <div className="flex items-center gap-2 text-xs">
                 <span className="text-slate-500 uppercase font-mono">Credits</span>
                 <span className="font-bold text-yellow-400 font-mono">{state.resources.credits.toLocaleString()}</span>
             </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 pb-20">
            {INFINITE_RESEARCH_DEFS.map((def, index) => {
                const currentLevel = state.researchLevels[def.id] || 0;
                const cost = Math.floor(def.baseCost * Math.pow(def.costScaling, currentLevel));
                const currentEffect = currentLevel * def.baseEffect;
                const nextEffect = (currentLevel + 1) * def.baseEffect;
                
                const isCreditCost = def.costType === 'credits';
                const canAfford = isCreditCost ? state.resources.credits >= cost : state.resources.data >= cost;

                const isPercentage = def.effectType.includes('mult') || def.effectType.includes('luck');
                const valueMultiplier = isPercentage ? 100 : 1;
                const unit = isPercentage ? '%' : '';
                
                const tier = Math.floor(currentLevel / 10) + 1;

                return (
                    <div 
                        key={def.id} 
                        className={`
                            relative bg-slate-900/80 border rounded-lg overflow-hidden transition-all duration-200 group
                            ${canAfford ? 'border-slate-700 hover:border-emerald-500/50 hover:bg-slate-900' : 'border-slate-800 opacity-90'}
                        `}
                    >
                        {/* Connecting Line Art */}
                        <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-800 z-0"></div>
                        <div className="absolute left-6 top-1/2 w-4 h-px bg-slate-800 z-0"></div>

                        <div className="flex items-stretch relative z-10">
                            {/* Icon Column */}
                            <div className="w-16 flex flex-col items-center justify-center border-r border-slate-800 bg-slate-950/30">
                                <div className={`
                                    w-10 h-10 rounded flex items-center justify-center text-slate-300 shadow-lg border
                                    ${canAfford ? 'bg-slate-800 border-slate-600' : 'bg-slate-900 border-slate-800'}
                                `}>
                                    {getIcon(def.icon, 20)}
                                </div>
                                <div className="mt-2 text-[9px] font-mono text-slate-600">TIER {tier}</div>
                            </div>

                            {/* Content Column */}
                            <div className="flex-1 p-3 flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{def.name}</h3>
                                        <p className="text-[10px] text-slate-400 leading-tight max-w-[200px]">{def.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-slate-500 font-mono uppercase">Level</div>
                                        <div className="text-lg font-bold text-white font-mono leading-none">{currentLevel}</div>
                                    </div>
                                </div>

                                {/* Progress/Effect Bar */}
                                <div className="bg-slate-950/50 rounded p-2 border border-slate-800/50 flex items-center justify-between text-xs mb-2">
                                    <span className="text-slate-500 font-mono uppercase text-[10px]">Effect</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-emerald-400 font-bold">
                                            +{(currentEffect * valueMultiplier).toFixed(1)}{unit}
                                        </span>
                                        <ChevronRight size={12} className="text-slate-600" />
                                        <span className="text-slate-300">
                                            +{(nextEffect * valueMultiplier).toFixed(1)}{unit}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (canAfford) {
                                            playSound('success');
                                            buyResearch(def.id);
                                        } else {
                                            playSound('fail');
                                        }
                                    }}
                                    disabled={!canAfford}
                                    className={`
                                        w-full py-2 px-3 rounded text-xs font-bold flex items-center justify-between transition-all
                                        ${canAfford 
                                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-800/40 hover:border-emerald-500/50' 
                                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}
                                    `}
                                >
                                    <span className="font-mono flex items-center">
                                        {canAfford ? 'UPGRADE' : `INSUFFICIENT ${isCreditCost ? 'CREDITS' : 'DATA'}`}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {canAfford ? 
                                            (isCreditCost ? <DollarSign size={12} /> : <Database size={12} />) : 
                                            <Lock size={12} />
                                        }
                                        <span className={isCreditCost ? 'text-yellow-400' : 'text-cyan-400'}>{cost.toLocaleString()}</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
      </div>
    </div>
  );
};
