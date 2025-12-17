
import React, { useState, useMemo } from 'react';
import { GameState, Creature, CreatureStatus } from '../types';
import { CREATURE_DB } from '../constants';
import { Bug, Star, Dna, Activity, Skull, Cpu, Ghost, Heart, Droplets, Box, X, Sword, Maximize, Flame, Zap, Scan, Thermometer, Battery, Microscope } from 'lucide-react';
import { playSound } from '../utils/audio';

interface Props {
  state: GameState;
}

export const CreatureScreen: React.FC<Props> = ({ state }) => {
  const [selectedCreatureId, setSelectedCreatureId] = useState<string | null>(null);

  // Merge base DB with custom bred creatures
  const allCreatures = useMemo(() => [...CREATURE_DB, ...state.customCreatures], [state.customCreatures]);
  const ownedCreatures = useMemo(() => allCreatures.filter(c => state.ownedCreatures.includes(c.id)), [allCreatures, state.ownedCreatures]);
  
  const selectedCreature = useMemo(() => ownedCreatures.find(c => c.id === selectedCreatureId), [ownedCreatures, selectedCreatureId]);
  const selectedStatus = selectedCreature ? (state.creatureStatus[selectedCreature.id] || { fatigue: 0, arousal: 50 }) : null;

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
          case 'UR': return 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] bg-red-950/20';
          case 'SSR': return 'border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)] bg-yellow-950/20';
          case 'SR': return 'border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)] bg-purple-950/20';
          default: return 'border-slate-700 bg-slate-900/50';
      }
  };

  const getRarityText = (rarity: string) => {
    switch (rarity) {
        case 'UR': return 'text-red-400';
        case 'SSR': return 'text-yellow-400';
        case 'SR': return 'text-purple-400';
        default: return 'text-slate-400';
    }
  };

  const getTypeIcon = (type: string, size = 40) => {
      switch(type) {
          case 'Mechanical': return <Cpu size={size} className="text-cyan-400 opacity-90" />;
          case 'Eldritch': return <Ghost size={size} className="text-fuchsia-400 opacity-90" />;
          case 'Mutant': return <Skull size={size} className="text-green-400 opacity-90" />;
          default: return <Dna size={size} className="text-pink-400 opacity-90" />;
      }
  };

  const StatBar = ({ label, value, colorClass, icon: Icon }: { label: string, value: number, colorClass: string, icon?: any }) => (
      <div className="flex items-center gap-3 text-xs mb-2">
          <div className="w-24 flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider">
              {Icon && <Icon size={12} className="opacity-70" />}
              {label}
          </div>
          <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
              {/* Background grid for bar */}
              <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(90deg, transparent 95%, #000 95%)', backgroundSize: '10% 100%'}}></div>
              <div className={`h-full ${colorClass} shadow-[0_0_10px_currentColor]`} style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }}></div>
          </div>
          <span className="w-8 text-right font-mono text-white font-bold">{Math.floor(value || 0)}</span>
      </div>
  );

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 p-4 bg-purple-950/30 border border-purple-500/20 rounded-xl shrink-0 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-900/50 rounded-lg text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <Box size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white leading-none tracking-wide">CONTAINMENT</h2>
                    <p className="text-[10px] text-purple-300/70 font-mono mt-1 uppercase tracking-widest">{ownedCreatures.length} SPECIMENS SECURE</p>
                </div>
            </div>
            <div className="text-[10px] text-purple-300 font-mono border border-purple-500/30 px-3 py-1 rounded-full bg-purple-950/50 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                STABLE
            </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto pr-1 pb-20">
            {ownedCreatures.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30 text-slate-500">
                    <Bug size={48} className="mb-4 opacity-50" />
                    <p className="font-bold tracking-widest uppercase">No Specimens Found</p>
                    <p className="text-xs mt-1">Acquire assets via Incubation</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ownedCreatures.map(creature => {
                        const status = state.creatureStatus[creature.id] || { fatigue: 0, arousal: creature.arousal || 50 };
                        
                        return (
                            <div 
                                key={creature.id}
                                onClick={() => { playSound('click'); setSelectedCreatureId(creature.id); }}
                                className={`
                                    relative rounded-xl border p-0 flex flex-col transition-all overflow-hidden cursor-pointer group hover:scale-[1.01] hover:shadow-xl
                                    ${getRarityColor(creature.rarity)} backdrop-blur-sm
                                `}
                            >
                                {/* Top Status Bar */}
                                <div className="bg-black/40 p-2 flex justify-between items-center border-b border-white/5">
                                    <div className="flex items-center gap-2 text-[9px] font-mono uppercase text-slate-400 tracking-wider">
                                        <span className="font-bold text-slate-300">{creature.type}</span>
                                        <span>//</span>
                                        <span>{creature.subtype}</span>
                                    </div>
                                    {renderStars(creature.rarity)}
                                </div>

                                <div className="p-4 flex gap-4">
                                    {/* Icon Container */}
                                    <div className="w-20 h-24 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden group-hover:border-slate-600 transition-colors">
                                        {/* Scanline */}
                                        <div className="absolute inset-0 bg-white/5 animate-[shimmer_3s_infinite]" style={{transform: 'skewY(10deg)'}}></div>
                                        <div className="relative z-10 transform transition-transform group-hover:scale-110 duration-500">{getTypeIcon(creature.type, 40)}</div>
                                        
                                        {/* Generation Badge */}
                                        {creature.generation && creature.generation > 1 && (
                                            <div className="absolute bottom-0 right-0 bg-purple-900 text-[8px] px-1 rounded-tl text-purple-200 border-t border-l border-purple-700 font-mono">
                                                G-{creature.generation}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <h3 className="text-lg font-bold text-white leading-tight flex items-center gap-2 mb-3 truncate">
                                            {creature.variant}
                                            {creature.isBred && (
                                                <span title="Genetically Engineered" className="bg-purple-500/20 text-purple-300 p-0.5 rounded border border-purple-500/50 shrink-0">
                                                    <Dna size={12} />
                                                </span>
                                            )}
                                        </h3>

                                        <div className="space-y-1 bg-black/20 p-2 rounded border border-white/5">
                                            {/* Mini Stat Bars for Card View */}
                                            <div className="flex items-center gap-2 text-[9px]">
                                                <span className="w-6 text-slate-500 font-bold">STR</span>
                                                <div className="flex-1 h-1 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{width: `${creature.strength}%`}}></div></div>
                                            </div>
                                            <div className="flex items-center gap-2 text-[9px]">
                                                <span className="w-6 text-slate-500 font-bold">WLD</span>
                                                <div className="flex-1 h-1 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-yellow-500" style={{width: `${creature.wildness}%`}}></div></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Info */}
                                <div className="bg-black/20 p-2 px-4 flex justify-between items-center border-t border-white/5 text-[10px]">
                                    <div className="flex items-center gap-1 font-mono text-emerald-400 font-bold">
                                        <Activity size={10} /> 
                                        YIELD: +{creature.productionBonus}%
                                    </div>
                                    <div className="flex items-center gap-1 font-mono text-pink-400">
                                        <Droplets size={10} />
                                        FERT: {creature.fertility || 'Medium'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Detailed Modal */}
        {selectedCreature && selectedStatus && (
            <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200" onClick={() => setSelectedCreatureId(null)}>
                <div 
                    className={`
                        w-full max-w-4xl h-[85vh] bg-slate-900 border-2 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative
                        ${selectedCreature.rarity === 'UR' ? 'border-red-500 shadow-red-900/50' : 
                          selectedCreature.rarity === 'SSR' ? 'border-yellow-500 shadow-yellow-900/50' : 
                          selectedCreature.rarity === 'SR' ? 'border-purple-500 shadow-purple-900/50' : 
                          'border-slate-600 shadow-slate-900/50'}
                    `}
                    onClick={e => e.stopPropagation()}
                >
                    <button 
                        onClick={() => setSelectedCreatureId(null)}
                        className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors border border-white/10"
                    >
                        <X size={20} />
                    </button>

                    {/* Left Col: Holographic Viewer */}
                    <div className="w-full md:w-5/12 h-1/3 md:h-full relative bg-black overflow-hidden border-b md:border-b-0 md:border-r border-slate-800 flex items-center justify-center group">
                         {/* Background Grid Animation */}
                         <div className="absolute inset-0 opacity-20" 
                              style={{ 
                                  backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .1) 25%, rgba(255, 255, 255, .1) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .1) 75%, rgba(255, 255, 255, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .1) 25%, rgba(255, 255, 255, .1) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .1) 75%, rgba(255, 255, 255, .1) 76%, transparent 77%, transparent)',
                                  backgroundSize: '40px 40px'
                              }} 
                         />
                         
                         {/* Floor Glow */}
                         <div className={`absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-${selectedCreature.rarity === 'UR' ? 'red' : 'cyan'}-900/40 to-transparent opacity-50`}></div>

                         {/* Holo Projector Base */}
                         <div className="absolute bottom-10 w-32 h-4 rounded-[100%] bg-slate-800 border border-slate-600 shadow-[0_-5px_20px_rgba(255,255,255,0.2)]"></div>

                         {/* The Creature "Hologram" */}
                         <div className="relative z-10 animate-[bob_4s_infinite_ease-in-out]">
                             <div className={`filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] opacity-90 transform transition-transform duration-700 md:scale-150`}>
                                 {getTypeIcon(selectedCreature.type, 120)}
                             </div>
                             {/* Scan Beam */}
                             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent h-10 w-full animate-[scan_3s_linear_infinite] pointer-events-none"></div>
                         </div>

                         {/* Rarity Tag */}
                         <div className={`absolute top-6 left-6 border px-2 py-1 rounded text-xs font-bold tracking-widest bg-black/60 backdrop-blur ${getRarityText(selectedCreature.rarity)} border-current`}>
                             CLASS: {selectedCreature.rarity}
                         </div>

                         {/* Generation Tag */}
                         {selectedCreature.generation && (
                             <div className="absolute bottom-6 left-6 text-xs font-mono text-purple-400 flex items-center gap-2">
                                 <Dna size={14} /> GEN-{selectedCreature.generation}
                             </div>
                         )}
                    </div>

                    {/* Right Col: Data */}
                    <div className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto bg-gradient-to-br from-slate-900 to-slate-950">
                        {/* Header */}
                        <div className="mb-6 border-b border-white/10 pb-4">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1 flex items-center gap-2">
                                         <Microscope size={12} /> Subject Analysis
                                     </div>
                                     <h2 className={`text-3xl font-bold text-white leading-none mb-2 ${getRarityText(selectedCreature.rarity)}`}>
                                         {selectedCreature.variant}
                                     </h2>
                                     <div className="flex items-center gap-3 text-xs font-mono">
                                         <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">{selectedCreature.type}</span>
                                         <span className="text-slate-600">//</span>
                                         <span className="text-slate-400">{selectedCreature.subtype}</span>
                                     </div>
                                 </div>
                             </div>
                        </div>

                        {/* Description */}
                        <div className="bg-slate-950/50 border border-slate-800 p-3 rounded-lg mb-6 italic text-slate-400 text-sm border-l-4 border-l-slate-600">
                             "{selectedCreature.description}"
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 gap-6 mb-6">
                             {/* Attributes */}
                             <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5">
                                 <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                     <Scan size={12} /> Physical Attributes
                                 </h4>
                                 <StatBar label="Strength" value={selectedCreature.strength} colorClass="bg-red-500" icon={Sword} />
                                 <StatBar label="Size" value={selectedCreature.size} colorClass="bg-blue-500" icon={Maximize} />
                                 <StatBar label="Wildness" value={selectedCreature.wildness} colorClass="bg-yellow-500" icon={Flame} />
                                 <StatBar label="Creepiness" value={selectedCreature.creepiness} colorClass="bg-purple-500" icon={Ghost} />
                             </div>

                             {/* Status */}
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5">
                                     <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                         <Thermometer size={12} /> Physiology
                                     </h4>
                                     <div className="space-y-3">
                                         <div>
                                             <div className="flex justify-between text-[10px] text-pink-300 mb-1">
                                                 <span>Arousal</span>
                                                 <span>{Math.floor(selectedStatus.arousal)}%</span>
                                             </div>
                                             <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                                 <div className="h-full bg-pink-500" style={{width: `${selectedStatus.arousal}%`}}></div>
                                             </div>
                                         </div>
                                         <div>
                                             <div className="flex justify-between text-[10px] text-orange-300 mb-1">
                                                 <span>Fatigue</span>
                                                 <span>{Math.floor(selectedStatus.fatigue)}%</span>
                                             </div>
                                             <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                                 <div className="h-full bg-orange-500" style={{width: `${selectedStatus.fatigue}%`}}></div>
                                             </div>
                                         </div>
                                         <div className="flex justify-between items-center pt-1 border-t border-white/5 mt-2">
                                             <span className="text-[10px] text-slate-400">Fertility</span>
                                             <span className={`text-xs font-bold font-mono ${selectedCreature.fertility === 'High' ? 'text-green-400' : selectedCreature.fertility === 'Medium' ? 'text-yellow-400' : 'text-slate-500'}`}>
                                                 {selectedCreature.fertility || 'Medium'}
                                             </span>
                                         </div>
                                     </div>
                                 </div>

                                 {/* Passive */}
                                 <div className="bg-emerald-950/10 p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-center items-center text-center">
                                     <Activity size={24} className="text-emerald-500 mb-2" />
                                     <div className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-wider mb-1">Network Yield</div>
                                     <div className="text-2xl font-bold text-emerald-400 font-mono">+{selectedCreature.productionBonus}%</div>
                                     <div className="text-[9px] text-emerald-600 mt-1">Data Generation</div>
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
