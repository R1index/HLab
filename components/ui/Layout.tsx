
import React, { useEffect, useState } from 'react';
import { ScreenState, Resources } from '../../types';
import { LayoutGrid, FileText, FlaskConical, Users, Gem, Volume2, VolumeX, Infinity, Heart, Bug, Radio, Database, DollarSign } from 'lucide-react';
import { playSound, initAudio, startMusic } from '../../utils/audio';
import { FACTION_STYLES } from '../../constants';

interface LayoutProps {
  currentScreen: ScreenState;
  onNavigate: (screen: ScreenState) => void;
  resources: Resources;
  activeTheme: string;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  volume: number;
  onSetVolume: (vol: number) => void;
  children: React.ReactNode;
}

// Default fallback style matching the structure of FACTION_STYLES
const DEFAULT_STYLE = {
    bgTrans: 'bg-cyan-950/40',
    bgTransHover: 'bg-cyan-900/30',
    border: 'border-cyan-500',
    borderDim: 'border-cyan-500/30',
    text: 'text-cyan-500',
    textLight: 'text-cyan-100',
    textHighlight: 'text-cyan-400',
    btn: 'bg-cyan-700',
    btnHover: 'hover:bg-cyan-600',
    dot: 'bg-cyan-500'
};

export const Layout: React.FC<LayoutProps> = ({
  currentScreen,
  onNavigate,
  resources,
  activeTheme,
  musicEnabled,
  onToggleMusic,
  volume,
  onSetVolume,
  children
}) => {
  const [interacted, setInteracted] = useState(false);
  const styles = FACTION_STYLES[activeTheme] || DEFAULT_STYLE;

  const handleInteraction = () => {
    if (!interacted) {
      setInteracted(true);
      initAudio();
      if (musicEnabled) {
        startMusic();
      }
    }
  };

  useEffect(() => {
    if (interacted && musicEnabled) {
        startMusic();
    }
  }, [musicEnabled, interacted]);

  const NavItem = ({ screen, icon: Icon, label }: { screen: ScreenState; icon: any; label: string }) => {
    const isActive = currentScreen === screen;
    return (
      <button
        onClick={() => {
            playSound('click');
            onNavigate(screen);
        }}
        className={`
          flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 w-full mb-1 group relative overflow-hidden
          ${isActive 
            ? `${styles.bgTrans} ${styles.text} border ${styles.borderDim} shadow-[0_0_15px_rgba(0,0,0,0.2)]` 
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
        `}
      >
        {isActive && <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.dot}`}></div>}
        <Icon size={20} className={`relative z-10 transition-transform group-hover:scale-110 ${isActive ? 'animate-pulse' : ''}`} />
        <span className="font-bold tracking-wide relative z-10 text-sm">{label}</span>
      </button>
    );
  };

  const ResourceItem = ({ icon: Icon, value, label, color }: { icon: any, value: number, label: string, color: string }) => (
      <div className="flex flex-col items-center bg-slate-900/50 p-2 rounded border border-white/5 min-w-[80px]">
          <div className="flex items-center gap-1.5 mb-1">
              <Icon size={14} className={color} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>{label}</span>
          </div>
          <span className="text-sm font-mono font-bold text-white tracking-tight">{Math.floor(value).toLocaleString()}</span>
      </div>
  );

  return (
    <div 
        className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 overflow-hidden"
        onClick={handleInteraction}
    >
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-white/5 flex flex-col shrink-0 z-20 shadow-2xl">
        <div className="p-6 border-b border-white/5">
            <h1 className={`text-2xl font-black italic tracking-tighter ${styles.text} flex items-center gap-2`}>
                <Radio className="animate-pulse" />
                NEXUS<span className="text-white not-italic">LAB</span>
            </h1>
            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500 font-mono">
                <div className={`w-2 h-2 rounded-full ${styles.dot} animate-pulse`}></div>
                ONLINE // V.1.0.4
            </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-3 mt-2">Operations</div>
            <NavItem screen="HOME" icon={LayoutGrid} label="Command" />
            <NavItem screen="CONTRACTS" icon={FileText} label="Contracts" />
            <NavItem screen="SIMULATION" icon={Infinity} label="Deep Dive" />
            
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-3 mt-6">Management</div>
            <NavItem screen="STAFF" icon={Users} label="Personnel" />
            <NavItem screen="CREATURES" icon={Bug} label="Containment" />
            <NavItem screen="LAB" icon={FlaskConical} label="Research" />

            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-3 mt-6">Acquisition</div>
            <NavItem screen="GACHA" icon={Gem} label="Gacha / Incubation" />
            <NavItem screen="BREEDING" icon={Heart} label="Xeno-Genetics" />
        </nav>

        {/* Audio Controls Footer */}
        <div className="p-4 border-t border-white/5 bg-slate-950/30">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Audio Stream</span>
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleMusic(); }}
                    className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${musicEnabled ? styles.text : 'text-slate-600'}`}
                >
                    {musicEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
            </div>
            <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={volume}
                onChange={(e) => onSetVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-500 hover:accent-white"
            />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 relative">
          {/* Background Grid FX */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ 
                   backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', 
                   backgroundSize: '40px 40px' 
               }}
          />
          
          {/* Top Resource Bar */}
          <div className="h-20 border-b border-white/5 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 z-10">
              <div className="flex items-center gap-4">
                 <div className="text-xs font-mono text-slate-500">
                     SECTOR: <span className="text-white font-bold">ALPHA-9</span>
                 </div>
              </div>

              <div className="flex items-center gap-3">
                  <ResourceItem icon={DollarSign} value={resources.credits} label="Credits" color="text-yellow-400" />
                  <ResourceItem icon={Database} value={resources.data} label="Data" color="text-cyan-400" />
                  <ResourceItem icon={Gem} value={resources.gems} label="Gems" color="text-purple-400" />
              </div>
          </div>

          {/* Screen Content */}
          <main className="flex-1 overflow-hidden relative p-4 md:p-6">
              {children}
          </main>
      </div>
    </div>
  );
};
