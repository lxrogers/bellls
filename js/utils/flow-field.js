import { settings } from '../settings.js';

// Flow field time - updated each frame in game loop
export let flowTime = 0;

export function updateFlowTime(delta = 0.016) {
  flowTime += delta;
}

// Procedural noise function for organic dust/particle movement
export function flowNoise(x, y, t) {
  const scale = settings.dustFieldScale;
  const angle =
    Math.sin(x * scale + t * 0.3) * 2 +
    Math.cos(y * scale * 1.3 + t * 0.2) * 2 +
    Math.sin((x + y) * scale * 0.7 + t * 0.4) +
    Math.cos((x - y) * scale * 0.5 + t * 0.25);
  return angle;
}
