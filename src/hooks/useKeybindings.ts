import { useState, useEffect, useCallback } from 'react';

export type Keybindings = {
  manualTick: string;
  buyExpansion: string;
  buyAutoTick: string;
  toggleBuyMode: string;
  openSettings: string;
  buyPrestige: string;
  buyAscend: string;
  debugMaxAll: string;
  debugMaxAutoTick: string;
  debugMaxAscend: string;
};

export const defaultKeybindings: Keybindings = {
  manualTick: ' ',
  buyExpansion: 'e',
  buyAutoTick: 'a',
  toggleBuyMode: 'm',
  openSettings: 'Escape',
  buyPrestige: 'p',
  buyAscend: 'o',
  debugMaxAll: 'x',
  debugMaxAutoTick: 'c',
  debugMaxAscend: 'v',
};

export const useKeybindings = (
  manualTick: () => void,
  buyExpansion: () => void,
  buyAutoTick: () => void,
  toggleBuyMode: () => void,
  toggleSettings: () => void,
  buyPrestige: () => void,
  buyAscend: () => void,
  debugMaxAll: () => void,
  debugMaxAutoTick: () => void,
  debugMaxAscend: () => void
) => {
  const [keybindings, setKeybindings] = useState<Keybindings>(() => {
    const saved = localStorage.getItem('neonLifeKeybindings');
    if (saved) {
      try { return { ...defaultKeybindings, ...JSON.parse(saved) }; } 
      catch (e) {}
    }
    return defaultKeybindings;
  });

  const updateKeybinding = useCallback((action: keyof Keybindings, key: string) => {
    setKeybindings(prev => {
      const newBindings = { ...prev, [action]: key };
      localStorage.setItem('neonLifeKeybindings', JSON.stringify(newBindings));
      return newBindings;
    });
  }, []);

  const resetKeybindings = useCallback(() => {
    setKeybindings(defaultKeybindings);
    localStorage.removeItem('neonLifeKeybindings');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();

      if (key === keybindings.manualTick.toLowerCase() || (keybindings.manualTick === 'Space' && key === ' ')) {
        e.preventDefault();
        manualTick();
      } else if (key === keybindings.buyExpansion.toLowerCase()) {
        e.preventDefault();
        buyExpansion();
      } else if (key === keybindings.buyAutoTick.toLowerCase()) {
        e.preventDefault();
        buyAutoTick();
      } else if (key === keybindings.toggleBuyMode.toLowerCase()) {
        e.preventDefault();
        toggleBuyMode();
      } else if (key === keybindings.openSettings.toLowerCase()) {
        e.preventDefault();
        toggleSettings();
      } else if (key === keybindings.buyPrestige.toLowerCase()) {
        e.preventDefault();
        buyPrestige();
      } else if (key === keybindings.buyAscend.toLowerCase()) {
        e.preventDefault();
        buyAscend();
      } else if (key === keybindings.debugMaxAll.toLowerCase()) {
        e.preventDefault();
        debugMaxAll();
      } else if (key === keybindings.debugMaxAutoTick.toLowerCase()) {
        e.preventDefault();
        debugMaxAutoTick();
      } else if (key === keybindings.debugMaxAscend.toLowerCase()) {
        e.preventDefault();
        debugMaxAscend();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keybindings, manualTick, buyExpansion, buyAutoTick, toggleBuyMode, toggleSettings, buyPrestige, buyAscend, debugMaxAll, debugMaxAutoTick, debugMaxAscend]);

  return { keybindings, updateKeybinding, resetKeybindings };
};
