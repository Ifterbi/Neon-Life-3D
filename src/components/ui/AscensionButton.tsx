import React, { useEffect, useState } from 'react';
import { useGame } from '../../game/GameContext';
import { subscribeToPoints, getPointsSnapshot } from '../../game/store';
import { Button } from './button';

export const AscensionButton: React.FC = () => {
  const { 
    cubes, isDebugMode, buyAscend
  } = useGame();
  const [storeState, setStoreState] = useState(() => getPointsSnapshot());

  useEffect(() => {
    return subscribeToPoints(() => {
      setStoreState(getPointsSnapshot());
    });
  }, []);

  const { maxGridSize, ascensionCount } = storeState;

  // Validate if ascension is possible
  let allFacesUnlockedAndMaxed = true;
  let faceCount = 0;
  
  for (const c of cubes) {
    for (const f of c.faces) {
      faceCount++;
      if (!f.unlocked || Math.max(f.rows, f.cols) < maxGridSize) {
        allFacesUnlockedAndMaxed = false;
        break;
      }
    }
    if (!allFacesUnlockedAndMaxed) break;
  }
  
  // Must have all 90 faces unlocked to Ascend
  if (faceCount < 90) allFacesUnlockedAndMaxed = false;
  
  const canAscend = allFacesUnlockedAndMaxed || isDebugMode;

  if (ascensionCount >= 5) {
    return null; // Reached absolute limit
  }

  // Only show if close to Ascend (or in debug mode), otherwise it clutters the UI early game
  // e.g. show if at least 14 cubes are fully unlocked, or debug mode
  let unlockedCount = 0;
  for (const c of cubes) {
    for (const f of c.faces) {
      if (f.unlocked) unlockedCount++;
    }
  }
  
  if (!isDebugMode && unlockedCount < 84) {
    return null;
  }

  return (
    <Button 
      onClick={buyAscend}
      disabled={!canAscend}
      variant="outline"
      className="flex-col h-auto w-max whitespace-normal text-left p-4 bg-yellow-500/10 border-yellow-500/40 hover:bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.3)] opacity-70 hover:opacity-100 transition-all duration-300 pointer-events-auto rounded-sm mb-2"
    >
      <div className="flex items-center gap-2 text-yellow-300 font-black tracking-widest text-lg drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">
        <i className='bx bx-rocket text-2xl'></i>
        ASCEND (Lv {ascensionCount + 1})
      </div>
      <div className="text-yellow-100/70 text-xs text-center mt-2 leading-relaxed font-medium">
        Reset the ENTIRE game, but increase global Max Grid size to {maxGridSize + 10}x{maxGridSize + 10}!
        <br/>
        <span className="text-white/40 text-[10px] mt-1 inline-block">
          (Requires ALL 90 faces unlocked & maxed at {maxGridSize}x{maxGridSize})
        </span>
      </div>
    </Button>
  );
};
