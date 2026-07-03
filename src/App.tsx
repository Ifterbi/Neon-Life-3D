import React from 'react';
import { GameProvider } from './game/GameContext';
import { Board } from './components/3d/Board';
import { UI } from './components/ui/UI';

import { SettingsModal } from './components/SettingsModal';

const App: React.FC = () => {
  return (
    <GameProvider>
      <div className="relative-container">
        <Board />
        <UI />
        <SettingsModal />
      </div>
    </GameProvider>
  );
};

export default App;
