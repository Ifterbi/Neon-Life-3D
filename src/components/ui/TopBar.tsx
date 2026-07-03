import React from 'react';
import { useGame } from '../../game/GameContext';
import { PointsDisplay } from './PointsDisplay';
import { FACE_NAMES } from '../../game/constants';
import { Card } from './card';
import { Button } from './button';

export const TopBar: React.FC = () => {
  const { cubes, activeCubeIdx, activeFaceIdx, setIsSettingsOpen, isDebugMode, toggleDebugMode, keybindings } = useGame();
  
  const clicksRef = React.useRef(0);
  const clickTimeout = React.useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (clickTimeout.current) clearTimeout(clickTimeout.current);
    };
  }, []);

  const onTitleClick = () => {
    clicksRef.current += 1;
    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    clickTimeout.current = setTimeout(() => { clicksRef.current = 0; }, 1000);
    
    if (clicksRef.current >= 5) {
      toggleDebugMode();
      clicksRef.current = 0;
    }
  };

  if (cubes.length === 0) return null;
  const activeCube = cubes[activeCubeIdx];
  if (!activeCube) return null;
  const activeFace = activeCube.faces[activeFaceIdx];
  if (!activeFace) return null;

  return (
    <div className="flex justify-between items-start w-full pointer-events-none">
      <Card className="pointer-events-auto opacity-70 hover:opacity-100 transition-opacity duration-300 bg-ror-panelBg backdrop-blur-md border-ror-panelBorder shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] p-4 rounded-sm border-l-4 border-l-ror-cyan">
        <h1 
          className="text-3xl font-black m-0 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] select-none cursor-pointer tracking-tighter" 
          onClick={onTitleClick}
        >
          NEON LIFE 3D {isDebugMode && <span className="text-ror-red text-sm align-middle ml-2 drop-shadow-ror-red font-bold">[DEBUG]</span>}
        </h1>
        <div className="text-white/70 font-medium text-sm mt-1 uppercase tracking-wider">
          Cube {activeCubeIdx + 1} <span className="text-white/30 mx-1">|</span> {FACE_NAMES[activeFaceIdx]} Face
          <br/>
          <span className="text-xs text-white/50">Size: {activeFace.rows}x{activeFace.cols}</span>
        </div>
      </Card>
      
      <Card className="pointer-events-auto opacity-70 hover:opacity-100 transition-opacity duration-300 flex items-center bg-ror-panelBg backdrop-blur-md border-ror-panelBorder shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] p-2 pl-6 rounded-sm border-r-4 border-r-ror-purple">
        <PointsDisplay />
        <Button 
          variant="ghost"
          size="icon"
          onClick={() => setIsSettingsOpen(true)}
          title="Settings (Keybindings)"
          className="h-10 w-10 relative text-white hover:bg-white/10 hover:text-white rounded-sm ml-2 group border border-white/5"
        >
          <i className='bx bx-cog text-2xl group-hover:rotate-90 transition-transform duration-500'></i>
          <span className="absolute -bottom-2 -right-1 text-[8px] text-white/40 bg-black/80 px-1 rounded shadow-md border border-white/10 pointer-events-none">
            [{keybindings.openSettings.toUpperCase()}]
          </span>
        </Button>
      </Card>
    </div>
  );
};
