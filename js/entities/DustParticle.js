import { settings } from '../settings.js';
import { flowNoise, flowTime } from '../utils/flow-field.js';
import { app, dustParticles, dustContainer, circles } from '../engine/pixi-app.js';
import * as camera from '../engine/camera.js';

export class DustParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    // Small random initial velocity
    this.vx = (Math.random() - 0.5) * settings.dustVelocity;
    this.vy = (Math.random() - 0.5) * settings.dustVelocity;
    // Nudge (acceleration) - decays over time
    this.nudgeX = 0;
    this.nudgeY = 0;

    this.size = 1.5 + Math.random() * 1.5;
    this.opacity = 1;

    this.graphics = new PIXI.Graphics();
    dustContainer.addChild(this.graphics);
  }

  applyFlowField() {
    // Get flow angle at this position
    const angle = flowNoise(this.x, this.y, flowTime);

    // Apply force in flow direction
    this.vx += Math.cos(angle) * settings.dustFieldStrength;
    this.vy += Math.sin(angle) * settings.dustFieldStrength;
  }

  update() {
    // Apply nudge to velocity
    this.vx += this.nudgeX;
    this.vy += this.nudgeY;

    // Decay nudge
    this.nudgeX *= settings.dustNudgeDecay;
    this.nudgeY *= settings.dustNudgeDecay;

    // Apply slight drag to velocity
    this.vx *= 0.995;
    this.vy *= 0.995;

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Wall bounce
    if (this.x < 0) { this.x = 0; this.vx *= -0.5; }
    if (this.x > app.screen.width) { this.x = app.screen.width; this.vx *= -0.5; }
    if (this.y < 0) { this.y = 0; this.vy *= -0.5; }
    if (this.y > app.screen.height) { this.y = app.screen.height; this.vy *= -0.5; }
  }

  checkCircleFlow(circle) {
    const dx = this.x - circle.x;
    const dy = this.y - circle.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Distance from circle edge
    const edgeDist = dist - circle.r;

    // Only affect particles within range past the circle edge
    if (edgeDist < 0 || edgeDist > settings.dustFlowRange) return;

    // Circle speed - effect scales with velocity
    const circleSpeed = Math.sqrt(circle.vx * circle.vx + circle.vy * circle.vy);
    if (circleSpeed < 0.001) return;

    // Normalized direction from circle to particle (radius direction)
    const nx = dx / dist;
    const ny = dy / dist;

    // Normalized circle velocity
    const cvx = circle.vx / circleSpeed;
    const cvy = circle.vy / circleSpeed;

    // How "to the side" the particle is relative to motion direction
    const alignment = nx * cvx + ny * cvy;
    const sideAmount = 1 - Math.abs(alignment);

    // Tangent direction (perpendicular to radius)
    const tx1 = -ny;
    const ty1 = nx;

    // Pick tangent that aligns with circle velocity
    const dot = tx1 * circle.vx + ty1 * circle.vy;
    const sign = dot >= 0 ? -1 : 1;

    const tx = tx1 * sign;
    const ty = ty1 * sign;

    // Inward direction (toward circle center)
    const inwardX = -nx;
    const inwardY = -ny;

    // Blend tangent with inward - more inward as particle gets to the sides
    const inwardBias = sideAmount * 0.8;
    const forceX = tx * (1 - inwardBias) + inwardX * inwardBias;
    const forceY = ty * (1 - inwardBias) + inwardY * inwardBias;

    // Normalize
    const forceMag = Math.sqrt(forceX * forceX + forceY * forceY);
    const normForceX = forceX / forceMag;
    const normForceY = forceY / forceMag;

    // Force falloff: stronger at edge, weaker at range
    const falloff = 1 - (edgeDist / settings.dustFlowRange);

    // Apply force directly to velocity
    const force = falloff * settings.dustFlowPower * circleSpeed;
    this.vx += normForceX * force;
    this.vy += normForceY * force;
  }

  checkCircleCollision(circle) {
    const dx = this.x - circle.x;
    const dy = this.y - circle.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Only apply position-based repulsion if particle is between 2-20px from circle edge
    const repulsionMin = circle.r + this.size + 2;
    const repulsionMax = circle.r + this.size + 20;
    
    // If particle is within repulsion range (2-20px from edge)
    if (dist >= repulsionMin && dist <= repulsionMax) {
      // Calculate direction from circle center to particle
      const nx = dx / dist;
      const ny = dy / dist;
      
      // Calculate repulsion strength - stronger when closer to circle edge
      const distanceFromEdge = dist - (circle.r + this.size);
      const repulsionFactor = 1 - (distanceFromEdge / 18); // 1.0 at 2px, 0.0 at 20px
      
      // Apply position repulsion - push particle further away from circle center
      // Extreme multiplier to shoot particles across screen at max setting
      const repulsionDistance = repulsionFactor * settings.dustPositionRepulsion * 20;
      this.x += nx * repulsionDistance;
      this.y += ny * repulsionDistance;
      
      // Debug: Log the repulsion effect when it occurs
      if (settings.dustPositionRepulsion > 0.05 && repulsionFactor > 0.8) {
        console.log(`Repulsion: distance=${dist.toFixed(2)}, factor=${repulsionFactor.toFixed(2)}, distance=${repulsionDistance.toFixed(3)}`);
      }
    }
    
    // Collision buffer: prevent particles from getting within 2 pixels of circle edge
    // Only apply if particle is inside the buffer (not in repulsion range)
    const minDist = circle.r + this.size + 2;
    if (dist < minDist && dist > 0 && (dist < repulsionMin || dist > repulsionMax)) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.x = circle.x + nx * minDist;
      this.y = circle.y + ny * minDist;
    }
  }

  draw() {
    const drawX = this.x - camera.cameraX;
    const drawY = this.y - camera.cameraY;

    this.graphics.clear();
    this.graphics.beginFill(0xffffff, this.opacity);
    this.graphics.drawCircle(drawX, drawY, this.size);
    this.graphics.endFill();
  }

  destroy() {
    dustContainer.removeChild(this.graphics);
    this.graphics.destroy();
  }
}

export function createDustParticles() {
  // Remove extra particles
  while (dustParticles.length > settings.dustCount) {
    const p = dustParticles.pop();
    p.destroy();
  }

  // Add new particles
  while (dustParticles.length < settings.dustCount) {
    const x = Math.random() * app.screen.width;
    const y = Math.random() * app.screen.height;
    dustParticles.push(new DustParticle(x, y));
  }
}
