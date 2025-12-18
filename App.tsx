import React, { useCallback, useState } from 'react';
import { Layout } from './components/ui/Layout';
import { BreedingScreen } from './screens/BreedingScreen';
import { ContractsScreen } from './screens/ContractsScreen';
import { CreatureScreen } from './screens/CreatureScreen';
import { GachaScreen } from './screens/GachaScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LabScreen } from './screens/LabScreen';
import { SimulationScreen } from './screens/SimulationScreen';
import { StaffScreen } from './screens/StaffScreen';
import { MiniGame } from './components/mechanics/MiniGame';
import { FloatingTextProvider, useFloatingText } from './components/ui/FloatingTextOverlay';
import { useGameStore } from './state/gameStore';
import { GameEvent, ResourceType, ScreenState } from './types';

const RESOURCE_COLORS: Record<ResourceType, string> = {
  credits: 'text-yellow-400',
  data: 'text-cyan-400',
  gems: 'text-purple-400',
};

const AppContent = () => {
  const [screen, setScreen] = useState<ScreenState>('HOME');
  const { spawnText } = useFloatingText();

  const handleGameEvent = useCallback(
    (event: GameEvent) => {
      if (event.type !== 'RESOURCE_GAIN' || event.amount <= 0) {
        return;
      }

      const color = RESOURCE_COLORS[event.resource] || 'text-white';
      const x = window.innerWidth / 2 + (Math.random() * 100 - 50);
      const y = window.innerHeight / 2 + (Math.random() * 100 - 50);

      spawnText(x, y, `+${event.amount.toLocaleString()} ${event.resource.toUpperCase()}`, color, 'lg');
    },
    [spawnText],
  );

  const store = useGameStore(handleGameEvent);
  const { activeProtocol } = store.state;

  const renderScreen = () => {
    const screens: Record<ScreenState, JSX.Element> = {
      HOME: (
        <HomeScreen
          state={store.state}
          onSetTheme={store.setTheme}
          onManualHack={store.manualHack}
          onDevMode={store.activateDevMode}
        />
      ),
      CONTRACTS: (
        <ContractsScreen
          state={store.state}
          onStartContract={store.startProtocol}
          onFulfillTrade={store.fulfillTradeContract}
          bonuses={store.getBonuses()}
        />
      ),
      SIMULATION: <SimulationScreen state={store.state} onStartProtocol={store.startProtocol} />,
      LAB: <LabScreen state={store.state} buyResearch={store.buyResearch} />,
      STAFF: (
        <StaffScreen
          state={store.state}
          onToggleStaff={store.activateStaff}
          onDeliverCreature={store.deliverCreature}
          onTreatStaff={store.treatStaff}
        />
      ),
      GACHA: (
        <GachaScreen
          state={store.state}
          onPerformGacha={store.performGacha}
          onPerformCreatureGacha={store.performCreatureGacha}
          onPerformBatchGacha={store.performBatchGacha}
        />
      ),
      BREEDING: <BreedingScreen state={store.state} onBreed={store.breedingAction} />,
      CREATURES: <CreatureScreen state={store.state} />,
    };

    return screens[screen] ?? screens.HOME;
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

      {activeProtocol && (
        <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col animate-in zoom-in duration-300">
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
            <div>
              <div className="text-[10px] text-red-500 font-mono font-bold animate-pulse">LIVE FEED // SECURE CHANNEL</div>
              <h2 className="text-xl font-bold text-white">{activeProtocol.title}</h2>
            </div>
          </div>

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
