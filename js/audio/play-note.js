import { audioReady, voicePools, voiceIndices, currentInstrument } from './audio-engine.js';
import { scales, currentScale } from './scales.js';

export function playNote(noteIndex, velocity = 0.5, xPosition = 0.5) {
  if (!audioReady) return;
  const pool = voicePools[currentInstrument];
  if (!pool || pool.length === 0) return;

  const voiceIndex = voiceIndices[currentInstrument];
  const voice = pool[voiceIndex];
  voiceIndices[currentInstrument] = (voiceIndex + 1) % pool.length;

  voice.panner.pan.value = (xPosition * 2) - 1;
  const scaleNotes = scales[currentScale].notes;
  const note = scaleNotes[noteIndex % scaleNotes.length];
  const duration = 2 + Math.random() * 2;
  voice.sampler.triggerAttackRelease(note, duration, undefined, velocity);
}
