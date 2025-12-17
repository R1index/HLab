
import React, { useState } from 'react';
import { GameState, Creature } from '../types';
import { CREATURE_DB } from '../constants';
import { Bug, Star, Dna, Activity, Skull, Cpu, Ghost, Heart, Droplets } from 'lucide-react';

interface Props {
  state: GameState;
}

export const CreatureScreen: React.FC<Props> = ({ state }) => {
  // Merge base DB with custom bred creatures
  const allCreatures = [...CREATURE_DB, ...state.customCreatures];
  const ownedCreatures = allCreatures.filter(c => state.ownedCreatures.includes(c.id));

  const renderStars = (rarity: string) => {
    const count = rarity === 'UR' ? 5 : rarity === 'SSR' ? 3 : rarity === 'SR' ? 2 : 1;
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: count }).map((_, i) => (
                <Star key={i} size={10} className={`fill-current ${rarity === 'UR' ? 'text-red-500' : 'text-purple-400'}`} />
            ))}
        </div>
    );
  };

  const getRarityColor = (rarity: string) => {
      switch (rarity) {
          case 'UR': return 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] bg-red-950/20';
          case 'SSR': return 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)] bg-yellow-950/20';
          case 'SR': return 'border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.2)] bg-purple-950/20';
          default: return 'border-slate-700 bg-slate-900/50';
      }
  };

  const getTypeIcon = (type: string) => {
      switch(type) {
          case 'Mechanical': return <Cpu size={48} className="text-cyan-400 opacity-80" />;
          case 'Eldritch': return <Ghost size={48} className="text-fuchsia-400 opacity-80" />;
          case 'Mutant': return <Skull size={48} className="text-green-400 opacity-80" />;
          default: return <Heart size={48} className="text-pink-400 opacity-80" />;
      }
  };

  const StatBar = ({ label, value, colorClass }: { label: string, value: number, colorClass: string }) => (
      <div className="flex items-center gap-2 text-[10px]">
          <span className="w-16 text-slate-500 uppercase font-mono truncate">{label}</span>
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              {/* Ensure value is never undefined or NaN */}
              <div className={`h-full ${colorClass}`} style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }}></div>
          </div>
          <span className="w-6 text-right font-mono text-slate-300">{Math.floor(value || 0)}</span>
      </div>
  );

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-900/50 rounded-lg text-purple-300">
                    <Dna size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white leading-none">Biological Assets</h2>
                    <p className="text-[10px] text-purple-300/70 font-mono mt-1">SPECIMEN CONTAINMENT • {ownedCreatures.length} UNITS</p>
                </div>
            </div>
            <div className="text-xs text-purple-300 font-mono border border-purple-500/30 px-2 py-1 rounded bg-purple-950/50">
                SECURE
            </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto pr-1 pb-20">
            {ownedCreatures.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30 text-slate-500">
                    <Bug size={48} className="mb-4 opacity-50" />
                    <p>NO SPECIMENS FOUND</p>
                    <p className="text-xs mt-1">Acquire assets via Incubation</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ownedCreatures.map(creature => {
                        const status = state.creatureStatus[creature.id] || { fatigue: 0, arousal: creature.arousal || 50 };
                        
                        return (
                            <div 
                                key={creature.id}
                                className={`relative rounded-xl border p-4 flex flex-col gap-3 transition-all ${getRarityColor(creature.rarity)}`}
                            >
                                {/* Header Line */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                                            <span>{creature.type}</span>
                                            <span>&gt;</span>
                                            <span className="text-slate-300 font-bold">{creature.subtype}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white leading-tight flex items-center gap-2">
                                            {creature.variant}
                                            {creature.isBred && (
                                                <span title="Genetically Engineered" className="bg-purple-500/20 text-purple-300 p-0.5 rounded border border-purple-500/50">
                                                    <Dna size={12} />
                                                </span>
                                            )}
                                        </h3>
                                    </div>
                                    {renderStars(creature.rarity)}
                                </div>

                                <div className="flex gap-4">
                                    {/* Visual */}
                                    <div className="w-20 h-24 bg-slate-950/50 rounded-lg border border-slate-800 flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden group">
                                        {getTypeIcon(creature.type)}
                                        {/* Generation Badge */}
                                        {creature.generation && creature.generation > 1 && (
                                            <div className="absolute top-0 left-0 bg-slate-800 text-[9px] px-1 rounded-br text-slate-400 border-r border-b border-slate-700 font-mono">
                                                GEN-{creature.generation}
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats Block */}
                                    <div className="flex-1 flex flex-col justify-center space-y-1.5">
                                        <StatBar label="Strength" value={creature.strength} colorClass="bg-red-500" />
                                        <StatBar label="Size" value={creature.size} colorClass="bg-blue-500" />
                                        <StatBar label="Wildness" value={creature.wildness} colorClass="bg-yellow-500" />
                                        <StatBar label="Creepiness" value={creature.creepiness} colorClass="bg-purple-800" />
                                        
                                        {/* Dynamic Stats */}
                                        <StatBar label="Arousal" value={status.arousal} colorClass="bg-pink-500" />
                                        <StatBar label="Fatigue" value={status.fatigue} colorClass="bg-orange-500" />
                                    </div>
                                </div>

                                {/* Passive Bonus & Fertility */}
                                <div className="flex justify-between items-center mt-1">
                                    <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                                        <Activity size={10} /> 
                                        BONUS: +{creature.productionBonus}%
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-mono text-pink-400 bg-pink-950/30 px-1.5 py-0.5 rounded border border-pink-900">
                                        <Droplets size={10} />
                                        FERTILITY: {creature.fertility || 'Medium'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};
