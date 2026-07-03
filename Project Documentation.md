# Neon Life 3D - Project Documentation

This document serves as a comprehensive guide to understanding the architecture, files, and core methods of the "Neon Life 3D" (Web GoL) codebase.

---

## 1. Overall Project Architecture & Docstring

> **Project Docstring**
> Neon Life 3D is a browser-based incremental idle game blending Conway's Game of Life with prestige mechanics. It features a high-performance simulation engine written in C (compiled to WebAssembly) to handle the complex, rapid matrix math of the Game of Life rules across multiple dynamic grids. The frontend is built with React and Three.js (`@react-three/fiber`) to render the 2D simulations onto the 3D faces of multiple floating cubes, wrapped in a sleek, responsive glassmorphism UI.

### Overall Pseudocode Architecture
```text
INITIALIZE Application:
  Load WASM C Engine (engine.c -> engine.wasm)
  Mount React App (main.tsx -> App.tsx)
  
SETUP Game State (GameContext):
  Bind WASM exported functions to JS wrappers
  Initialize React State (Cubes, UI visibility, Camera Mode)
  Initialize Fast State Store (Points) to prevent global re-renders
  
START Main Loop (useGameLoop):
  On every Animation Frame (60 FPS):
    For each Cube in memory:
      For each Face on the Cube:
        If Face is unlocked AND autoTick interval elapsed:
          WASM: Calculate Next Game of Life Generation
          WASM: Accumulate Points based on living cells
    JS: Sync Points from WASM to Fast State Store
    
RENDER 3D Scene (Board.tsx):
  Map 2D matrix arrays from WASM memory into 3D InstancedMeshes
  Position and rotate Meshes to form Cubes
  Handle Camera logic: smoothly interpolate quaternions to focus on the active cube/face
  
RENDER UI Overlay (React Components):
  Listen to Fast State Store to display points
  Listen to GameContext for UI events (Upgrades, Settings, Keyboard bindings)
  Send user inputs (Buy Upgrade, Prestige, Toggle Cell) directly back to WASM engine
```

---

## 2. File-by-File Documentation

### WebAssembly Engine

#### `src/wasm/engine.c`
> **Docstring**: The core authoritative simulation engine. Manages memory for all cubes and grids, enforces game rules, calculates points, and handles upgrade/prestige validation. Compiled to WASM for maximum performance. Variables and points use `unsigned long long` to prevent precision loss.

**Specific Methods & Pseudocode**:
- `Cube* get_cubes_ptr()`, `unsigned long long* get_points_ptr()`: Memory pointers exposed for the Javascript bridge to read the raw `cubes` struct and `points` value directly.
- `void reset_face(int cubeIdx, int faceIdx)`: Helper function to reset a specific face to a 10x10 grid, disable autoTick, and randomize its cells.
- `void init_game()`: Initializes the first cube and unlocks its front face. Sets points to 0 and uses `reset_face` for initialization.
- `int get_aggregated_halo_value(int cubeIdx, int faceIdx, int haloR, int haloC)`: Calculates neighbor counts across cube edges, wrapping coordinates accurately to adjacent faces. Uses scaled integer math to resolve edge alignments smoothly without floats.
- `void sync_halos()`: Synchronizes the internal `halo` buffer (an outer padding around the face) for all active faces. This ensures Game of Life logic properly wraps across the 3D cube edges seamlessly.
- `int count_neighbors_native(Face* face, int r, int c)`: Reads from the synchronized `halo` buffer to count the 8-directional alive neighbors for a specific cell.
- `void tick_face(int cubeIdx, int faceIdx)`:
  ```text
  Create an empty buffer grid
  For each cell in the face (rows x cols):
    Count living neighbors (using count_neighbors_native)
    Apply Game of Life rules (Survive if 2 or 3 neighbors, Birth if exactly 3)
    Write result to buffer grid
    If cell is born:
      Pick random color channel (R, G, or B) and increment by 25
    If cell dies:
      Payout points = Integer Division (R + G + B) / 100 (minimum 1 point)
  Copy buffer grid back to main face memory
  ```
- `void toggle_cell(int cubeIdx, int faceIdx, int r, int c)`: Inverts the alive bit of a specific cell (used for manual player clicks).
- `void set_debug_mode(int mode)`, `void debug_max_all()`, `void debug_max_auto_tick()`: Debug helper functions to bypass costs and instantly max out upgrades or unlock debug features.
- `void buy_expansion(int cubeIdx, int faceIdx, int amount)`:
  ```text
  Calculate cost (current_size * 50)
  If points >= cost AND size < 50:
    Deduct points
    Increase rows and cols by 5
  ```
- `void buy_autotick(int cubeIdx, int faceIdx, int amount)`:
  ```text
  Calculate cost (if level 0: 200, else level * 500)
  If points >= cost AND level < 100:
    Deduct points
    Increase autoTick level by 1
  ```
- `int get_unlocked_faces_count()`: Iterates through all cubes and returns the total number of currently unlocked faces.
- `unsigned long long get_prestige_cost()`:
  ```text
  Base cost is 50,000.
  Multiply by 2.5 for every additional unlocked face.
  ```
- `void buy_prestige()`:
  ```text
  Validate that all unlocked faces on all current cubes are maxed out (50x50)
  If valid:
    Reset global points to 0
    Unlock the next available face on the cube (or next cube if full)
    Reset all existing unlocked faces on all cubes back to 10x10 using reset_face
  ```

---

### Javascript Data Bridge & State Management

#### `src/game/wasmBridge.ts`
> **Docstring**: The Javascript interfacing layer. Fetches the compiled `.wasm` file, instantiates memory blocks, and provides strongly-typed TypeScript wrappers around the underlying C functions.

**Specific Methods & Pseudocode**:
- `initWasm()`:
  ```text
  Fetch 'engine.wasm' (using cache-buster query parameter to bypass browser caching)
  Instantiate WebAssembly module
  Store exported C functions into a global `wasmExports` object
  ```
- `getGameState()`:
  ```text
  Allocate memory pointers to read the C memory space
  Parse C memory into JS Objects (Cubes array containing Faces, rows, cols, unlocked state)
  Return the structured Cube data to React
  ```
- `wasmBuyPrestige()`:
  ```text
  Call wasmExports.buy_prestige()
  Forcefully overwrite the `points` pointer in WASM memory (using BigUint64Array) to 0n to guarantee a complete wipe
  ```

#### `src/game/constants.ts`
> **Docstring**: Contains shared application constants such as `FACE_NAMES` array to reduce duplication across components.

#### `src/game/GameContext.tsx`
> **Docstring**: The primary React Context Provider. It acts as the "Controller" connecting the UI components to the WASM bridge, managing the slow-changing structural state of the game (e.g., active camera modes, opened menus, unlocked faces) and registering keybindings.

**Specific Methods & Pseudocode**:
- `syncStructure()`:
  ```text
  Call wasmBridge.getGameState()
  Update the React `cubes` state variable (triggering a re-render of the Board and UI)
  ```
- `buyAutoTick()`, `buyExpansion()`, `debugMaxAll()`:
  ```text
  Call corresponding wasmBridge function to perform the logic in C
  Call syncStructure() to force the JS UI to recognize the structural change
  ```

#### `src/game/store.ts`
> **Docstring**: A high-performance, subscription-based external state store created specifically to manage the player's `points`.

**Specific Methods & Pseudocode**:
- `updatePoints(p)`: Updates the internal variable without triggering a React render cycle.
- `subscribeToPoints(listener)`: Allows specific tiny UI components to attach a listener and only re-render themselves when points change (preventing the entire 3D scene from lagging when points tick).

---

### React Hooks

#### `src/hooks/useGameLoop.ts`
> **Docstring**: A React Hook that maintains the primary browser `requestAnimationFrame` loop, driving the idle automation mechanics.

**Specific Methods & Pseudocode**:
- `useEffect` Loop:
  ```text
  On every frame:
    Calculate delta time since last frame
    For every unlocked face on every cube:
      If face has autoTick > 0:
        Calculate tick interval based on autoTick level
        If accumulated time > tick interval:
           Call wasmTickFace()
    Sync points from WASM to the fast state store
    Request next animation frame
  ```

#### `src/hooks/useKeybindings.ts`
> **Docstring**: Manages global event listeners for keyboard shortcuts, allowing players to map and save custom keystrokes for various actions.

**Specific Methods & Pseudocode**:
- `useKeybindings(actions...)`:
  ```text
  Load saved bindings from LocalStorage (or use defaults)
  Attach 'keydown' event listener to `window`
  When key is pressed:
    If key matches the binding for "buyExpansion", trigger expansion action
    If key matches the binding for "manualTick", trigger tick action
    (etc...)
  Return current bindings and updater function
  ```

---

### 3D Rendering Engine

#### `src/components/3d/Board.tsx`
> **Docstring**: The Three.js visualizer. Responsible for taking the logical game grid and projecting it into an interactable 3D space. Handles grouping, materials, instanced rendering, and dynamic camera swooping.

**Specific Methods & Pseudocode**:
- `SceneController`:
  ```text
  On frame update (useFrame):
    Calculate target global camera position based on activeCubeIdx (to center the active cube)
    Calculate target local rotation for the active cube based on cameraMode (Front, Top, Left, etc.)
    Smoothly interpolate (Slerp / Lerp) current positions and rotations towards the targets
  ```

#### `src/components/3d/FaceRenderer.tsx`
> **Docstring**: The visual rendering core. Utilizes custom vertex and fragment shaders mapped onto InstancedMesh objects to render hundreds of thousands of Game of Life cells highly efficiently without crashing the browser.

**Specific Methods & Pseudocode**:
- `FaceRenderer`:
  ```text
  Create an InstancedMesh to efficiently render tiny box geometries in a single draw call
  For each Face:
    For each Row and Col:
      Calculate 3D coordinate based on matrix position and face orientation
      If cell is alive (read from WASM memory pointer):
        Map its RGB stored value (0-255) linearly onto a 0.0-1.0 scale
        Set the instance color
      If cell is dead:
        Set instance color to black (0, 0, 0)
  ```

#### `src/components/3d/shaders.ts`
> **Docstring**: Holds the GLSL code that injects directly into the Three.js compilation pipeline. This creates custom visual rules per instance.

**Specific Methods & Pseudocode**:
- `Fragment Shader Injection`:
  ```text
  Discard pixel rendering if cell is dead (fully transparent to expose cube core)
  Calculate UV coordinates to determine if pixel is an edge (border)
  If pixel is on the edge:
    Render a thick (8%) light grey border (rgb: 0.6) for alive cells (overriding instance color)
    Render a dark grey gridline (rgb: 0.2) for dead cells
  ```

---

### User Interface Components

#### `src/components/ui/UI.tsx`
> **Docstring**: The primary UI wrapper overlay. Contains the absolute positioning grid that lays out all floating panels over the 3D canvas.

#### `src/components/ui/TopBar.tsx`
> **Docstring**: Top navigation header displaying the title, debug toggle, and settings button.

#### `src/components/ui/PointsDisplay.tsx`
> **Docstring**: Specifically isolated UI component that subscribes to the Fast State Store (`usePointsStore`) to render points at 60FPS without lagging the rest of the React tree.

#### `src/components/ui/ControlsPanel.tsx`
> **Docstring**: Render manual trigger controls. Allows the user to manual tick (simulate step) or manual toggle cells on the grid using their cursor.

#### `src/components/ui/UpgradesPanel.tsx`
> **Docstring**: A React component rendering the upgrade options for the currently focused face. Validates button states based on available points and debug mode.

**Specific Methods & Pseudocode**:
- `UpgradesPanel()`:
  ```text
  Subscribe to the Fast Points Store
  Calculate `expansionCost` and `autoTickCost` dynamically
  Render "Expand Board" button (Disabled if points < cost)
  Render "Upgrade Auto-Tick" button (Disabled if points < cost OR level >= 100)
  If debugMode is true, render override buttons (Max All, Max Auto-Ticks)
  ```

#### `src/components/ui/CameraPanel.tsx`
> **Docstring**: The navigation UI. Renders a draggable, hierarchical list of all unlocked cubes and their respective unlocked faces, allowing the player to freely focus the camera anywhere.

**Specific Methods & Pseudocode**:
- `CameraPanel()`:
  ```text
  Map through all `cubes`
    Map through all `faces` in cube
      Render button "Focus [Face Name]"
      OnClick: 
        Set GameContext activeCubeIdx and activeFaceIdx
        Set GameContext cameraMode (which triggers SceneController 3D rotation)
  ```

#### `src/components/ui/PrestigeButton.tsx`
> **Docstring**: The prestige trigger UI. Calculates whether the player meets the requirements to prestige and handles the global reset mechanic.

**Specific Methods & Pseudocode**:
- `PrestigeButton()`:
  ```text
  Loop through all cubes and all faces:
    If any unlocked face has size < 50x50, prestige is INVALID
  Render Button (Disabled if INVALID)
  OnClick:
    Trigger WASM prestige function
    Update UI structure
  ```

#### `src/components/SettingsModal.tsx`
> **Docstring**: A modal overlay for managing game configurations, such as custom keyboard bindings via the `useKeybindings` hook, saving them to LocalStorage.

---

### Root Configuration

#### `src/main.tsx` & `src/App.tsx`
> **Docstring**: Standard React entry points. `main.tsx` mounts the DOM. `App.tsx` initializes the WASM engine asynchronously and wraps the 3D Canvas and UI within the `GameProvider`.

#### `src/index.css`
> **Docstring**: Global stylesheet configurations establishing glassmorphism visual rules, animations, CSS variables, and layout resets.
