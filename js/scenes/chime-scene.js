import { settings } from '../settings.js';
import { scales } from '../audio/scales.js';
import { setCurrentScale } from '../audio/index.js';
import { updateRoomSize } from '../audio/index.js';
import { themes, applyTheme } from '../themes.js';
import { app, circles } from '../engine/pixi-app.js';
import { createCircles, destroyAllCircles } from '../entities/Circle.js';
import { createDustParticles } from '../entities/DustParticle.js';
import { createSlides } from '../entities/Slide.js';
import { createHangers, destroyAllHangers } from '../entities/Hanger.js';
import { destroyAllRipples } from '../entities/Ripple.js';

// --- Name generation ---

const adjectives = [
  'Gentle', 'Distant', 'Floating', 'Still', 'Quiet', 'Deep',
  'Soft', 'Fading', 'Warm', 'Cool', 'Slow', 'Drifting',
  'Pale', 'Dim', 'Hollow', 'Glowing', 'Sunken', 'Endless'
];

const nouns = [
  'Rain', 'Fog', 'Tide', 'Ember', 'Garden', 'Stones',
  'Moss', 'Stream', 'Dusk', 'Shore', 'Glass', 'Bells',
  'Lanterns', 'Pines', 'Petals', 'Silk', 'Mist', 'Frost'
];

function generateName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

// --- Utilities ---

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return min + Math.random() * (max - min);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Mood pairings (scale + theme affinity) ---

const moodPairings = [
  { scales: ['pentatonic-d'],       themes: ['warm', 'blossom', 'flamingo', 'fairy', 'coral', 'candy'] },
  { scales: ['pentatonic-a-minor'], themes: ['dark', 'aquatic', 'neon-depths', 'violet-dusk', 'orchid'] },
  { scales: ['sadge'],              themes: ['dark', 'aquatic', 'wine', 'neon-depths', 'ember', 'crimson-ink', 'violet-dusk', 'berry'] },
];

// --- Generate ---

export function generateScene(forceEntityType = null) {
  // Pick scale + theme (80% use mood affinity, 20% fully random)
  let scale, theme;
  if (Math.random() < 0.8) {
    const mood = pick(moodPairings);
    scale = pick(mood.scales);
    theme = pick(mood.themes);
  } else {
    scale = pick(Object.keys(scales));
    theme = pick(Object.keys(themes));
  }

  // Density archetype
  const density = pick(['sparse', 'medium', 'dense']);

  // Pick one entity type: circles (20%), slides (40%), hangers (40%)
  let entityType;
  if (forceEntityType) {
    entityType = forceEntityType;
  } else {
    const roll = Math.random();
    entityType = roll < 0.2 ? 'circles' : roll < 0.6 ? 'slides' : 'hangers';
  }

  let numSlides, slideLength, slideSpacing, slideRadius;
  let numCircles, baseVelocity;
  let numHangers, hangerLength, hangerSpacing, hangerRadius;
  let dustCount, dustVelocity, roomSize, rippleExpand, rippleFade, solidRipples;
  const solidRippleOpacity = pick([0.15, 0.5, 0.75, 1.0]);

  switch (density) {
    case 'sparse':
      numSlides      = randInt(5, 7);
      slideLength    = randInt(50, 85);
      slideSpacing   = randInt(20, 50);
      slideRadius    = randInt(6, 15);
      numCircles     = randInt(7, 10);
      baseVelocity   = randFloat(0.4, 0.6);
      numHangers     = randInt(6, 10);
      hangerLength   = randInt(55, 70);
      hangerSpacing  = randInt(15, 35);
      hangerRadius   = randInt(10, 18);
      dustCount      = randInt(20, 60);
      dustVelocity   = randFloat(0.05, 0.15);
      roomSize       = randInt(50, 90);
      rippleExpand   = randFloat(0.1, 0.4);
      rippleFade     = randFloat(0.05, 0.1);
      solidRipples   = Math.random() < 0.6;
      break;

    case 'medium':
      numSlides      = randInt(7, 13);
      slideLength    = randInt(40, 70);
      slideSpacing   = randInt(20, 40);
      slideRadius    = randInt(6, 20);
      numCircles     = randInt(8, 16);
      baseVelocity   = randFloat(0.4, 0.8);
      numHangers     = randInt(10, 16);
      hangerLength   = randInt(50, 65);
      hangerSpacing  = randInt(15, 30);
      hangerRadius   = randInt(8, 15);
      dustCount      = randInt(30, 100);
      dustVelocity   = randFloat(0.1, 0.25);
      roomSize       = randInt(30, 70);
      rippleExpand   = randFloat(0.2, 0.5);
      rippleFade     = randFloat(0.05, 0.15);
      solidRipples   = Math.random() < 0.5;
      break;

    case 'dense':
      numSlides      = randInt(12, 20);
      slideLength    = randInt(30, 60);
      slideSpacing   = randInt(30, 80);
      slideRadius    = randInt(4, 12);
      numCircles     = randInt(12, 25);
      baseVelocity   = randFloat(0.4, 1.0);
      numHangers     = randInt(16, 25);
      hangerLength   = randInt(50, 60);
      hangerSpacing  = randInt(15, 25);
      hangerRadius   = randInt(6, 12);
      dustCount      = randInt(80, 250);
      dustVelocity   = randFloat(0.15, 0.4);
      roomSize       = randInt(20, 50);
      rippleExpand   = randFloat(0.3, 0.7);
      rippleFade     = randFloat(0.08, 0.2);
      solidRipples   = Math.random() < 0.4;
      break;
  }

  // Slide rotation: weighted toward 0, constrained on narrow screens
  const aspect = window.innerWidth / window.innerHeight;
  const slideRotationOptions = aspect < 0.7
    ? [-15, -10, 0, 0, 0, 10, 15]
    : [-30, -15, -10, 0, 0, 0, 10, 15, 30];
  const slideRotation = pick(slideRotationOptions);
  const gridEnabled = Math.random() < 0.3;

  // Hanger length curve: flat is rare, variation is the norm
  const hangerCurve = pick([
    'flat',
    'linear-up', 'linear-up',
    'linear-down', 'linear-down',
    'arc-up', 'arc-up',
    'arc-down', 'arc-down',
    'sine', 'sine',
  ]);

  return {
    name: generateName(),
    scale,
    theme,
    entityType,
    // Circles
    numCircles,
    baseVelocity,
    // Slides
    numSlides,
    slideLength,
    slideSpacing,
    slideRadius,
    slideRotation,
    // Hangers
    numHangers,
    hangerLength,
    hangerSpacing,
    hangerRadius,
    hangerCurve,
    // Shared
    dustCount,
    dustVelocity,
    roomSize,
    solidRipples,
    solidRippleOpacity,
    rippleExpand,
    rippleFade,
    gridEnabled,
  };
}

// --- Apply ---

export function applyScene(scene) {
  // 1. Write to settings
  settings.circlesEnabled = scene.entityType === 'circles';
  settings.numCircles     = scene.numCircles;
  settings.numSlides      = scene.numSlides;
  settings.dustCount      = scene.dustCount;
  settings.baseVelocity   = scene.baseVelocity;
  settings.slideLength    = scene.slideLength;
  settings.slideSpacing   = scene.slideSpacing;
  settings.slideRadius    = scene.slideRadius;
  settings.dustVelocity   = scene.dustVelocity;
  settings.roomSize       = scene.roomSize;
  settings.solidRipples   = scene.solidRipples;
  settings.solidRippleOpacity = scene.solidRippleOpacity;
  settings.rippleExpand   = scene.rippleExpand;
  settings.rippleFade     = scene.rippleFade;
  settings.gridEnabled    = scene.gridEnabled;
  settings.numHangers     = scene.numHangers;
  settings.hangerLength   = scene.hangerLength;
  settings.hangerSpacing  = scene.hangerSpacing;
  settings.hangerRadius   = scene.hangerRadius;

  // 2. Scale
  setCurrentScale(scene.scale);

  // 3. Theme
  applyTheme(scene.theme, app, circles);

  // 4. Clear ripples from previous scene
  destroyAllRipples();

  // 5. Recreate entities (only the active type; destroy the others)
  if (scene.entityType === 'circles') {
    createCircles();
  } else {
    destroyAllCircles();
  }

  if (scene.entityType === 'slides') {
    createSlides(scene.slideRotation);
  } else {
    const saved = settings.numSlides;
    settings.numSlides = 0;
    createSlides();
    settings.numSlides = saved;
  }

  if (scene.entityType === 'hangers') {
    createHangers(scene.hangerCurve);
  } else {
    destroyAllHangers();
  }

  createDustParticles();

  // 6. Audio
  updateRoomSize();

  // 7. Sync admin panel
  syncAdminPanel(scene);
}

// --- Sync admin panel controls ---

function syncAdminPanel(scene) {
  const setVal = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  const setChecked = (id, checked) => {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
  };

  // Scale & Theme
  setVal('scale-select', scene.scale);
  setVal('theme-select', scene.theme);

  // Room size
  setVal('room-slider', scene.roomSize);
  setText('room-val', scene.roomSize + '%');

  // Ripples
  setChecked('grid-toggle', scene.gridEnabled);
  setChecked('solid-ripples-toggle', scene.solidRipples);
  setVal('ripple-opacity-slider', Math.round(scene.solidRippleOpacity * 100));
  setText('ripple-opacity-val', Math.round(scene.solidRippleOpacity * 100) + '%');
  setVal('ripple-expand-slider', Math.round(scene.rippleExpand * 10));
  setText('ripple-expand-val', scene.rippleExpand.toFixed(1));
  setVal('ripple-fade-slider', Math.round(scene.rippleFade * 10));
  setText('ripple-fade-val', scene.rippleFade.toFixed(1));

  // Slides
  setVal('slides-slider', scene.numSlides);
  setText('slides-val', scene.numSlides);
  setVal('slide-length-slider', scene.slideLength);
  setText('slide-length-val', scene.slideLength + '%');
  setVal('slide-spacing-slider', scene.slideSpacing);
  setText('slide-spacing-val', scene.slideSpacing + '%');
  setVal('slide-radius-slider', scene.slideRadius);
  setText('slide-radius-val', scene.slideRadius);

  // Hangers
  setVal('hangers-slider', scene.numHangers);
  setText('hangers-val', scene.numHangers);
  setVal('hanger-length-slider', scene.hangerLength);
  setText('hanger-length-val', scene.hangerLength + '%');
  setVal('hanger-spacing-slider', scene.hangerSpacing);
  setText('hanger-spacing-val', scene.hangerSpacing + '%');
  setVal('hanger-radius-slider', scene.hangerRadius);
  setText('hanger-radius-val', scene.hangerRadius);
  setVal('hanger-gravity-slider', Math.round(settings.hangerGravity * 100));
  setText('hanger-gravity-val', settings.hangerGravity.toFixed(2));
  setVal('hanger-weight-slider', Math.round(settings.hangerTipWeight * 10));
  setText('hanger-weight-val', settings.hangerTipWeight.toFixed(1));

  // Dust
  setVal('dust-count-slider', scene.dustCount);
  setText('dust-count-val', scene.dustCount);
  setVal('dust-vel-slider', Math.round(scene.dustVelocity * 100));
  setText('dust-vel-val', scene.dustVelocity.toFixed(2));

  // Circles
  setChecked('circles-toggle', scene.entityType === 'circles');
  setVal('circles-slider', scene.numCircles);
  setText('circles-val', scene.numCircles);
  setVal('velocity-slider', Math.round(scene.baseVelocity * 100));
  setText('velocity-val', scene.baseVelocity.toFixed(2));
}
