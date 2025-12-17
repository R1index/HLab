
import React, { useState } from 'react';
import { GameState, Resources, GameBonuses, Contract } from '../types';
import { Infinity, Clock, DollarSign, Gem, ShieldAlert, Play, Cpu, Server } from 'lucide-react';
import { playSound, setMusicIntensity } from '../utils/audio';
import { MiniGame } from '../components/mechanics/MiniGame';
import { useFloatingText } from '../components/ui/FloatingTextOverlay';

interface Props {
  state: GameState;
  updateResources: (delta: Partial<Resources>) => void;
  onCompleteContract: (contractId: string | Contract, success: boolean, score: number) => void;
  bonuses: GameBonuses;
}

export const SimulationScreen: React.FC<Props> = ({ state, updateResources, onCompleteContract, bonuses }) => {
    const [duration, setDuration] = useState<number | string>(60); // Allow string for empty input
    const [activeContract, setActiveContract] = useState<Contract | null>(null);
    const { spawnText } = useFloatingText();

    const numericDuration = typeof duration === 'number' ? duration : 0;
    
    // Cost calculation: Base 100/s + scaling factor based on duration.
    // Longer simulations require more "stability power", increasing the cost per second slightly.
    const costPerSecond = Math.floor(100 + (numericDuration * 0.15));
    const totalCost = numericDuration * costPerSecond;
    
    const canAfford = state.resources.credits >= totalCost;
    
    // Validate range for button state
    const isValidDuration = numericDuration >= 30 && numericDuration <= 600;

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            setDuration('');
            return;
        }
        setDuration(parseInt(val));
    };

    const handleBlur = () => {
        let val = Number(duration);
        if (isNaN(val) || val < 30) val = 30;
        if (val > 600) val = 600;
        setDuration(val);
    };

    const handleStart = () => {
        if (!canAfford) {
            playSound('fail');
            spawnText(window.innerWidth/2, window.innerHeight/2, "INSUFFICIENT CREDITS", "text-red-500", "lg");
            return;
        }

        if (!isValidDuration) {
             playSound('fail');
             return;
        }

        updateResources({ credits: -totalCost });
        playSound('click');
        spawnText(window.innerWidth/2, window.innerHeight/2, `-${totalCost} CR`, "text-red-400", "md");

        const infiniteContract: Contract = {
            id: `sim_${Date.now()}`,
            kind: 'MISSION',
            factionId: 'omnicorp',
            title: 'Deep Dive Simulation',
            difficulty: 'Simulation',
            tier: 999,
            description: `Sustained connection for ${numericDuration}s.`,
            deposit: totalCost,
            rewardCredits: 0,
            rewardData: 0,
            durationSeconds: numericDuration,
            quota: 9999999,
            gridSize: 3,
            modifiers: [],
            expiresAt: Date.now() + 1000000,
            isInfinite: true
        };

        setTimeout(() => {
            setMusicIntensity('high');
            setActiveContract(infiniteContract);
        }, 300);
    };

    const handleGameComplete = (success: boolean, score: number) => {
        setMusicIntensity('normal');
        if (activeContract) {
            // Success in simulation means surviving the duration. 
            // Reward is data based on score. Scaled x5 since base scores were nerfed to ~1-5.
            const dataReward = Math.floor(score * 5 * bonuses.dataMult);
            updateResources({ data: dataReward });
            
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            setTimeout(() => spawnText(cx, cy, `+${dataReward} DATA`, "text-cyan-400", "lg"), 300);
            
            // Pass the FULL contract object, not just ID, so the store can process XP
            onCompleteContract(activeContract, true, score);
        }
        setActiveContract(null);
    };

    if (activeContract) {
        return (
            <div className="h-full flex flex-col animate-in fade-in duration-300">
                 <div className="mb-4 flex items-center justify-between p-3 rounded-lg border backdrop-blur-sm bg-purple-950/80 border-purple-800">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-purple-300 font-mono">SIMULATION ACTIVE</span>
                        <h2 className="text-lg font-bold text-white flex items-center">
                            DEEP DIVE
                            <Infinity size={16} className="ml-2 text-purple-400 animate-pulse" />
                        </h2>
                    </div>
                    <button 
                        onClick={() => { setActiveContract(null); setMusicIntensity('normal'); }}
                        className="px-4 py-2 text-xs font-bold text-red-400 hover:text-white border border-red-900/50 rounded hover:bg-red-600 transition-colors"
                    >
                        ABORT
                    </button>
                </div>
                <div className="flex-1 border border-purple-900 rounded-xl bg-slate-950 relative overflow-hidden shadow-2xl">
                    <MiniGame 
                        contract={activeContract} 
                        bonuses={bonuses} 
                        onComplete={handleGameComplete} 
                        updateResources={updateResources}
                        currentResources={state.resources}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col items-center justify-center animate-in fade-in duration-500">
            {/* Background elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 w-full max-w-md bg-slate-900/80 border border-purple-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-3 mb-6 border-b border-purple-500/20 pb-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-950/50 border border-purple-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        <Infinity size={28} className="text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-wider">DEEP DIVE SIM</h1>
                        <p className="text-[10px] text-purple-300 font-mono">UNLIMITED POTENTIAL • HIGH RISK</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-950/50 p-3 rounded border border-slate-800 flex flex-col items-center text-center">
                            <Clock size={16} className="text-cyan-400 mb-2" />
                            <div className="text-[10px] text-slate-500 font-mono uppercase">Difficulty Scaling</div>
                            <div className="text-xs text-slate-300">Increases over time</div>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded border border-slate-800 flex flex-col items-center text-center">
                            <Gem size={16} className="text-fuchsia-400 mb-2" />
                            <div className="text-[10px] text-slate-500 font-mono uppercase">Loot Drops</div>
                            <div className="text-xs text-slate-300">Rare Gems & Data</div>
                        </div>
                    </div>

                    {/* Time Selector */}
                    <div className="space-y-2">
                         <div className="flex justify-between items-end">
                             <label className="text-xs font-bold text-slate-400 uppercase">Connection Duration (Sec)</label>
                             <div className="flex items-center gap-1 border-b border-slate-700 focus-within:border-purple-500 transition-colors">
                                 <input
                                    type="number"
                                    min="30"
                                    max="600"
                                    value={duration}
                                    onChange={handleDurationChange}
                                    onBlur={handleBlur}
                                    className="w-20 bg-transparent text-right text-xl font-bold text-white font-mono focus:outline-none appearance-none"
                                 />
                                 <span className="text-sm font-mono text-slate-500 pb-1 select-none">s</span>
                             </div>
                         </div>
                         <input 
                            type="range" 
                            min="30" 
                            max="600" 
                            step="10" 
                            value={numericDuration} 
                            onChange={handleDurationChange}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                         />
                         <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                             <span>30s</span>
                             <span>10m</span>
                         </div>
                    </div>

                    {/* Cost Calculation */}
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                         <div className="flex flex-col">
                             <span className="text-[10px] text-slate-500 uppercase">Required Investment</span>
                             <div className="flex items-center gap-1 text-[10px] text-purple-400">
                                 {costPerSecond} CR / SEC
                             </div>
                         </div>
                         <div className={`text-2xl font-bold font-mono flex items-center ${canAfford ? 'text-white' : 'text-red-500'}`}>
                             {totalCost.toLocaleString()} <span className="text-sm ml-1 text-slate-500">CR</span>
                         </div>
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={handleStart}
                        disabled={!canAfford || !isValidDuration}
                        className={`
                            w-full py-4 rounded-lg font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-all
                            ${canAfford && isValidDuration
                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)]' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                        `}
                    >
                        {canAfford ? (
                            <>
                                <Play size={16} fill="currentColor" /> Initialize Simulation
                            </>
                        ) : (
                            <>
                                <ShieldAlert size={16} /> Insufficient Funds
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
