import React, { useEffect, useState } from 'react';
import { useGame } from '../../game/GameContext';
import { subscribeToPoints, getPointsSnapshot } from '../../game/store';
import { Button } from './button';

export const PrestigeButton: React.FC = () => {
  const { 
    cubes, isDebugMode, buyPrestige, keybindings 
  } = useGame();
  const [storeState, setStoreState] = useState(() => getPointsSnapshot());

  useEffect(() => {
    return subscribeToPoints(() => {
      setStoreState(getPointsSnapshot());
    });
  }, []);

  const { points, prestigeCost, maxGridSize } = storeState;

  let allUnlockedFacesMaxed = true;
  let hasUnlockedFace = false;
  let unlockedCount = 0;
  
  for (const c of cubes) {
    for (const f of c.faces) {
      if (f.unlocked) {
        hasUnlockedFace = true;
        unlockedCount++;
        if (Math.max(f.rows, f.cols) < maxGridSize) {
          allUnlockedFacesMaxed = false;
        }
      }
    }
  }
  
  // If all 90 faces are unlocked (15 cubes * 6 faces), prestige is complete
  if (unlockedCount >= 90) {
    return null;
  }
  
  const canPrestige = hasUnlockedFace && allUnlockedFacesMaxed && (isDebugMode || points >= prestigeCost);

  return (
    <Button 
      onClick={buyPrestige}
      disabled={!canPrestige}
      variant="outline"
      className="flex-col h-auto w-max whitespace-normal text-left p-4 bg-purple-500/10 border-purple-500/40 hover:bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.3)] opacity-70 hover:opacity-100 transition-all duration-300 pointer-events-auto rounded-sm mb-2"
    >
      <div className="flex items-center gap-2 text-purple-300 font-black tracking-widest text-lg drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">
        <i className='bx bx-globe text-2xl'></i>
        GLOBAL PRESTIGE
        <span className="text-[10px] text-white/50 absolute top-2 right-2 font-normal tracking-normal">[{keybindings.buyPrestige.toUpperCase()}]</span>
      </div>
      <div className="text-purple-200/70 text-xs text-center mt-2 leading-relaxed font-medium">
        Unlock next face. Resets ALL unlocked faces to 10x10.
        <br/>
        <span className="text-white/40 text-[10px] mt-1 inline-block">
          (Requires ALL current faces to be maxed at {maxGridSize}x{maxGridSize})
        </span>
      </div>
      <div className="text-lg font-bold text-ror-purple mt-2 drop-shadow-ror-purple">
        {prestigeCost.toLocaleString()} pts
      </div>
    </Button>
  );
};
