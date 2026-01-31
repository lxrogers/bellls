import { settings } from '../settings.js';
import { getTheme } from '../themes.js';
import { ripples, rippleContainer } from '../engine/pixi-app.js';
import * as camera from '../engine/camera.js';

let rippleIdCounter = 0;

export class Ripple {
  constructor(x, y, radius) {
    this.id = rippleIdCounter++;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.prevRadius = radius;
    this.opacity = 0.5;

    this.graphics = new PIXI.Graphics();
    rippleContainer.addChild(this.graphics);
  }

  update() {
    this.prevRadius = this.radius;
    this.radius += settings.rippleExpand;
    this.opacity -= settings.rippleFade * 0.01;
  }

  isDead() {
    return this.opacity <= 0;
  }

  draw() {
    if (this.opacity <= 0) return;

    const drawX = this.x - camera.cameraX;
    const drawY = this.y - camera.cameraY;

    this.graphics.clear();
    this.graphics.lineStyle(2, getTheme().ripple, this.opacity);
    this.graphics.drawCircle(drawX, drawY, this.radius);
  }

  destroy() {
    rippleContainer.removeChild(this.graphics);
    this.graphics.destroy();
  }
}

export function createRipple(x, y, radius) {
  const ripple = new Ripple(x, y, radius);
  ripples.push(ripple);
  return ripple;
}
