import { useEffect } from 'react';
import { syncPointsFromWasm } from '../game/store';

export const useGameLoop = (isWasmReady: boolean) => {
  useEffect(() => {
    if (!isWasmReady) return;
    let animationFrameId: number;
    
    const loop = () => {
      // The WebWorker handles all Game of Life ticking natively in the background.
      // The UI thread simply syncs the Points/Ascension data from Shared Memory every frame to drive the UI.
      syncPointsFromWasm();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isWasmReady]);
};
