
import React, { useState } from 'react';
import { GameState, Contract } from '../types';
import { Infinity, Clock, Play, ShieldAlert, Gem } from 'lucide-react';
import { playSound, setMusicIntensity } from '../utils/audio';
import { useFloatingText } from '../components/ui/FloatingTextOverlay';

interface Props {
  state: GameState;
  onStartProtocol: (contract: Contract) => void;
}

export const SimulationScreen: React.FC<Props> = ({ state, onStartProtocol }) => {
    const [duration, setDuration] = useState<number | string>(60);
    const { spawnText } = useFloatingText();

    const numericDuration = typeof duration === 'number' && !isNaN(duration) ? duration : 30;
    
    // Balanced Cost calculation: Exponential based on duration to prevent cheap AFK farming
    // Formula: Floor(Duration * 50 * (1.1 ^ (Duration / 60)))
    // 60s = 3000 * 1.1 = 3300
    // 600s = 30000 * (1.1^10) = 30000 * 2.59 = ~77000
    const totalCost = Math.floor(numericDuration * 50 * Math.pow(1.1, numericDuration / 60));
    const costPerSecond = Math.floor(totalCost / numericDuration);
    
    const canAfford = state.resources.credits >= totalCost;
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
            spawnText(window.innerWidth/2, window.innerHeight / 2, "INSUFFICIENT CREDITS", "text-red-500", "lg");
            return;
        }

        if (!isValidDuration) {
             playSound('fail');
             return;
        }

        // Logic handled in store now for resource deduction
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
            onStartProtocol(infiniteContract);
        }, 300);
    };

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
                                 ~{costPerSecond} CR / SEC
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
