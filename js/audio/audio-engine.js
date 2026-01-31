import { settings } from '../settings.js';

// Audio state
export let audioReady = false;

// Keep audio alive in background tabs
let keepAliveInterval = null;
function setupBackgroundAudio() {
  // Create a silent audio element that keeps the audio context running
  const silentAudio = document.createElement('audio');
  silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
  silentAudio.loop = true;
  silentAudio.volume = 0.001; // Nearly silent

  // Also ping the audio context periodically
  keepAliveInterval = setInterval(() => {
    if (Tone.context.state === 'suspended') {
      Tone.context.resume();
    }
  }, 1000);

  // Resume audio when tab becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Tone.context.state === 'suspended') {
      Tone.context.resume();
    }
  });

  // Start the silent audio on first interaction
  const startSilent = () => {
    silentAudio.play().catch(() => {});
    document.removeEventListener('click', startSilent);
  };
  document.addEventListener('click', startSilent);
}
let instrumentsLoaded = 0;
const totalInstruments = 1;
const VOICE_POOL_SIZE = 12;

export const voicePools = {};
export const voiceIndices = {};
export let currentInstrument = 'vibraphone';

// Effect chain nodes
let reverb, convolver, delay, compressor, limiter;

export function setCurrentInstrument(name) {
  currentInstrument = name;
}

export function getVoicePools() {
  return voicePools;
}

// Instrument sample configurations
const instrumentConfigs = {
  vibraphone: {
    urls: {
      'F2': 'Vibes_soft_F2_v1_rr1_Main.wav',
      'A2': 'Vibes_soft_A2_v1_rr1_Main.wav',
      'C3': 'Vibes_soft_C3_v1_rr2_Main.wav',
      'E3': 'Vibes_soft_E3_v1_rr2_Main.wav',
      'G3': 'Vibes_soft_G3_v1_rr1_Main.wav',
      'B3': 'Vibes_soft_B3_v1_rr1_Main.wav',
      'D4': 'Vibes_soft_D4_v1_rr1_Main.wav',
      'F4': 'Vibes_soft_F4_v1_rr1_Main.wav',
      'A4': 'Vibes_soft_A4_v1_rr1_Main.wav',
      'C5': 'Vibes_soft_C5_v1_rr1_Main.wav',
      'E5': 'Vibes_soft_E5_v1_rr1_Main.wav',
    },
    baseUrl: 'samples/'
  }
};

export async function initAudio() {
  await Tone.start();
  Tone.context.lookAhead = 0.01;
  setupBackgroundAudio();

  limiter = new Tone.Limiter(-1).toDestination();
  compressor = new Tone.Compressor({
    threshold: -24, ratio: 4, attack: 0.003, release: 0.25, knee: 6
  }).connect(limiter);

  convolver = new Tone.Convolver({ wet: 0.45 }).connect(compressor);
  const irLength = 4 * Tone.context.sampleRate;
  const irBuffer = Tone.context.createBuffer(2, irLength, Tone.context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const channelData = irBuffer.getChannelData(channel);
    for (let i = 0; i < irLength; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / irLength);
    }
  }
  convolver.buffer = irBuffer;

  reverb = new Tone.Reverb({ decay: 6.5, wet: 0.45, preDelay: 0.055 }).connect(convolver);
  delay = new Tone.FeedbackDelay({ delayTime: '8n.', feedback: 0.25, wet: 0.15 }).connect(reverb);

  for (const [instName, config] of Object.entries(instrumentConfigs)) {
    voicePools[instName] = [];
    voiceIndices[instName] = 0;

    for (let i = 0; i < VOICE_POOL_SIZE; i++) {
      const panner = new Tone.Panner(0).connect(delay);
      const sampler = new Tone.Sampler({
        urls: config.urls,
        baseUrl: config.baseUrl,
        release: 4,
        onload: () => {
          if (i === 0) {
            console.log(`${instName} loaded`);
            instrumentsLoaded++;
            if (instrumentsLoaded >= totalInstruments) audioReady = true;
          }
        }
      }).connect(panner);
      voicePools[instName].push({ sampler, panner });
    }
  }

  const vol = -6 + (settings.volume / 100) * 18;
  for (const pool of Object.values(voicePools)) {
    for (const voice of pool) {
      voice.sampler.volume.value = vol;
    }
  }
}

let roomSizeTimeout = null;
export function updateRoomSize() {
  if (roomSizeTimeout) clearTimeout(roomSizeTimeout);
  roomSizeTimeout = setTimeout(async () => {
    if (!reverb || !convolver || !audioReady) return;
    const size = settings.roomSize / 100;
    try {
      if (convolver.wet) convolver.wet.value = 0.1 + size * 0.7;
      if (reverb.wet) reverb.wet.value = 0.2 + size * 0.6;
      const irLength = Math.floor((1 + size * 6) * Tone.context.sampleRate);
      const irBuffer = Tone.context.createBuffer(2, irLength, Tone.context.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const channelData = irBuffer.getChannelData(channel);
        for (let i = 0; i < irLength; i++) {
          const decayRate = 2 + (1 - size) * 4;
          channelData[i] = (Math.random() * 2 - 1) * Math.exp(-decayRate * i / irLength);
        }
      }
      convolver.buffer = irBuffer;
      reverb.decay = 1 + size * 10;
      reverb.preDelay = 0.01 + size * 0.09;
      await reverb.generate();
    } catch (err) {
      console.warn('Room size update error:', err);
    }
  }, 150);
}

export function updateVolume() {
  const vol = -6 + (settings.volume / 100) * 18;
  for (const pool of Object.values(voicePools)) {
    for (const voice of pool) {
      if (voice.sampler) voice.sampler.volume.value = vol;
    }
  }
}
