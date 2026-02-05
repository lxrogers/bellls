import { settings } from '../settings.js';
import { scales } from '../audio/scales.js';
import { setCurrentScale } from '../audio/index.js';
import { updateRoomSize } from '../audio/index.js';
import { themes, applyTheme } from '../themes.js';
import { app, circles } from '../engine/pixi-app.js';
import { createCircles, destroyAllCircles } from '../entities/Circle.js';
import { createDustParticles } from '../entities/DustParticle.js';
import { createSlides } from '../entities/Slide.js';
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
  { scales: ['pentatonic-d'],       themes: ['warm', 'blossom'] },
  { scales: ['pentatonic-a-minor'], themes: ['dark', 'aquatic'] },
  { scales: ['whole-tone'],         themes: ['aquatic', 'dark'] },
  { scales: ['dorian'],             themes: ['warm', 'dark'] },
  { scales: ['miyako-bushi'],       themes: ['dark', 'blossom'] },
  { scales: ['sadge'],              themes: ['dark', 'aquatic'] },
];

// --- Generate ---

export function generateScene() {
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

  // Either circles OR slides, not both
  const useCircles = Math.random() < 0.3;

  let numSlides, slideLength, slideSpacing, slideRadius, dustCount, dustVelocity;
  let numCircles, baseVelocity, roomSize, rippleExpand, rippleFade, solidRipples;

  switch (density) {
    case 'sparse':
      numSlides    = randInt(3, 7);
      slideLength  = randInt(50, 85);
      slideSpacing = randInt(20, 50);
      slideRadius  = randInt(6, 15);
      dustCount    = randInt(20, 60);
      dustVelocity = randFloat(0.05, 0.15);
      numCircles   = randInt(2, 5);
      baseVelocity = randFloat(0.05, 0.15);
      roomSize     = randInt(50, 90);
      rippleExpand = randFloat(0.3, 0.8);
      rippleFade   = randFloat(0.05, 0.1);
      solidRipples = Math.random() < 0.6;
      break;

    case 'medium':
      numSlides    = randInt(7, 13);
      slideLength  = randInt(40, 70);
      slideSpacing = randInt(20, 40);
      slideRadius  = randInt(6, 20);
      dustCount    = randInt(30, 100);
      dustVelocity = randFloat(0.1, 0.25);
      numCircles   = randInt(4, 9);
      baseVelocity = randFloat(0.1, 0.25);
      roomSize     = randInt(30, 70);
      rippleExpand = randFloat(0.5, 1.5);
      rippleFade   = randFloat(0.05, 0.15);
      solidRipples = Math.random() < 0.5;
      break;

    case 'dense':
      numSlides    = randInt(12, 20);
      slideLength  = randInt(30, 60);
      slideSpacing = randInt(30, 80);
      slideRadius  = randInt(4, 12);
      dustCount    = randInt(80, 250);
      dustVelocity = randFloat(0.15, 0.4);
      numCircles   = randInt(6, 15);
      baseVelocity = randFloat(0.15, 0.35);
      roomSize     = randInt(20, 50);
      rippleExpand = randFloat(0.8, 2.0);
      rippleFade   = randFloat(0.08, 0.2);
      solidRipples = Math.random() < 0.4;
      break;
  }

  // Rotation: weighted toward 0
  const slideRotation = pick([-30, -15, -10, 0, 0, 0, 10, 15, 30]);

  return {
    name: generateName(),
    scale,
    theme,
    circlesEnabled: useCircles,
    slidesEnabled: !useCircles,
    numCircles,
    numSlides,
    dustCount,
    baseVelocity,
    slideLength,
    slideSpacing,
    slideRadius,
    dustVelocity,
    roomSize,
    solidRipples,
    rippleExpand,
    rippleFade,
    slideRotation,
  };
}

// --- Apply ---

export function applyScene(scene) {
  // 1. Write to settings
  settings.circlesEnabled = scene.circlesEnabled;
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
  settings.rippleExpand   = scene.rippleExpand;
  settings.rippleFade     = scene.rippleFade;

  // 2. Scale
  setCurrentScale(scene.scale);

  // 3. Theme
  applyTheme(scene.theme, app, circles);

  // 4. Clear ripples from previous scene
  destroyAllRipples();

  // 5. Recreate entities (scenes use either circles OR slides, not both)
  if (scene.circlesEnabled) {
    createCircles();
  } else {
    destroyAllCircles();
  }
  if (scene.slidesEnabled) {
    createSlides(scene.slideRotation);
  } else {
    // createSlides reads settings.numSlides; zero it to just clear, then restore
    const saved = settings.numSlides;
    settings.numSlides = 0;
    createSlides();
    settings.numSlides = saved;
  }
  createDustParticles();

  // 5. Audio
  updateRoomSize();

  // 6. Sync admin panel
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
  setChecked('solid-ripples-toggle', scene.solidRipples);
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

  // Dust
  setVal('dust-count-slider', scene.dustCount);
  setText('dust-count-val', scene.dustCount);
  setVal('dust-vel-slider', Math.round(scene.dustVelocity * 100));
  setText('dust-vel-val', scene.dustVelocity.toFixed(2));

  // Circles
  setChecked('circles-toggle', scene.circlesEnabled);
  setVal('circles-slider', scene.numCircles);
  setText('circles-val', scene.numCircles);
  setVal('velocity-slider', Math.round(scene.baseVelocity * 100));
  setText('velocity-val', scene.baseVelocity.toFixed(2));
}
