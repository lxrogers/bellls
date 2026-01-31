import { app, setStarted, initPixi } from './engine/pixi-app.js';
import { gameLoop, physicsLoop } from './engine/game-loop.js';
import { initAudio } from './audio/index.js';
import { createCircles } from './entities/Circle.js';
import { createDustParticles } from './entities/DustParticle.js';
import { setupAdminPanel } from './ui/admin-panel.js';

let experienceStarted = false;
let physicsInterval = null;

function startExperience() {
  if (experienceStarted) return;
  experienceStarted = true;
  setStarted(true);

  document.getElementById('start-overlay').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';

  initAudio();
  createCircles();
  createDustParticles();

  // Physics runs on setInterval (not throttled in background)
  physicsInterval = setInterval(physicsLoop, 1000 / 60);

  // Rendering runs on requestAnimationFrame (pauses in background, that's fine)
  app.ticker.add(gameLoop);
}

async function init() {
  await initPixi();
  setupAdminPanel();

  document.getElementById('start-overlay').addEventListener('click', startExperience);
  document.addEventListener('keydown', startExperience, { once: true });
}

init();
