import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../../game/GameContext';
import { getWasmMemory, getCubesPtr } from '../../game/wasmBridge';
import { globalVertexShader, globalFragmentShader, faceBackdropVertexShader, faceBackdropFragmentShader } from './shaders';

const MAX_CUBES = 15;
const FACES_PER_CUBE = 6;
const TOTAL_INSTANCES = MAX_CUBES * FACES_PER_CUBE;

const TEX_WIDTH = 1024;
const TEX_HEIGHT = 1111;

const FACE_TRANSFORMS = [
  { pos: new THREE.Vector3(0, 0, 25), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)) },
  { pos: new THREE.Vector3(25, 0, 0), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)) },
  { pos: new THREE.Vector3(0, 0, -25), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)) },
  { pos: new THREE.Vector3(-25, 0, 0), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)) },
  { pos: new THREE.Vector3(0, 25, 0), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)) },
  { pos: new THREE.Vector3(0, -25, 0), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)) }
];

export const GlobalInstancedMesh: React.FC<{
  cubeRefs: React.MutableRefObject<(THREE.Group | null)[]>;
}> = ({ cubeRefs }) => {
  const { cameraMode, activeCubeIdx, activeFaceIdx, cubes } = useGame();
  
  const instancedMeshRef = useRef<THREE.Mesh>(null);
  const backdropsRef = useRef<THREE.Mesh>(null);
  const dataTextureRef = useRef<THREE.DataTexture | null>(null);

  const tempPos = useMemo(() => new THREE.Vector3(), []);
  const tempQuat = useMemo(() => new THREE.Quaternion(), []);

  // Static Geometry and Attributes
  const { geometry, faceGeometry } = useMemo(() => {
    const baseGeo = new THREE.PlaneGeometry(50, 50);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = baseGeo.index;
    geo.attributes = baseGeo.attributes;
    geo.instanceCount = TOTAL_INSTANCES;
    
    const cubeIdxArr = new Float32Array(TOTAL_INSTANCES);
    const faceIdxArr = new Float32Array(TOTAL_INSTANCES);
    const instancePosArr = new Float32Array(TOTAL_INSTANCES * 3);
    const instanceQuatArr = new Float32Array(TOTAL_INSTANCES * 4);

    let idx = 0;
    for (let c = 0; c < MAX_CUBES; c++) {
      for (let f = 0; f < FACES_PER_CUBE; f++) {
        cubeIdxArr[idx] = c;
        faceIdxArr[idx] = f;
        idx++;
      }
    }

    geo.setAttribute('aCubeIdx', new THREE.InstancedBufferAttribute(cubeIdxArr, 1));
    geo.setAttribute('aFaceIdx', new THREE.InstancedBufferAttribute(faceIdxArr, 1));
    geo.setAttribute('aInstancePos', new THREE.InstancedBufferAttribute(instancePosArr, 3));
    geo.setAttribute('aInstanceQuat', new THREE.InstancedBufferAttribute(instanceQuatArr, 4));

    const baseFaceGeo = new THREE.PlaneGeometry(50.1, 50.1);
    const faceGeo = new THREE.InstancedBufferGeometry();
    faceGeo.index = baseFaceGeo.index;
    faceGeo.attributes = baseFaceGeo.attributes;
    faceGeo.instanceCount = TOTAL_INSTANCES;
    
    faceGeo.setAttribute('aCubeIdx', new THREE.InstancedBufferAttribute(cubeIdxArr, 1));
    faceGeo.setAttribute('aFaceIdx', new THREE.InstancedBufferAttribute(faceIdxArr, 1));
    faceGeo.setAttribute('aInstancePos', new THREE.InstancedBufferAttribute(instancePosArr, 3));
    faceGeo.setAttribute('aInstanceQuat', new THREE.InstancedBufferAttribute(instanceQuatArr, 4));

    return { geometry: geo, faceGeometry: faceGeo };
  }, []);

  // Material and Uniforms
  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: globalVertexShader,
      fragmentShader: globalFragmentShader,
      uniforms: {
        uDataTex: { value: null },
        uTexSize: { value: new THREE.Vector2(TEX_WIDTH, TEX_HEIGHT) },
        uCubeActive: { value: new Float32Array(MAX_CUBES) },
        uFocusMode: { value: 0.0 }
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false, // Prevent z-fighting on overlaps since we have a solid backdrop
    });

    const backdropMat = new THREE.ShaderMaterial({
      vertexShader: faceBackdropVertexShader,
      fragmentShader: faceBackdropFragmentShader,
      uniforms: {
        uDataTex: { value: null },
        uTexSize: { value: new THREE.Vector2(TEX_WIDTH, TEX_HEIGHT) },
        uCubeActive: { value: new Float32Array(MAX_CUBES) },
        uFocusMode: { value: 0.0 },
        uCubeUnlockedFaces: { value: new Float32Array(MAX_CUBES) },
        uActiveCube: { value: 0 },
        uActiveFace: { value: 0 }
      },
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: true,
    });

    return { mat, backdropMat };
  }, []);

  React.useEffect(() => {
    return () => {
      geometry.dispose();
      faceGeometry.dispose();
      material.mat.dispose();
      material.backdropMat.dispose();
      if (dataTextureRef.current) dataTextureRef.current.dispose();
    };
  }, [geometry, faceGeometry, material]);

  useFrame(() => {
    const memory = getWasmMemory();
    const ptr = getCubesPtr();
    if (!memory || !ptr) return;

    if (!dataTextureRef.current) {
      const view = new Uint8Array(memory.buffer, ptr, TEX_WIDTH * TEX_HEIGHT * 4);
      const tex = new THREE.DataTexture(view, TEX_WIDTH, TEX_HEIGHT, THREE.RGBAFormat, THREE.UnsignedByteType);
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      dataTextureRef.current = tex;
      material.mat.uniforms.uDataTex.value = tex;
      material.backdropMat.uniforms.uDataTex.value = tex;
    } else {
      dataTextureRef.current.needsUpdate = true;
    }

    material.backdropMat.uniforms.uActiveCube.value = activeCubeIdx;
    material.backdropMat.uniforms.uActiveFace.value = activeFaceIdx;
    
    const focusMode = cameraMode === 'focus' ? 1.0 : 0.0;
    material.mat.uniforms.uFocusMode.value = focusMode;
    material.backdropMat.uniforms.uFocusMode.value = focusMode;
    
    const activeArr1 = material.mat.uniforms.uCubeActive.value;
    const activeArr2 = material.backdropMat.uniforms.uCubeActive.value;
    const unlockedArr = material.backdropMat.uniforms.uCubeUnlockedFaces.value;
    
    const posArr = geometry.attributes.aInstancePos.array as Float32Array;
    const quatArr = geometry.attributes.aInstanceQuat.array as Float32Array;
    const facePosArr = faceGeometry.attributes.aInstancePos.array as Float32Array;
    const faceQuatArr = faceGeometry.attributes.aInstanceQuat.array as Float32Array;

    let idx = 0;
    for (let c = 0; c < MAX_CUBES; c++) {
      activeArr1[c] = (c === activeCubeIdx) ? 1.0 : 0.0;
      activeArr2[c] = (c === activeCubeIdx) ? 1.0 : 0.0;
      
      let unlockedCount = 0;
      if (cubes[c]) {
        for (let f = 0; f < cubes[c].faces.length; f++) {
          if (cubes[c].faces[f].unlocked) unlockedCount++;
        }
      }
      unlockedArr[c] = unlockedCount;
      
      const cubeGroup = cubeRefs.current[c];
      if (cubeGroup) {
        for (let f = 0; f < FACES_PER_CUBE; f++) {
          tempQuat.copy(cubeGroup.quaternion).multiply(FACE_TRANSFORMS[f].quat);
          tempPos.copy(FACE_TRANSFORMS[f].pos).applyQuaternion(cubeGroup.quaternion).add(cubeGroup.position);

          posArr[idx * 3 + 0] = tempPos.x;
          posArr[idx * 3 + 1] = tempPos.y;
          posArr[idx * 3 + 2] = tempPos.z;
          quatArr[idx * 4 + 0] = tempQuat.x;
          quatArr[idx * 4 + 1] = tempQuat.y;
          quatArr[idx * 4 + 2] = tempQuat.z;
          quatArr[idx * 4 + 3] = tempQuat.w;
          
          facePosArr[idx * 3 + 0] = tempPos.x;
          facePosArr[idx * 3 + 1] = tempPos.y;
          facePosArr[idx * 3 + 2] = tempPos.z;
          faceQuatArr[idx * 4 + 0] = tempQuat.x;
          faceQuatArr[idx * 4 + 1] = tempQuat.y;
          faceQuatArr[idx * 4 + 2] = tempQuat.z;
          faceQuatArr[idx * 4 + 3] = tempQuat.w;

          idx++;
        }
      } else {
        idx += FACES_PER_CUBE;
      }
    }

    geometry.attributes.aInstancePos.needsUpdate = true;
    geometry.attributes.aInstanceQuat.needsUpdate = true;
    faceGeometry.attributes.aInstancePos.needsUpdate = true;
    faceGeometry.attributes.aInstanceQuat.needsUpdate = true;
  });

  return (
    <group>
      <mesh
        ref={backdropsRef}
        geometry={faceGeometry}
        material={material.backdropMat}
        frustumCulled={false}
      />
      <mesh
        ref={instancedMeshRef}
        geometry={geometry}
        material={material.mat}
        frustumCulled={false}
      />
    </group>
  );
};
