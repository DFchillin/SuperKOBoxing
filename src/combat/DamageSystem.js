import { Config } from '../core/Config.js';

// Tracks damage by region (head/body) and folds it into a shared health pool.
// Head damage drives knockout risk; body damage drags stamina and movement.
export const DamageSystem = {
  apply(fighter, amount, target) {
    if (target === 'body') {
      fighter.damage.body += amount * Config.fighter.bodyDamageWeight;
      fighter.health -= amount * Config.fighter.bodyDamageWeight;
    } else {
      fighter.damage.head += amount * Config.fighter.headDamageWeight;
      fighter.health -= amount * Config.fighter.headDamageWeight;
    }
    fighter.health = Math.max(0, fighter.health);
  },

  addStun(fighter, amount) {
    fighter.stun = Math.min(
      Config.knockdown.stunKnockdownThreshold,
      fighter.stun + amount,
    );
  },

  decayStun(fighter, dt) {
    if (fighter.down) return;
    fighter.stun = Math.max(0, fighter.stun - Config.knockdown.stunDecayPerSec * dt);
  },

  // A punch's raw knockdown pressure is scaled by remaining health and chin.
  knockdownChance(fighter, knockdownPower) {
    const healthFrac = 1 - fighter.health / Config.fighter.maxHealth;
    const chinResist = fighter.def.attributes.chin / 100;
    const stunFrac = fighter.stun / Config.knockdown.stunKnockdownThreshold;
    let chance = (knockdownPower / 100) * (0.4 + healthFrac * 0.9 + stunFrac * 0.7);
    chance *= 1 - chinResist * 0.55;
    // Repeated knockdowns make the next one easier.
    chance *= 1 + fighter.knockdowns * 0.25;
    return Math.min(0.95, Math.max(0, chance));
  },
};
