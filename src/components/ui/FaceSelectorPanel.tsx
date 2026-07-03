import React from 'react';
import { useGame } from '../../game/GameContext';
import { FACE_NAMES } from '../../game/constants';
import { X } from 'lucide-react';

export const FaceSelectorPanel: React.FC = () => {
  const { cameraMode, activeCubeIdx, cubes, focusFace, setCameraMode, activeFaceIdx, isFaceFocused } = useGame();

  if (cameraMode !== 'focus' || cubes.length === 0) return null;

  const cube = cubes[activeCubeIdx];
  if (!cube) return null;

  let unlockedCubeCount = 0;
  for (const c of cubes) { 
    let unlockedInCube = 0;
    for (const f of c.faces) { if (f.unlocked) unlockedInCube++; } 
    if (unlockedInCube > 0) unlockedCubeCount++;
  }

  return (
    <div 
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        minWidth: '240px',
      }}
    >
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '8px'
        }}
      >
        <h2 style={{ color: '#fff', margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Select Face</h2>
        {unlockedCubeCount > 1 && (
          <button 
            className="icon-btn" 
            onClick={() => setCameraMode('idle')}
            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {cube.faces.map((f, fIdx) => {
          if (!f.unlocked) return null;
          const isSelected = isFaceFocused && activeFaceIdx === fIdx;
          return (
            <button
              key={fIdx}
              className={`glass-btn px-4 py-2 text-sm whitespace-nowrap transition-colors ${isSelected ? 'active text-ror-cyan border-ror-cyan bg-ror-cyan/20 shadow-ror-cyan shadow-sm' : 'hover:bg-ror-cyan/20 hover:text-ror-cyan'}`}
              onClick={() => focusFace(activeCubeIdx, fIdx)}
            >
              {FACE_NAMES[fIdx]}
            </button>
          );
        })}
      </div>
    </div>
  );
};
