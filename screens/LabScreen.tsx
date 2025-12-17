
import React from 'react';
import { GameState, ResearchCategory } from '../types';
import { INFINITE_RESEARCH_DEFS } from '../constants';
import { Zap, Database, DollarSign, Brain, Shield, Star, ChevronRight, Lock, CircuitBoard, ArrowDown } from 'lucide-react';
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
      <div className="flex items-center justify-between shrink-0 mb-4 p-4 bg-emerald-950/30 border border-emerald-500/20 rounded-xl">
         <div className="flex items-center gap-4">
             <div className="p-3 bg-emerald-900/50 rounded-lg border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                 <CircuitBoard size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white leading-none tracking-wide">R&D TERMINAL</h2>
                <div className="text-[10px] text-emerald-500/80 font-mono mt-1 uppercase tracking-widest">Protocol Upgrade System</div>
             </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-0 pb-20 relative">
            {/* Tech Tree Line */}
            <div className="absolute left-8 top-4 bottom-10 w-0.5 bg-gradient-to-b from-slate-700 to-transparent z-0"></div>

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
                    <div key={def.id} className="relative pl-16 mb-6">
                        {/* Connector Node */}
                        <div className={`absolute left-[30px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 z-10 bg-slate-950 ${currentLevel > 0 ? 'border-emerald-500 shadow-[0_0_10px_#10b981]' : 'border-slate-700'}`}>
                             {currentLevel > 0 && <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>}
                        </div>
                        <div className={`absolute left-[34px] top-1/2 w-8 h-0.5 z-0 ${currentLevel > 0 ? 'bg-emerald-500/50' : 'bg-slate-700'}`}></div>

                        <div 
                            className={`
                                relative bg-slate-900/80 border rounded-xl overflow-hidden transition-all duration-200 group
                                ${canAfford ? 'border-slate-600 hover:border-emerald-500/50 hover:bg-slate-800 hover:shadow-lg' : 'border-slate-800 opacity-80'}
                            `}
                        >
                            <div className="flex items-stretch relative z-10">
                                {/* Icon Column */}
                                <div className="w-20 flex flex-col items-center justify-center border-r border-white/5 bg-black/20">
                                    <div className={`
                                        w-12 h-12 rounded-lg flex items-center justify-center text-slate-300 shadow-lg border transition-all
                                        ${canAfford ? 'bg-slate-800 border-slate-600 group-hover:border-emerald-500 group-hover:text-emerald-400' : 'bg-slate-900 border-slate-800'}
                                    `}>
                                        {getIcon(def.icon, 24)}
                                    </div>
                                    <div className="mt-2 text-[9px] font-mono text-slate-500 font-bold">TIER {tier}</div>
                                </div>

                                {/* Content Column */}
                                <div className="flex-1 p-4 flex flex-col justify-between">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-wide">{def.name}</h3>
                                            <p className="text-[10px] text-slate-400 leading-tight max-w-[200px] mt-1">{def.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] text-slate-500 font-mono uppercase">Level</div>
                                            <div className="text-xl font-bold text-white font-mono leading-none">{currentLevel}</div>
                                        </div>
                                    </div>

                                    {/* Progress/Effect Bar */}
                                    <div className="bg-black/30 rounded p-2 border border-white/5 flex items-center justify-between text-xs mb-3">
                                        <span className="text-slate-500 font-mono uppercase text-[10px] font-bold">Current Bonus</span>
                                        <div className="flex items-center gap-2 font-mono">
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
                                            w-full py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-between transition-all shadow-md
                                            ${canAfford 
                                                ? 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500' 
                                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}
                                        `}
                                    >
                                        <span className="font-mono flex items-center uppercase tracking-wider">
                                            {canAfford ? 'Upgrade Protocol' : 'Insufficient Resources'}
                                        </span>
                                        <div className="flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded">
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
                    </div>
                );
            })}
      </div>
    </div>
  );
};
