
import React, { useState, useCallback } from 'react';
import { Layout } from './components/ui/Layout';
import { ScreenState, GameEvent } from './types';
import { useGameStore } from './state/gameStore';
import { HomeScreen } from './screens/HomeScreen';
import { ContractsScreen } from './screens/ContractsScreen';
import { LabScreen } from './screens/LabScreen';
import { StaffScreen } from './screens/StaffScreen';
import { GachaScreen } from './screens/GachaScreen';
import { SimulationScreen } from './screens/SimulationScreen';
import { BreedingScreen } from './screens/BreedingScreen';
import { CreatureScreen } from './screens/CreatureScreen';
import { FloatingTextProvider, useFloatingText } from './components/ui/FloatingTextOverlay';
import { MiniGame } from './components/mechanics/MiniGame';

const AppContent = () => {
  const [screen, setScreen] = useState<ScreenState>('HOME');
  const { spawnText } = useFloatingText();

  const handleGameEvent = useCallback((event: GameEvent) => {
    if (event.type === 'RESOURCE_GAIN' && event.amount > 0) {
        let color = 'text-white';
        if (event.resource === 'credits') color = 'text-yellow-400';
        if (event.resource === 'data') color = 'text-cyan-400';
        if (event.resource === 'gems') color = 'text-purple-400';
        
        // Randomize position slightly around center
        const x = (window.innerWidth / 2) + (Math.random() * 100 - 50);
        const y = (window.innerHeight / 2) + (Math.random() * 100 - 50);
        
        spawnText(x, y, `+${event.amount.toLocaleString()} ${event.resource.toUpperCase()}`, color, 'lg');
    }
  }, [spawnText]);

  const store = useGameStore(handleGameEvent);
  const { activeProtocol } = store.state;

  const renderScreen = () => {
    switch (screen) {
      case 'HOME':
        return (
            <HomeScreen 
                state={store.state} 
                onSetTheme={store.setTheme} 
                onManualHack={store.manualHack}
                onDevMode={store.activateDevMode}
            />
        );
      case 'CONTRACTS':
        return (
          <ContractsScreen 
            state={store.state} 
            onStartContract={store.startProtocol}
            onFulfillTrade={store.fulfillTradeContract}
            bonuses={store.getBonuses()}
          />
        );
      case 'SIMULATION':
        return (
            <SimulationScreen 
                state={store.state}
                onStartProtocol={store.startProtocol}
            />
        );
      case 'LAB':
        return (
            <LabScreen 
                state={store.state} 
                buyResearch={store.buyResearch}
            />
        );
      case 'STAFF':
        return (
          <StaffScreen 
            state={store.state} 
            onToggleStaff={store.activateStaff} 
            onDeliverCreature={store.deliverCreature} 
            onTreatStaff={store.treatStaff}
          />
        );
      case 'GACHA':
        return <GachaScreen 
                  state={store.state} 
                  onPerformGacha={store.performGacha} 
                  onPerformCreatureGacha={store.performCreatureGacha} 
                  onPerformBatchGacha={store.performBatchGacha}
               />;
      case 'BREEDING':
        return <BreedingScreen state={store.state} onBreed={store.breedingAction} />;
      case 'CREATURES':
        return <CreatureScreen state={store.state} />;
      default:
        return <HomeScreen state={store.state} onSetTheme={store.setTheme} onManualHack={store.manualHack} />;
    }
  };

  return (
    <>
      <Layout 
        currentScreen={screen} 
        onNavigate={setScreen} 
        resources={store.state.resources}
        activeTheme={store.state.activeTheme}
        musicEnabled={store.state.musicEnabled}
        onToggleMusic={store.toggleMusic}
        volume={store.state.volume}
        onSetVolume={store.setVolume}
      >
        {renderScreen()}
      </Layout>

      {/* Global Mission Overlay */}
      {activeProtocol && (
          <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col animate-in zoom-in duration-300">
             {/* Header */}
             <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
                 <div>
                     <div className="text-[10px] text-red-500 font-mono font-bold animate-pulse">LIVE FEED // SECURE CHANNEL</div>
                     <h2 className="text-xl font-bold text-white">{activeProtocol.title}</h2>
                 </div>
                 {/* Abort is handled inside MiniGame via pause menu for cleaner UI, 
                     but we pass the handler down */}
             </div>
             
             {/* Game Container */}
             <div className="flex-1 relative overflow-hidden">
                 <MiniGame 
                     contract={activeProtocol}
                     bonuses={store.getBonuses()}
                     onComplete={store.completeContract}
                     onAbandon={store.abandonProtocol}
                     updateResources={store.updateResources}
                     currentResources={store.state.resources}
                 />
             </div>
          </div>
      )}
    </>
  );
};

const App = () => (
  <FloatingTextProvider>
    <AppContent />
  </FloatingTextProvider>
);

export default App;
