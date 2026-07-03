import { getPointsOnly, wasmGetPrestigeCost } from './wasmBridge';

let points = 0;
let prestigeCost = 50000;
let maxGridSize = 50;
let ascensionCount = 0;
let listeners: Array<() => void> = [];

export const syncPointsFromWasm = () => {
  const state = getPointsOnly();
  let changed = false;
  if (state.points !== points) { points = state.points; changed = true; }
  if (state.maxGridSize !== maxGridSize) { maxGridSize = state.maxGridSize; changed = true; }
  if (state.ascensionCount !== ascensionCount) { ascensionCount = state.ascensionCount; changed = true; }
  const newPrestigeCost = wasmGetPrestigeCost();
  if (newPrestigeCost !== prestigeCost) { prestigeCost = newPrestigeCost; changed = true; }
  
  if (changed) {
    listeners.forEach(l => l());
  }
};

export const subscribeToPoints = (listener: () => void) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

export const getPointsSnapshot = () => ({ points, prestigeCost, maxGridSize, ascensionCount });
