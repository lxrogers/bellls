import { settings } from '../settings.js';
import { app, hangers, hangerContainer, getScreenScale } from '../engine/pixi-app.js';
import { playNote } from '../audio/play-note.js';
import { scales, currentScale } from '../audio/scales.js';
import { createRipple } from './Ripple.js';
import { getTheme } from '../themes.js';

// --- Gust system ---

export const gust = {
  active: false,
  direction: 0,       // radians
  magnitude: 0.1,     // slider midpoint
  duration: 120,      // frames (2 seconds at 60fps)
  elapsed: 0,
  autoMagnitude: 0,   // override for auto-gusts
};

let framesSinceLastNote = 0;
let autoGustThreshold = 300 + Math.random() * 300; // 5-10 seconds

export function notePlayed() {
  framesSinceLastNote = 0;
}

export function triggerGust() {
  gust.active = true;
  gust.elapsed = 0;
  gust.autoMagnitude = 0; // clear auto override for manual gusts
}

export function updateGust() {
  framesSinceLastNote++;

  // Auto-gust if no notes for 5-10 seconds
  if (!gust.active && framesSinceLastNote >= autoGustThreshold) {
    // Mostly left or right, with slight vertical variance (±30 degrees)
    const base = Math.random() < 0.5 ? 0 : Math.PI; // right or left
    gust.direction = base + (Math.random() - 0.5) * (Math.PI / 3);
    triggerGust();
    gust.autoMagnitude = 0.005 + Math.random() * 0.015; // 0.005 - 0.02
    framesSinceLastNote = 0;
    autoGustThreshold = 300 + Math.random() * 300; // re-roll for next time
  }

  if (!gust.active) return;
  gust.elapsed++;
  if (gust.elapsed >= gust.duration) {
    gust.active = false;
  }
}

function getGustForce(multiplier) {
  if (!gust.active) return { x: 0, y: 0 };
  const t = gust.elapsed / gust.duration;
  const mag = gust.autoMagnitude || gust.magnitude;
  const strength = Math.sin(Math.PI * t) * mag * multiplier;
  return {
    x: Math.cos(gust.direction) * strength,
    y: Math.sin(gust.direction) * strength,
  };
}

// --- Verlet point ---

class VerletPoint {
  constructor(x, y, pinned = false, mass = 1) {
    this.x = x;
    this.y = y;
    this.oldX = x;
    this.oldY = y;
    this.pinned = pinned;
    this.mass = mass;
  }

  update(gravity, friction, gustMultiplier) {
    if (this.pinned) return;
    const vx = (this.x - this.oldX) * friction;
    const vy = (this.y - this.oldY) * friction;
    const gustForce = getGustForce(gustMultiplier);
    this.oldX = this.x;
    this.oldY = this.y;
    this.x += vx + gustForce.x;
    this.y += vy + gravity * this.mass + gustForce.y;
  }
}

// --- Verlet stick (distance constraint) ---

class Stick {
  constructor(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    this.length = Math.sqrt(dx * dx + dy * dy);
  }

  solve() {
    const dx = this.p2.x - this.p1.x;
    const dy = this.p2.y - this.p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;
    const diff = (dist - this.length) / dist;

    // Mass-weighted: heavier points move less
    const totalMass = this.p1.mass + this.p2.mass;
    const w1 = this.p2.mass / totalMass; // p1 moves proportional to p2's mass
    const w2 = this.p1.mass / totalMass; // p2 moves proportional to p1's mass

    if (!this.p1.pinned) {
      this.p1.x += dx * diff * w1;
      this.p1.y += dy * diff * w1;
    }
    if (!this.p2.pinned) {
      this.p2.x -= dx * diff * w2;
      this.p2.y -= dy * diff * w2;
    }
  }
}

// --- Hanger entity ---

export class Hanger {
  constructor(anchorX, anchorY, ropeLength, noteIndex, colorIndex) {
    this.noteIndex = noteIndex;
    this.colorIndex = colorIndex;

    const scale = getScreenScale();
    this.circleRadius = (settings.hangerRadius || 12) * scale;

    // Build rope as chain of verlet points
    const segments = settings.hangerSegments || 10;
    const gap = ropeLength / segments;

    this.points = [];
    this.sticks = [];

    const tipWeight = settings.hangerTipWeight || 3.0;
    for (let i = 0; i <= segments; i++) {
      const pinned = i === 0;
      const mass = i === segments ? tipWeight : 1;
      this.points.push(new VerletPoint(anchorX, anchorY + i * gap, pinned, mass));
    }
    for (let i = 0; i < this.points.length - 1; i++) {
      this.sticks.push(new Stick(this.points[i], this.points[i + 1]));
    }

    // Gentle initial sway: offset oldX on all points to give a small horizontal velocity
    const nudgeVel = (Math.random() - 0.5) * 1.5;
    for (let i = 1; i <= segments; i++) {
      this.points[i].oldX = this.points[i].x - nudgeVel;
    }

    // Each hanger reacts to gust differently (0.2 - 2.0x)
    this.gustMultiplier = 0.2 + Math.random() * 1.8;

    // Collision cooldown
    this.soundCooldown = 0;

    // Graphics
    this.graphics = new PIXI.Graphics();
    hangerContainer.addChild(this.graphics);
  }

  get tip() {
    return this.points[this.points.length - 1];
  }

  update() {
    const gravity = settings.hangerGravity;
    const friction = settings.hangerDamping;
    const constraintIterations = 8;

    // Update all points
    for (const p of this.points) {
      p.update(gravity, friction, this.gustMultiplier);
    }

    // Solve constraints multiple times for stability
    for (let i = 0; i < constraintIterations; i++) {
      for (const s of this.sticks) {
        s.solve();
      }
    }

    if (this.soundCooldown > 0) this.soundCooldown--;
  }

  checkCollision(other) {
    const t1 = this.tip;
    const t2 = other.tip;
    const dx = t2.x - t1.x;
    const dy = t2.y - t1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = this.circleRadius + other.circleRadius;

    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;

      // Compute velocities BEFORE separation
      const v1x = t1.x - t1.oldX;
      const v1y = t1.y - t1.oldY;
      const v2x = t2.x - t2.oldX;
      const v2y = t2.y - t2.oldY;
      const relVx = v1x - v2x;
      const relVy = v1y - v2y;
      const impactSpeed = relVx * nx + relVy * ny;

      // Separate positions
      const overlap = (minDist - dist) / 2;
      if (!t1.pinned) {
        t1.x -= nx * overlap;
        t1.y -= ny * overlap;
      }
      if (!t2.pinned) {
        t2.x += nx * overlap;
        t2.y += ny * overlap;
      }

      // Move oldPos by same amount so separation doesn't create fake velocity
      if (!t1.pinned) {
        t1.oldX -= nx * overlap;
        t1.oldY -= ny * overlap;
      }
      if (!t2.pinned) {
        t2.oldX += nx * overlap;
        t2.oldY += ny * overlap;
      }

      // Apply bounce impulse along normal
      if (impactSpeed > 0) {
        const correction = (1 + settings.hangerBounce) / 2 * impactSpeed;
        if (!t1.pinned) {
          t1.oldX += correction * nx;
          t1.oldY += correction * ny;
        }
        if (!t2.pinned) {
          t2.oldX -= correction * nx;
          t2.oldY -= correction * ny;
        }
      }

      if (impactSpeed > settings.hangerMinImpact) {
        const velocity = Math.min(1.0, 0.3 + impactSpeed * 0.4);
        const palette = getTheme().palette;

        if (this.soundCooldown <= 0) {
          playNote(this.noteIndex, velocity, t1.x / app.screen.width);
          const c1 = palette[this.colorIndex % palette.length];
          createRipple(t1.x, t1.y, this.circleRadius, c1);
          this.soundCooldown = 20;
          notePlayed();
        }
        if (other.soundCooldown <= 0) {
          playNote(other.noteIndex, velocity, t2.x / app.screen.width);
          const c2 = palette[other.colorIndex % palette.length];
          createRipple(t2.x, t2.y, other.circleRadius, c2);
          other.soundCooldown = 20;
          notePlayed();
        }
      }
    }
  }

  draw() {
    this.graphics.clear();

    // Draw rope segments
    this.graphics.lineStyle(1.5, 0xcccccc, 0.5);
    this.graphics.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      this.graphics.lineTo(this.points[i].x, this.points[i].y);
    }

    // Draw circle at tip
    const palette = getTheme().palette;
    const color = palette[this.colorIndex % palette.length];
    this.graphics.lineStyle(2, 0xdddddd, 0.8);
    this.graphics.beginFill(color, 1.0);
    this.graphics.drawCircle(this.tip.x, this.tip.y, this.circleRadius);
    this.graphics.endFill();

    // Draw small anchor dot at top
    this.graphics.lineStyle(0);
    this.graphics.beginFill(0xcccccc, 0.4);
    this.graphics.drawCircle(this.points[0].x, this.points[0].y, 2);
    this.graphics.endFill();
  }

  destroy() {
    hangerContainer.removeChild(this.graphics);
    this.graphics.destroy();
  }
}

// --- Factory functions ---

export function createHangers() {
  while (hangers.length > 0) {
    const h = hangers.pop();
    h.destroy();
  }

  const centerX = app.screen.width / 2;
  const totalWidth = app.screen.width * (settings.hangerSpacing / 100);
  const scale = getScreenScale();
  const minSpacing = settings.hangerRadius * scale * 2.5;
  const spacing = Math.max(totalWidth / (settings.numHangers + 1), minSpacing);
  const actualWidth = spacing * (settings.numHangers + 1);
  const startX = centerX - actualWidth / 2;

  const ropeLength = app.screen.height * (Math.max(settings.hangerLength, 60) / 100);
  const anchorY = app.screen.height * 0.08; // Hang from near top

  const scaleNotes = scales[currentScale].notes;

  for (let i = 0; i < settings.numHangers; i++) {
    const x = startX + spacing * (i + 1);
    const noteIndex = Math.floor((i / Math.max(settings.numHangers - 1, 1)) * (scaleNotes.length - 1));
    const hanger = new Hanger(x, anchorY, ropeLength, noteIndex, i);
    hangers.push(hanger);
  }
}

export function destroyAllHangers() {
  while (hangers.length > 0) {
    const h = hangers.pop();
    h.destroy();
  }
}
