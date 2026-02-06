// Musical scale definitions
export const scales = {
  'pentatonic-d': {
    name: 'D Major Pentatonic',
    notes: ['D2', 'F#2', 'A2', 'B2', 'D3', 'E3', 'F#3', 'A3', 'B3', 'D4', 'E4', 'F#4', 'A4', 'B4', 'D5']
  },
  'pentatonic-a-minor': {
    name: 'A Minor Pentatonic',
    notes: ['A2', 'C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5']
  },
  'sadge': {
    name: 'Sadge',
    notes: ['C3', 'D3', 'G3', 'A#3', 'D4', 'F4', 'A5', 'C5', 'D5', 'E5', 'F5', 'C6', 'E6', 'A6']
  }
};

export let currentScale = 'pentatonic-d';

export function setCurrentScale(scaleName) {
  currentScale = scaleName;
}
