import { settings } from '../settings.js';
import { applyTheme } from '../themes.js';
import { updateRoomSize, updateVolume, setCurrentScale } from '../audio/index.js';
import { app, circles } from '../engine/pixi-app.js';
import { createCircles } from '../entities/Circle.js';
import { createDustParticles } from '../entities/DustParticle.js';

export function setupAdminPanel() {
  document.getElementById('circles-slider').addEventListener('input', (e) => {
    settings.numCircles = parseInt(e.target.value);
    document.getElementById('circles-val').textContent = settings.numCircles;
    createCircles();
  });

  document.getElementById('scale-select').addEventListener('change', (e) => {
    setCurrentScale(e.target.value);
  });

  document.getElementById('theme-select').addEventListener('change', (e) => {
    applyTheme(e.target.value, app, circles);
  });

  document.getElementById('volume-slider').addEventListener('input', (e) => {
    settings.volume = parseInt(e.target.value);
    document.getElementById('volume-val').textContent = settings.volume + '%';
    updateVolume();
  });

  document.getElementById('room-slider').addEventListener('input', (e) => {
    settings.roomSize = parseInt(e.target.value);
    document.getElementById('room-val').textContent = settings.roomSize + '%';
    updateRoomSize();
  });

  document.getElementById('velocity-slider').addEventListener('input', (e) => {
    settings.baseVelocity = parseInt(e.target.value) / 100;
    document.getElementById('velocity-val').textContent = settings.baseVelocity.toFixed(2);
    for (const c of circles) {
      const angle = Math.atan2(c.vy, c.vx);
      const newSpeed = settings.baseVelocity + (Math.random() - 0.5) * settings.baseVelocity * 0.5;
      c.vx = Math.cos(angle) * newSpeed;
      c.vy = Math.sin(angle) * newSpeed;
    }
  });

  document.getElementById('radius-slider').addEventListener('input', (e) => {
    settings.radiusMultiplier = parseInt(e.target.value) / 100;
    document.getElementById('radius-val').textContent = settings.radiusMultiplier.toFixed(2);
  });

  document.getElementById('ripple-expand-slider').addEventListener('input', (e) => {
    settings.rippleExpand = parseInt(e.target.value) / 10;
    document.getElementById('ripple-expand-val').textContent = settings.rippleExpand.toFixed(1);
  });

  document.getElementById('ripple-fade-slider').addEventListener('input', (e) => {
    settings.rippleFade = parseInt(e.target.value) / 10;
    document.getElementById('ripple-fade-val').textContent = settings.rippleFade.toFixed(1);
  });

  document.getElementById('dust-count-slider').addEventListener('input', (e) => {
    settings.dustCount = parseInt(e.target.value);
    document.getElementById('dust-count-val').textContent = settings.dustCount;
    createDustParticles();
  });

  document.getElementById('dust-vel-slider').addEventListener('input', (e) => {
    settings.dustVelocity = parseInt(e.target.value) / 100;
    document.getElementById('dust-vel-val').textContent = settings.dustVelocity.toFixed(2);
  });

  document.getElementById('dust-power-slider').addEventListener('input', (e) => {
    settings.dustFlowPower = parseInt(e.target.value) / 10000;
    document.getElementById('dust-power-val').textContent = settings.dustFlowPower.toFixed(4);
  });

  document.getElementById('dust-range-slider').addEventListener('input', (e) => {
    settings.dustFlowRange = parseInt(e.target.value);
    document.getElementById('dust-range-val').textContent = settings.dustFlowRange;
  });

  document.getElementById('dust-buffer-slider').addEventListener('input', (e) => {
    settings.dustCollisionBuffer = parseInt(e.target.value);
    document.getElementById('dust-buffer-val').textContent = settings.dustCollisionBuffer;
  });

  document.getElementById('dust-decay-slider').addEventListener('input', (e) => {
    settings.dustNudgeDecay = parseInt(e.target.value) / 100;
    document.getElementById('dust-decay-val').textContent = settings.dustNudgeDecay.toFixed(2);
  });

  document.getElementById('field-strength-slider').addEventListener('input', (e) => {
    settings.dustFieldStrength = parseInt(e.target.value) / 10000;
    document.getElementById('field-strength-val').textContent = settings.dustFieldStrength.toFixed(4);
  });

  document.getElementById('field-scale-slider').addEventListener('input', (e) => {
    settings.dustFieldScale = parseInt(e.target.value) / 1000;
    document.getElementById('field-scale-val').textContent = settings.dustFieldScale.toFixed(3);
  });
}
