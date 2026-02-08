import { settings } from '../settings.js';
import { scales, currentScale } from './scales.js';

// Audio state
export let audioReady = false;

// Background audio: when the app is backgrounded on iOS, JS execution stops
// but the Web Audio render thread keeps playing already-scheduled events.
// We pre-schedule ~60 seconds of generative notes into Tone.Transport so
// the sound bath continues seamlessly in the background.
let bgScheduledIds = [];
let keepAliveInterval = null;

function scheduleBackgroundNotes() {
  cancelBackgroundNotes();

  const pool = voicePools[currentInstrument];
  if (!pool || pool.length === 0) return;

  const scaleNotes = scales[currentScale].notes;
  const now = Tone.now();

  // Schedule ~60 seconds of gentle random notes directly on the AudioContext timeline.
  // These are pre-baked into the audio render thread and play even when JS is suspended.
  let time = 0.5;
  let voiceIdx = voiceIndices[currentInstrument] || 0;

  while (time < 60) {
    const note = scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
    const velocity = 0.15 + Math.random() * 0.25;
    const pan = Math.random() * 2 - 1;
    const duration = 2 + Math.random() * 2;
    const vi = voiceIdx % pool.length;
    const t = now + time;

    // Schedule directly on the sampler — this uses AudioContext scheduling
    // which runs on the audio thread, not the JS thread
    const voice = pool[vi];
    if (voice) {
      voice.panner.pan.setValueAtTime(pan, t);
      voice.sampler.triggerAttackRelease(note, duration, t, velocity);
    }

    voiceIdx++;
    time += 1.5 + Math.random() * 2.5;
  }

  console.log('[audio] scheduled ~' + Math.round(time) + 's of background notes');
}

function cancelBackgroundNotes() {
  // Stop all voices to cut off any remaining scheduled notes
  const pool = voicePools[currentInstrument];
  if (pool) {
    for (const voice of pool) {
      voice.sampler.releaseAll();
    }
  }
  bgScheduledIds = [];
}

function setupBackgroundAudio() {
  const ctx = Tone.context.rawContext;

  // Bridge: Web Audio → MediaStream → <audio> element.
  // iOS keeps the audio render thread alive when an <audio> element is playing.
  // The Tone.Gain() intermediary is needed — direct connect to native node doesn't work.
  try {
    const streamDest = ctx.createMediaStreamDestination();
    Tone.getDestination().connect(new Tone.Gain().connect(streamDest));

    const bgAudio = document.createElement('audio');
    bgAudio.srcObject = streamDest.stream;
    bgAudio.setAttribute('playsinline', '');
    bgAudio.volume = 1.0;

    const startBg = () => {
      bgAudio.play().catch(() => {});
      document.removeEventListener('click', startBg);
      document.removeEventListener('touchstart', startBg);
    };
    document.addEventListener('click', startBg);
    document.addEventListener('touchstart', startBg);

    console.log('[audio] MediaStream bridge active');
  } catch (e) {
    console.warn('[audio] MediaStream bridge failed:', e.message);
  }

  // When app backgrounds: schedule 60s of notes (JS stops but audio thread keeps playing)
  // When app foregrounds: cancel scheduled notes, resume collision-driven audio
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      scheduleBackgroundNotes();
    } else {
      cancelBackgroundNotes();
      if (Tone.context.state === 'suspended') {
        Tone.context.resume();
      }
    }
  });

  // Ping audio context periodically
  keepAliveInterval = setInterval(() => {
    if (Tone.context.state === 'suspended') {
      Tone.context.resume();
    }
  }, 1000);
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
      'F2': 'Vibes_soft_F2_v1_rr1_Main.m4a',
      'A2': 'Vibes_soft_A2_v1_rr1_Main.m4a',
      'C3': 'Vibes_soft_C3_v1_rr2_Main.m4a',
      'E3': 'Vibes_soft_E3_v1_rr2_Main.m4a',
      'G3': 'Vibes_soft_G3_v1_rr1_Main.m4a',
      'B3': 'Vibes_soft_B3_v1_rr1_Main.m4a',
      'D4': 'Vibes_soft_D4_v1_rr1_Main.m4a',
      'F4': 'Vibes_soft_F4_v1_rr1_Main.m4a',
      'A4': 'Vibes_soft_A4_v1_rr1_Main.m4a',
      'C5': 'Vibes_soft_C5_v1_rr1_Main.m4a',
      'E5': 'Vibes_soft_E5_v1_rr1_Main.m4a',
    },
    baseUrl: 'samples/'
  }
};

// Manually fetch and decode samples to work around WKWebView's capacitor://
// scheme returning status 0 (which breaks Tone.Sampler's internal XHR loader)
async function loadSampleBuffers(config) {
  const buffers = {};
  const ctx = Tone.context.rawContext;
  const results = await Promise.allSettled(
    Object.entries(config.urls).map(async ([note, filename]) => {
      const resp = await fetch(config.baseUrl + filename);
      const arrayBuf = await resp.arrayBuffer();
      if (arrayBuf.byteLength === 0) throw new Error(`empty response for ${filename}`);
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      return { note, audioBuf };
    })
  );
  for (const result of results) {
    if (result.status === 'fulfilled') {
      buffers[result.value.note] = new Tone.ToneAudioBuffer(result.value.audioBuf);
    } else {
      console.error('[audio] sample decode failed:', result.reason.message);
    }
  }
  return buffers;
}

export async function initAudio() {
  try {
    await Tone.start();
    console.log('[audio] Tone started, state:', Tone.context.state);
  } catch (err) {
    console.error('[audio] Tone.start() FAILED:', err);
    return;
  }
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

    // Load and decode all sample buffers manually (bypasses Tone's XHR loader
    // which fails on Capacitor's capacitor:// scheme due to status 0 responses)
    const buffers = await loadSampleBuffers(config);
    const bufferCount = Object.keys(buffers).length;
    console.log(`[audio] decoded ${bufferCount} samples for ${instName}`);

    for (let i = 0; i < VOICE_POOL_SIZE; i++) {
      const panner = new Tone.Panner(0).connect(delay);
      const sampler = new Tone.Sampler({ release: 4 }).connect(panner);
      // Add pre-decoded buffers directly to the sampler
      for (const [note, buffer] of Object.entries(buffers)) {
        sampler.add(note, buffer);
      }
      voicePools[instName].push({ sampler, panner });
    }

    if (bufferCount > 0) {
      instrumentsLoaded++;
      if (instrumentsLoaded >= totalInstruments) {
        audioReady = true;
        console.log('[audio] all samples loaded');
      }
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
