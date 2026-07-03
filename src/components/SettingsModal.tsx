import React, { useState, useEffect } from 'react';
import { useGame } from '../game/GameContext';
import type { Keybindings } from '../hooks/useKeybindings';
import { X, RotateCcw } from 'lucide-react';

const ACTION_LABELS: Record<keyof Keybindings, string> = {
  manualTick: 'Manual Tick',
  buyExpansion: 'Expand Board',
  buyAutoTick: 'Upgrade Auto-Tick',
  toggleBuyMode: 'Toggle Buy Mode (1x/10x/Max)',
  openSettings: 'Open/Close Settings',
  buyPrestige: 'Global Prestige',
  buyAscend: 'Global Ascend',
  debugMaxAll: '[DEBUG] Max All Faces',
  debugMaxAutoTick: '[DEBUG] Max All Auto-Ticks',
  debugMaxAscend: '[DEBUG] Max Ascension (Grid 100x100)',
};

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen, keybindings, updateKeybinding, resetKeybindings } = useGame();
  const [listeningFor, setListeningFor] = useState<keyof Keybindings | null>(null);

  useEffect(() => {
    if (!listeningFor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      let key = e.key;
      if (key === ' ') key = 'Space';
      else if (key.length === 1) key = key.toLowerCase();

      updateKeybinding(listeningFor as keyof Keybindings, key);
      setListeningFor(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [listeningFor, updateKeybinding]);

  if (!isSettingsOpen) return null;

  return (
    <div className="settings-overlay" onClick={() => setIsSettingsOpen(false)}>
      <div className="settings-modal glass-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Keybindings</h2>
          <button className="icon-btn" onClick={() => setIsSettingsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="settings-content">
          <p className="settings-instruction">
            Click a key to rebind it. Press any key to assign.
          </p>

          <div className="keybindings-list">
            {(Object.keys(keybindings) as Array<keyof Keybindings>).map((action) => (
              <div key={action as string} className="keybinding-row">
                <span className="keybinding-label">{ACTION_LABELS[action]}</span>
                <button 
                  className={`keybinding-btn ${listeningFor === action ? 'listening' : ''}`}
                  onClick={() => setListeningFor(action)}
                >
                  {listeningFor === action ? 'Press any key...' : (keybindings[action as keyof Keybindings] === ' ' ? 'Space' : keybindings[action as keyof Keybindings])}
                </button>
              </div>
            ))}
          </div>

          <div className="settings-footer">
            <button className="reset-btn glass-btn glass-btn-red" onClick={resetKeybindings}>
              <RotateCcw size={16} style={{ marginRight: '8px' }} /> Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .settings-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .settings-modal {
          width: 400px;
          max-width: 90vw;
          padding: 24px;
        }
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .settings-header h2 {
          margin: 0;
          color: #fff;
        }
        .icon-btn {
          background: none; border: none; color: #fff; cursor: pointer;
        }
        .settings-instruction {
          color: #a1a1aa;
          font-size: 14px;
          margin-bottom: 20px;
        }
        .keybindings-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .keybinding-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          padding: 8px 16px;
          border-radius: 8px;
        }
        .keybinding-label {
          color: #e4e4e7;
          font-size: 14px;
        }
        .keybinding-btn {
          background: rgba(34, 211, 238, 0.1);
          border: 1px solid rgba(34, 211, 238, 0.3);
          color: #22d3ee;
          padding: 6px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-family: monospace;
          font-size: 14px;
          min-width: 80px;
          transition: all 0.2s;
        }
        .keybinding-btn:hover {
          background: rgba(34, 211, 238, 0.2);
        }
        .keybinding-btn.listening {
          background: rgba(234, 179, 8, 0.2);
          border-color: rgba(234, 179, 8, 0.5);
          color: #facc15;
          animation: pulse 1s infinite;
        }
        .settings-footer {
          margin-top: 24px;
          display: flex;
          justify-content: flex-end;
        }
        .reset-btn {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          font-size: 14px;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
