// Data-driven punch definitions. Each punch is pure data consumed by CombatSystem.
// Times are in milliseconds; range is in world units; damage is on a 0-100 health scale.

/**
 * @typedef {Object} PunchDef
 * @property {string} id
 * @property {string} name
 * @property {'left'|'right'} hand
 * @property {'jab'|'cross'|'hook'|'uppercut'|'overhand'|'body_hook'|'body_straight'} type
 * @property {'head'|'body'} target
 * @property {number} baseDamage
 * @property {number} staminaCost
 * @property {number} startupMs   time before the punch can connect
 * @property {number} activeMs    window during which it can connect
 * @property {number} recoveryMs  time locked out after the active window
 * @property {number} range       max distance to connect (world units)
 * @property {number} accuracy    0-1 base chance modifier
 * @property {number} knockdown   contribution to knockdown pressure
 * @property {number} stun        contribution to stun meter
 * @property {number} counterBonus multiplier applied when it lands as a counter
 * @property {number} guardVuln   how exposed you are while throwing (0-1)
 * @property {string} anim        animation state key
 * @property {string} sound       sound key
 */

/** @type {Record<string, PunchDef>} */
export const PUNCHES = {
  // Touch — a very fast lead-hand extension (design notes). Minimal damage; used
  // to measure range and INTERRUPT an opponent's punch startup. Beaten by
  // committed hooks/body shots (already active by the time a Touch lands).
  touch: {
    id: 'touch', name: 'Touch', hand: 'left', type: 'jab', target: 'head',
    baseDamage: 1, staminaCost: 2,
    startupMs: 45, activeMs: 60, recoveryMs: 120,
    range: 1.65, accuracy: 0.95, knockdown: 0, stun: 1,
    counterBonus: 1.1, guardVuln: 0.1,
    interrupt: true,
    anim: 'left_jab', sound: 'punch_light',
  },
  left_jab: {
    id: 'left_jab', name: 'Jab', hand: 'left', type: 'jab', target: 'head',
    baseDamage: 5, staminaCost: 4,
    startupMs: 90, activeMs: 90, recoveryMs: 200,
    range: 1.55, accuracy: 0.92, knockdown: 3, stun: 6,
    counterBonus: 1.3, guardVuln: 0.15,
    anim: 'left_jab', sound: 'punch_light',
  },
  right_cross: {
    id: 'right_cross', name: 'Cross', hand: 'right', type: 'cross', target: 'head',
    baseDamage: 11, staminaCost: 8,
    startupMs: 150, activeMs: 100, recoveryMs: 320,
    range: 1.5, accuracy: 0.82, knockdown: 12, stun: 14,
    counterBonus: 1.5, guardVuln: 0.4,
    anim: 'right_cross', sound: 'punch_heavy',
  },
  left_hook: {
    id: 'left_hook', name: 'Left Hook', hand: 'left', type: 'hook', target: 'head',
    baseDamage: 13, staminaCost: 10,
    startupMs: 180, activeMs: 110, recoveryMs: 360,
    range: 1.25, accuracy: 0.76, knockdown: 16, stun: 18,
    counterBonus: 1.5, guardVuln: 0.5,
    anim: 'left_hook', sound: 'punch_heavy',
  },
  right_hook: {
    id: 'right_hook', name: 'Right Hook', hand: 'right', type: 'hook', target: 'head',
    baseDamage: 14, staminaCost: 11,
    startupMs: 190, activeMs: 110, recoveryMs: 380,
    range: 1.25, accuracy: 0.74, knockdown: 17, stun: 19,
    counterBonus: 1.5, guardVuln: 0.55,
    anim: 'right_hook', sound: 'punch_heavy',
  },
  left_body: {
    id: 'left_body', name: 'Left Body', hand: 'left', type: 'body_hook', target: 'body',
    baseDamage: 9, staminaCost: 7,
    startupMs: 150, activeMs: 100, recoveryMs: 300,
    range: 1.2, accuracy: 0.84, knockdown: 6, stun: 8,
    counterBonus: 1.35, guardVuln: 0.45,
    anim: 'left_body', sound: 'punch_body',
  },
  right_body: {
    id: 'right_body', name: 'Right Body', hand: 'right', type: 'body_straight', target: 'body',
    baseDamage: 10, staminaCost: 8,
    startupMs: 160, activeMs: 100, recoveryMs: 320,
    range: 1.2, accuracy: 0.82, knockdown: 7, stun: 9,
    counterBonus: 1.35, guardVuln: 0.5,
    anim: 'right_body', sound: 'punch_body',
  },
};

export const PUNCH_IDS = Object.keys(PUNCHES);
