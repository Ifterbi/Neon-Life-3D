import React, { useEffect, useState } from 'react';
import { useGame } from '../../game/GameContext';
import { subscribeToPoints, getPointsSnapshot } from '../../game/store';
import { FACE_NAMES } from '../../game/constants';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';

export const UpgradesPanel: React.FC = () => {
  const { 
    cubes, activeCubeIdx, activeFaceIdx, 
    buyExpansion, buyAutoTick, 
    buyMode, setBuyMode, isDebugMode, debugMaxAll, debugMaxAutoTick,
    keybindings, focusFace
  } = useGame();

  const [storeState, setStoreState] = useState(() => getPointsSnapshot());

  useEffect(() => {
    return subscribeToPoints(() => {
      setStoreState(getPointsSnapshot());
    });
  }, []);

  if (cubes.length === 0) return null;
  if (!cubes[activeCubeIdx] || !cubes[activeCubeIdx].faces[activeFaceIdx]) return null;

  const activeFace = cubes[activeCubeIdx].faces[activeFaceIdx];
  const currentSize = Math.max(activeFace.rows, activeFace.cols);
  const expansionCost = currentSize * 50;
  const autoTickCost = activeFace.autoTick === 0 ? 50 : activeFace.autoTick * 100;
  const autoTickInterval = 1000 * Math.pow(0.9, activeFace.autoTick);
  const formatNumber = (n: number) => n.toLocaleString();
  
  const { points } = storeState;

  const getNextUnlockedFace = (direction: 1 | -1) => {
    let nextIdx = activeFaceIdx;
    for (let i = 0; i < 6; i++) {
      nextIdx = (nextIdx + direction + 6) % 6;
      if (cubes[activeCubeIdx].faces[nextIdx].unlocked) {
        return nextIdx;
      }
    }
    return activeFaceIdx;
  };

  return (
    <Card className="w-max opacity-70 hover:opacity-100 transition-opacity duration-300 bg-ror-panelBg backdrop-blur-md border-ror-panelBorder rounded-sm shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
      <CardHeader className="pb-2 border-b border-white/10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-white hover:bg-white/20 hover:text-ror-cyan transition-colors"
              onClick={() => {
                const nextIdx = getNextUnlockedFace(-1);
                if (nextIdx !== activeFaceIdx) {
                  focusFace(activeCubeIdx, nextIdx);
                }
              }}
              title="Previous Face"
            >
              <i className='bx bx-chevron-left text-lg'></i>
            </Button>
            <CardTitle className="text-lg font-bold text-white uppercase tracking-wider">
              {FACE_NAMES[activeFaceIdx]}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-white hover:bg-white/20 hover:text-ror-cyan transition-colors"
              onClick={() => {
                const nextIdx = getNextUnlockedFace(1);
                if (nextIdx !== activeFaceIdx) {
                  focusFace(activeCubeIdx, nextIdx);
                }
              }}
              title="Next Face"
            >
              <i className='bx bx-chevron-right text-lg'></i>
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-6 text-xs bg-transparent border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              if (buyMode === '1x') setBuyMode('10x');
              else if (buyMode === '10x') setBuyMode('Max');
              else setBuyMode('1x');
            }}
          >
            Buy: {buyMode} <span className="text-white/50 ml-1">[{keybindings.toggleBuyMode.toUpperCase()}]</span>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 flex flex-col gap-3">
        {isDebugMode && (
          <div className="flex gap-2">
            <Button 
              onClick={debugMaxAll}
              variant="outline"
              className="flex-1 flex-col h-auto whitespace-normal text-left items-start p-2 bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
            >
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                [DEBUG] Max All Faces
                <span className="text-[10px] text-white/50">[{keybindings.debugMaxAll.toUpperCase()}]</span>
              </div>
            </Button>
            <Button 
              onClick={debugMaxAutoTick}
              variant="outline"
              className="flex-1 flex-col h-auto whitespace-normal text-left items-start p-2 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20"
            >
              <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                [DEBUG] Max Auto-Ticks
                <span className="text-[10px] text-white/50">[{keybindings.debugMaxAutoTick.toUpperCase()}]</span>
              </div>
            </Button>
          </div>
        )}
        
        <Button 
          onClick={buyExpansion}
          disabled={!isDebugMode && (points < expansionCost || currentSize >= storeState.maxGridSize)}
          variant="outline"
          className="w-full flex-col h-auto whitespace-normal text-left items-start p-3 bg-white/5 border-transparent hover:bg-white/10 hover:border-ror-purple/50 transition-all rounded-sm disabled:opacity-50"
        >
          <div className="flex w-full items-center justify-between text-white font-bold">
            <span className="flex items-center gap-2">
              <i className='bx bx-expand text-ror-purple text-lg drop-shadow-ror-purple'></i> 
              Expand Board (+5)
            </span>
            <span className="text-[10px] text-white/50">[{keybindings.buyExpansion.toUpperCase()}]</span>
          </div>
          <div className="text-xs text-white/60 mt-1 font-normal">
            Max out at {storeState.maxGridSize}x{storeState.maxGridSize}
          </div>
          <div className="text-sm font-bold text-ror-purple mt-2 drop-shadow-ror-purple">
            {currentSize >= storeState.maxGridSize ? 'MAXED' : `${buyMode === '1x' ? '' : buyMode + ' '}Cost: ${expansionCost} pts`}
          </div>
        </Button>

        <Button 
          onClick={buyAutoTick}
          disabled={activeFace.autoTick >= 100 || (!isDebugMode && points < autoTickCost)}
          variant="outline"
          className="w-full flex-col h-auto whitespace-normal text-left items-start p-3 bg-white/5 border-transparent hover:bg-white/10 hover:border-ror-cyan/50 transition-all rounded-sm disabled:opacity-50"
        >
          <div className="flex w-full items-center justify-between text-white font-bold">
            <span className="flex items-center gap-2">
              <i className='bx bx-fast-forward-circle text-ror-cyan text-lg drop-shadow-ror-cyan'></i> 
              {activeFace.autoTick === 0 ? 'Buy Auto-Tick' : `Auto-Tick (Lv ${activeFace.autoTick})`}
            </span>
            <span className="text-[10px] text-white/50">[{keybindings.buyAutoTick.toUpperCase()}]</span>
          </div>
          <div className="text-xs text-white/60 mt-1 font-normal">
            {activeFace.autoTick >= 100 ? 'Max Level Reached' : `Interval: ${autoTickInterval.toFixed(0)}ms`}
          </div>
          <div className="text-sm font-bold text-ror-cyan mt-2 drop-shadow-ror-cyan">
            {activeFace.autoTick >= 100 ? 'MAXED' : `${buyMode === '1x' ? '' : buyMode + ' '}Cost: ${formatNumber(autoTickCost)} pts`}
          </div>
        </Button>
      </CardContent>
    </Card>
  );
};
