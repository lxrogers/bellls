import { audioReady, voicePools, voiceIndices, currentInstrument } from './audio-engine.js';
import { scales, currentScale } from './scales.js';

// Snap-to-nearest for recording: map any note to the closest available native sample
const NOTE_TO_MIDI = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
};
function noteToMidi(note) {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return 0;
  return NOTE_TO_MIDI[match[1]] + (parseInt(match[2]) + 1) * 12;
}
const SAMPLE_NOTES = ['F2', 'A2', 'C3', 'E3', 'G3', 'B3', 'D4', 'F4', 'A4', 'C5', 'E5'];
const SAMPLE_MIDIS = SAMPLE_NOTES.map(noteToMidi);
function snapToSample(note) {
  const midi = noteToMidi(note);
  let best = 0;
  let bestDist = Math.abs(midi - SAMPLE_MIDIS[0]);
  for (let i = 1; i < SAMPLE_MIDIS.length; i++) {
    const dist = Math.abs(midi - SAMPLE_MIDIS[i]);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return SAMPLE_NOTES[best];
}

// Recording state
let recording = false;
let recordedNotes = [];
let recordStartTime = 0;

export function startRecording() {
  recordedNotes = [];
  recordStartTime = performance.now();
  recording = true;
}

export function stopRecording() {
  recording = false;
  const notes = recordedNotes;
  recordedNotes = [];
  return notes;
}

export function isRecording() {
  return recording;
}

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

  if (recording) {
    const time = (performance.now() - recordStartTime) / 1000;
    recordedNotes.push({
      sample: snapToSample(note),
      time: Math.round(time * 1000) / 1000,
      velocity: Math.round(velocity * 1000) / 1000,
    });
  }
}
