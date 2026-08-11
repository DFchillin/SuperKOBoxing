// Super KO Boxing — global balance & tuning values.
// Keep gameplay numbers here so they stay configurable and out of the systems.

export const Config = {
  // Rendering
  render: {
    clearColor: 0x0a0a12,
    pixelRatioCap: 2,
    // Low-res arcade look: render to a small buffer and upscale.
    internalScale: 0.5,
  },

  // Ring geometry (world units). Fighters live on the XZ plane.
  ring: {
    halfSize: 3.0, // playable half-width/half-depth inside the ropes
    ropeHeight: 1.1,
    floorY: 0,
  },

  // Match rules
  match: {
    rounds: 3,
    roundSeconds: 60,
    betweenRoundSeconds: 8,
    knockdownCount: 10, // referee count (seconds) to beat
    maxKnockdownsBeforeTko: 3, // 3-knockdown rule per match
    standingCountThreshold: 1.0, // if a count reaches this fraction of full and fighter can't rise -> KO
  },

  // Fighter physics / spacing
  fighter: {
    baseMoveSpeed: 1.7, // units/sec at movementSpeed 50 (slower, deliberate footwork)
    clinchRange: 0.5,
    maxHealth: 100,
    maxStamina: 100,
    // Head/body damage feed a shared health pool but with different weights.
    headDamageWeight: 1.0,
    bodyDamageWeight: 0.75,
  },

  // Range bands (distance between fighters, world units) — inside vs outside.
  // Straights own the outside; hooks/uppercuts/body own the inside. Being at the
  // wrong range whiffs (via each punch's own range) or gets penalised below.
  combat: {
    insideMax: 0.95,   // at/below this = "inside"
    outsideMin: 1.35,  // at/above this = "outside"
    straightCrampedMult: 0.6, // straights lose power when jammed inside
    insideHookBonus: 1.15,    // hooks/body reward getting inside
  },

  // Stamina economy
  stamina: {
    regenPerSec: 6.5, // when idle / calm
    regenMovePenalty: 0.35, // multiplier while moving aggressively
    missExtraCost: 1.6, // multiplier on stamina when a punch whiffs
    blockCostPerHit: 3.0,
    dodgeCost: 4.0,
    lowThreshold: 25, // below this, penalties kick in
    exhaustedSpeedMult: 0.7,
    exhaustedDamageMult: 0.8,
  },

  // Defence
  defence: {
    blockDamageReduction: 0.78, // fraction of damage removed by a correct block
    blockGuardWear: 5, // guard integrity lost per blocked heavy punch
    guardMax: 100,
    guardRegenPerSec: 8,
    dodgeWindowMs: 320, // i-frame-ish window after pressing dodge
    dodgeSuccessReduction: 1.0, // full negation on a clean dodge
  },

  // Knockdown / stun
  knockdown: {
    stunDecayPerSec: 14,
    stunKnockdownThreshold: 100,
    getUpSeconds: 2.4,
  },

  // Combo timing default (individual combos can override)
  combo: {
    defaultMaxGapMs: 550,
    historyLength: 6,
  },

  input: {
    // Punch queue: how many presses can stack, and how long each stays valid
    // while it waits for its hand to reload. Short + shallow so a queue is a
    // ~1s commitment, not a pre-programmed flurry.
    queueLen: 3,
    queueMs: 1200,
  },

  debug: false,
};
