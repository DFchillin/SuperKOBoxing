// Data-driven combo recognition table. A combo is an ordered sequence of punch ids
// thrown within each combo's timing window. The ComboSystem matches the tail of the
// recent-punch history against these definitions.

/**
 * @typedef {Object} ComboDef
 * @property {string} id
 * @property {string} name
 * @property {string[]} sequence      ordered punch ids
 * @property {number} maxGapMs        max ms allowed between consecutive punches
 * @property {number} damageMultiplier applied to the finishing punch
 * @property {number} stunBonus       flat stun added on completion
 * @property {number} staminaModifier multiplier on the finishing punch's stamina cost
 */

/** @type {ComboDef[]} */
export const COMBOS = [
  {
    id: 'one_two',
    name: 'One-Two',
    sequence: ['left_jab', 'right_cross'],
    maxGapMs: 520,
    damageMultiplier: 1.15,
    stunBonus: 5,
    staminaModifier: 1.0,
  },
  {
    id: 'one_two_hook',
    name: 'One-Two Hook',
    sequence: ['left_jab', 'right_cross', 'left_hook'],
    maxGapMs: 550,
    damageMultiplier: 1.25,
    stunBonus: 8,
    staminaModifier: 0.95,
  },
  {
    id: 'body_head',
    name: 'Body-Head Rip',
    sequence: ['left_body', 'right_cross'],
    maxGapMs: 520,
    damageMultiplier: 1.2,
    stunBonus: 6,
    staminaModifier: 1.0,
  },
  {
    id: 'checkhook_counter',
    name: 'Check Hook',
    sequence: ['left_jab', 'left_hook'],
    maxGapMs: 480,
    damageMultiplier: 1.18,
    stunBonus: 6,
    staminaModifier: 1.0,
  },
];

// Combos sorted longest-first so the recognizer prefers the richer match.
export const COMBOS_BY_LENGTH = [...COMBOS].sort(
  (a, b) => b.sequence.length - a.sequence.length,
);
