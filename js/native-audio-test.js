// Native Audio Test — prototype for iOS background playback
// Generates random vibraphone notes and plays them via native AVAudioEngine
//
// Access native plugin via window.Capacitor.Plugins (injected by Capacitor bridge).
// No bundler needed — no npm imports.

function getNativeAudio() {
  return window.Capacitor?.Plugins?.NativeAudio;
}

// The 11 sample notes with exact .m4a files (no pitch shifting needed)
const SAMPLE_NOTES = ['F2', 'A2', 'C3', 'E3', 'G3', 'B3', 'D4', 'F4', 'A4', 'C5', 'E5'];

const SAMPLE_FILES = {
  'F2': 'Vibes_soft_F2_v1_rr1_Main_wet.m4a',
  'A2': 'Vibes_soft_A2_v1_rr1_Main_wet.m4a',
  'C3': 'Vibes_soft_C3_v1_rr2_Main_wet.m4a',
  'E3': 'Vibes_soft_E3_v1_rr2_Main_wet.m4a',
  'G3': 'Vibes_soft_G3_v1_rr1_Main_wet.m4a',
  'B3': 'Vibes_soft_B3_v1_rr1_Main_wet.m4a',
  'D4': 'Vibes_soft_D4_v1_rr1_Main_wet.m4a',
  'F4': 'Vibes_soft_F4_v1_rr1_Main_wet.m4a',
  'A4': 'Vibes_soft_A4_v1_rr1_Main_wet.m4a',
  'C5': 'Vibes_soft_C5_v1_rr1_Main_wet.m4a',
  'E5': 'Vibes_soft_E5_v1_rr1_Main_wet.m4a',
};

// Currently selected sequence key (null = random dense)
let selectedSequence = null;

export function setSelectedSequence(key) {
  selectedSequence = key;
}

function generateNoteEvents(durationSeconds, dense = false) {
  const events = [];
  let time = 0.5;

  while (time < durationSeconds) {
    const sample = SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)];
    const velocity = dense
      ? 0.15 + Math.random() * 0.35   // 0.15 - 0.50
      : 0.15 + Math.random() * 0.25;  // 0.15 - 0.40

    events.push({ sample, time, velocity });

    // In dense mode, sometimes add 1-2 extra simultaneous notes (chords)
    if (dense && Math.random() < 0.4) {
      const sample2 = SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)];
      events.push({ sample: sample2, time: time + 0.02, velocity: velocity * 0.8 });
    }
    if (dense && Math.random() < 0.15) {
      const sample3 = SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)];
      events.push({ sample: sample3, time: time + 0.04, velocity: velocity * 0.6 });
    }

    time += dense
      ? 0.2 + Math.random() * 0.6   // 0.2 - 0.8s between notes
      : 1.5 + Math.random() * 2.5;  // 1.5 - 4.0s between notes
  }

  // Sort by time (chords may be slightly out of order)
  events.sort((a, b) => a.time - b.time);
  return events;
}

async function getNotesForPlayback() {
  if (!selectedSequence) {
    return { notes: generateNoteEvents(120, true), label: 'random dense (2 min)' };
  }
  const { SEQUENCES } = await import('./recorded-sequences.js');
  const seq = SEQUENCES[selectedSequence];
  if (!seq) {
    return { notes: generateNoteEvents(120, true), label: 'random dense (2 min)' };
  }
  return { notes: seq.notes, label: seq.name };
}

export async function runNativeAudioTest() {
  const statusEl = document.getElementById('native-test-status');
  const NativeAudio = getNativeAudio();

  if (!NativeAudio) {
    statusEl.textContent = 'Error: Capacitor plugin not available. Capacitor=' + typeof window.Capacitor
      + ', Plugins=' + JSON.stringify(Object.keys(window.Capacitor?.Plugins || {}));
    return;
  }

  try {
    statusEl.textContent = 'Loading samples...';
    const samples = Object.entries(SAMPLE_FILES).map(([note, file]) => ({ note, file }));
    const loadResult = await NativeAudio.loadSamples({ samples });
    console.log('[native-audio-test] loaded:', loadResult);

    statusEl.textContent = 'Preparing notes...';
    const { notes, label } = await getNotesForPlayback();

    statusEl.textContent = `Scheduling ${notes.length} notes...`;
    const scheduleResult = await NativeAudio.scheduleNotes({ notes });
    console.log('[native-audio-test] scheduled:', scheduleResult);

    statusEl.textContent = 'Starting playback...';
    await NativeAudio.startPlayback();

    statusEl.textContent = `Playing "${label}" — ${notes.length} notes. Background the app to test.`;
  } catch (err) {
    statusEl.textContent = `Error: ${err.message || err}`;
    console.error('[native-audio-test]', err);
  }
}

export async function stopNativeAudioTest() {
  const NativeAudio = getNativeAudio();
  if (!NativeAudio) return;
  try {
    await NativeAudio.stopPlayback();
    const statusEl = document.getElementById('native-test-status');
    if (statusEl) statusEl.textContent = 'Stopped.';
  } catch (err) {
    console.error('[native-audio-test] stop error:', err);
  }
}
