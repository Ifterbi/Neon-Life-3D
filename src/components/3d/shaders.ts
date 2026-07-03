export const globalVertexShader = `
attribute vec3 aInstancePos;
attribute vec4 aInstanceQuat;

attribute float aCubeIdx;
attribute float aFaceIdx;

varying vec2 vUv;
varying float vCubeIdx;
varying float vFaceIdx;

vec3 rotateVectorByQuaternion(vec3 v, vec4 q) {
  vec3 t = 2.0 * cross(q.xyz, v);
  return v + q.w * t + cross(q.xyz, t);
}

void main() {
  vUv = uv;
  vCubeIdx = aCubeIdx;
  vFaceIdx = aFaceIdx;

  vec3 p = position;
  p = rotateVectorByQuaternion(p, aInstanceQuat) + aInstancePos;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const globalFragmentShader = `
uniform sampler2D uDataTex;
uniform vec2 uTexSize;
uniform float uCubeActive[15];
uniform float uFocusMode;

varying vec2 vUv;
varying float vCubeIdx;
varying float vFaceIdx;

void main() {
  int cIdx = int(vCubeIdx + 0.5);
  int fIdx = int(vFaceIdx + 0.5);

  int faceByteOffset = cIdx * 303120 + fIdx * 50520;
  int facePixelIdx = faceByteOffset / 4;
  
  float fx = mod(float(facePixelIdx), uTexSize.x);
  float fy = floor(float(facePixelIdx) / uTexSize.x);
  vec4 faceTexel = texture2D(uDataTex, vec2((fx + 0.5) / uTexSize.x, (fy + 0.5) / uTexSize.y));
  int unlocked = int(faceTexel.r * 255.0 + 0.5);
  
  if (unlocked == 0) discard;

  float frx = mod(float(facePixelIdx + 1), uTexSize.x);
  float fry = floor(float(facePixelIdx + 1) / uTexSize.x);
  vec4 rowsTexel = texture2D(uDataTex, vec2((frx + 0.5) / uTexSize.x, (fry + 0.5) / uTexSize.y));
  int rows = int(rowsTexel.r * 255.0 + 0.5);

  float fcx = mod(float(facePixelIdx + 2), uTexSize.x);
  float fcy = floor(float(facePixelIdx + 2) / uTexSize.x);
  vec4 colsTexel = texture2D(uDataTex, vec2((fcx + 0.5) / uTexSize.x, (fcy + 0.5) / uTexSize.y));
  int cols = int(colsTexel.r * 255.0 + 0.5);

  float c_f = floor(vUv.x * float(cols));
  float r_f = floor((1.0 - vUv.y) * float(rows));
  
  int c = int(c_f);
  int r = int(r_f);
  
  if (c < 0 || c >= cols || r < 0 || r >= rows) discard;
  
  int cellByteOffset = faceByteOffset + 10520 + (r * 100 + c) * 4;
  int cellPixelIdx = cellByteOffset / 4;
  
  float cx = mod(float(cellPixelIdx), uTexSize.x);
  float cy = floor(float(cellPixelIdx) / uTexSize.x);
  vec4 texel = texture2D(uDataTex, vec2((cx + 0.5) / uTexSize.x, (cy + 0.5) / uTexSize.y));
  
  int meta = int(texel.a * 255.0 + 0.5);
  
  bool isVisible = (uFocusMode < 0.5 || uCubeActive[cIdx] > 0.5);
  if (!isVisible) discard;

  float scale = 0.0;
  if (mod(float(meta), 2.0) > 0.5) {
    scale = 1.0;
  }
  
  float px = fract(vUv.x * float(cols));
  float py = fract((1.0 - vUv.y) * float(rows));
  
  vec3 color = texel.rgb * 3.5; 
  float maxVal = max(color.r, max(color.g, color.b));
  if (maxVal < 0.4) {
    if (maxVal > 0.001) {
      color *= (0.4 / maxVal);
    } else {
      color = vec3(0.4); 
    }
  }
  
  float gridMax = max(float(cols), float(rows));
  
  // Calculate distance to nearest edge in terms of the whole face (0 to 1)
  // This ensures horizontal and vertical lines have the exact same physical thickness.
  float distFaceX = min(px, 1.0 - px) / float(cols);
  float distFaceY = min(py, 1.0 - py) / float(rows);
  float edgeDistFace = min(distFaceX, distFaceY);
  
  // Thickness relative to the face size
  float thickness = clamp(0.7 / gridMax, 0.002, 0.02);
  
  // Neon mesh calculations
  float core = 1.0 - smoothstep(0.0, thickness * 0.4, edgeDistFace);
  float glow = 1.0 - smoothstep(thickness * 0.1, thickness * 0.8, edgeDistFace);
  
  vec3 finalColor = vec3(0.0);
  float alpha = 0.0;
  
  if (scale > 0.5) {
    // Alive cell: interior is clearly colored, edges have a very subtle extra glow
    vec3 cellBodyColor = color * 0.6;
    float cellBodyAlpha = 0.9;
    
    vec3 edgeColor = color * (core * 0.4 + glow * 0.15);
    float edgeAlpha = core * 0.4 + glow * 0.15;
    
    finalColor = cellBodyColor + edgeColor;
    alpha = max(cellBodyAlpha, edgeAlpha);
  } else {
    // Dead cell: darker, very subtle mesh wire (no clip effect)
    vec3 defaultWireColor = vec3(0.05, 0.08, 0.12); 
    finalColor = defaultWireColor * (core * 0.8 + glow * 0.2);
    alpha = core * 0.3 + glow * 0.1;
  }
  
  if (alpha < 0.01) discard;
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;

export const faceBackdropVertexShader = `
uniform sampler2D uDataTex;
uniform vec2 uTexSize;
uniform float uCubeActive[15];
uniform float uFocusMode;
uniform float uCubeUnlockedFaces[15];
uniform int uActiveCube;
uniform int uActiveFace;

attribute vec3 aInstancePos;
attribute vec4 aInstanceQuat;
attribute float aCubeIdx;
attribute float aFaceIdx;

varying float vUnlocked;
varying vec4 vColor;

vec3 rotateVectorByQuaternion(vec3 v, vec4 q) {
  vec3 t = 2.0 * cross(q.xyz, v);
  return v + q.w * t + cross(q.xyz, t);
}

void main() {
  int cIdx = int(aCubeIdx + 0.5);
  int fIdx = int(aFaceIdx + 0.5);

  int faceByteOffset = cIdx * 303120 + fIdx * 50520;
  int facePixelIdx = faceByteOffset / 4;
  float fx = mod(float(facePixelIdx), uTexSize.x);
  float fy = floor(float(facePixelIdx) / uTexSize.x);
  vec4 faceTexel = texture2D(uDataTex, vec2((fx + 0.5) / uTexSize.x, (fy + 0.5) / uTexSize.y));
  int unlocked = int(faceTexel.r * 255.0 + 0.5);
  
  vUnlocked = float(unlocked);
  
  // Hide if in focus mode and not the active cube
  if (uFocusMode > 0.5 && uCubeActive[cIdx] < 0.5) {
    vColor = vec4(0.0);
    vUnlocked = 0.0;
  } else {
    if (unlocked == 1) {
      if (cIdx == uActiveCube && fIdx == uActiveFace) {
        vColor = vec4(0.0, 0.0, 0.0, 0.7); // Black, 70% opacity for active face
      } else {
        vColor = vec4(0.0, 0.0, 0.0, 0.7); // Black, 70% opacity for inactive faces
      }
    } else {
      vColor = vec4(0.0, 0.0, 0.0, 0.0); // Invisible
    }
  }

  vec3 p = position;
  p.z -= 0.05; // -0.05 offset
  
  p = rotateVectorByQuaternion(p, aInstanceQuat) + aInstancePos;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const faceBackdropFragmentShader = `
varying float vUnlocked;
varying vec4 vColor;

void main() {
  if (vColor.a < 0.01) discard;
  gl_FragColor = vColor;
}
`;
