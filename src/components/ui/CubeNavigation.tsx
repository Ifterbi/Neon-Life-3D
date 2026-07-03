import React from 'react';
import { useGame } from '../../game/GameContext';
import { Button } from './button';
import { tumbleCamera, previewTumbleFace } from '../../game/cameraModule';

import { FACE_NAMES } from '../../game/constants';

export const CubeNavigation: React.FC = () => {
  const { cameraMode, isFaceFocused, activeCubeIdx, cubes, focusFace } = useGame();
  
  // Force a re-render on interval so that the UI can update its buttons 
  // as the user drags the cube around. We just use a dummy state.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    let frameId: number;
    const update = () => {
      setTick(t => t + 1);
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, []);

  if (cameraMode !== 'focus' || cubes.length === 0) return null;

  const cube = cubes[activeCubeIdx];
  if (!cube) return null;

  const isUnlocked = (fIdx: number) => cube.faces[fIdx]?.unlocked;

  const handleTumble = (axis: 'x' | 'y', dir: 1 | -1) => {
    const newFaceIdx = tumbleCamera(axis, dir);
    focusFace(activeCubeIdx, newFaceIdx, false);
  };

  const topFaceIdx = previewTumbleFace('x', 1);
  const bottomFaceIdx = previewTumbleFace('x', -1);
  const rightFaceIdx = previewTumbleFace('y', -1);
  const leftFaceIdx = previewTumbleFace('y', 1);

  const navBtnClass = "absolute bg-ror-cyan/10 border border-ror-cyan/40 text-ror-cyan h-12 w-12 rounded-sm flex items-center justify-center cursor-pointer transition-all duration-200 backdrop-blur-sm hover:bg-ror-cyan/30 hover:border-ror-cyan hover:shadow-ror-cyan hover:scale-110 pointer-events-auto";

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(80vw,800px)] h-[min(80vh,800px)] pointer-events-none z-10">
      {isUnlocked(topFaceIdx) && (
        <Button variant="outline" size="icon" className={`${navBtnClass} top-0 left-1/2 -translate-x-1/2`} onClick={() => handleTumble('x', 1)}>
          <i className='bx bx-chevron-up text-3xl'></i>
        </Button>
      )}
      {isUnlocked(bottomFaceIdx) && (
        <Button variant="outline" size="icon" className={`${navBtnClass} bottom-0 left-1/2 -translate-x-1/2`} onClick={() => handleTumble('x', -1)}>
          <i className='bx bx-chevron-down text-3xl'></i>
        </Button>
      )}
      {isUnlocked(leftFaceIdx) && (
        <Button variant="outline" size="icon" className={`${navBtnClass} left-0 top-1/2 -translate-y-1/2`} onClick={() => handleTumble('y', 1)}>
          <i className='bx bx-chevron-left text-3xl'></i>
        </Button>
      )}
      {isUnlocked(rightFaceIdx) && (
        <Button variant="outline" size="icon" className={`${navBtnClass} right-0 top-1/2 -translate-y-1/2`} onClick={() => handleTumble('y', -1)}>
          <i className='bx bx-chevron-right text-3xl'></i>
        </Button>
      )}
    </div>
  );
};
