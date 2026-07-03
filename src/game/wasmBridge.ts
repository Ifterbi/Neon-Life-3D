export type FaceState = {
  unlocked: boolean;
  rows: number;
  cols: number;
  autoTick: number; // 0 = off, 1 = 1 tick/sec, etc.
};

export type CubeState = {
  faces: FaceState[]; // Always 6 faces. faces[0] is Front.
};

export type GameState = {
  cubes: CubeState[];
  points: number;
  maxGridSize: number;
  ascensionCount: number;
};

let wasmMemory: WebAssembly.Memory | null = null;
let cubesPtr: number = 0;
let pointsPtr: number = 0;
let maxGridPtr: number = 0;
let ascensionPtr: number = 0;

let worker: Worker | null = null;
let isInitialized = false;
let syncStructureCallback: (() => void) | null = null;

export const setSyncStructureCallback = (cb: () => void) => {
  syncStructureCallback = cb;
};

export const initWasm = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isInitialized) return resolve();
    
    const timeout = setTimeout(() => {
      reject(new Error('WASM initialization timed out after 10 seconds'));
    }, 10000);
    
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    
    worker.onmessage = (e) => {
      if (e.data.type === 'INIT_DONE') {
        clearTimeout(timeout);
        wasmMemory = e.data.payload.memory;
        cubesPtr = e.data.payload.cubesPtr;
        pointsPtr = e.data.payload.pointsPtr;
        maxGridPtr = e.data.payload.maxGridPtr;
        ascensionPtr = e.data.payload.ascensionPtr;
        isInitialized = true;
        resolve();
      } else if (e.data.type === 'SYNC_STRUCTURE') {
        if (syncStructureCallback) syncStructureCallback();
      }
    };
    
    worker.onerror = (err) => {
      clearTimeout(timeout);
      reject(new Error(`WASM worker error: ${err.message}`));
    };
    
    worker.postMessage({ type: 'INIT' });
  });
};

export const getGameState = (): GameState => {
  if (!wasmMemory || !isInitialized) return { cubes: [], points: 0, maxGridSize: 50, ascensionCount: 0 };
  
  const points = Number(new BigUint64Array(wasmMemory.buffer, pointsPtr, 1)[0]);
  
  const dv = new DataView(wasmMemory.buffer);
  
  const maxGridSize = dv.getInt32(maxGridPtr, true);
  const ascensionCount = dv.getInt32(ascensionPtr, true);

  const cubes: CubeState[] = [];
  const CUBE_SIZE = 303120;
  const FACE_SIZE = 50520;

  for (let c = 0; c < 15; c++) {
    const cubeOffset = cubesPtr + c * CUBE_SIZE;
    const faces: FaceState[] = [];
    for (let f = 0; f < 6; f++) {
      const faceOffset = cubeOffset + f * FACE_SIZE;
      const unlocked = dv.getInt32(faceOffset, true);
      const rows = dv.getInt32(faceOffset + 4, true);
      const cols = dv.getInt32(faceOffset + 8, true);
      const autoTick = dv.getInt32(faceOffset + 12, true);
      faces.push({
        unlocked: unlocked === 1,
        rows,
        cols,
        autoTick
      });
    }
    cubes.push({ faces });
  }
  
  return { cubes, points, maxGridSize, ascensionCount };
};

export const getPointsOnly = (): { points: number; maxGridSize: number; ascensionCount: number } => {
  if (!wasmMemory || !isInitialized) return { points: 0, maxGridSize: 50, ascensionCount: 0 };
  
  const points = Number(new BigUint64Array(wasmMemory.buffer, pointsPtr, 1)[0]);
  const dv = new DataView(wasmMemory.buffer);
  const maxGridSize = dv.getInt32(maxGridPtr, true);
  const ascensionCount = dv.getInt32(ascensionPtr, true);
  
  return { points, maxGridSize, ascensionCount };
};

// No longer direct WASM calls. We post messages to the WebWorker.

export const wasmTickFace = (cubeIdx: number, faceIdx: number) => {
  if (worker) worker.postMessage({ type: 'MANUAL_TICK', payload: { cubeIdx, faceIdx } });
};

export const wasmToggleCell = (cubeIdx: number, faceIdx: number, r: number, c: number) => {
  if (worker) worker.postMessage({ type: 'TOGGLE_CELL', payload: { cubeIdx, faceIdx, r, c } });
};

export const wasmBuyExpansion = (cubeIdx: number, faceIdx: number, amount: number) => {
  if (worker) worker.postMessage({ type: 'BUY_EXPANSION', payload: { cubeIdx, faceIdx, amount } });
};

export const wasmBuyAutoTick = (cubeIdx: number, faceIdx: number, amount: number) => {
  if (worker) worker.postMessage({ type: 'BUY_AUTOTICK', payload: { cubeIdx, faceIdx, amount } });
};

export const wasmBuyPrestige = () => {
  if (worker) worker.postMessage({ type: 'BUY_PRESTIGE', payload: {} });
};

export const wasmBuyAscend = () => {
  if (worker) worker.postMessage({ type: 'BUY_ASCEND', payload: {} });
};

export const wasmDebugMaxAscend = () => {
  if (worker) worker.postMessage({ type: 'DEBUG_MAX_ASCEND', payload: {} });
};

export const wasmSetDebugMode = (mode: boolean) => {
  if (worker) worker.postMessage({ type: 'SET_DEBUG_MODE', payload: { mode } });
};

export const wasmDebugMaxAll = () => {
  if (worker) worker.postMessage({ type: 'DEBUG_MAX_ALL', payload: {} });
};

export const wasmDebugMaxAutoTick = () => {
  if (worker) worker.postMessage({ type: 'DEBUG_MAX_AUTOTICK', payload: {} });
};

export const wasmGetPrestigeCost = (): number => {
  if (!wasmMemory || !isInitialized) return 50000;
  
  let count = 0;
  const dv = new DataView(wasmMemory.buffer);
  for (let c = 0; c < 15; c++) {
    for (let f = 0; f < 6; f++) {
      if (dv.getInt32(cubesPtr + c * 303120 + f * 50520, true) === 1) count++;
    }
  }
  
  let cost = 50000;
  for (let i = 1; i < count; i++) {
    cost = Math.floor((cost * 5) / 2);
  }
  return cost;
};

export const wasmResetGame = () => {
  if (worker) worker.postMessage({ type: 'RESET_GAME', payload: {} });
};

export const getWasmMemory = () => wasmMemory;
export const getCubesPtr = () => cubesPtr;
