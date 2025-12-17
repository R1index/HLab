
import React, { useState, useEffect } from 'react';
import { GameState, Staff, Creature } from '../types';
import { GACHA_COST, CREATURE_GACHA_COST, getAnimeAvatarUrl } from '../constants';
import { playSound } from '../utils/audio';
import { Sparkles, Hexagon, Star, Gift, Repeat, Scan, Radio, Dna, ArrowRight, FlaskConical, Zap, Grid3X3 } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';

interface Props {
  state: GameState;
  onPerformGacha: () => { staff: Staff, isDuplicate: boolean, reward: number } | null;
  onPerformCreatureGacha: () => { creature: Creature, isDuplicate: boolean, reward: number } | null;
  onPerformBatchGacha: (type: 'STAFF' | 'CREATURE', count: number) => { staff?: Staff, creature?: Creature, isDuplicate: boolean, reward: number }[] | null;
}

type Tab = 'STAFF' | 'CREATURE';

export const GachaScreen: React.FC<Props> = ({ state, onPerformGacha, onPerformCreatureGacha, onPerformBatchGacha }) => {
  const [activeTab, setActiveTab] = useState<Tab>('STAFF');
  const [animating, setAnimating] = useState(false);
  const [lastPull, setLastPull] = useState<{ staff?: Staff, creature?: Creature, isDuplicate: boolean, reward: number }[] | null>(null);

  // Clear result when switching tabs
  useEffect(() => {
      setLastPull(null);
      setAnimating(false);
  }, [activeTab]);

  const pullGacha = (count: number) => {
    let results = null;

    if (count === 1) {
        if (activeTab === 'STAFF') {
            if (!state.freeRecruitAvailable && state.resources.gems < GACHA_COST) return;
            const res = onPerformGacha();
            if (res) results = [res];
        } else {
            if (state.resources.gems < CREATURE_GACHA_COST) return;
            const res = onPerformCreatureGacha();
            if (res) results = [res];
        }
    } else {
        results = onPerformBatchGacha(activeTab, count);
    }

    if (!results) { playSound('fail'); return; }

    // 2. Set State to drive animation
    setLastPull(results);
    setAnimating(true);
    playSound('spawn');

    // Find highest rarity in batch for color logic
    let maxRarity = 'R';
    results.forEach(r => {
        const rarity = r.staff?.rarity || r.creature?.rarity || 'R';
        if (rarity === 'UR') maxRarity = 'UR';
        else if (rarity === 'SSR' && maxRarity !== 'UR') maxRarity = 'SSR';
        else if (rarity === 'SR' && maxRarity !== 'UR' && maxRarity !== 'SSR') maxRarity = 'SR';
    });

    const isHighRarity = maxRarity === 'SSR' || maxRarity === 'UR';
    const duration = isHighRarity ? 2500 : 1500;

    // 3. Reveal at end of duration
    setTimeout(() => {
        setAnimating(false);
        playSound('success');
    }, duration);
  };

  const renderStars = (rarity: string, size = 12) => {
      const count = rarity === 'UR' ? 5 : rarity === 'SSR' ? 3 : rarity === 'SR' ? 2 : 1;
      return (
          <div className="flex gap-0.5 justify-center">
              {Array.from({ length: count }).map((_, i) => (
                  <Star key={i} size={size} className={`fill-current ${rarity === 'UR' ? 'text-red-500' : 'text-yellow-400'}`} />
              ))}
          </div>
      );
  };

  const getAnimColors = (rarity: string) => {
      switch(rarity) {
          case 'UR': return { 
              border: 'border-red-500', 
              shadow: 'shadow-red-500', 
              text: 'text-red-500', 
              bg: 'bg-red-500',
              spinSpeed: 'duration-300' 
          };
          case 'SSR': return { 
              border: 'border-yellow-400', 
              shadow: 'shadow-yellow-400', 
              text: 'text-yellow-400', 
              bg: 'bg-yellow-400',
              spinSpeed: 'duration-700'
          };
          case 'SR': return { 
              border: 'border-purple-400', 
              shadow: 'shadow-purple-400', 
              text: 'text-purple-400', 
              bg: 'bg-purple-400',
              spinSpeed: 'duration-1000'
          };
          default: return { 
              border: 'border-cyan-400', 
              shadow: 'shadow-cyan-400', 
              text: 'text-cyan-400', 
              bg: 'bg-cyan-400',
              spinSpeed: 'duration-[2000ms]'
          };
      }
  };

  // Determine current display logic
  let currentRarity = 'R';
  if (lastPull) {
      lastPull.forEach(r => {
          const rarity = r.staff?.rarity || r.creature?.rarity || 'R';
          if (rarity === 'UR') currentRarity = 'UR';
          else if (rarity === 'SSR' && currentRarity !== 'UR') currentRarity = 'SSR';
          else if (rarity === 'SR' && currentRarity !== 'UR' && currentRarity !== 'SSR') currentRarity = 'SR';
      });
  }

  const animStyle = getAnimColors(animating ? currentRarity : 'R');
  const isShake = animating && (currentRarity === 'UR' || currentRarity === 'SSR');
  const isIntenseShake = animating && currentRarity === 'UR';

  const singleCost = activeTab === 'STAFF' ? GACHA_COST : CREATURE_GACHA_COST;
  const batchCost = singleCost * 10;
  const canAffordBatch = state.resources.gems >= batchCost;
  const canAffordSingle = activeTab === 'STAFF' ? (state.freeRecruitAvailable || state.resources.gems >= GACHA_COST) : (state.resources.gems >= CREATURE_GACHA_COST);

  const ResultItemView = ({ item, isGrid = false }: { item: any, isGrid?: boolean }) => {
      const isStaff = !!item.staff;
      const data = item.staff || item.creature;
      const isDuplicate = item.isDuplicate;
      const rarity = data.rarity;
      const colors = getAnimColors(rarity);

      if (isGrid) {
          return (
              <div className={`relative bg-slate-950 border rounded-lg overflow-hidden flex flex-col items-center p-2 ${colors.border} ${rarity === 'UR' || rarity === 'SSR' ? 'shadow-lg '+colors.shadow.replace('shadow-', 'shadow-'+colors.border.split('-')[1]+'/20') : ''}`}>
                  <div className="w-12 h-12 rounded bg-slate-900 mb-2 relative overflow-hidden shrink-0">
                      {isStaff ? (
                          <Avatar src={getAnimeAvatarUrl(data.imageSeed)} alt={data.name} className={`w-full h-full object-cover ${isDuplicate ? 'grayscale opacity-50' : ''}`} />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-purple-400"><FlaskConical size={20} /></div>
                      )}
                      {isDuplicate && <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[8px] text-white font-bold">DUP</div>}
                  </div>
                  <div className={`text-[9px] font-bold truncate w-full text-center ${colors.text}`}>{data.name || data.variant}</div>
                  <div className="mt-1">{renderStars(rarity, 8)}</div>
                  {isDuplicate && <div className="text-[8px] text-cyan-400 mt-1 font-mono">+{item.reward} DATA</div>}
              </div>
          );
      }

      // Single big card view
      return (
        <div className={`
            w-64 bg-slate-900 border-2 rounded-xl overflow-hidden shadow-2xl relative group animate-in zoom-in duration-300
            ${rarity === 'UR' ? 'border-red-500 shadow-red-500/50' :
                rarity === 'SSR' ? 'border-yellow-400 shadow-yellow-500/30' : 
                rarity === 'SR' ? 'border-purple-500 shadow-purple-500/30' :
                'border-slate-600'}
        `}>
            <div className="bg-slate-950 p-6 flex justify-center border-b border-slate-800 relative">
                {isStaff ? (
                    <Avatar 
                        src={getAnimeAvatarUrl(data.imageSeed)} 
                        className={`w-32 h-32 object-cover drop-shadow-lg ${isDuplicate ? 'grayscale opacity-80' : ''}`}
                        alt="Character"
                    />
                ) : (
                    <div className="w-32 h-32 flex items-center justify-center bg-slate-900 rounded-full border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                        <FlaskConical size={64} className="text-purple-400" />
                    </div>
                )}

                {isDuplicate && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                        <div className="bg-slate-900 border border-slate-500 px-3 py-1 rounded text-[10px] font-bold text-white flex items-center shadow-lg transform -rotate-12 border-dashed">
                            <Repeat size={12} className="mr-1" />
                            DUPLICATE FOUND
                        </div>
                    </div>
                )}
            </div>
            
            <div className="p-4 text-center relative z-10 bg-slate-900">
                {isStaff ? (
                    <>
                        <div className="text-lg font-bold mb-0.5 text-white">{data.name}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-mono">{data.role}</div>
                        {renderStars(rarity)}
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-widest">
                            <span>{data.type}</span>
                            <ArrowRight size={10} />
                            <span>{data.subtype}</span>
                        </div>
                        <div className="text-xl font-bold mb-1 text-purple-200">{data.variant}</div>
                        {renderStars(rarity)}
                    </>
                )}
                
                <div className="mt-4 pt-4 border-t border-slate-800">
                    {isDuplicate ? (
                        <div className="text-[10px] bg-cyan-950/30 p-2 rounded text-cyan-300 border border-cyan-800/50 font-mono">
                            CONVERTED: +{item.reward} DATA
                        </div>
                    ) : (
                        <div className="text-[10px] bg-slate-950 p-2 rounded text-slate-400 border border-slate-800 leading-tight italic">
                            "{data.description}"
                        </div>
                    )}
                </div>
            </div>
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
      <div className="flex gap-2 p-1 bg-slate-900/80 rounded-lg border border-slate-700 mb-4 relative z-20 shrink-0">
          <button 
             onClick={() => { setActiveTab('STAFF'); }}
             className={`px-4 py-2 rounded text-xs font-bold transition-all ${activeTab === 'STAFF' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
              PERSONNEL
          </button>
          <button 
             onClick={() => { setActiveTab('CREATURE'); }}
             className={`px-4 py-2 rounded text-xs font-bold transition-all ${activeTab === 'CREATURE' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
              SPECIMENS
          </button>
      </div>

      {!lastPull && (
        <div className="text-center mb-6 relative z-10 shrink-0">
            <div className="inline-flex items-center justify-center p-2 bg-slate-900/80 border border-slate-700 rounded-lg mb-2 backdrop-blur-sm">
                {activeTab === 'STAFF' ? <Radio className="mr-2 text-cyan-400 animate-pulse" size={16} /> : <Dna className="mr-2 text-purple-400 animate-spin-slow" size={16} />}
                <span className="text-xs font-bold text-white tracking-widest uppercase">
                    {activeTab === 'STAFF' ? 'Neural Uplink' : 'Genetic Sequencer'}
                </span>
            </div>
            <p className="text-slate-500 text-[10px] font-mono">
                {activeTab === 'STAFF' ? 'ESTABLISHING SECURE CONNECTION...' : 'SYNTHESIZING ASSETS FROM RAW DATA...'}
            </p>
        </div>
      )}

      <div className="relative w-full flex-1 flex flex-col items-center justify-center z-10 min-h-0 overflow-hidden mb-4">
          {animating ? (
              <div className={`relative w-64 h-64 flex items-center justify-center ${isIntenseShake ? 'animate-[shake_0.1s_ease-in-out_infinite]' : isShake ? 'animate-[shake_0.5s_ease-in-out_infinite]' : ''}`}>
                  {/* Core Energy */}
                  <div className={`absolute inset-0 border-4 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50 ${animStyle.border}`}></div>
                  
                  {/* Spinning Rings */}
                  <div className={`absolute w-48 h-48 border-2 rounded-full border-t-transparent animate-spin ${animStyle.border} ${animStyle.spinSpeed}`}></div>
                  <div className={`absolute w-32 h-32 border-4 rounded-full border-b-transparent animate-spin ${animStyle.border} duration-[1500ms] opacity-70`}></div>
                  
                  {/* Inner Core */}
                  <div className={`w-16 h-16 rounded-full ${animStyle.bg} animate-pulse shadow-[0_0_30px_currentColor] flex items-center justify-center`}>
                       <Zap size={24} className="text-white animate-bounce" />
                  </div>

                  {/* Text */}
                  <div className="absolute -bottom-8 text-white font-mono text-xs animate-pulse tracking-widest bg-slate-950/80 px-2 z-10 border border-slate-800 rounded">
                      {activeTab === 'STAFF' ? 'MATERIALIZING...' : 'INCUBATING...'}
                  </div>
              </div>
          ) : lastPull ? (
              <div className="w-full h-full overflow-y-auto px-4 py-2 flex flex-col items-center">
                   {lastPull.length === 1 ? (
                       <div className="my-auto">
                           <ResultItemView item={lastPull[0]} />
                       </div>
                   ) : (
                       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full max-w-2xl my-auto animate-in zoom-in duration-500">
                           {lastPull.map((item, idx) => (
                               <ResultItemView key={idx} item={item} isGrid={true} />
                           ))}
                       </div>
                   )}
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

      {/* Action Buttons Row */}
      <div className="w-full max-w-md px-4 flex gap-3 shrink-0 mb-2">
          {/* Single Pull Button */}
          <button
            onClick={() => pullGacha(1)}
            disabled={animating || !canAffordSingle}
            className={`
                flex-1 relative overflow-hidden py-3 rounded font-bold text-xs tracking-wider flex flex-col items-center justify-center transition-all group border
                ${(!animating && canAffordSingle)
                ? (activeTab === 'STAFF' ? 'bg-cyan-700 hover:bg-cyan-600 border-cyan-500' : 'bg-purple-700 hover:bg-purple-600 border-purple-500') + ' text-white shadow-lg'
                : 'bg-slate-900 text-slate-600 cursor-not-allowed border-slate-800'}
            `}
          >
              <div className="flex items-center gap-1 mb-0.5">
                  {(activeTab === 'STAFF' && state.freeRecruitAvailable) ? <Gift size={12} className="animate-bounce text-yellow-400" /> : <Scan size={12} />}
                  <span>SINGLE</span>
              </div>
              <span className={`text-[9px] font-mono opacity-80 ${(activeTab === 'STAFF' && state.freeRecruitAvailable) ? 'text-yellow-300 font-bold' : ''}`}>
                  {(activeTab === 'STAFF' && state.freeRecruitAvailable) ? 'FREE' : `${singleCost} GEMS`}
              </span>
          </button>

          {/* Batch Pull Button */}
          <button
            onClick={() => pullGacha(10)}
            disabled={animating || !canAffordBatch}
            className={`
                flex-1 relative overflow-hidden py-3 rounded font-bold text-xs tracking-wider flex flex-col items-center justify-center transition-all group border
                ${(!animating && canAffordBatch)
                ? (activeTab === 'STAFF' ? 'bg-cyan-800 hover:bg-cyan-700 border-cyan-500' : 'bg-purple-800 hover:bg-purple-700 border-purple-500') + ' text-white shadow-lg'
                : 'bg-slate-900 text-slate-600 cursor-not-allowed border-slate-800'}
            `}
          >
              <div className="flex items-center gap-1 mb-0.5">
                  <Grid3X3 size={12} />
                  <span>BATCH x10</span>
              </div>
              <span className="text-[9px] font-mono opacity-80">
                  {batchCost} GEMS
              </span>
          </button>
      </div>

      {/* Footer Info */}
      <div className="mt-auto w-full border-t border-slate-800 bg-slate-950/50 py-2 overflow-hidden shrink-0">
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
