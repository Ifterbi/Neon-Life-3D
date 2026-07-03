import * as THREE from 'three';

let listeners: Array<() => void> = [];

// The authoritative target rotation for the focused cube
export const targetQuat = new THREE.Quaternion();

export const subscribeToCamera = (listener: () => void) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

const emit = () => listeners.forEach(l => l());

// Helper to determine which face is currently pointing at the camera (+Z)
export function getFaceFromQuat(q: THREE.Quaternion): number {
  const normals = [
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0)
  ];
  let maxDot = -Infinity;
  let bestFace = 0;
  for (let i = 0; i < 6; i++) {
    const v = normals[i].clone().applyQuaternion(q);
    if (v.z > maxDot) {
      maxDot = v.z;
      bestFace = i;
    }
  }
  return bestFace;
}

// Fixed absolute rotations for the 6 faces (used when explicitly snapping from 2D UI)
export const FACE_QUATS = [
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0, 'YXZ')),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0, 'YXZ')),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0, 'YXZ')),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0, 'YXZ')),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0, 'YXZ')),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0, 'YXZ'))
];

// Handles free-form dragging (mouse)
export function dragCamera(dx: number, dy: number, speed: number = 0.005) {
  const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * speed);
  const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * speed);
  const deltaQuat = new THREE.Quaternion().multiplyQuaternions(qY, qX);
  
  targetQuat.premultiply(deltaQuat);
  targetQuat.normalize();
  emit();
}

// Handles relative tumbling (UI buttons)
// Returns the new face index so the GameContext can be updated
export function tumbleCamera(axis: 'x' | 'y', dir: 1 | -1): number {
  const delta = new THREE.Quaternion();
  if (axis === 'x') {
    delta.setFromAxisAngle(new THREE.Vector3(1, 0, 0), dir * Math.PI / 2);
  } else {
    delta.setFromAxisAngle(new THREE.Vector3(0, 1, 0), dir * Math.PI / 2);
  }
  targetQuat.premultiply(delta);
  targetQuat.normalize();
  emit();
  return getFaceFromQuat(targetQuat);
}

// Absolute snapping
export function snapToFace(faceIdx: number) {
  targetQuat.copy(FACE_QUATS[faceIdx]);
  emit();
}

// Simulate a tumble to preview what face it will land on (for hiding buttons)
export function previewTumbleFace(axis: 'x' | 'y', dir: 1 | -1): number {
  const delta = new THREE.Quaternion();
  if (axis === 'x') {
    delta.setFromAxisAngle(new THREE.Vector3(1, 0, 0), dir * Math.PI / 2);
  } else {
    delta.setFromAxisAngle(new THREE.Vector3(0, 1, 0), dir * Math.PI / 2);
  }
  const previewQuat = delta.multiply(targetQuat.clone());
  return getFaceFromQuat(previewQuat);
}
