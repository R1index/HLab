
import React, { useState } from 'react';
import { Layout } from './components/ui/Layout';
import { ScreenState } from './types';
import { useGameStore } from './state/gameStore';
import { HomeScreen } from './screens/HomeScreen';
import { ContractsScreen } from './screens/ContractsScreen';
import { LabScreen } from './screens/LabScreen';
import { StaffScreen } from './screens/StaffScreen';
import { GachaScreen } from './screens/GachaScreen';
import { SimulationScreen } from './screens/SimulationScreen';
import { BreedingScreen } from './screens/BreedingScreen';
import { CreatureScreen } from './screens/CreatureScreen';
import { FloatingTextProvider } from './components/ui/FloatingTextOverlay';

const AppContent = () => {
  const [screen, setScreen] = useState<ScreenState>('HOME');
  const store = useGameStore();

  const renderScreen = () => {
    switch (screen) {
      case 'HOME':
        return <HomeScreen state={store.state} onSetTheme={store.setTheme} />;
      case 'CONTRACTS':
        return (
          <ContractsScreen 
            state={store.state} 
            onCompleteContract={store.completeContract} 
            onFulfillTrade={store.fulfillTradeContract}
            bonuses={store.getBonuses()}
            updateResources={store.updateResources}
          />
        );
      case 'SIMULATION':
        return (
            <SimulationScreen 
                state={store.state}
                updateResources={store.updateResources}
                onCompleteContract={store.completeContract}
                bonuses={store.getBonuses()}
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
        return <GachaScreen state={store.state} onPerformGacha={store.performGacha} onPerformCreatureGacha={store.performCreatureGacha} />;
      case 'BREEDING':
        return <BreedingScreen state={store.state} onBreed={store.breedingAction} />;
      case 'CREATURES':
        return <CreatureScreen state={store.state} />;
      default:
        return <HomeScreen state={store.state} onSetTheme={store.setTheme} />;
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
    </>
  );
};

const App = () => (
  <FloatingTextProvider>
    <AppContent />
  </FloatingTextProvider>
);

export default App;
