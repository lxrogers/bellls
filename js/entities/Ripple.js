import { settings } from '../settings.js';
import { getTheme } from '../themes.js';
import { ripples, rippleContainer } from '../engine/pixi-app.js';
import * as camera from '../engine/camera.js';

// Single shared graphics for all ripples
let sharedGraphics = null;

function getSharedGraphics() {
  if (!sharedGraphics) {
    sharedGraphics = new PIXI.Graphics();
    rippleContainer.addChild(sharedGraphics);
  }
  return sharedGraphics;
}

export class Ripple {
  constructor(x, y, radius, color = null) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.prevRadius = radius;
    this.opacity = 1.0;
    this.color = color;
    this.age = 0;
  }

  update() {
    this.prevRadius = this.radius;
    this.radius += settings.rippleExpand;
    this.age++;

    if (settings.solidRipples && this.color !== null) {
      // Solid ripples: stay opaque until maxRadius, then fade over ~2s (120 frames)
      const maxRadius = 500;
      if (this.radius > maxRadius) {
        this.opacity -= 1 / 120;
      }
    } else {
      this.opacity -= settings.rippleFade * 0.01;
    }
  }

  isDead() {
    return this.opacity <= 0;
  }
}

// Draw all ripples in one batch
export function drawAllRipples() {
  const g = getSharedGraphics();
  g.clear();

  if (settings.solidRipples) {
    // Solid opaque ripples: draw newest (largest) first since they're on top.
    // Cull any ripple fully inside a newer, larger one (it's hidden).
    // Ripples are in creation order, so iterate from end (newest/largest).
    const visible = [];
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      if (r.color === null) { visible.push(r); continue; }
      let hidden = false;
      for (const v of visible) {
        if (v.color === null) continue;
        const dx = r.x - v.x;
        const dy = r.y - v.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // r is fully inside v if v.radius >= dist + r.radius
        if (v.radius >= dist + r.radius) {
          hidden = true;
          break;
        }
      }
      if (!hidden) visible.push(r);
    }

    // Draw in reverse (oldest/smallest first so newest paints on top)
    for (let i = visible.length - 1; i >= 0; i--) {
      const ripple = visible[i];
      const drawX = ripple.x - camera.cameraX;
      const drawY = ripple.y - camera.cameraY;
      if (ripple.color !== null) {
        g.beginFill(ripple.color, ripple.opacity);
        g.drawCircle(drawX, drawY, ripple.radius);
        g.endFill();
      } else {
        g.lineStyle(1, getTheme().ripple, ripple.opacity);
        g.drawCircle(drawX, drawY, ripple.radius);
        g.lineStyle(0);
      }
    }
  } else {
    for (const ripple of ripples) {
      if (ripple.opacity <= 0) continue;
      const drawX = ripple.x - camera.cameraX;
      const drawY = ripple.y - camera.cameraY;
      g.lineStyle(1, getTheme().ripple, ripple.opacity);
      g.drawCircle(drawX, drawY, ripple.radius);
      g.lineStyle(0);
    }
  }
}

export function createRipple(x, y, radius, color = null) {
  const ripple = new Ripple(x, y, radius, color);
  ripples.push(ripple);
  return ripple;
}

export function destroyAllRipples() {
  ripples.length = 0;
  if (sharedGraphics) {
    sharedGraphics.clear();
  }
}
