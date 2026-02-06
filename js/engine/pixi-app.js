import { getTheme } from '../themes.js';
import * as camera from './camera.js';

// PixiJS Application instance
export let app = null;

// Containers for layered rendering
export let circleContainer = null;
export let rippleContainer = null;
export let dustContainer = null;
export let slideContainer = null;
export let hangerContainer = null;

// Shared entity arrays
export const circles = [];
export const ripples = [];
export const dustParticles = [];
export const slides = [];
export const hangers = [];

// Application state
export let started = false;

// Screen scale factor for responsive sizing (1.0 at 1000px, scales down on smaller screens)
export function getScreenScale() {
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  return Math.max(0.6, minDim / 1000);
}

export function setStarted(value) {
  started = value;
}

export async function initPixi() {
  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: getTheme().background,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    forceCanvas: false,
  });
  document.getElementById('app').appendChild(app.view);

  // Create containers for layering
  const gridContainer = new PIXI.Container();
  const blurFilter = new PIXI.filters.BlurFilter();
  blurFilter.blur = 1; // Subtle blur for grid background
  gridContainer.filters = [blurFilter];
  
  rippleContainer = new PIXI.Container();
  dustContainer = new PIXI.Container();
  circleContainer = new PIXI.Container();
  slideContainer = new PIXI.Container();
  hangerContainer = new PIXI.Container();
  const boundsOverlay = new PIXI.Container();

  // Grid pattern (for follow mode)
  const gridGraphics = new PIXI.Graphics();
  gridContainer.addChild(gridGraphics);

  // Out-of-bounds overlay (drawn on top of everything)
  const boundsGraphics = new PIXI.Graphics();
  boundsOverlay.addChild(boundsGraphics);

  // Store for updating in game loop
  app.gridGraphics = gridGraphics;
  app.boundsGraphics = boundsGraphics;
  app.gridBlurFilter = blurFilter;

  // All PixiJS classes are available globally via the PIXI object since it's loaded via CDN
  app.stage.addChild(gridContainer);
  app.stage.addChild(rippleContainer);
  app.stage.addChild(dustContainer);
  app.stage.addChild(circleContainer);
  app.stage.addChild(slideContainer);
  app.stage.addChild(hangerContainer);
  app.stage.addChild(boundsOverlay);

  // Handle resize
  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
  });

  // Handle click for follow mode
  app.view.addEventListener('click', (e) => {
    if (!started) return;

    const rect = app.view.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (app.screen.width / rect.width) + camera.cameraX;
    const clickY = (e.clientY - rect.top) * (app.screen.height / rect.height) + camera.cameraY;

    // Check if clicked on a circle
    let clickedCircle = null;
    for (const circle of circles) {
      const dx = circle.x - clickX;
      const dy = circle.y - clickY;
      if (Math.sqrt(dx * dx + dy * dy) < circle.r) {
        clickedCircle = circle;
        break;
      }
    }

    if (clickedCircle) {
      // Toggle follow - if clicking same circle, stop following
      if (camera.followedCircle === clickedCircle) {
        camera.setFollowedCircle(null);
      } else {
        camera.setFollowedCircle(clickedCircle);
      }
    } else {
      // Clicked empty space - stop following
      camera.setFollowedCircle(null);
    }
  });
}
