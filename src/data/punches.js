// Data-driven punch definitions. Each punch is pure data consumed by CombatSystem.
// Times are in milliseconds; range is in world units; damage is on a 0-100 scale.
//
// Range design (side-view inside/outside game):
//   straights (jab/cross/touch) have long reach  -> OUTSIDE weapons
//   hooks / body shots have short reach           -> INSIDE weapons
// Being at the wrong range whiffs (range check) or is penalised (CombatSystem).

/**
 * @typedef {Object} PunchDef
 * @property {string} id
 * @property {string} name
 * @property {'left'|'right'} hand
 * @property {'jab'|'cross'|'hook'|'uppercut'|'overhand'|'body_hook'|'body_straight'} type
 * @property {'head'|'body'} target
 * @property {number} baseDamage
 * @property {number} staminaCost
 * @property {number} startupMs
 * @property {number} activeMs
 * @property {number} recoveryMs
 * @property {number} range
 * @property {number} accuracy
 * @property {number} knockdown
 * @property {number} stun
 * @property {number} counterBonus
 * @property {number} guardVuln
 * @property {boolean} [interrupt]
 * @property {string} anim
 * @property {string} sound
 */

/** @type {Record<string, PunchDef>} */
export const PUNCHES = {
  // Touch — very fast lead-hand extension. Measures range, interrupts startups.
  touch: {
    id: 'touch', name: 'Touch', hand: 'left', type: 'jab', target: 'head',
    baseDamage: 1, staminaCost: 2,
    startupMs: 55, activeMs: 60, recoveryMs: 140,
    range: 1.85, accuracy: 0.95, knockdown: 0, stun: 1,
    counterBonus: 1.1, guardVuln: 0.1,
    interrupt: true,
    anim: 'left_jab', sound: 'punch_light',
  },
  // --- Outside weapons (straights, long reach) ---
  left_jab: {
    id: 'left_jab', name: 'Jab', hand: 'left', type: 'jab', target: 'head',
    baseDamage: 5, staminaCost: 4,
    startupMs: 110, activeMs: 90, recoveryMs: 240,
    range: 1.8, accuracy: 0.92, knockdown: 3, stun: 6,
    counterBonus: 1.3, guardVuln: 0.15,
    anim: 'left_jab', sound: 'punch_light',
  },
  right_cross: {
    id: 'right_cross', name: 'Cross', hand: 'right', type: 'cross', target: 'head',
    baseDamage: 12, staminaCost: 9,
    startupMs: 200, activeMs: 100, recoveryMs: 400,
    range: 1.7, accuracy: 0.82, knockdown: 13, stun: 15,
    counterBonus: 1.5, guardVuln: 0.45,
    anim: 'right_cross', sound: 'punch_heavy',
  },
  // --- Inside weapons (hooks / body, short reach) ---
  left_hook: {
    id: 'left_hook', name: 'Left Hook', hand: 'left', type: 'hook', target: 'head',
    baseDamage: 14, staminaCost: 11,
    startupMs: 230, activeMs: 110, recoveryMs: 440,
    range: 1.0, accuracy: 0.76, knockdown: 17, stun: 19,
    counterBonus: 1.5, guardVuln: 0.55,
    anim: 'left_hook', sound: 'punch_heavy',
  },
  right_hook: {
    id: 'right_hook', name: 'Right Hook', hand: 'right', type: 'hook', target: 'head',
    baseDamage: 15, staminaCost: 12,
    startupMs: 240, activeMs: 110, recoveryMs: 460,
    range: 1.0, accuracy: 0.74, knockdown: 18, stun: 20,
    counterBonus: 1.5, guardVuln: 0.6,
    anim: 'right_hook', sound: 'punch_heavy',
  },
  left_body: {
    id: 'left_body', name: 'Left Body', hand: 'left', type: 'body_hook', target: 'body',
    baseDamage: 10, staminaCost: 8,
    startupMs: 190, activeMs: 100, recoveryMs: 360,
    range: 1.0, accuracy: 0.84, knockdown: 6, stun: 8,
    counterBonus: 1.35, guardVuln: 0.5,
    anim: 'left_body', sound: 'punch_body',
  },
  right_body: {
    id: 'right_body', name: 'Right Body', hand: 'right', type: 'body_straight', target: 'body',
    baseDamage: 11, staminaCost: 9,
    startupMs: 200, activeMs: 100, recoveryMs: 380,
    range: 1.0, accuracy: 0.82, knockdown: 7, stun: 9,
    counterBonus: 1.35, guardVuln: 0.55,
    anim: 'right_body', sound: 'punch_body',
  },
};

export const PUNCH_IDS = Object.keys(PUNCHES);
