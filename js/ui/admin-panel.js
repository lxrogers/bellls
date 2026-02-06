import { settings } from '../settings.js';
import { applyTheme } from '../themes.js';
import { updateRoomSize, updateVolume, setCurrentScale } from '../audio/index.js';
import { app, circles } from '../engine/pixi-app.js';
import { createCircles, destroyAllCircles } from '../entities/Circle.js';
import { createDustParticles } from '../entities/DustParticle.js';
import { createSlides } from '../entities/Slide.js';
import { createHangers, gust, triggerGust } from '../entities/Hanger.js';

export function setupAdminPanel() {
  document.getElementById('circles-toggle').addEventListener('change', (e) => {
    settings.circlesEnabled = e.target.checked;
    if (settings.circlesEnabled) {
      createCircles();
    } else {
      destroyAllCircles();
    }
  });

  document.getElementById('circles-slider').addEventListener('input', (e) => {
    settings.numCircles = parseInt(e.target.value);
    document.getElementById('circles-val').textContent = settings.numCircles;
    if (settings.circlesEnabled) {
      createCircles();
    }
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

  document.getElementById('dust-repulsion-slider').addEventListener('input', (e) => {
    settings.dustPositionRepulsion = parseInt(e.target.value) / 100000;
    document.getElementById('dust-repulsion-val').textContent = settings.dustPositionRepulsion.toFixed(6);
  });

  document.getElementById('slides-slider').addEventListener('input', (e) => {
    settings.numSlides = parseInt(e.target.value);
    document.getElementById('slides-val').textContent = settings.numSlides;
    createSlides();
  });

  document.getElementById('slide-length-slider').addEventListener('input', (e) => {
    settings.slideLength = parseInt(e.target.value);
    document.getElementById('slide-length-val').textContent = settings.slideLength + '%';
    createSlides();
  });

  document.getElementById('slide-spacing-slider').addEventListener('input', (e) => {
    settings.slideSpacing = parseInt(e.target.value);
    document.getElementById('slide-spacing-val').textContent = settings.slideSpacing + '%';
    createSlides();
  });

  document.getElementById('slide-radius-slider').addEventListener('input', (e) => {
    settings.slideRadius = parseInt(e.target.value);
    document.getElementById('slide-radius-val').textContent = settings.slideRadius;
    createSlides();
  });

  document.getElementById('hangers-slider').addEventListener('input', (e) => {
    settings.numHangers = parseInt(e.target.value);
    document.getElementById('hangers-val').textContent = settings.numHangers;
    createHangers();
  });

  document.getElementById('hanger-length-slider').addEventListener('input', (e) => {
    settings.hangerLength = parseInt(e.target.value);
    document.getElementById('hanger-length-val').textContent = settings.hangerLength + '%';
    createHangers();
  });

  document.getElementById('hanger-spacing-slider').addEventListener('input', (e) => {
    settings.hangerSpacing = parseInt(e.target.value);
    document.getElementById('hanger-spacing-val').textContent = settings.hangerSpacing + '%';
    createHangers();
  });

  document.getElementById('hanger-radius-slider').addEventListener('input', (e) => {
    settings.hangerRadius = parseInt(e.target.value);
    document.getElementById('hanger-radius-val').textContent = settings.hangerRadius;
    createHangers();
  });

  document.getElementById('hanger-gravity-slider').addEventListener('input', (e) => {
    settings.hangerGravity = parseInt(e.target.value) / 100;
    document.getElementById('hanger-gravity-val').textContent = settings.hangerGravity.toFixed(2);
  });

  document.getElementById('hanger-weight-slider').addEventListener('input', (e) => {
    settings.hangerTipWeight = parseInt(e.target.value) / 10;
    document.getElementById('hanger-weight-val').textContent = settings.hangerTipWeight.toFixed(1);
    createHangers();
  });

  document.getElementById('hanger-damping-slider').addEventListener('input', (e) => {
    settings.hangerDamping = parseInt(e.target.value) / 1000;
    document.getElementById('hanger-damping-val').textContent = settings.hangerDamping.toFixed(3);
  });

  document.getElementById('hanger-bounce-slider').addEventListener('input', (e) => {
    settings.hangerBounce = parseInt(e.target.value) / 100;
    document.getElementById('hanger-bounce-val').textContent = settings.hangerBounce.toFixed(2);
  });

  document.getElementById('hanger-impact-slider').addEventListener('input', (e) => {
    settings.hangerMinImpact = parseInt(e.target.value) / 100;
    document.getElementById('hanger-impact-val').textContent = settings.hangerMinImpact.toFixed(2);
  });

  document.getElementById('grid-toggle').addEventListener('change', (e) => {
    settings.gridEnabled = e.target.checked;
  });

  document.getElementById('solid-ripples-toggle').addEventListener('change', (e) => {
    settings.solidRipples = e.target.checked;
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

  // --- Gust controls ---

  // Magnitude slider (1-200 → 0.001-0.200)
  document.getElementById('gust-mag-slider').addEventListener('input', (e) => {
    gust.magnitude = parseInt(e.target.value) / 1000;
    document.getElementById('gust-mag-val').textContent = gust.magnitude.toFixed(3);
  });

  // Duration slider
  document.getElementById('gust-dur-slider').addEventListener('input', (e) => {
    gust.duration = parseInt(e.target.value);
    document.getElementById('gust-dur-val').textContent = (gust.duration / 60).toFixed(1) + 's';
  });

  // Gust button
  document.getElementById('gust-btn').addEventListener('click', triggerGust);

  // Direction dial (canvas)
  const dial = document.getElementById('gust-dial');
  const dialCtx = dial.getContext('2d');

  function drawDial() {
    const cx = dial.width / 2;
    const cy = dial.height / 2;
    const r = cx - 4;

    dialCtx.clearRect(0, 0, dial.width, dial.height);

    // Outer ring
    dialCtx.beginPath();
    dialCtx.arc(cx, cy, r, 0, Math.PI * 2);
    dialCtx.strokeStyle = 'rgba(255,255,255,0.2)';
    dialCtx.lineWidth = 1.5;
    dialCtx.stroke();

    // Direction line
    const endX = cx + Math.cos(gust.direction) * r * 0.8;
    const endY = cy + Math.sin(gust.direction) * r * 0.8;
    dialCtx.beginPath();
    dialCtx.moveTo(cx, cy);
    dialCtx.lineTo(endX, endY);
    dialCtx.strokeStyle = '#8a8a9a';
    dialCtx.lineWidth = 2;
    dialCtx.stroke();

    // Tip dot
    dialCtx.beginPath();
    dialCtx.arc(endX, endY, 3, 0, Math.PI * 2);
    dialCtx.fillStyle = '#b0aaa0';
    dialCtx.fill();
  }

  function setDialAngle(e) {
    const rect = dial.getBoundingClientRect();
    const x = e.clientX - rect.left - dial.width / 2;
    const y = e.clientY - rect.top - dial.height / 2;
    gust.direction = Math.atan2(y, x);
    drawDial();
  }

  let draggingDial = false;
  dial.addEventListener('mousedown', (e) => { draggingDial = true; setDialAngle(e); });
  document.addEventListener('mousemove', (e) => { if (draggingDial) setDialAngle(e); });
  document.addEventListener('mouseup', () => { draggingDial = false; });
  dial.addEventListener('touchstart', (e) => { draggingDial = true; setDialAngle(e.touches[0]); e.preventDefault(); });
  document.addEventListener('touchmove', (e) => { if (draggingDial) setDialAngle(e.touches[0]); });
  document.addEventListener('touchend', () => { draggingDial = false; });

  // Initial draw
  drawDial();
}
