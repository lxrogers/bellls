import { settings } from '../settings.js';
import { flowNoise, flowTime } from '../utils/flow-field.js';
import { app, dustParticles, dustContainer, circles, slides } from '../engine/pixi-app.js';
import * as camera from '../engine/camera.js';
import { gust } from './Hanger.js';

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

    // Apply gust (lighter than hangers)
    if (gust.active) {
      const t = gust.elapsed / gust.duration;
      const strength = Math.sin(Math.PI * t) * gust.magnitude * 0.3;
      this.vx += Math.cos(gust.direction) * strength;
      this.vy += Math.sin(gust.direction) * strength;
    }

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Screen wrap
    const w = app.screen.width;
    const h = app.screen.height;
    if (this.x < 0) this.x += w;
    else if (this.x > w) this.x -= w;
    if (this.y < 0) this.y += h;
    else if (this.y > h) this.y -= h;
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
    
    // Collision buffer: prevent particles from getting within 2 pixels of circle edge
    const minDist = circle.r + this.size + 2;
    
    // Only apply position-based repulsion if particle is between 2-20px from circle edge
    const repulsionMin = circle.r + this.size + 2;
    const repulsionMax = circle.r + this.size + 20;
    
    // If particle is within repulsion range (2-20px from edge)
    // Include the exact 2px boundary in repulsion calculation
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
      
    }
    
    // Apply collision buffer only if particle is strictly inside the 2px boundary (not at the boundary)
    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.x = circle.x + nx * minDist;
      this.y = circle.y + ny * minDist;
    }
  }

  checkSlideCircleFlow(slide) {
    const dx = this.x - slide.circleX;
    const dy = this.y - slide.circleY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Distance from circle edge
    const edgeDist = dist - slide.circleRadius;

    // Only affect particles within range past the circle edge
    if (edgeDist < 0 || edgeDist > settings.dustFlowRange) return;

    // Calculate circle velocity from position change along line
    // Use circleVT (velocity along line) and line direction
    const lineDx = slide.endX - slide.x;
    const lineDy = slide.endY - slide.y;
    const lineLength = Math.sqrt(lineDx * lineDx + lineDy * lineDy);
    const lineDirX = lineDx / lineLength;
    const lineDirY = lineDy / lineLength;
    
    // Circle velocity in world space
    const circleVx = slide.circleVT * lineDx;
    const circleVy = slide.circleVT * lineDy;
    
    const circleSpeed = Math.sqrt(circleVx * circleVx + circleVy * circleVy);
    if (circleSpeed < 0.001) return;

    // Normalized direction from circle to particle (radius direction)
    const nx = dx / dist;
    const ny = dy / dist;

    // Normalized circle velocity
    const cvx = circleVx / circleSpeed;
    const cvy = circleVy / circleSpeed;

    // How "to the side" the particle is relative to motion direction
    const alignment = nx * cvx + ny * cvy;
    const sideAmount = 1 - Math.abs(alignment);

    // Tangent direction (perpendicular to radius)
    const tx1 = -ny;
    const ty1 = nx;

    // Pick tangent that aligns with circle velocity
    const dot = tx1 * circleVx + ty1 * circleVy;
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

  checkSlideCircleCollision(slide) {
    const dx = this.x - slide.circleX;
    const dy = this.y - slide.circleY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Collision buffer: prevent particles from getting within 2 pixels of circle edge
    const minDist = slide.circleRadius + this.size + 2;
    
    // Only apply position-based repulsion if particle is between 2-20px from circle edge
    const repulsionMin = slide.circleRadius + this.size + 2;
    const repulsionMax = slide.circleRadius + this.size + 20;
    
    // If particle is within repulsion range (2-20px from edge)
    if (dist >= repulsionMin && dist <= repulsionMax) {
      // Calculate direction from circle center to particle
      const nx = dx / dist;
      const ny = dy / dist;
      
      // Calculate repulsion strength - stronger when closer to circle edge
      const distanceFromEdge = dist - (slide.circleRadius + this.size);
      const repulsionFactor = 1 - (distanceFromEdge / 18); // 1.0 at 2px, 0.0 at 20px
      
      // Apply position repulsion
      const repulsionDistance = repulsionFactor * settings.dustPositionRepulsion * 20;
      this.x += nx * repulsionDistance;
      this.y += ny * repulsionDistance;
    }
    
    // Apply collision buffer
    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.x = slide.circleX + nx * minDist;
      this.y = slide.circleY + ny * minDist;
    }
  }

  checkHangerFlow(hanger) {
    const tip = hanger.tip;
    const dx = this.x - tip.x;
    const dy = this.y - tip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const edgeDist = dist - hanger.circleRadius;
    if (edgeDist < 0 || edgeDist > settings.dustFlowRange) return;

    // Tip velocity from verlet
    const tipVx = tip.x - tip.oldX;
    const tipVy = tip.y - tip.oldY;
    const tipSpeed = Math.sqrt(tipVx * tipVx + tipVy * tipVy);
    if (tipSpeed < 0.001) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const tx = -ny;
    const ty = nx;
    const dot = tx * tipVx + ty * tipVy;
    const sign = dot >= 0 ? -1 : 1;

    const falloff = 1 - (edgeDist / settings.dustFlowRange);
    const force = falloff * settings.dustFlowPower * tipSpeed;
    this.vx += tx * sign * force;
    this.vy += ty * sign * force;
  }

  checkHangerCollision(hanger) {
    const tip = hanger.tip;
    const dx = this.x - tip.x;
    const dy = this.y - tip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const minDist = hanger.circleRadius + this.size + 2;
    const repulsionMin = hanger.circleRadius + this.size + 2;
    const repulsionMax = hanger.circleRadius + this.size + 20;

    if (dist >= repulsionMin && dist <= repulsionMax) {
      const nx = dx / dist;
      const ny = dy / dist;
      const distanceFromEdge = dist - (hanger.circleRadius + this.size);
      const repulsionFactor = 1 - (distanceFromEdge / 18);
      const repulsionDistance = repulsionFactor * settings.dustPositionRepulsion * 20;
      this.x += nx * repulsionDistance;
      this.y += ny * repulsionDistance;
    }

    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.x = tip.x + nx * minDist;
      this.y = tip.y + ny * minDist;
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
