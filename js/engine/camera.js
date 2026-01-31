// Camera and follow mode state
export let followedCircle = null;
export let cameraX = 0;
export let cameraY = 0;
export let targetCameraX = 0;
export let targetCameraY = 0;
export let cameraZoom = 1;
export let targetCameraZoom = 1;
export let gridOpacity = 0;
export let targetGridOpacity = 0;

// Animation state
export let animationStart = null;
export const animationDuration = 1500;
export let startCameraX = 0;
export let startCameraY = 0;
export let startCameraZoom = 1;
export let startGridOpacity = 0;
export let prevTargetCameraX = 0;
export let prevTargetCameraY = 0;
export let prevTargetCameraZoom = 1;
export let prevTargetGridOpacity = 0;

// Camera constants
export const followZoom = 1.8;
export const gridSpacing = 40;

// Setters for mutable state
export function setFollowedCircle(circle) {
  followedCircle = circle;
}

export function setCameraPosition(x, y) {
  cameraX = x;
  cameraY = y;
}

export function setTargetCamera(x, y, zoom, opacity) {
  targetCameraX = x;
  targetCameraY = y;
  targetCameraZoom = zoom;
  targetGridOpacity = opacity;
}

export function setCameraZoom(zoom) {
  cameraZoom = zoom;
}

export function setGridOpacity(opacity) {
  gridOpacity = opacity;
}

export function startAnimation() {
  animationStart = performance.now();
  startCameraX = cameraX;
  startCameraY = cameraY;
  startCameraZoom = cameraZoom;
  startGridOpacity = gridOpacity;
  prevTargetCameraX = targetCameraX;
  prevTargetCameraY = targetCameraY;
  prevTargetCameraZoom = targetCameraZoom;
  prevTargetGridOpacity = targetGridOpacity;
}

export function endAnimation() {
  animationStart = null;
}

// Ease-in-out cubic function
export function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
