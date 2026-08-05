// Fictional fighter roster data. Original characters only.
// Attributes are on a 0-100 scale and are read by combat/AI systems.

/**
 * @typedef {Object} FighterDef
 * @property {string} id
 * @property {string} name
 * @property {string} nickname
 * @property {string} country
 * @property {string} style
 * @property {Object} attributes
 * @property {Object} colors     sprite colour scheme
 * @property {string[]} unlockedCombos
 * @property {string} aiPersonality
 */

/** @type {Record<string, FighterDef>} */
export const FIGHTERS = {
  dex_kowalski: {
    id: 'dex_kowalski',
    name: 'Dex Kowalski',
    nickname: 'The Hammer',
    country: 'USA',
    style: 'pressure_fighter',
    attributes: {
      power: 78, handSpeed: 62, movementSpeed: 58, stamina: 70,
      chin: 74, bodyDurability: 72, defence: 55, accuracy: 66,
      recovery: 60, reach: 60, footwork: 55, counter: 58,
      combination: 68, heart: 80,
    },
    colors: { skin: '#e0a878', trunks: '#c02434', gloves: '#d8d8e0', accent: '#f0c020' },
    unlockedCombos: ['one_two', 'one_two_hook', 'body_head'],
    aiPersonality: 'aggressive',
  },
  kenji_arata: {
    id: 'kenji_arata',
    name: 'Kenji Arata',
    nickname: 'Silk',
    country: 'Japan',
    style: 'out_boxer',
    attributes: {
      power: 60, handSpeed: 80, movementSpeed: 76, stamina: 72,
      chin: 62, bodyDurability: 60, defence: 74, accuracy: 82,
      recovery: 66, reach: 72, footwork: 82, counter: 78,
      combination: 74, heart: 70,
    },
    colors: { skin: '#e8c0a0', trunks: '#1c3ca0', gloves: '#e8e8f0', accent: '#e0e0e0' },
    unlockedCombos: ['one_two', 'checkhook_counter'],
    aiPersonality: 'counter',
  },
};

export const FIGHTER_IDS = Object.keys(FIGHTERS);
