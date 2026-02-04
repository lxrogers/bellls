import { settings } from '../settings.js';
import { getTheme } from '../themes.js';
import { flowNoise, flowTime } from '../utils/flow-field.js';
import { playNote } from '../audio/play-note.js';
import { app, circles, circleContainer, getScreenScale } from '../engine/pixi-app.js';
import * as camera from '../engine/camera.js';
import { createRipple } from './Ripple.js';
import { scales, currentScale } from '../audio/scales.js';

export class Circle {
  constructor(x, y, radius, noteIndex, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.noteIndex = noteIndex;
    this.color = color;
    this.glow = 0;

    const angle = Math.random() * Math.PI * 2;
    const speed = settings.baseVelocity + (Math.random() - 0.5) * settings.baseVelocity * 0.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    // Z-axis for bobbing effect (0 = resting, positive = "up"/closer)
    this.z = 0;
    this.vz = 0;
    this.zSpring = 0.02;   // Spring stiffness (very soft)
    this.zDamping = 0.98;  // Velocity damping (slow decay)

    // Graphics
    this.graphics = new PIXI.Graphics();
    circleContainer.addChild(this.graphics);
  }

  get r() {
    return this.radius * settings.radiusMultiplier * getScreenScale();
  }

  get mass() {
    // Mass proportional to area (radius squared)
    return this.r * this.r;
  }

  applyFlowField() {
    // Get flow angle at this position
    const angle = flowNoise(this.x, this.y, flowTime);

    // Apply force - scaled down by mass so larger circles are less affected
    const force = settings.dustFieldStrength / (this.mass * 0.5);
    this.vx += Math.cos(angle) * force;
    this.vy += Math.sin(angle) * force;
  }

  // Check if a ripple's expanding ring passes through this circle's center
  checkRippleHit(ripple) {
    const dx = this.x - ripple.x;
    const dy = this.y - ripple.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Ripple ring passed through center this frame
    if (dist >= ripple.prevRadius && dist < ripple.radius) {
      // Give upward impulse, scaled by ripple opacity (newer ripples = stronger)
      const impulse = ripple.opacity * 0.03;
      this.vz += impulse;
    }
  }

  updateZ() {
    // Spring physics: accelerate toward z=0
    const springForce = -this.z * this.zSpring;
    this.vz += springForce;
    this.vz *= this.zDamping;
    this.z += this.vz;

    // Clamp to reasonable range
    this.z = Math.max(-0.5, Math.min(1.5, this.z));
  }

  update() {
    this.applyFlowField();
    this.x += this.vx;
    this.y += this.vy;
    this.glow *= 0.92;

    let hitWall = false;
    const r = this.r;

    if (this.x - r < 0) {
      this.x = r;
      this.vx *= -1;
      hitWall = true;
    } else if (this.x + r > app.screen.width) {
      this.x = app.screen.width - r;
      this.vx *= -1;
      hitWall = true;
    }

    if (this.y - r < 0) {
      this.y = r;
      this.vy *= -1;
      hitWall = true;
    } else if (this.y + r > app.screen.height) {
      this.y = app.screen.height - r;
      this.vy *= -1;
      hitWall = true;
    }

    if (hitWall) this.triggerSound(0.25);
  }

  checkCollision(other) {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = this.r + other.r;

    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const dvx = this.vx - other.vx;
      const dvy = this.vy - other.vy;
      const dvn = dvx * nx + dvy * ny;

      if (dvn > 0) {
        // Mass-weighted elastic collision
        const m1 = this.mass;
        const m2 = other.mass;
        const totalMass = m1 + m2;

        // Impulse coefficients based on mass ratio
        const c1 = (2 * m2) / totalMass;
        const c2 = (2 * m1) / totalMass;

        this.vx -= c1 * dvn * nx;
        this.vy -= c1 * dvn * ny;
        other.vx += c2 * dvn * nx;
        other.vy += c2 * dvn * ny;

        const overlap = (minDist - dist) / 2;
        this.x -= overlap * nx;
        this.y -= overlap * ny;
        other.x += overlap * nx;
        other.y += overlap * ny;

        const vel = Math.min(0.7, Math.abs(dvn) * 0.4 + 0.2);
        this.triggerSound(vel);
        other.triggerSound(vel * 0.6);
        return true;
      }
    }
    return false;
  }

  triggerSound(velocity) {
    this.glow = 1;
    const xNormalized = this.x / app.screen.width;
    playNote(this.noteIndex, velocity, xNormalized);

    // Create ripple
    createRipple(this.x, this.y, this.r);
  }

  draw() {
    const baseR = this.r;
    // Scale radius based on z (higher = bigger, like coming closer)
    const zScale = 1 + this.z * 0.15;
    const r = baseR * zScale;
    const drawX = this.x - camera.cameraX;
    const drawY = this.y - camera.cameraY;

    this.graphics.clear();

    // Fill (full opacity)
    this.graphics.beginFill(this.color, 1);
    this.graphics.drawCircle(drawX, drawY, r * 0.85);
    this.graphics.endFill();

    // Outline - thicker stroke when struck
    const strokeWidth = 2 + this.glow * 6;
    this.graphics.lineStyle(strokeWidth, this.color, 1);
    this.graphics.drawCircle(drawX, drawY, r);

    // Extra glow ring when struck
    if (this.glow > 0.1) {
      this.graphics.lineStyle(this.glow * 4, 0xffffff, this.glow * 0.4);
      this.graphics.drawCircle(drawX, drawY, r + this.glow * 5);
    }
  }

  destroy() {
    circleContainer.removeChild(this.graphics);
    this.graphics.destroy();
  }
}

export function createCircles() {
  // Remove extra circles
  while (circles.length > settings.numCircles) {
    const c = circles.pop();
    c.destroy();
  }

  // Add new circles
  while (circles.length < settings.numCircles) {
    const i = circles.length;

    // Assign note first - spread across the scale
    const scaleNotes = scales[currentScale].notes;
    const noteIndex = Math.floor((i / settings.numCircles) * scaleNotes.length);

    // Radius proportional to note (lower note = larger circle)
    const noteRatio = noteIndex / (scaleNotes.length - 1);
    const radius = 90 - noteRatio * 55; // Range: 90 (low notes) to 35 (high notes)

    let x, y, attempts = 0;
    do {
      x = radius * settings.radiusMultiplier + Math.random() * (app.screen.width - radius * settings.radiusMultiplier * 2);
      y = radius * settings.radiusMultiplier + Math.random() * (app.screen.height - radius * settings.radiusMultiplier * 2);
      attempts++;
    } while (attempts < 50 && circles.some(c => {
      const dx = c.x - x;
      const dy = c.y - y;
      return Math.sqrt(dx * dx + dy * dy) < c.radius + radius + 20;
    }));

    circles.push(new Circle(x, y, radius, noteIndex, getTheme().palette[i % getTheme().palette.length]));
  }
}
