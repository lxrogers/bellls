// Settings - single source of truth for all tweakable parameters
export const settings = {
  numCircles: 9,
  circlesEnabled: false,  // Toggle for old circles
  volume: 70,
  roomSize: 50,
  baseVelocity: 0.2,
  radiusMultiplier: 1.5,
  rippleExpand: 0.6,
  rippleFade: 1.7,
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
  numHangers: 8,       // Number of hanging ropes
  hangerLength: 40,    // Rope length as percentage of screen height
  hangerSpacing: 50,   // Hanger spacing as percentage of screen width
  hangerRadius: 12,    // Circle radius at tip
  hangerSegments: 20,  // Rope segments per hanger
  hangerDamping: 0.999, // Rope friction (0.95 = settles fast, 1.0 = no damping)
  hangerGravity: 0.15,  // Gravity strength (lower = floatier, higher = snappier)
  hangerTipWeight: 3.0, // Tip mass relative to rope points (1 = same, higher = heavier)
  hangerBounce: 0.7,   // Collision bounce factor (0 = no bounce, 1 = full)
  hangerMinImpact: 0.1, // Min impact speed to trigger sound
  gridEnabled: false,  // Toggle for background grid
  solidRipples: true,  // Draw ripples as filled circles
  solidRippleOpacity: 0.7  // Max opacity for solid ripples (0-1)
};
