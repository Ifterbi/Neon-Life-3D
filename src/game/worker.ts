let wasmExports: any = null;
let memory: WebAssembly.Memory | null = null;
let cubesPtr = 0;

const lastTickMap = new Map<string, number>();

const runLoop = () => {
  if (!wasmExports || !memory) return;
  const time = performance.now();
  let didTick = false;
  const dv = new DataView(memory.buffer);
  
  for (let c = 0; c < 15; c++) {
    const cubeOffset = cubesPtr + c * 303120;
    for (let f = 0; f < 6; f++) {
      const faceOffset = cubeOffset + f * 50520;
      const unlocked = dv.getInt32(faceOffset, true);
      const autoTick = dv.getInt32(faceOffset + 12, true);
      
      if (unlocked !== 1 || autoTick === 0) continue;
      
      const tickInterval = 1000 / autoTick;
      const key = `${c}-${f}`;
      const lastTick = lastTickMap.get(key) || 0;
      
      if (time - lastTick >= tickInterval) {
        wasmExports.tick_face(c, f);
        lastTickMap.set(key, time);
        didTick = true;
      }
    }
  }
  
  if (didTick) {
    wasmExports.sync_halos();
  }
};

self.onmessage = async (e) => {
  const { type, payload } = e.data;
  
  if (type === 'INIT') {
    memory = new WebAssembly.Memory({ initial: 256, maximum: 256, shared: true });
    const env = { 
      env: { 
        memory, 
        random_float: () => Math.random() 
      } 
    };
    
    try {
      const response = await fetch('/engine.wasm?v=' + Date.now());
      const buffer = await response.arrayBuffer();
      const module = await WebAssembly.instantiate(buffer, env);
      wasmExports = module.instance.exports;
      
      wasmExports.init_game();
      cubesPtr = wasmExports.get_cubes_ptr();
      
      // Start background simulation loop at 60 FPS
      setInterval(runLoop, 16);
      
      self.postMessage({
        type: 'INIT_DONE',
        payload: {
          memory,
          cubesPtr,
          pointsPtr: wasmExports.get_points_ptr(),
          maxGridPtr: wasmExports.get_max_grid_ptr(),
          ascensionPtr: wasmExports.get_ascension_count_ptr()
        }
      });
    } catch (err) {
      console.error("Worker failed to init WASM:", err);
    }
  }
  else if (type === 'TOGGLE_CELL') {
    if (wasmExports) wasmExports.toggle_cell(payload.cubeIdx, payload.faceIdx, payload.r, payload.c);
  }
  else if (type === 'MANUAL_TICK') {
    if (wasmExports) {
      wasmExports.tick_face(payload.cubeIdx, payload.faceIdx);
      wasmExports.sync_halos();
    }
  }
  else if (type === 'BUY_EXPANSION') {
    if (wasmExports) {
      wasmExports.buy_expansion(payload.cubeIdx, payload.faceIdx, payload.amount);
      self.postMessage({ type: 'SYNC_STRUCTURE' });
    }
  }
  else if (type === 'BUY_AUTOTICK') {
    if (wasmExports) {
      wasmExports.buy_autotick(payload.cubeIdx, payload.faceIdx, payload.amount);
      self.postMessage({ type: 'SYNC_STRUCTURE' });
    }
  }
  else if (type === 'BUY_PRESTIGE') {
    if (wasmExports) {
      wasmExports.buy_prestige();
      self.postMessage({ type: 'SYNC_STRUCTURE' });
    }
  }
  else if (type === 'BUY_ASCEND') {
    if (wasmExports) {
      wasmExports.buy_ascend();
      self.postMessage({ type: 'SYNC_STRUCTURE' });
    }
  }
  else if (type === 'DEBUG_MAX_ASCEND') {
    if (wasmExports) {
      wasmExports.debug_max_ascend();
      self.postMessage({ type: 'SYNC_STRUCTURE' });
    }
  }
  else if (type === 'SET_DEBUG_MODE') {
    if (wasmExports) wasmExports.set_debug_mode(payload.mode ? 1 : 0);
  }
  else if (type === 'DEBUG_MAX_ALL') {
    if (wasmExports) {
      wasmExports.debug_max_all();
      self.postMessage({ type: 'SYNC_STRUCTURE' });
    }
  }
  else if (type === 'DEBUG_MAX_AUTOTICK') {
    if (wasmExports) {
      wasmExports.debug_max_auto_tick();
      self.postMessage({ type: 'SYNC_STRUCTURE' });
    }
  }
  else if (type === 'RESET_GAME') {
    if (wasmExports) {
      wasmExports.init_game();
      self.postMessage({ type: 'SYNC_STRUCTURE' });
    }
  }
};
