import { settings } from '../settings.js';
import { getTheme } from '../themes.js';
import { app, circles, ripples, dustParticles, started } from './pixi-app.js';
import * as camera from './camera.js';
import { updateFlowTime } from '../utils/flow-field.js';

// Physics loop - runs on setInterval, keeps going in background tabs
export function physicsLoop() {
  if (!started) return;

  // Update circle physics
  for (const c of circles) {
    c.update();
  }

  // Check collisions (this triggers sounds)
  for (let i = 0; i < circles.length; i++) {
    for (let j = i + 1; j < circles.length; j++) {
      circles[i].checkCollision(circles[j]);
    }
  }

  // Update ripples
  for (const ripple of ripples) {
    ripple.update();
  }

  // Update flow field time
  updateFlowTime(0.016);

  // Update dust particles
  for (const dust of dustParticles) {
    dust.applyFlowField();
    for (const circle of circles) {
      dust.checkCircleFlow(circle);
    }
    for (const circle of circles) {
      dust.checkCircleCollision(circle);
    }
    dust.update();
  }

  // Remove dead ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    if (ripples[i].isDead()) {
      ripples[i].destroy();
      ripples.splice(i, 1);
    }
  }
}

// Render loop - runs on requestAnimationFrame, pauses in background (saves CPU)
export function gameLoop() {
  if (!started) return;

  // Update camera for follow mode
  if (camera.followedCircle) {
    camera.setTargetCamera(
      camera.followedCircle.x - app.screen.width / 2,
      camera.followedCircle.y - app.screen.height / 2,
      camera.followZoom,
      0.15
    );
  } else {
    camera.setTargetCamera(0, 0, 1, 0.11);
  }

  // Detect target change and start new animation
  if (camera.targetCameraZoom !== camera.prevTargetCameraZoom ||
      camera.targetGridOpacity !== camera.prevTargetGridOpacity) {
    camera.startAnimation();
  }

  // Animate with ease-in-out
  if (camera.animationStart !== null) {
    const elapsed = performance.now() - camera.animationStart;
    const progress = Math.min(elapsed / camera.animationDuration, 1);
    const eased = camera.easeInOutCubic(progress);

    camera.setCameraZoom(camera.startCameraZoom + (camera.targetCameraZoom - camera.startCameraZoom) * eased);
    camera.setGridOpacity(camera.startGridOpacity + (camera.targetGridOpacity - camera.startGridOpacity) * eased);

    // For camera position, blend between animated and live tracking
    if (camera.followedCircle) {
      const trackingBlend = eased;
      const animatedX = camera.startCameraX + (camera.prevTargetCameraX - camera.startCameraX) * eased;
      const animatedY = camera.startCameraY + (camera.prevTargetCameraY - camera.startCameraY) * eased;
      const liveX = camera.followedCircle.x - app.screen.width / 2;
      const liveY = camera.followedCircle.y - app.screen.height / 2;
      camera.setCameraPosition(
        animatedX + (liveX - animatedX) * trackingBlend,
        animatedY + (liveY - animatedY) * trackingBlend
      );
    } else {
      camera.setCameraPosition(
        camera.startCameraX + (camera.targetCameraX - camera.startCameraX) * eased,
        camera.startCameraY + (camera.targetCameraY - camera.startCameraY) * eased
      );
    }

    if (progress >= 1) {
      camera.endAnimation();
    }
  } else if (camera.followedCircle) {
    // After animation, track the circle live
    camera.setCameraPosition(
      camera.followedCircle.x - app.screen.width / 2,
      camera.followedCircle.y - app.screen.height / 2
    );
  }

  // Apply zoom to stage
  app.stage.scale.set(camera.cameraZoom);
  app.stage.pivot.set(app.screen.width / 2, app.screen.height / 2);
  app.stage.position.set(app.screen.width / 2, app.screen.height / 2);

  // Draw diamond grid pattern
  const grid = app.gridGraphics;
  grid.clear();
  if (camera.gridOpacity > 0.001) {
    grid.lineStyle(1, getTheme().grid, camera.gridOpacity);
    const w = app.screen.width;
    const h = app.screen.height;
    const s = camera.gridSpacing;

    // Diagonal lines (top-left to bottom-right)
    for (let x = -h; x < w + h; x += s) {
      grid.moveTo(x - camera.cameraX, -camera.cameraY);
      grid.lineTo(x + h - camera.cameraX, h - camera.cameraY);
    }
    // Diagonal lines (top-right to bottom-left)
    for (let x = -h; x < w + h; x += s) {
      grid.moveTo(x - camera.cameraX, -camera.cameraY);
      grid.lineTo(x - h - camera.cameraX, h - camera.cameraY);
    }
  }

  // Draw out-of-bounds overlay
  const oob = app.boundsGraphics;
  const w = app.screen.width;
  const h = app.screen.height;
  const pad = 2000;
  const oobColor = getTheme().outOfBounds;

  oob.clear();
  oob.beginFill(oobColor);
  oob.drawRect(-camera.cameraX - pad, -camera.cameraY - pad, pad, h + pad * 2);
  oob.drawRect(-camera.cameraX + w, -camera.cameraY - pad, pad, h + pad * 2);
  oob.drawRect(-camera.cameraX, -camera.cameraY - pad, w, pad);
  oob.drawRect(-camera.cameraX, -camera.cameraY + h, w, pad);
  oob.endFill();

  // Draw ripples
  for (const ripple of ripples) {
    ripple.draw();
  }

  // Draw dust particles
  for (const dust of dustParticles) {
    dust.draw();
  }

  // Draw circles
  for (const c of circles) {
    c.draw();
  }

  // FPS display
  document.getElementById('fps-display').textContent = Math.round(app.ticker.FPS) + ' fps';
}
