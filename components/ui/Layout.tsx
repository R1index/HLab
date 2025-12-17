
import React, { useEffect } from 'react';
import { ScreenState, Resources } from '../../types';
import { LayoutGrid, FileText, FlaskConical, Users, Gem, Volume2, VolumeX, Infinity, Heart, Bug } from 'lucide-react';
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

const NavButton = ({ 
  active, 
  onClick, 
  icon: Icon, 
  label,
  style
}: { active: boolean; onClick: () => void; icon: any; label: string; style: typeof DEFAULT_STYLE }) => {
    
    return (
      <button
        onClick={() => {
            playSound('click');
            onClick();
        }}
        className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 border ${
          active 
            ? `${style.bgTrans} ${style.border} ${style.textHighlight} shadow-[0_0_10px_currentColor]` 
            : 'border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-900'
        }`}
      >
        <Icon size={18} className="mb-1" />
        <span className="text-[9px] md:text-xs font-bold tracking-wider uppercase">{label}</span>
      </button>
    );
};

const ResourceBadge = ({ icon: Icon, value, color }: { icon: any; value: number; color: string }) => (
  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border bg-slate-950/80 ${color}`}>
    <Icon size={14} />
    <span className="font-mono font-bold text-sm">{Math.floor(value).toLocaleString()}</span>
  </div>
);

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
  const styles = FACTION_STYLES[activeTheme] || DEFAULT_STYLE;
  
  // Audio init on first interaction
  useEffect(() => {
    const handleInteraction = () => {
        initAudio();
        if (musicEnabled) {
            startMusic();
        }
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
    };
  }, [musicEnabled]);

  return (
    <div className={`h-[100dvh] bg-slate-950 text-slate-200 flex flex-col scanlines overflow-hidden relative select-none theme-${activeTheme}`}>
      {/* Top Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-4 z-20 shrink-0 gap-2">
        <div className="flex items-center space-x-2 shrink-0">
          <div className={`w-8 h-8 rounded flex items-center justify-center text-slate-950 font-bold text-xl ${styles.dot} shadow-[0_0_15px_currentColor]`}>
            PL
          </div>
          <h1 className={`hidden md:block font-bold text-lg tracking-widest ${styles.textLight}`}>PRIVATE LAB</h1>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <ResourceBadge icon={FileText} value={resources.credits} color="border-yellow-500/30 text-yellow-400" />
          <ResourceBadge icon={FlaskConical} value={resources.data} color="border-cyan-500/30 text-cyan-400" />
          <div className="hidden md:flex">
             <ResourceBadge icon={Gem} value={resources.gems} color="border-purple-500/30 text-purple-400" />
          </div>
          
          <div className="flex items-center gap-2 border-l border-slate-700 pl-2 ml-1">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={volume} 
                onChange={(e) => onSetVolume(parseFloat(e.target.value))}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <button 
                 onClick={() => { playSound('click'); onToggleMusic(); }}
                 className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors ${musicEnabled ? 'border-cyan-500 text-cyan-400 bg-cyan-950/50' : 'border-slate-700 text-slate-600 bg-slate-900'}`}
              >
                 {musicEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
        <div className="max-w-4xl mx-auto h-full">
           {children}
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="h-20 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md grid grid-cols-8 gap-1 p-2 shrink-0 z-30 relative overflow-x-auto no-scrollbar">
        <NavButton style={styles} active={currentScreen === 'HOME'} onClick={() => onNavigate('HOME')} icon={LayoutGrid} label="Home" />
        <NavButton style={styles} active={currentScreen === 'CONTRACTS'} onClick={() => onNavigate('CONTRACTS')} icon={FileText} label="Jobs" />
        <NavButton style={styles} active={currentScreen === 'SIMULATION'} onClick={() => onNavigate('SIMULATION')} icon={Infinity} label="Sim" />
        <NavButton style={styles} active={currentScreen === 'LAB'} onClick={() => onNavigate('LAB')} icon={FlaskConical} label="Lab" />
        <NavButton style={styles} active={currentScreen === 'STAFF'} onClick={() => onNavigate('STAFF')} icon={Users} label="Staff" />
        <NavButton style={styles} active={currentScreen === 'CREATURES'} onClick={() => onNavigate('CREATURES')} icon={Bug} label="Zoo" />
        <NavButton style={styles} active={currentScreen === 'BREEDING'} onClick={() => onNavigate('BREEDING')} icon={Heart} label="Breed" />
        <NavButton style={styles} active={currentScreen === 'GACHA'} onClick={() => onNavigate('GACHA')} icon={Gem} label="Recruit" />
      </nav>
    </div>
  );
};
