import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { CubeState } from './wasmBridge';
import { 
  initWasm, getGameState, 
  wasmTickFace, wasmToggleCell, 
  wasmBuyExpansion, wasmBuyAutoTick,
  wasmBuyPrestige, wasmBuyAscend, wasmResetGame, wasmSetDebugMode, wasmDebugMaxAll, wasmDebugMaxAutoTick, wasmDebugMaxAscend, setSyncStructureCallback
} from './wasmBridge';
import { useGameLoop } from '../hooks/useGameLoop';
import { useKeybindings } from '../hooks/useKeybindings';
import type { Keybindings } from '../hooks/useKeybindings';
import { syncPointsFromWasm } from './store';
import { snapToFace } from './cameraModule';

export type BuyMode = '1x' | '10x' | 'Max';

type GameContextType = {
  cubes: CubeState[];
  activeCubeIdx: number;
  activeFaceIdx: number;
  isWasmReady: boolean;
  buyMode: BuyMode;
  setBuyMode: (mode: BuyMode) => void;
  keybindings: Keybindings;
  updateKeybinding: (action: keyof Keybindings, key: string) => void;
  resetKeybindings: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveFace: (cubeIdx: number, faceIdx: number) => void;
  manualTick: () => void;
  buyExpansion: () => void;
  buyAutoTick: () => void;
  buyPrestige: () => void;
  buyAscend: () => void;
  toggleCell: (cubeIdx: number, faceIdx: number, r: number, c: number) => void;
  resetGame: () => void;
  cameraMode: 'idle' | 'focus';
  setCameraMode: (mode: 'idle' | 'focus') => void;
  isFaceFocused: boolean;
  setIsFaceFocused: (focused: boolean) => void;
  focusFace: (cubeIdx: number, faceIdx: number, doSnap?: boolean) => void;
  focusCube: (cubeIdx: number) => void;
  isDebugMode: boolean;
  toggleDebugMode: () => void;
  debugMaxAll: () => void;
  debugMaxAutoTick: () => void;
  debugMaxAscend: () => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cubes, setCubes] = useState<CubeState[]>([]);
  const [activeCubeIdx, setActiveCubeIdx] = useState(0);
  const [activeFaceIdx, setActiveFaceIdx] = useState(0);
  const [isWasmReady, setIsWasmReady] = useState(false);

  const [buyMode, setBuyMode] = useState<BuyMode>('1x');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'idle' | 'focus'>('idle');
  const [isFaceFocused, setIsFaceFocused] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);

  const focusFace = useCallback((cubeIdx: number, faceIdx: number, doSnap: boolean = true) => {
    if (doSnap) snapToFace(faceIdx);
    setActiveCubeIdx(cubeIdx);
    setActiveFaceIdx(faceIdx);
    setCameraMode('focus');
    setIsFaceFocused(true);
  }, []);

  const focusCube = useCallback((cubeIdx: number) => {
    setActiveCubeIdx(cubeIdx);
    setCameraMode('focus');
    setIsFaceFocused(false);
  }, []);

  const toggleDebugMode = useCallback(() => {
    setIsDebugMode(prev => {
      const next = !prev;
      wasmSetDebugMode(next);
      return next;
    });
  }, []);

  // Sync only structural changes (bought upgrades)
  const syncStructure = useCallback(() => {
    const state = getGameState();
    if (state.cubes.length > 0) {
      setCubes(state.cubes);
    }
    syncPointsFromWasm();
  }, []);

  useEffect(() => {
    initWasm().then(() => {
      setIsWasmReady(true);
      syncStructure();
      setSyncStructureCallback(() => {
        syncStructure();
      });
    });
  }, [syncStructure]);

  useGameLoop(isWasmReady);

  const manualTick = useCallback(() => {
    if (!isWasmReady) return;
    wasmTickFace(activeCubeIdx, activeFaceIdx);
    syncPointsFromWasm();
  }, [isWasmReady, activeCubeIdx, activeFaceIdx]);

  const setActiveFace = useCallback((cubeIdx: number, faceIdx: number) => {
    setActiveCubeIdx(cubeIdx);
    setActiveFaceIdx(faceIdx);
  }, []);

  const getBuyAmount = useCallback(() => {
    if (buyMode === '1x') return 1;
    if (buyMode === '10x') return 10;
    return -1; // Max
  }, [buyMode]);

  const buyExpansion = useCallback(() => {
    if (!isWasmReady) return;
    wasmBuyExpansion(activeCubeIdx, activeFaceIdx, getBuyAmount());
  }, [isWasmReady, activeCubeIdx, activeFaceIdx, getBuyAmount]);

  const buyAutoTick = useCallback(() => {
    if (!isWasmReady) return;
    wasmBuyAutoTick(activeCubeIdx, activeFaceIdx, getBuyAmount());
  }, [isWasmReady, activeCubeIdx, activeFaceIdx, getBuyAmount]);

  const buyPrestige = useCallback(() => {
    if (!isWasmReady) return;
    wasmBuyPrestige();
  }, [isWasmReady]);

  const buyAscend = useCallback(() => {
    if (!isWasmReady) return;
    wasmBuyAscend();
  }, [isWasmReady]);

  const debugMaxAll = useCallback(() => {
    if (!isWasmReady) return;
    wasmDebugMaxAll();
  }, [isWasmReady]);

  const debugMaxAutoTick = useCallback(() => {
    if (!isWasmReady) return;
    wasmDebugMaxAutoTick();
  }, [isWasmReady]);

  const debugMaxAscend = useCallback(() => {
    if (!isWasmReady) return;
    wasmDebugMaxAscend();
  }, [isWasmReady]);

  const toggleBuyMode = useCallback(() => {
    setBuyMode(m => m === '1x' ? '10x' : m === '10x' ? 'Max' : '1x');
  }, []);

  const { keybindings, updateKeybinding, resetKeybindings } = useKeybindings(
    manualTick,
    buyExpansion,
    buyAutoTick,
    toggleBuyMode,
    () => setIsSettingsOpen(p => !p),
    buyPrestige,
    buyAscend,
    debugMaxAll,
    debugMaxAutoTick,
    debugMaxAscend
  );

  const toggleCell = useCallback((cubeIdx: number, faceIdx: number, r: number, c: number) => {
    if (!isWasmReady) return;
    wasmToggleCell(cubeIdx, faceIdx, r, c);
  }, [isWasmReady]);

  const resetGame = useCallback(() => {
    wasmResetGame();
    syncStructure();
  }, [syncStructure]);

  const contextValue = useMemo(() => ({
    cubes, activeCubeIdx, activeFaceIdx, isWasmReady, buyMode, setBuyMode,
    keybindings, updateKeybinding, resetKeybindings, isSettingsOpen, setIsSettingsOpen,
    setActiveFace, manualTick, buyExpansion, buyAutoTick, buyPrestige, buyAscend, toggleCell,
    resetGame,
    cameraMode,
    setCameraMode,
    isFaceFocused,
    setIsFaceFocused,
    focusFace,
    focusCube,
    isDebugMode,
    toggleDebugMode,
    debugMaxAll,
    debugMaxAutoTick,
    debugMaxAscend
  }), [
    cubes, activeCubeIdx, activeFaceIdx, isWasmReady, buyMode, setBuyMode,
    keybindings, updateKeybinding, resetKeybindings, isSettingsOpen, setIsSettingsOpen,
    setActiveFace, manualTick, buyExpansion, buyAutoTick, buyPrestige, buyAscend, toggleCell,
    resetGame,
    cameraMode,
    setCameraMode,
    isFaceFocused,
    setIsFaceFocused,
    focusFace,
    focusCube,
    isDebugMode,
    toggleDebugMode,
    debugMaxAll,
    debugMaxAutoTick,
    debugMaxAscend
  ]);

  if (!isWasmReady) {
    return <div style={{ color: 'white', padding: '2rem' }}>Initializing C Engine (WASM)...</div>;
  }

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};
