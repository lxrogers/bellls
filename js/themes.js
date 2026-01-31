// Theme definitions
export const themes = {
  warm: {
    name: 'Warm Sand',
    background: 0xf5f0e8,
    outOfBounds: 0x2a2520,
    grid: 0x8b7355,
    ripple: 0xffffff,
    palette: [
      0xe3d2b6,  // warm ochre
      0xcbbead,  // warm brown
      0xd3b19d,  // sienna
      0xe5c5a4,  // peru
      0xe7ba97,  // chocolate
      0xddc68f,  // dark goldenrod
    ]
  },
  aquatic: {
    name: 'Aquatic',
    background: 0xe8f4f5,
    outOfBounds: 0x1a2a2e,
    grid: 0x7ba3a8,
    ripple: 0xffffff,
    palette: [
      0x7eb8c9,  // deeper teal
      0xb5c9a8,  // sea moss
      0xe8c4b8,  // coral sand
      0x9ab8d8,  // soft periwinkle
      0xc9d4a8,  // kelp green
      0xd8b8c4,  // sea anemone pink
    ]
  },
  dark: {
    name: 'Midnight',
    background: 0x1e1e2e,
    outOfBounds: 0x0a0a12,
    grid: 0x4a4a6a,
    ripple: 0x6a6a8a,
    palette: [
      0x7a7a9a,  // muted lavender
      0x8a8aa8,  // dusty purple
      0x6a7a8a,  // slate
      0x9a8a9a,  // mauve
      0x7a8a8a,  // sage grey
      0x8a7a8a,  // dusty rose
    ]
  },
  blossom: {
    name: 'Blossom',
    background: 0xf8f0f4,
    outOfBounds: 0x2a2028,
    grid: 0xb89aaa,
    ripple: 0xffffff,
    palette: [
      0xe8c8d8,  // soft pink
      0xd8c0d0,  // dusty rose
      0xc8b8c8,  // lavender
      0xe0d0dc,  // pale mauve
      0xd0c8d8,  // lilac
      0xe8d8e4,  // blush
    ]
  }
};

export let currentTheme = 'warm';

export function applyTheme(themeName, app, circles) {
  currentTheme = themeName;
  const theme = themes[themeName];

  // Update background
  if (app && app.renderer) {
    app.renderer.background.color = theme.background;
  }

  // Update circle colors
  if (circles) {
    circles.forEach((circle, i) => {
      circle.color = theme.palette[i % theme.palette.length];
    });
  }
}

export function getTheme() {
  return themes[currentTheme];
}
