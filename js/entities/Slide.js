import { settings } from '../settings.js';
import { app, slides, slideContainer, getScreenScale } from '../engine/pixi-app.js';
import * as camera from '../engine/camera.js';
import { playNote } from '../audio/play-note.js';
import { scales, currentScale } from '../audio/scales.js';
import { createRipple } from './Ripple.js';
import { getTheme } from '../themes.js';

// Rotation animation state
let rotationAnimation = null;
let currentRotation = 0; // Track cumulative rotation in radians

export class Slide {
  constructor(x, y, length, noteIndex, colorIndex) {
    this.x = x;
    this.y = y;
    this.length = length;
    this.noteIndex = noteIndex;
    this.colorIndex = colorIndex;
    
    // End point of line (for rotation)
    this.endX = x;
    this.endY = y + length;
    
    // Circle properties
    this.circleRadius = settings.slideRadius * getScreenScale();
    
    // Circle position along the line (0 = start, 1 = end)
    this.circleT = Math.random() * 0.7; // Spawn in upper 70% of the line
    this.circleX = x;
    this.circleY = y + this.circleT * length;
    this.circleVT = 0; // Velocity along line (in t units)
    
    // Rotation state
    this.isRotating = false;
    
    // Gravity (moon-like, very light) - slightly different for each slide
    this.gravity = 0.005 + (Math.random() - 0.5) * 0.003;
    
    // Graphics
    this.graphics = new PIXI.Graphics();
    slideContainer.addChild(this.graphics);
    
    // Draw the line
    this.draw();
  }
  
  update() {
    // Calculate line direction
    const dx = this.endX - this.x;
    const dy = this.endY - this.y;
    const lineLength = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction
    const dirX = dx / lineLength;
    const dirY = dy / lineLength;
    
    // Apply gravity projected onto line direction
    // Gravity always points down (0, 1), so dot product with line direction
    const gravityProjection = dirY * this.gravity;
    this.circleVT += gravityProjection / lineLength;
    
    // Update circle position along line
    this.circleT += this.circleVT;
    
    // Bounce off end of line (t = 1)
    if (this.circleT > 1 - this.circleRadius / lineLength) {
      this.circleT = 1 - this.circleRadius / lineLength;
      
      // Only play note if velocity is high enough
      const speed = Math.abs(this.circleVT * lineLength);
      if (speed > 0.5) {
        // Map velocity to 50-100% volume range
        const velocity = Math.min(1.0, 0.5 + speed * 0.25);
        const xNormalized = this.circleX / app.screen.width;
        playNote(this.noteIndex, velocity, xNormalized);
        // Create ripple at circle position with circle's color
        const palette = getTheme().palette;
        const color = palette[this.colorIndex % palette.length];
        createRipple(this.circleX, this.circleY, this.circleRadius, color);
        this.circleVT *= -0.9; // High velocity bounce
      } else {
        this.circleVT *= -0.5; // Low velocity damping
      }
    }
    
    // Bounce off start of line (t = 0)
    if (this.circleT < this.circleRadius / lineLength) {
      this.circleT = this.circleRadius / lineLength;
      
      // Only play note if velocity is high enough
      const speed = Math.abs(this.circleVT * lineLength);
      if (speed > 0.5) {
        // Map velocity to 50-100% volume range
        const velocity = Math.min(1.0, 0.5 + speed * 0.25);
        const xNormalized = this.circleX / app.screen.width;
        playNote(this.noteIndex, velocity, xNormalized);
        // Create ripple at circle position with circle's color
        const palette = getTheme().palette;
        const color = palette[this.colorIndex % palette.length];
        createRipple(this.circleX, this.circleY, this.circleRadius, color);
        this.circleVT *= -0.9; // High velocity bounce
      } else {
        this.circleVT *= -0.5; // Low velocity damping
      }
    }
    
    // Update circle world position
    this.circleX = this.x + this.circleT * dx;
    this.circleY = this.y + this.circleT * dy;
  }
  
  draw() {
    this.graphics.clear();
    
    // Draw the line
    this.graphics.lineStyle(1.5, 0xcccccc, 0.5);
    this.graphics.moveTo(this.x, this.y);
    this.graphics.lineTo(this.endX, this.endY);
    
    // Draw the circle with theme color and white outline
    const palette = getTheme().palette;
    const color = palette[this.colorIndex % palette.length];
    this.graphics.lineStyle(2, 0xdddddd, 0.8);
    this.graphics.beginFill(color, 1.0);
    this.graphics.drawCircle(this.circleX, this.circleY, this.circleRadius);
    this.graphics.endFill();
  }
  
  destroy() {
    slideContainer.removeChild(this.graphics);
    this.graphics.destroy();
  }
}

export function createSlides(initialRotationDegrees = 0) {
  // Remove all existing slides first to reposition them
  while (slides.length > 0) {
    const s = slides.pop();
    s.destroy();
  }
  
  // Add new slides, equally spaced horizontally, closer to center
  const centerX = app.screen.width / 2;
  const pivotY = app.screen.height / 2 - 50; // Rotation pivot accounts for vertical offset
  const totalWidth = app.screen.width * (settings.slideSpacing / 100);
  const spacing = totalWidth / (settings.numSlides + 1);
  const startX = centerX - totalWidth / 2;

  // Slide length from settings
  const length = app.screen.height * (settings.slideLength / 100);
  const startY = pivotY - length / 2; // Center vertically around pivot
  
  // Get scale notes for assigning to slides
  const scaleNotes = scales[currentScale].notes;
  
  // Initial rotation in radians
  const angleRadians = initialRotationDegrees * (Math.PI / 180);
  
  for (let i = 0; i < settings.numSlides; i++) {
    const x = startX + spacing * (i + 1);
    
    // Assign note index - spread across the scale (left = low, right = high)
    const noteIndex = Math.floor((i / (settings.numSlides - 1)) * (scaleNotes.length - 1));
    
    const slide = new Slide(x, startY, length, noteIndex, i);
    
    // Apply initial rotation if specified
    if (initialRotationDegrees !== 0) {
      const newStart = rotatePoint(slide.x, slide.y, centerX, pivotY, angleRadians);
      const newEnd = rotatePoint(slide.endX, slide.endY, centerX, pivotY, angleRadians);
      slide.x = newStart.x;
      slide.y = newStart.y;
      slide.endX = newEnd.x;
      slide.endY = newEnd.y;
      const dx = slide.endX - slide.x;
      const dy = slide.endY - slide.y;
      slide.circleX = slide.x + slide.circleT * dx;
      slide.circleY = slide.y + slide.circleT * dy;
    }
    
    slides.push(slide);
  }
}

// Ease-in-out cubic function
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Check if half or more circles are at rest at the bottom, trigger auto-rotation
function checkAutoRotation() {
  if (rotationAnimation) return;
  if (slides.length === 0) return;

  let atRest = 0;
  for (const slide of slides) {
    const lineLength = Math.sqrt(
      (slide.endX - slide.x) ** 2 + (slide.endY - slide.y) ** 2
    );
    const bottomT = 1 - slide.circleRadius / lineLength;
    const nearBottom = slide.circleT >= bottomT - 0.02;
    const slowEnough = Math.abs(slide.circleVT) < 0.001;
    if (nearBottom && slowEnough) atRest++;
  }

  if (atRest >= Math.ceil(slides.length / 2)) {
    rotateSlides(true);
  }
}

// Start rotation animation
export function rotateSlides(auto = false) {
  if (rotationAnimation) return; // Don't start if already animating

  const centerX = app.screen.width / 2;
  const centerY = app.screen.height / 2 - 50; // Match the -50px vertical offset from createSlides

  let rotationAmount, duration;
  if (auto) {
    // Auto-rotation: 90-180 degrees
    const degrees = 90 + Math.floor(Math.random() * 4) * 30; // 90, 120, 150, or 180
    rotationAmount = degrees * (Math.PI / 180);
    duration = (degrees / 30) * 1500;
  } else {
    // Manual: random multiple of 30 between 30-180
    const multiplier = Math.floor(Math.random() * 6) + 1;
    rotationAmount = multiplier * (Math.PI / 6);
    duration = multiplier * 1500;
  }
  const startTime = performance.now();
  
  // Store initial positions for each slide (both line endpoints and circle)
  const initialStates = slides.map(slide => {
    // Line start point
    const startX = slide.x;
    const startY = slide.y;
    
    // Line end point
    const endX = slide.endX;
    const endY = slide.endY;
    
    // Circle position
    const circleX = slide.circleX;
    const circleY = slide.circleY;
    
    // Store circleT so we can restore it after rotation
    const circleT = slide.circleT;
    
    return { startX, startY, endX, endY, circleX, circleY, circleT };
  });
  
  rotationAnimation = {
    startTime,
    duration,
    rotationAmount,
    centerX,
    centerY,
    initialStates
  };
}

// Rotate a point around a center
function rotatePoint(x, y, centerX, centerY, angle) {
  const dx = x - centerX;
  const dy = y - centerY;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos
  };
}

// Update rotation animation (call this from game loop)
export function updateRotationAnimation() {
  if (!rotationAnimation) {
    checkAutoRotation();
    return;
  }
  
  const elapsed = performance.now() - rotationAnimation.startTime;
  const progress = Math.min(elapsed / rotationAnimation.duration, 1);
  const easedProgress = easeInOutCubic(progress);
  const rotationAngle = easedProgress * rotationAnimation.rotationAmount; // 30 degrees
  
  const { centerX, centerY, initialStates } = rotationAnimation;
  
  slides.forEach((slide, i) => {
    const state = initialStates[i];
    
    // Rotate line start point
    const newStart = rotatePoint(state.startX, state.startY, centerX, centerY, rotationAngle);
    
    // Rotate line end point
    const newEnd = rotatePoint(state.endX, state.endY, centerX, centerY, rotationAngle);
    
    // Update slide line positions
    slide.x = newStart.x;
    slide.y = newStart.y;
    slide.endX = newEnd.x;
    slide.endY = newEnd.y;
    
    // Circle position is updated by update() based on circleT
    // The physics will keep running and the circle will stay on the line
  });
  
  // End animation
  if (progress >= 1) {
    currentRotation += rotationAnimation.rotationAmount;
    rotationAnimation = null;
  }
}