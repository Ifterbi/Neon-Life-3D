import React from 'react';
import { useGame } from '../../game/GameContext';
import { Button } from './button';

export const ControlsPanel: React.FC = () => {
  const { manualTick, resetGame, keybindings } = useGame();

  return (
    <div className="flex gap-4 pointer-events-auto opacity-70 hover:opacity-100 transition-opacity duration-300">
      <Button 
        onClick={manualTick}
        variant="outline"
        className="h-14 flex items-center justify-center gap-2 bg-ror-cyan/20 border-ror-cyan/40 hover:bg-ror-cyan/40 text-ror-cyan shadow-ror-cyan rounded-sm transition-all"
        title="Manual Tick"
      >
        <i className='bx bx-step-forward text-2xl'></i>
        <span className="text-[10px] text-white/50 tracking-wider">[{keybindings.manualTick === ' ' ? 'SPACE' : keybindings.manualTick.toUpperCase()}]</span>
      </Button>
      
      <Button 
        onClick={resetGame}
        variant="outline"
        size="icon"
        className="h-14 w-14 bg-ror-red/20 border-ror-red/40 hover:bg-ror-red/40 text-ror-red hover:text-red-300 shadow-ror-red rounded-sm transition-all"
        title="Reset Entire Game"
      >
        <i className='bx bx-reset text-2xl'></i>
      </Button>
    </div>
  );
};
