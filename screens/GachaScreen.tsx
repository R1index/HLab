
import React, { useState } from 'react';
import { GameState, Staff, Creature } from '../types';
import { GACHA_COST, CREATURE_GACHA_COST, getAnimeAvatarUrl } from '../constants';
import { playSound } from '../utils/audio';
import { Sparkles, Hexagon, Star, Gift, Repeat, Scan, Radio, Dna, ArrowRight, FlaskConical } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';

interface Props {
  state: GameState;
  onPerformGacha: () => { staff: Staff, isDuplicate: boolean, reward: number } | null;
  onPerformCreatureGacha: () => { creature: Creature, isDuplicate: boolean, reward: number } | null;
}

type Tab = 'STAFF' | 'CREATURE';

export const GachaScreen: React.FC<Props> = ({ state, onPerformGacha, onPerformCreatureGacha }) => {
  const [activeTab, setActiveTab] = useState<Tab>('STAFF');
  const [animating, setAnimating] = useState(false);
  const [lastPull, setLastPull] = useState<{ staff?: Staff, creature?: Creature, isDuplicate: boolean, reward: number } | null>(null);

  const pullGacha = () => {
    if (activeTab === 'STAFF') {
        if (!state.freeRecruitAvailable && state.resources.gems < GACHA_COST) return;
        const result = onPerformGacha();
        if (!result) { playSound('fail'); return; }
        
        startAnimation(() => setLastPull({ ...result }));
    } else {
        if (state.resources.gems < CREATURE_GACHA_COST) return;
        const result = onPerformCreatureGacha();
        if (!result) { playSound('fail'); return; }

        startAnimation(() => setLastPull({ ...result }));
    }
  };

  const startAnimation = (callback: () => void) => {
    setAnimating(true);
    setLastPull(null);
    playSound('spawn');
    setTimeout(() => {
        callback();
        playSound('success');
        setAnimating(false);
    }, 2000);
  };

  const renderStars = (rarity: string) => {
      const count = rarity === 'UR' ? 5 : rarity === 'SSR' ? 3 : rarity === 'SR' ? 2 : 1;
      return (
          <div className="flex gap-0.5 justify-center">
              {Array.from({ length: count }).map((_, i) => (
                  <Star key={i} size={12} className={`fill-current ${rarity === 'UR' ? 'text-red-500' : 'text-yellow-400'}`} />
              ))}
          </div>
      );
  };

  return (
    <div className="flex flex-col items-center h-full py-2 animate-in fade-in relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl"></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900/80 rounded-lg border border-slate-700 mb-6 relative z-20">
          <button 
             onClick={() => { setActiveTab('STAFF'); setLastPull(null); }}
             className={`px-4 py-2 rounded text-xs font-bold transition-all ${activeTab === 'STAFF' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
              PERSONNEL RECRUITMENT
          </button>
          <button 
             onClick={() => { setActiveTab('CREATURE'); setLastPull(null); }}
             className={`px-4 py-2 rounded text-xs font-bold transition-all ${activeTab === 'CREATURE' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
              SPECIMEN INCUBATION
          </button>
      </div>

      <div className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center justify-center p-2 bg-slate-900/80 border border-slate-700 rounded-lg mb-2 backdrop-blur-sm">
             {activeTab === 'STAFF' ? <Radio className="mr-2 text-cyan-400 animate-pulse" size={16} /> : <Dna className="mr-2 text-purple-400 animate-spin-slow" size={16} />}
             <span className="text-xs font-bold text-white tracking-widest uppercase">
                 {activeTab === 'STAFF' ? 'Neural Uplink' : 'Genetic Sequencer'}
             </span>
          </div>
          <p className="text-slate-500 text-[10px] font-mono">
              {activeTab === 'STAFF' ? 'ESTABLISHING SECURE CONNECTION TO GLOBAL DATABASE' : 'SYNTHESIZING BIOLOGICAL ASSETS FROM RAW DATA'}
          </p>
      </div>

      <div className="relative w-full max-w-sm h-64 mb-8 flex items-center justify-center z-10">
          {animating ? (
              <div className="relative w-full h-full flex items-center justify-center">
                  <div className={`absolute inset-0 border-2 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] ${activeTab === 'STAFF' ? 'border-cyan-500/20' : 'border-purple-500/20'}`}></div>
                  <div className={`absolute inset-4 border-2 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s] ${activeTab === 'STAFF' ? 'border-cyan-400/30' : 'border-purple-400/30'}`}></div>
                  <div className={`absolute inset-0 border-t-2 rounded-full animate-spin ${activeTab === 'STAFF' ? 'border-cyan-500' : 'border-purple-500'}`}></div>
                  <div className="text-white font-mono text-xs animate-pulse tracking-widest bg-slate-950 px-2 z-10">
                      {activeTab === 'STAFF' ? 'SCANNING...' : 'INCUBATING...'}
                  </div>
              </div>
          ) : lastPull ? (
              <div className="animate-in zoom-in duration-500 flex flex-col items-center w-full">
                   {/* RESULT CARD */}
                   <div className={`
                       w-64 bg-slate-900 border-2 rounded-xl overflow-hidden shadow-2xl relative group
                       ${(lastPull.staff?.rarity === 'UR' || lastPull.creature?.rarity === 'UR') ? 'border-red-500 shadow-red-500/50' :
                         (lastPull.staff?.rarity === 'SSR' || lastPull.creature?.rarity === 'SSR') ? 'border-yellow-400 shadow-yellow-500/30' : 
                         'border-slate-600'}
                   `}>
                       {/* Materialize Effect */}
                       <div className="absolute inset-0 bg-white/20 animate-[ping_0.5s_ease-out_1] pointer-events-none"></div>
                       
                       <div className="bg-slate-950 p-6 flex justify-center border-b border-slate-800 relative">
                           {lastPull.staff ? (
                               <Avatar 
                                    src={getAnimeAvatarUrl(lastPull.staff.imageSeed)} 
                                    className={`w-32 h-32 object-cover drop-shadow-lg ${lastPull.isDuplicate ? 'grayscale opacity-80' : ''}`}
                                    alt="Character"
                               />
                           ) : (
                               <div className="w-32 h-32 flex items-center justify-center bg-slate-900 rounded-full border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                                   <FlaskConical size={64} className="text-purple-400" />
                               </div>
                           )}

                           {lastPull.isDuplicate && (
                               <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                                   <div className="bg-slate-900 border border-slate-500 px-3 py-1 rounded text-[10px] font-bold text-white flex items-center shadow-lg transform -rotate-12 border-dashed">
                                       <Repeat size={12} className="mr-1" />
                                       DUPLICATE FOUND
                                   </div>
                               </div>
                           )}
                       </div>
                       
                       <div className="p-4 text-center relative z-10 bg-slate-900">
                           {lastPull.staff ? (
                               <>
                                   <div className="text-lg font-bold mb-0.5 text-white">{lastPull.staff.name}</div>
                                   <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-mono">{lastPull.staff.role}</div>
                                   {renderStars(lastPull.staff.rarity)}
                               </>
                           ) : lastPull.creature ? (
                               <>
                                   <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-widest">
                                       <span>{lastPull.creature.type}</span>
                                       <ArrowRight size={10} />
                                       <span>{lastPull.creature.subtype}</span>
                                   </div>
                                   <div className="text-xl font-bold mb-1 text-purple-200">{lastPull.creature.variant}</div>
                                   {renderStars(lastPull.creature.rarity)}
                               </>
                           ) : null}
                           
                           <div className="mt-4 pt-4 border-t border-slate-800">
                               {lastPull.isDuplicate ? (
                                   <div className="text-[10px] bg-cyan-950/30 p-2 rounded text-cyan-300 border border-cyan-800/50 font-mono">
                                       CONVERTED: +{lastPull.reward} DATA
                                   </div>
                               ) : (
                                   <div className="text-[10px] bg-slate-950 p-2 rounded text-slate-400 border border-slate-800 leading-tight italic">
                                       "{lastPull.staff?.description || lastPull.creature?.description}"
                                   </div>
                               )}
                           </div>
                       </div>
                   </div>
              </div>
          ) : (
              <div className="relative group cursor-default">
                  <div className="w-48 h-48 border border-slate-800 bg-slate-900/50 rounded-full flex flex-col items-center justify-center text-slate-700 relative z-10">
                      <Scan size={48} className="mb-2 opacity-50" />
                      <span className="text-[10px] font-mono tracking-widest">SYSTEM IDLE</span>
                  </div>
                  {/* Idle rotating rings */}
                  <div className="absolute inset-0 border border-dashed border-slate-800 rounded-full animate-[spin_10s_linear_infinite]"></div>
                  <div className={`absolute -inset-4 border border-slate-800/50 rounded-full animate-[spin_15s_linear_infinite_reverse]`}></div>
              </div>
          )}
      </div>

      {/* Action Button */}
      <button
        onClick={pullGacha}
        disabled={animating || (activeTab === 'STAFF' && !state.freeRecruitAvailable && state.resources.gems < GACHA_COST) || (activeTab === 'CREATURE' && state.resources.gems < CREATURE_GACHA_COST)}
        className={`
            relative overflow-hidden px-8 py-3 rounded md:w-64 w-full max-w-xs font-bold text-sm tracking-wider flex items-center justify-center transition-all group
            ${(!animating && ((activeTab === 'STAFF' && (state.freeRecruitAvailable || state.resources.gems >= GACHA_COST)) || (activeTab === 'CREATURE' && state.resources.gems >= CREATURE_GACHA_COST)))
            ? (activeTab === 'STAFF' ? 'bg-cyan-700 hover:bg-cyan-600 border-cyan-500' : 'bg-purple-700 hover:bg-purple-600 border-purple-500') + ' text-white shadow-lg border'
            : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'}
        `}
      >
          {animating ? 'PROCESSING...' : (activeTab === 'STAFF' && state.freeRecruitAvailable) ? (
              <>
                <Gift className="mr-2 animate-bounce text-yellow-400" size={16} />
                <span className="text-yellow-100">FREE RECRUIT</span>
              </>
          ) : (
              <div className="flex flex-col items-center leading-none py-1">
                <span>{activeTab === 'STAFF' ? 'INITIATE SEARCH' : 'BEGIN INCUBATION'}</span>
                <span className={`text-[10px] mt-1 font-mono opacity-80 ${activeTab === 'STAFF' ? 'text-cyan-200' : 'text-purple-200'}`}>
                    COST: {activeTab === 'STAFF' ? GACHA_COST : CREATURE_GACHA_COST} GEMS
                </span>
              </div>
          )}
      </button>

      {/* Footer Info */}
      <div className="mt-auto w-full border-t border-slate-800 bg-slate-950/50 py-2 overflow-hidden">
          <div className="flex justify-center space-x-6 text-[10px] font-mono text-slate-500">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>R: 70%</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>SR: 25%</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-2 shadow-[0_0_5px_currentColor]"></span>SSR: 5%</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-600 mr-2 animate-pulse shadow-[0_0_5px_currentColor]"></span>UR: 0.5%</span>
          </div>
      </div>
    </div>
  );
};
