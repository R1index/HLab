
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Contract, GameBonuses, MiniGameCellType, Resources } from '../../types';
import { playSound, setMusicIntensity } from '../../utils/audio';
import { 
    AlertTriangle, CheckCircle, XCircle, Zap, ShieldAlert, Crosshair, 
    ShieldOff, Flame, Pause, Clock, Layers, Star, FileWarning, Bomb, Bug,
    EyeOff, Shield, Infinity, Gem, X, Play, LogOut
} from 'lucide-react';
import { useFloatingText } from '../ui/FloatingTextOverlay';

interface MiniGameProps {
  contract: Contract;
  bonuses: GameBonuses;
  onComplete: (success: boolean, score: number) => void;
  onAbandon?: () => void;
  updateResources?: (delta: Partial<Resources>) => void;
  currentResources?: Resources;
}

interface Cell {
  id: number;
  type: MiniGameCellType;
  x: number;
  y: number;
  clicksRemaining: number;
  maxLife: number; // Life in MS
  life: number; // Life in MS
}

const getModifierInfo = (mod: string) => {
    let icon = <ShieldAlert size={20} />;
    let desc = 'Unknown anomaly';
    let title = mod;
    let colorClass = 'border-slate-700 text-slate-400 bg-slate-900';
    let textColor = 'text-slate-400';

    switch(mod) {
        case 'chaos': icon=<Zap size={20}/>; desc='Spawns are erratic'; colorClass='border-yellow-500/50 text-yellow-400 bg-yellow-950'; textColor='text-yellow-400'; break;
        case 'precision': icon=<Crosshair size={20}/>; desc='Misses deal 5x damage'; colorClass='border-red-500/50 text-red-400 bg-red-950'; textColor='text-red-400'; break;
        case 'fragile': icon=<ShieldOff size={20}/>; desc='Stability regen disabled'; colorClass='border-orange-500/50 text-orange-400 bg-orange-950'; textColor='text-orange-400'; break;
        case 'volatile': icon=<AlertTriangle size={20}/>; desc='Explosive targets'; colorClass='border-red-500 text-red-500 bg-red-950'; textColor='text-red-500'; break;
        case 'hardened': icon=<ShieldAlert size={20}/>; desc='Reinforced targets'; colorClass='border-slate-400 text-slate-300 bg-slate-800'; textColor='text-slate-300'; break;
        case 'rushed': icon=<Clock size={20}/>; desc='+20% Spawn rate'; colorClass='border-cyan-500/50 text-cyan-400 bg-cyan-950'; textColor='text-cyan-400'; break;
        case 'dense': icon=<Layers size={20}/>; desc='Grid density increased'; colorClass='border-purple-500/50 text-purple-400 bg-purple-950'; textColor='text-purple-400'; break;
        case 'lucky': icon=<Star size={20}/>; desc='High value targets'; colorClass='border-green-500/50 text-green-400 bg-green-950'; textColor='text-green-400'; break;
        case 'bureaucracy': icon=<FileWarning size={20}/>; desc='Red Tape appears'; colorClass='border-blue-500/50 text-blue-400 bg-blue-950'; textColor='text-blue-400'; break;
        case 'bombardment': icon=<Bomb size={20}/>; desc='Time Bombs appear'; colorClass='border-red-500/70 text-red-400 bg-red-900/40'; textColor='text-red-400'; break;
        case 'replicator': icon=<Bug size={20}/>; desc='Viruses multiply rapidly'; colorClass='border-emerald-500/50 text-emerald-400 bg-emerald-950'; textColor='text-emerald-400'; break;
        case 'stealth': icon=<EyeOff size={20}/>; desc='Targets flicker invisibly'; colorClass='border-slate-500 text-white bg-black'; textColor='text-white'; break;
        case 'shielded': icon=<Shield size={20}/>; desc='Targets have heavy shields (4-5 clicks)'; colorClass='border-blue-500 text-blue-300 bg-blue-950'; textColor='text-blue-300'; break;
    }
    return { icon, title, desc, colorClass, textColor };
};

export const MiniGame: React.FC<MiniGameProps> = ({ contract, bonuses, onComplete, onAbandon, updateResources }) => {
  const [currentGridSize, setCurrentGridSize] = useState(contract.isInfinite ? 3 : (contract.gridSize || 4));
  
  const stateRef = useRef({
    cells: [] as Cell[],
    score: 0,
    stability: bonuses.maxStability,
    timeLeft: contract.durationSeconds,
    timeAccumulator: 0, 
    combo: 0,
    maxCombo: 0,
    gameActive: true,
    paused: false,
    result: null as 'WIN' | 'FAIL' | null,
    lastSpawnTime: 0,
    processedClicks: new Set<number>()
  });

  const [, setTick] = useState(0); 
  const [hoveredModifier, setHoveredModifier] = useState<{ id: string, rect: DOMRect } | null>(null);
  const { spawnText } = useFloatingText();
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>(0); 
  const isMountedRef = useRef(true);

  const isVolatile = contract.modifiers.includes('volatile');
  const isChaos = contract.modifiers.includes('chaos');
  const isHardened = contract.modifiers.includes('hardened');
  const isFragile = contract.modifiers.includes('fragile');
  const isPrecision = contract.modifiers.includes('precision');
  const isBureaucracy = contract.modifiers.includes('bureaucracy');
  const isBombardment = contract.modifiers.includes('bombardment');
  const isReplicator = contract.modifiers.includes('replicator');
  const isStealth = contract.modifiers.includes('stealth');
  const isShielded = contract.modifiers.includes('shielded');

  useEffect(() => {
      isMountedRef.current = true;
      const handleVisibilityChange = () => {
          if (document.hidden && stateRef.current.gameActive && !stateRef.current.result) {
              stateRef.current.paused = true;
              if (isMountedRef.current) setTick(t => t + 1);
          }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          isMountedRef.current = false;
          if (frameRef.current) cancelAnimationFrame(frameRef.current);
      };
  }, []);

  const handleEnd = useCallback((win: boolean) => {
    const s = stateRef.current;
    if (!s.gameActive || s.result) return; 
    
    s.gameActive = false;
    s.result = win ? 'WIN' : 'FAIL';
    
    // In infinite mode, losing stability counts as a "Success" extraction but ends the run
    if (contract.isInfinite && !win) {
         s.result = 'WIN';
    }

    if (isMountedRef.current) setTick(t => t + 1);
    playSound(win || contract.isInfinite ? 'success' : 'fail');
    if (!win && !contract.isInfinite) {
        setMusicIntensity('normal');
    }
  }, [contract.isInfinite]);

  const togglePause = () => {
    const s = stateRef.current;
    if (s.result) return;
    s.paused = !s.paused;
    playSound('click');
    if (isMountedRef.current) setTick(t => t + 1);
  };

  const breakCombo = (rect?: DOMRect) => {
      const s = stateRef.current;
      if (s.combo > 5) playSound('fail');
      s.combo = 0;
      if (rect) {
        spawnText(rect.left + rect.width/2, rect.top - 20, "COMBO BROKEN", "text-red-500", "sm");
      }
  };

  const spawnCell = (gridSize: number, elapsed: number) => {
      const s = stateRef.current;
      if (s.cells.length >= (gridSize * gridSize) - 1) return;

      let x = Math.floor(Math.random() * gridSize);
      let y = Math.floor(Math.random() * gridSize);
      let attempts = 0;
      
      while(s.cells.some(c => c.x === x && c.y === y) && attempts < 20) {
           x = Math.floor(Math.random() * gridSize);
           y = Math.floor(Math.random() * gridSize);
           attempts++;
      }
      if (attempts >= 20) return;

      const roll = Math.random();
      let type: MiniGameCellType = 'normal';
      let clicks = 1;
      let life = 2000; 

      if (contract.isInfinite) {
          const elapsed = contract.durationSeconds - s.timeLeft;
          const highTierUnlock = elapsed > 45; 
          
          if (Math.random() < 0.03) { type = 'gem_node'; life = 1500; } 
          else if (Math.random() < 0.05) { type = 'red_tape'; life = 2500; }
          else if (highTierUnlock && Math.random() < 0.05) { type = 'time_bomb'; life = 1600; }
          else if (highTierUnlock && Math.random() < 0.05) { type = 'virus'; life = 2300; }
          else if (highTierUnlock && Math.random() < 0.08) { type = 'shielded_core'; clicks = 4; life = 3000; }
          else if (Math.random() < 0.1) { type = 'trap'; life = 1600; }
          else if (Math.random() < 0.15) { type = 'critical'; life = 1300; }
          else if (Math.random() < 0.2) { type = 'tough'; clicks = 2; life = 3000; }
          
          const speedFactor = Math.min(0.6, elapsed / 300); 
          life = life * (1 - speedFactor);

      } else {
          if (isBureaucracy && Math.random() < 0.20) { type = 'red_tape'; life = 2500; }
          else if (isBombardment && Math.random() < 0.15) { type = 'time_bomb'; life = 1600; }
          else if (isReplicator && Math.random() < 0.15) { type = 'virus'; life = 2300; }
          else if (isShielded && Math.random() < 0.25) { type = 'shielded_core'; clicks = 4; life = 3000; }
          else if (roll < (isVolatile ? 0.2 : 0.1)) { type = 'trap'; life = 1600; }
          else if (roll < (isVolatile ? 0.2 : 0.1) + bonuses.critChance) { type = 'critical'; life = 1300; }
          else if (roll < (isHardened ? 0.5 : 0.3)) { type = 'tough'; clicks = isHardened ? 3 : 2; life = 3000; }
      }

      if (isChaos) life = Math.floor(life * 0.7); 
      life = Math.floor(life * (1 + (bonuses.lifeExtension || 0)));

      s.cells.push({
          id: Date.now() + Math.random(),
          type, x, y,
          clicksRemaining: clicks,
          maxLife: life, life: life
      });
      playSound('spawn');
  };

  const gameLoop = useCallback((timestamp: number) => {
    if (!isMountedRef.current) return;
    const s = stateRef.current;
    
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    let dt = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    if (!s.gameActive || s.result || s.paused) {
         if((s.paused || s.result) && isMountedRef.current) frameRef.current = requestAnimationFrame(gameLoop);
         return;
    }

    if (dt > 100) dt = 100; 

    s.timeAccumulator += dt;

    if (s.timeAccumulator >= 1000) {
        s.timeLeft -= 1;
        
        if (contract.isInfinite) {
            const elapsed = contract.durationSeconds - s.timeLeft;
            let targetSize = currentGridSize;

            if (elapsed >= 200) targetSize = 7;
            else if (elapsed >= 120) targetSize = 6;
            else if (elapsed >= 60) targetSize = 5;
            else if (elapsed >= 20) targetSize = 4;

            if (targetSize !== currentGridSize) {
                setCurrentGridSize(targetSize);
            }
        }

        if (s.timeLeft <= 0) {
            handleEnd(true); 
            return;
        }
        s.timeAccumulator -= 1000;
    }

    const cellsToSpawn: Cell[] = [];
    let damage = 0;
    let scorePenalty = 0;
    let missedCell = false;
    let nextCells = [];

    for (const c of s.cells) {
        c.life -= dt;
        if (c.life > 0) {
            nextCells.push(c);
        } else {
            if (c.type === 'trap') { }
            else if (c.type === 'gem_node') { missedCell = true; } 
            else if (c.type === 'red_tape') { scorePenalty += 3; playSound('fail'); missedCell = true; }
            else if (c.type === 'time_bomb') { damage += 30; playSound('fail'); missedCell = true; }
            else if (c.type === 'virus') { 
                damage += 5; playSound('fail'); missedCell = true;
                for(let i=0; i < (isReplicator ? 2 : 1); i++) {
                   cellsToSpawn.push({
                      id: Date.now() + Math.random(),
                      type: 'virus', x: -1, y: -1, clicksRemaining: 1, maxLife: 2500, life: 2500
                   });
                }
            } else {
                damage += isVolatile ? 15 : 8; 
                missedCell = true;
            }
        }
    }
    s.cells = nextCells;
    
    if (missedCell) s.combo = 0;
    if (damage > 0) s.stability = Math.max(0, s.stability - damage);
    if (scorePenalty > 0) s.score = Math.max(0, s.score - scorePenalty);

    // CRITICAL CHECK: End game immediately if stability hit zero from expiration
    if (s.stability <= 0) {
        handleEnd(false); 
        return;
    }
    
    cellsToSpawn.forEach(newCell => {
        if (s.cells.length >= (currentGridSize * currentGridSize)) return;
        let x = Math.floor(Math.random() * currentGridSize);
        let y = Math.floor(Math.random() * currentGridSize);
        let attempts = 0;
        while(s.cells.some(c => c.x === x && c.y === y) && attempts < 20) {
             x = Math.floor(Math.random() * currentGridSize);
             y = Math.floor(Math.random() * currentGridSize);
             attempts++;
        }
        if (attempts < 20) {
            newCell.x = x; newCell.y = y;
            s.cells.push(newCell);
        }
    });

    if (bonuses.stabilityRegen > 0 && !isFragile) {
       const regenAmount = (bonuses.stabilityRegen * dt) / 1000;
       s.stability = Math.min(bonuses.maxStability, s.stability + regenAmount);
    }

    if (!contract.isInfinite && s.score >= contract.quota) {
        handleEnd(true);
        return;
    }

    const now = Date.now();
    let spawnRate = 800;

    if (contract.isInfinite) {
        const elapsed = contract.durationSeconds - s.timeLeft;
        spawnRate = Math.max(200, 800 - (elapsed * 3)); 
    } else {
        spawnRate = contract.difficulty === 'Omega' ? 220 : 
                        contract.difficulty === 'Black Ops' ? 300 :
                        contract.difficulty === 'Extreme' ? 400 :
                        contract.difficulty === 'High' ? 500 : 
                        contract.difficulty === 'Medium' ? 650 : 800;

        if (contract.modifiers.includes('rushed')) spawnRate *= 0.85; 
        if (isChaos) spawnRate *= 0.7; 
        if (s.combo > 10) spawnRate *= 0.9;
    }
    
    if (now - s.lastSpawnTime > spawnRate) {
        spawnCell(currentGridSize, contract.durationSeconds - s.timeLeft);
        s.lastSpawnTime = now;
    }

    const shouldRender = (timestamp - lastRenderTimeRef.current) > (1000 / 30);
    if (shouldRender && isMountedRef.current) {
        setTick(t => t + 1); 
        lastRenderTimeRef.current = timestamp;
    }
    
    if (isMountedRef.current) frameRef.current = requestAnimationFrame(gameLoop);
  }, [currentGridSize, contract, bonuses, handleEnd]); 

  useEffect(() => {
    if (isMountedRef.current) frameRef.current = requestAnimationFrame(gameLoop);
    return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [gameLoop]);

  const handleCellClick = (e: React.PointerEvent | React.MouseEvent, cellId: number) => {
      e.preventDefault();
      e.stopPropagation();

      const s = stateRef.current;
      
      if (s.paused || s.result || !s.gameActive) return;
      if (s.processedClicks.has(cellId)) return;

      const cellIndex = s.cells.findIndex(c => c.id === cellId);
      if (cellIndex === -1) return;

      const cell = s.cells[cellIndex];
      const clickX = e.clientX;
      const clickY = e.clientY;

      if (cell.type === 'trap') {
           const dmg = isVolatile ? 40 : 25; 
           s.stability = Math.max(0, s.stability - dmg);
           playSound('fail');
           breakCombo();
           spawnText(clickX, clickY, `-${dmg} STABILITY`, 'text-red-500', 'md');
           s.cells.splice(cellIndex, 1);
           
           s.processedClicks.add(cellId);
           setTimeout(() => s.processedClicks.delete(cellId), 200);

           // IMMEDIATE CHECK: If stability reached zero, end now
           if (s.stability <= 0) {
               handleEnd(false);
           }
           return;
      }

      if (cell.clicksRemaining > 1) {
           playSound('click');
           if (cell.type === 'shielded_core') spawnText(clickX, clickY, "SHIELD HIT", 'text-blue-300', 'sm');
           else spawnText(clickX, clickY, "HIT", 'text-slate-300', 'sm');
           cell.clicksRemaining -= 1;
           return;
      }

      playSound('click');
      let basePoints = 1;
      let text = '';
      let color = 'text-cyan-400';
      let textSize: 'sm' | 'md' | 'lg' = 'md';
      
      if (contract.isInfinite) basePoints = 3;

      if (cell.type === 'gem_node') {
          basePoints = 0;
          if (updateResources) updateResources({ gems: 1 });
          text = "+1 GEM";
          color = 'text-purple-400';
          textSize = 'lg';
          playSound('success');
      } else if (cell.type === 'red_tape') {
          basePoints = 0;
          text = "FILED";
          color = 'text-blue-300';
          textSize = 'sm';
      } else if (cell.type === 'time_bomb') {
          basePoints = 5;
          text = "DEFUSED";
          color = 'text-yellow-400';
      } else if (cell.type === 'virus') {
          basePoints = 2;
          text = "PURGED";
          color = 'text-green-400';
      } else if (cell.type === 'shielded_core') {
          basePoints = 15;
          text = "SHIELD BROKEN";
          color = 'text-blue-400';
          textSize = 'lg';
      } else if (cell.type === 'critical') {
          basePoints = 10;
          text = "CRIT!";
          color = 'text-purple-400';
          textSize = 'lg';
      } else if (cell.type === 'tough') {
          basePoints = 5;
          color = 'text-orange-400';
      }

      if (cell.type !== 'red_tape') {
          const comboMultiplier = 1 + Math.floor(s.combo / 10) * 0.5;
          const baseWithPower = basePoints + (bonuses.clickPower || 0);
          
          let finalPoints = Math.floor(baseWithPower * comboMultiplier);
          const isLuckyCrit = cell.type !== 'critical' && cell.type !== 'shielded_core' && Math.random() < bonuses.critChance;
          
          if (isLuckyCrit) {
              finalPoints *= 2;
              text = "LUCKY!";
              color = 'text-pink-400';
              textSize = 'lg';
          }

          if (cell.type !== 'gem_node') {
            s.score += finalPoints;
            if (!text) text = `+${finalPoints}`;
            else text = `${text} +${finalPoints}`;
            spawnText(clickX, clickY, text, color, textSize);
          } else {
             spawnText(clickX, clickY, text, color, textSize); 
          }
      } else {
          spawnText(clickX, clickY, text, color, textSize);
      }

      s.combo += 1;
      if (s.combo > s.maxCombo) s.maxCombo = s.combo;
      s.cells.splice(cellIndex, 1);
      
      s.processedClicks.add(cellId);
      setTimeout(() => s.processedClicks.delete(cellId), 100);
  };

  const handleMiss = (e: React.PointerEvent | React.MouseEvent) => {
      if ((e.target as HTMLElement).getAttribute('data-cell') === 'true') return;

      const s = stateRef.current;
      if (!s.gameActive || s.result || s.paused) return;
      
      const penalty = isPrecision ? 25 : isVolatile ? 10 : 5;
      s.stability = Math.max(0, s.stability - penalty);
      playSound('fail');
      
      const target = e.currentTarget as Element;
      const rect = target.getBoundingClientRect();
      breakCombo(rect);
      spawnText(e.clientX, e.clientY, "MISS!", "text-red-500", "md");

      // IMMEDIATE CHECK: Missed click killed the connection
      if (s.stability <= 0) {
          handleEnd(false);
      }
  };

  const GridOverlay = useMemo(() => (
    <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${currentGridSize}, 1fr)`,
        gridTemplateRows: `repeat(${currentGridSize}, 1fr)`
    }}>
        {Array.from({ length: currentGridSize * currentGridSize }).map((_, i) => (
            <div key={i} className={`border ${isPrecision ? 'border-red-500/30' : 'border-slate-500/50'}`} />
        ))}
    </div>
  ), [currentGridSize, isPrecision]);

  const { stability, score, timeLeft, combo, maxCombo, paused, result, cells } = stateRef.current;

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center p-4 animate-in fade-in duration-300 ${contract.difficulty === 'Black Ops' ? 'bg-red-950/20' : ''}`}>
      
      {/* MiniGame Top Info Bar */}
      <div className="w-full max-w-md grid grid-cols-3 gap-2 items-end mb-4 font-mono text-sm relative select-none mt-8">
        <div className="flex flex-col">
            <span className="text-slate-400 text-[10px] uppercase font-bold mb-1">Stability</span>
            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
                <div 
                    className={`h-full transition-all duration-200 ${stability < 30 ? 'bg-red-500' : 'bg-cyan-500'}`} 
                    style={{ width: `${Math.max(0, Math.min(100, (stability / bonuses.maxStability) * 100))}%` }}
                />
            </div>
        </div>

        <div className="text-center flex flex-col items-center">
            {combo > 2 && (
                <div className="absolute -top-8 animate-in slide-in-from-bottom-2 fade-in zoom-in duration-200">
                    <div className={`
                        flex items-center space-x-1 font-bold italic
                        ${combo > 20 ? 'text-yellow-400 scale-125' : combo > 10 ? 'text-purple-400 scale-110' : 'text-cyan-400'}
                    `}>
                        <Flame size={16} className={`${combo > 10 ? 'fill-current animate-pulse' : ''}`} />
                        <span>{combo} COMBO</span>
                    </div>
                </div>
            )}
            <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">{contract.isInfinite ? 'Data Yield' : 'Quota'}</span>
            <span className="text-2xl font-bold text-white tracking-tighter">
                {contract.isInfinite ? score : `${score} / ${contract.quota}`}
            </span>
        </div>

        <div className="flex flex-col items-end">
            <div className="flex gap-2 mb-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); togglePause(); }}
                    className="p-1.5 bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Pause"
                >
                    {paused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                </button>
            </div>
            <div className="text-right">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Time Left</span>
                <span className={`text-xl font-bold font-mono ${timeLeft < 10 ? 'text-red-400' : 'text-white'}`}>
                    {timeLeft}s
                </span>
            </div>
        </div>
      </div>

      {/* Grid Container */}
      <div 
        className={`relative rounded-lg overflow-hidden select-none cursor-crosshair w-full max-w-sm aspect-square transition-all duration-500
            ${contract.difficulty === 'Black Ops' ? 'border-4 border-red-900 shadow-[0_0_50px_rgba(239,68,68,0.2)]' : 
              contract.isInfinite ? 'border-4 border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.3)]' :
              isVolatile ? 'shadow-[0_0_20px_rgba(239,68,68,0.3)] border-red-500/40' : 
              'shadow-2xl shadow-cyan-900/20 border-slate-700'}
            ${isHardened ? 'border-4' : 'border'}
            ${isFragile ? 'border-dashed' : ''}
            bg-slate-900/50
        `}
        style={{ touchAction: 'none' }}
        onPointerDown={handleMiss}
      >
        {isVolatile && <div className="absolute inset-0 bg-red-500/5 pointer-events-none animate-pulse" />}
        {isChaos && <div className="absolute inset-0 bg-yellow-500/5 pointer-events-none mix-blend-overlay" />}
        {contract.isInfinite && <div className="absolute inset-0 bg-purple-500/5 pointer-events-none" />}
        {contract.difficulty === 'Black Ops' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />}

        {paused && !result && (
            <div className="absolute inset-0 z-[80] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto"
                 onClick={(e) => { e.stopPropagation(); togglePause(); }}>
                <Pause size={48} className="text-cyan-400 mb-2" />
                <span className="text-cyan-200 font-bold tracking-widest animate-pulse">SYSTEM PAUSED</span>
                <span className="text-xs text-slate-500 mt-2">Tap to resume</span>
                {onAbandon && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAbandon(); setMusicIntensity('normal'); }}
                        className="mt-6 px-4 py-2 bg-red-900/20 border border-red-500/50 text-red-400 hover:bg-red-600 hover:text-white rounded text-xs font-bold flex items-center gap-2 transition-all"
                    >
                        <LogOut size={14} /> ABORT MISSION
                    </button>
                )}
            </div>
        )}

        {GridOverlay}

        {cells.map(cell => (
            <div
                key={cell.id}
                data-cell="true"
                onPointerDown={(e) => handleCellClick(e, cell.id)}
                className={`absolute m-[5px] rounded-md flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg
                    ${isStealth ? 'animate-[pulse_0.5s_ease-in-out_infinite] opacity-50 hover:opacity-100' : ''}
                    ${cell.type === 'normal' ? 'bg-cyan-600 border-2 border-cyan-400 shadow-cyan-500/20' : ''}
                    ${cell.type === 'tough' ? 'bg-orange-600 border-2 border-orange-400 shadow-orange-500/20' : ''}
                    ${cell.type === 'critical' ? 'bg-purple-600 border-2 border-purple-400 animate-pulse shadow-purple-500/40' : ''}
                    ${cell.type === 'trap' ? 'bg-red-600 border-2 border-red-400 shadow-red-500/20' : ''}
                    ${cell.type === 'red_tape' ? 'bg-blue-800 border-2 border-blue-400 opacity-90' : ''}
                    ${cell.type === 'time_bomb' ? 'bg-red-900 border-2 border-red-500 animate-bounce' : ''}
                    ${cell.type === 'virus' ? 'bg-emerald-700 border-2 border-emerald-400' : ''}
                    ${cell.type === 'shielded_core' ? 'bg-blue-950 border-4 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}
                    ${cell.type === 'gem_node' ? 'bg-fuchsia-900 border-2 border-fuchsia-400 shadow-[0_0_15px_currentColor] text-fuchsia-100' : ''}
                `}
                style={{
                    width: `calc(${100/currentGridSize}% - 10px)`,
                    height: `calc(${100/currentGridSize}% - 10px)`,
                    left: `${cell.x * (100/currentGridSize)}%`,
                    top: `${cell.y * (100/currentGridSize)}%`,
                    opacity: isStealth ? undefined : cell.life / cell.maxLife,
                    transform: `scale(${0.5 + (0.5 * (cell.life / cell.maxLife))})`
                }}
            >
                {cell.type === 'tough' && <div className="text-xs font-bold text-white select-none pointer-events-none">{cell.clicksRemaining}</div>}
                {cell.type === 'shielded_core' && (
                    <div className="flex items-center justify-center w-full h-full relative pointer-events-none">
                         <Shield size={24} className="text-blue-200" />
                         <span className="absolute text-xs font-black text-blue-900 bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center -bottom-1 -right-1">{cell.clicksRemaining}</span>
                    </div>
                )}
                {cell.type === 'trap' && <AlertTriangle size={24} className="text-red-200 pointer-events-none" />}
                {cell.type === 'critical' && <div className="w-2 h-2 bg-white rounded-full animate-ping pointer-events-none" />}
                {cell.type === 'red_tape' && <FileWarning size={20} className="text-blue-200 pointer-events-none" />}
                {cell.type === 'time_bomb' && <div className="text-white font-mono font-bold text-xs pointer-events-none">{Math.ceil((cell.life/1000)*10)/10}</div>}
                {cell.type === 'virus' && <Bug size={20} className="text-emerald-200 animate-pulse pointer-events-none" />}
                {cell.type === 'gem_node' && <Gem size={24} className="animate-spin-slow pointer-events-none" />}
            </div>
        ))}
      </div>

      {contract.modifiers.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-3 w-full max-w-sm relative z-10">
              {contract.modifiers.map(m => {
                  const info = getModifierInfo(m);
                  return (
                      <div 
                        key={m}
                        className={`
                            relative group p-3 rounded-xl border-2 transition-all duration-200 cursor-help
                            ${info.colorClass} bg-opacity-20 hover:bg-opacity-40 hover:scale-110 hover:shadow-[0_0_15px_rgba(0,0,0,0.5)]
                        `}
                        onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredModifier({id: m, rect});
                        }}
                        onMouseLeave={() => setHoveredModifier(null)}
                      >
                          {info.icon}
                      </div>
                  );
              })}
          </div>
      )}

      {hoveredModifier && createPortal(
          <div 
             className="fixed z-[9999] w-48 bg-slate-950/95 backdrop-blur-xl border border-slate-700 p-3 rounded-lg shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
             style={{
                 top: Math.max(10, hoveredModifier.rect.top), 
                 left: Math.min(window.innerWidth - 200, Math.max(10, hoveredModifier.rect.left + (hoveredModifier.rect.width/2))),
                 transform: 'translate(-50%, -100%) translateY(-12px)'
             }}
         >
             <div className={`text-xs font-bold uppercase mb-1 tracking-wider ${getModifierInfo(hoveredModifier.id).textColor}`}>
                 {getModifierInfo(hoveredModifier.id).title}
             </div>
             <div className="text-[10px] text-slate-300 leading-relaxed font-mono">
                 {getModifierInfo(hoveredModifier.id).desc}
             </div>
             <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-700"></div>
         </div>,
         document.body
      )}

      {result && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl text-center shadow-2xl max-w-xs w-full animate-in zoom-in duration-300">
                  {result === 'WIN' ? (
                      <>
                        <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">{contract.isInfinite ? 'DATA EXTRACTED' : 'CONTRACT FULFILLED'}</h2>
                        <p className="text-slate-400 mb-2">{contract.isInfinite ? 'Extraction complete. Data secured.' : 'Quota met. Data secured.'}</p>
                        {contract.isInfinite && (
                             <div className="mb-4 text-emerald-400 font-bold font-mono text-lg">
                                 YIELD: {score} DATA
                             </div>
                        )}
                        <div className="text-xs text-yellow-400 font-mono mb-6">
                            MAX COMBO: {maxCombo}
                        </div>
                      </>
                  ) : (
                      <>
                        <XCircle size={48} className="mx-auto text-red-400 mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">CONNECTION LOST</h2>
                        <p className="text-slate-400 mb-6">Stability critical. Abort.</p>
                        {contract.difficulty === 'Black Ops' && (
                            <div className="text-xs text-red-500 font-bold border border-red-900 bg-red-950/50 p-2 rounded mt-2">
                                REPUTATION COMPROMISED
                            </div>
                        )}
                      </>
                  )}
                  <button 
                    onClick={() => onComplete(result === 'WIN', score)}
                    className="w-full bg-slate-100 text-slate-900 font-bold py-3 rounded hover:bg-white transition-colors"
                  >
                      {result === 'WIN' ? 'COLLECT REWARDS' : 'RETURN TO BASE'}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
