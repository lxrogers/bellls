// Settings - single source of truth for all tweakable parameters
export const settings = {
  numCircles: 9,
  circlesEnabled: false,  // Toggle for old circles
  volume: 70,
  roomSize: 50,
  baseVelocity: 0.2,
  radiusMultiplier: 1.5,
  rippleExpand: 0.9,
  rippleFade: 0.1,
  dustCount: 50,
  dustVelocity: 0.2,
  dustFlowPower: 0.014,
  dustFlowRange: 75,
  dustCollisionBuffer: 15,
  dustNudgeDecay: 0.95,
  dustFieldStrength: 0.0008,
  dustFieldScale: 0.005,
  dustPositionRepulsion: 0.01,  // Default value for repulsion
  numSlides: 11,  // Number of slide lines
  slideLength: 66,  // Slide length as percentage of screen height
  slideSpacing: 25,  // Slide spacing as percentage of screen width
  slideRadius: 10,  // Slide circle radius
  gridEnabled: false,  // Toggle for background grid
  solidRipples: true  // Draw ripples as filled circles
};
