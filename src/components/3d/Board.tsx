import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Edges } from '@react-three/drei';
import { useGame } from '../../game/GameContext';
import { GlobalInstancedMesh } from './GlobalInstancedMesh';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { targetQuat, dragCamera } from '../../game/cameraModule';

import * as THREE from 'three';

const FACE_TRANSFORMS = [
  { pos: [0, 0, 25], rot: [0, 0, 0] },
  { pos: [25, 0, 0], rot: [0, Math.PI / 2, 0] },
  { pos: [0, 0, -25], rot: [0, Math.PI, 0] },
  { pos: [-25, 0, 0], rot: [0, -Math.PI / 2, 0] },
  { pos: [0, 25, 0], rot: [-Math.PI / 2, 0, 0] },
  { pos: [0, -25, 0], rot: [Math.PI / 2, 0, 0] }
] as const;

const HoverOutline = () => {
  const lineRef = React.useRef<THREE.LineSegments>(null);
  
  useFrame((state) => {
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      if (mat) {
        mat.transparent = true;
        mat.depthWrite = false;
        mat.opacity = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 8);
      }
    }
  });

  return <Edges ref={lineRef} color="white" />;
};

const CubeOutline = () => {
  const lineRef = React.useRef<THREE.LineSegments>(null);
  
  useFrame((state) => {
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      if (mat) {
        mat.transparent = true;
        mat.depthWrite = false;
        mat.opacity = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 8);
      }
    }
  });

  return (
    <mesh>
      <boxGeometry args={[50.2, 50.2, 50.2]} />
      <Edges ref={lineRef} color="white" />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
};

const SceneController = ({ groupRef, cubeRefs, isDragging }: { groupRef: React.RefObject<THREE.Group | null>, cubeRefs: React.MutableRefObject<(THREE.Group | null)[]>, isDragging: React.MutableRefObject<boolean> }) => {
  const { cameraMode, isFaceFocused, activeCubeIdx, cubes } = useGame();
  
  // Snap to face when activeFaceIdx or cameraMode changes
  React.useEffect(() => {
    if (cameraMode === 'focus') {
      // NOTE: We don't snap absolutely here anymore, because `CubeNavigation` 
      // tumbles and updates `activeFaceIdx` dynamically.
      // If we snapped absolutely here, we would undo the seamless tumble.
      // So snapping absolutely is only done if the user specifically clicks 
      // a mesh (handled in the mesh onClick down below).
    }
  }, [cameraMode]);
  
  const targetPos = React.useMemo(() => new THREE.Vector3(), []);
  const tempEuler = React.useMemo(() => new THREE.Euler(), []);
  const tempCamTarget = React.useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Ensure global group has no rotation, only translation
    groupRef.current.quaternion.identity();

    // Calculate how many total faces are unlocked across the entire game
    let totalUnlockedFaces = 0;
    let unlockedCubeCount = 0;
    for (const cube of cubes) {
      let unlockedInCube = 0;
      for (const f of cube.faces) { if (f.unlocked) unlockedInCube++; }
      totalUnlockedFaces += unlockedInCube;
      if (unlockedInCube > 0) unlockedCubeCount++;
    }
    
    // If only 1 face is unlocked, we used to force focus mode, but we should allow idle view always.
    if (cameraMode === 'idle') {
      // Idle mode: Center the global group at 0,0,0 and zoom camera out
      const cols = Math.min(unlockedCubeCount, 5);
      const rows = Math.ceil(unlockedCubeCount / 5);
      
      const centerTargetX = cols > 0 ? ((cols - 1) * 100) / 2 : 0;
      const centerTargetY = rows > 0 ? -((rows - 1) * 100) / 2 : 0;
      
      const idleRadius = 120 + Math.max(0, Math.max(cols, rows) - 1) * 80;
      
      // Camera stays stationary but zooms out
      tempCamTarget.set(0, 0, idleRadius);
      state.camera.position.lerp(tempCamTarget, 0.05);
      state.camera.lookAt(0, 0, 0);

      // Group centers itself purely via translation
      targetPos.set(-centerTargetX, -centerTargetY, 0);
      groupRef.current.position.lerp(targetPos, 0.05);

      // Local cubes rotate in place around their own local axes ONLY if >1 faces unlocked
      if (totalUnlockedFaces > 1) {
        const time = state.clock.getElapsedTime();
        const speed = 0.3;
        
        tempEuler.set(time * speed * 0.4, time * speed, 0, 'XYZ');
        targetQuat.setFromEuler(tempEuler);
        
        for (const cubeGroup of cubeRefs.current) {
          if (cubeGroup) cubeGroup.quaternion.slerp(targetQuat, 0.05);
        }
      } else {
        targetQuat.identity();
        for (const cubeGroup of cubeRefs.current) {
          if (cubeGroup) cubeGroup.quaternion.slerp(targetQuat, 0.05);
        }
      }

    } else {
      // Focus mode: Shift global group so active cube is at 0,0,0 via translation
      const activeCol = activeCubeIdx % 5;
      const activeRow = Math.floor(activeCubeIdx / 5);
      
      const activeX = activeCol * 100;
      const activeY = -activeRow * 100;
      
      targetPos.set(-activeX, -activeY, 0);
      groupRef.current.position.lerp(targetPos, 0.1);

      // Camera zooms in to standard viewing distance
      tempCamTarget.set(0, 0, 100);
      state.camera.position.lerp(tempCamTarget, 0.1);
      state.camera.lookAt(0, 0, 0);

      // Apply incremental auto-rotation if a face is not focused and not currently dragging
      if (!isFaceFocused && !isDragging.current) {
        const delta = 0.005;
        const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), delta);
        const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), delta * 0.4);
        targetQuat.premultiply(qY).premultiply(qX).normalize();
      }

      // Apply the manual drag or auto rotation
      for (const cubeGroup of cubeRefs.current) {
        if (cubeGroup) cubeGroup.quaternion.slerp(targetQuat, 0.2); // Snappy rotation response
      }
    }
  });

  return null;
};

export const Board: React.FC = () => {
  const { cubes, cameraMode, isFaceFocused, focusCube, focusFace, activeCubeIdx, activeFaceIdx, setCameraMode } = useGame();
  const groupRef = React.useRef<THREE.Group>(null);
  const cubeRefs = React.useRef<(THREE.Group | null)[]>([]);

  const isDragging = React.useRef(false);
  const previousPos = React.useRef({ x: 0, y: 0 });

  const [hoveredFace, setHoveredFace] = React.useState<{cIdx: number, fIdx: number} | null>(null);

  let totalUnlockedFaces = 0;
  let unlockedCubeCount = 0;
  for (const c of cubes) { 
    let unlockedInCube = 0;
    for (const f of c.faces) { if (f.unlocked) unlockedInCube++; } 
    totalUnlockedFaces += unlockedInCube;
    if (unlockedInCube > 0) unlockedCubeCount++;
  }

  // Force focus mode if only 1 cube is unlocked
  React.useEffect(() => {
    if (unlockedCubeCount === 1 && cameraMode === 'idle') {
      setCameraMode('focus');
      if (activeCubeIdx !== 0) focusCube(0);
    }
  }, [unlockedCubeCount, cameraMode, setCameraMode, activeCubeIdx, focusCube]);

  return (
    <div 
      className="board-container" 
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (cameraMode === 'focus' && totalUnlockedFaces > 1) {
          isDragging.current = true;
          previousPos.current = { x: e.clientX, y: e.clientY };
        }
      }}
      onPointerMove={(e) => {
        if (isDragging.current && cameraMode === 'focus') {
          const dx = e.clientX - previousPos.current.x;
          const dy = e.clientY - previousPos.current.y;
          
          dragCamera(dx, dy);
          
          previousPos.current = { x: e.clientX, y: e.clientY };
        }
      }}
      onPointerUp={() => isDragging.current = false}
      onPointerLeave={() => isDragging.current = false}
    >
      <Canvas onPointerMissed={() => {
        if (unlockedCubeCount > 1) {
          setCameraMode('idle');
        }
      }}>
        <PerspectiveCamera makeDefault position={[0, 0, 120]} fov={50} />
        <SceneController groupRef={groupRef} cubeRefs={cubeRefs} isDragging={isDragging} />
        <ambientLight intensity={1} />
        
        <group ref={groupRef}>
          <GlobalInstancedMesh cubeRefs={cubeRefs} />
          {cubes.map((_, cIdx) => {
            const col = cIdx % 5;
            const row = Math.floor(cIdx / 5);
            return (
              <group 
                key={cIdx} 
                position={[col * 100, -row * 100, 0]} 
                ref={el => cubeRefs.current[cIdx] = el}
              >
                {hoveredFace?.cIdx === cIdx && cameraMode === 'idle' && <CubeOutline />}

                {/* Invisible planes for raycasting - only on unlocked faces */}
                {FACE_TRANSFORMS.map((transform, fIdx) => {
                  const isUnlocked = cubes[cIdx]?.faces[fIdx]?.unlocked;
                  if (!isUnlocked) return null;
                  
                  const isHovered = hoveredFace?.cIdx === cIdx && hoveredFace?.fIdx === fIdx;
                  
                  return (
                    <mesh
                      key={fIdx}
                      position={transform.pos as any}
                      rotation={transform.rot as any}
                      onPointerOver={(e) => {
                        e.stopPropagation();
                        setHoveredFace({ cIdx, fIdx });
                      }}
                      onPointerOut={(e) => {
                        setHoveredFace(null);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (cameraMode !== 'focus' || cIdx !== activeCubeIdx) {
                          focusCube(cIdx);
                        } else {
                          focusFace(cIdx, fIdx);
                        }
                      }}
                    >
                      <planeGeometry args={[50.1, 50.1]} />
                      <meshBasicMaterial 
                        transparent 
                        opacity={0} 
                        depthWrite={false} 
                        side={THREE.DoubleSide} 
                      />
                      {isHovered && cameraMode === 'focus' && <HoverOutline />}
                    </mesh>
                  );
                })}
              </group>
            );
          })}
        </group>

        <EffectComposer>
          <Bloom luminanceThreshold={1.0} mipmapBlur intensity={2.0} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
