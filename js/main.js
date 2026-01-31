import { app, setStarted, initPixi } from './engine/pixi-app.js';
import { gameLoop, physicsLoop } from './engine/game-loop.js';
import { initAudio, updateVolume } from './audio/index.js';
import { createCircles } from './entities/Circle.js';
import { createDustParticles } from './entities/DustParticle.js';
import { setupAdminPanel } from './ui/admin-panel.js';
import { settings } from './settings.js';

let experienceStarted = false;
let physicsInterval = null;
let isMuted = false;
let volumeBeforeMute = 70;

function startExperience() {
  if (experienceStarted) return;
  experienceStarted = true;
  setStarted(true);

  document.getElementById('start-overlay').style.display = 'none';
  document.getElementById('settings-btn').style.display = 'flex';
  document.getElementById('play-bar').classList.add('visible');

  initAudio();
  createCircles();
  createDustParticles();

  // Physics runs on setInterval (not throttled in background)
  physicsInterval = setInterval(physicsLoop, 1000 / 60);

  // Rendering runs on requestAnimationFrame (pauses in background, that's fine)
  app.ticker.add(gameLoop);
}

function setupPlayBar() {
  const muteBtn = document.getElementById('mute-btn');
  const playbarVolume = document.getElementById('playbar-volume');
  const adminVolume = document.getElementById('volume-slider');
  const adminVolumeVal = document.getElementById('volume-val');

  // Mute button
  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    muteBtn.classList.toggle('muted', isMuted);

    if (isMuted) {
      volumeBeforeMute = settings.volume;
      settings.volume = 0;
    } else {
      settings.volume = volumeBeforeMute;
    }

    // Sync sliders
    playbarVolume.value = settings.volume;
    adminVolume.value = settings.volume;
    adminVolumeVal.textContent = settings.volume + '%';
    updateVolume();
  });

  // Playbar volume slider
  playbarVolume.addEventListener('input', (e) => {
    const vol = parseInt(e.target.value);
    settings.volume = vol;

    // Unmute if adjusting volume
    if (vol > 0 && isMuted) {
      isMuted = false;
      muteBtn.classList.remove('muted');
    }

    // Sync with admin panel
    adminVolume.value = vol;
    adminVolumeVal.textContent = vol + '%';
    updateVolume();
  });

  // Sync playbar when admin volume changes
  adminVolume.addEventListener('input', () => {
    playbarVolume.value = adminVolume.value;
    if (parseInt(adminVolume.value) > 0 && isMuted) {
      isMuted = false;
      muteBtn.classList.remove('muted');
    }
  });
}

function setupSettingsToggle() {
  const settingsBtn = document.getElementById('settings-btn');
  const adminPanel = document.getElementById('admin-panel');

  settingsBtn.addEventListener('click', () => {
    const isVisible = adminPanel.classList.toggle('visible');
    settingsBtn.classList.toggle('active', isVisible);
  });
}

async function init() {
  await initPixi();
  setupAdminPanel();
  setupPlayBar();
  setupSettingsToggle();

  document.getElementById('start-overlay').addEventListener('click', startExperience);
  document.addEventListener('keydown', startExperience, { once: true });
}

init();
