import { settings } from '../settings.js';
import { getTheme } from '../themes.js';
import { ripples, rippleContainer } from '../engine/pixi-app.js';
import * as camera from '../engine/camera.js';

let rippleIdCounter = 0;

export class Ripple {
  constructor(x, y, radius, color = null) {
    this.id = rippleIdCounter++;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.prevRadius = radius;
    this.opacity = 1.0;
    this.color = color; // Color of the circle that spawned this ripple

    this.graphics = new PIXI.Graphics();
    rippleContainer.addChild(this.graphics);
  }

  update() {
    this.prevRadius = this.radius;
    this.radius += settings.rippleExpand;
    
    // For solid ripples, don't fade
    if (!(settings.solidRipples && this.color !== null)) {
      this.opacity -= settings.rippleFade * 0.01;
    }
  }

  isDead() {
    // Solid ripples die when they get very large
    if (settings.solidRipples && this.color !== null) {
      return this.radius > 1500;
    }
    return this.opacity <= 0;
  }

  draw() {
    const drawX = this.x - camera.cameraX;
    const drawY = this.y - camera.cameraY;

    this.graphics.clear();
    if (settings.solidRipples && this.color !== null) {
      // Solid filled circle with spawning circle's color
      this.graphics.beginFill(this.color, this.opacity);
      this.graphics.drawCircle(drawX, drawY, this.radius);
      this.graphics.endFill();
    } else {
      // Regular ring ripple - skip if faded
      if (this.opacity <= 0) return;
      this.graphics.lineStyle(2, getTheme().ripple, this.opacity);
      this.graphics.drawCircle(drawX, drawY, this.radius);
    }
  }

  destroy() {
    rippleContainer.removeChild(this.graphics);
    this.graphics.destroy();
  }
}

export function createRipple(x, y, radius, color = null) {
  const ripple = new Ripple(x, y, radius, color);
  ripples.push(ripple);
  return ripple;
}

export function destroyAllRipples() {
  while (ripples.length > 0) {
    const r = ripples.pop();
    r.destroy();
  }
}
