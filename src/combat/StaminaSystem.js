import { Config } from '../core/Config.js';

// Stamina is one of the most important systems: it gates punch quality, defence
// and footwork. This module owns spend/regen and the derived "gas" penalties.
export const StaminaSystem = {
  spend(fighter, amount) {
    fighter.stamina = Math.max(0, fighter.stamina - amount);
  },

  regen(fighter, dt) {
    if (fighter.down || fighter.stunned) return;
    let rate = Config.stamina.regenPerSec;
    // Body damage suppresses recovery — a beaten body cannot refuel.
    const bodyFrac = fighter.damage.body / Config.fighter.maxHealth;
    rate *= 1 - Math.min(0.5, bodyFrac * 0.6);
    if (fighter.movingAggressively) rate *= Config.stamina.regenMovePenalty;
    fighter.stamina = Math.min(
      Config.fighter.maxStamina,
      fighter.stamina + rate * dt,
    );
  },

  isExhausted(fighter) {
    return fighter.stamina < Config.stamina.lowThreshold;
  },

  // Multipliers other systems query when a fighter is gassed.
  speedMult(fighter) {
    return this.isExhausted(fighter) ? Config.stamina.exhaustedSpeedMult : 1;
  },

  damageMult(fighter) {
    return this.isExhausted(fighter) ? Config.stamina.exhaustedDamageMult : 1;
  },
};
