import { Config } from '../core/Config.js';
import { StaminaSystem } from './StaminaSystem.js';
import { DamageSystem } from './DamageSystem.js';
import { ComboSystem } from './ComboSystem.js';

function distance(a, b) {
  const dx = a.pos.x - b.pos.x;
  const dz = a.pos.z - b.pos.z;
  return Math.hypot(dx, dz);
}

// Resolves punch outcomes each frame using a range + hit-window model (no rigid-
// body fists). Returns an array of gameplay events for audio / FX / UI to consume.
export const CombatSystem = {
  update(fighters, nowMs) {
    const events = [];
    for (const attacker of fighters) {
      const defender = attacker.opponent;
      for (const key of ['left', 'right']) {
        const hand = attacker.hands[key];

        // A punch that ran its active window without connecting: whiff penalty.
        if (hand.whiffFlag) {
          hand.whiffFlag = false;
          const extra = hand.punch
            ? hand.punch.staminaCost * (Config.stamina.missExtraCost - 1)
            : 0;
          StaminaSystem.spend(attacker, extra);
          events.push({ type: 'miss', side: attacker.side });
          continue;
        }

        if (hand.phase !== 'active' || hand.resolved || !hand.punch) continue;
        const punch = hand.punch;

        const reach = 0.9 + attacker.attr('reach') / 100 * 0.35;
        if (distance(attacker, defender) > punch.range * reach) continue;

        // We are in range during the active window — attempt to land it now.
        hand.resolved = true;
        const outcome = this._resolveLanding(attacker, defender, punch, nowMs);
        events.push(outcome);
      }
    }
    return events;
  },

  _resolveLanding(attacker, defender, punch, nowMs) {
    // Clean dodge fully negates.
    if (defender.isDodging()) {
      return { type: 'dodge', side: defender.side, punch: punch.id };
    }

    // Accuracy check blends attacker accuracy vs. defender footwork/defence.
    const acc = punch.accuracy
      * (0.7 + attacker.attr('accuracy') / 100 * 0.5)
      * StaminaSystem.speedMult(attacker);
    const evasion = defender.attr('footwork') / 100 * 0.18;
    if (Math.random() > acc - evasion) {
      return { type: 'slip', side: defender.side, punch: punch.id };
    }

    // Touch interrupt: a landed Touch snuffs out any punch the defender is still
    // winding up (startup). It can't beat a committed punch already active.
    let interrupted = false;
    if (punch.interrupt) {
      for (const key of ['left', 'right']) {
        if (defender.hands[key].phase === 'startup') {
          defender.cancelHand(key);
          interrupted = true;
        }
      }
    }

    // Base damage scaled by power and gas.
    let dmg = punch.baseDamage
      * (0.6 + attacker.attr('power') / 100 * 0.8)
      * StaminaSystem.damageMult(attacker);
    let stun = punch.stun;
    let blocked = false;

    // Counter bonus: caught the defender mid-commitment.
    const defenderCommitted =
      defender.hands.left.phase !== 'idle' || defender.hands.right.phase !== 'idle';
    let counter = false;
    if (defenderCommitted) {
      dmg *= punch.counterBonus;
      stun *= punch.counterBonus;
      counter = true;
    }

    // High-guard block. High block covers the head well and the body poorly.
    if (defender.blocking && !defender.handBusy('left') && !defender.handBusy('right')) {
      blocked = true;
      const reduction = punch.target === 'head'
        ? Config.defence.blockDamageReduction
        : Config.defence.blockDamageReduction * 0.5;
      dmg *= 1 - reduction;
      stun *= 1 - reduction;
      defender.guard = Math.max(0, defender.guard - Config.defence.blockGuardWear);
      StaminaSystem.spend(defender, Config.stamina.blockCostPerHit);
      // Broken guard lets extra damage leak through.
      if (defender.guard <= 0) dmg *= 1.4;
    }

    // Record the punch and check for a completed combo (attacker side).
    ComboSystem.record(attacker, punch.id, nowMs);
    const combo = ComboSystem.detect(attacker, nowMs);
    let comboName = null;
    if (combo && !blocked) {
      dmg *= combo.damageMultiplier;
      stun += combo.stunBonus;
      // Retro-adjust stamina for the finishing punch.
      const delta = punch.staminaCost * (combo.staminaModifier - 1);
      StaminaSystem.spend(attacker, delta);
      comboName = combo.name;
      attacker.activeCombo = { name: combo.name, at: nowMs };
    }

    // Apply.
    DamageSystem.apply(defender, dmg, punch.target);
    DamageSystem.addStun(defender, stun);
    defender.hitFlash = 180;

    // Knockdown roll (head shots and heavy body shots).
    let knockdown = false;
    if (!defender.down) {
      const kdPower = punch.knockdown * (counter ? 1.4 : 1) * (blocked ? 0.1 : 1);
      if (Math.random() < DamageSystem.knockdownChance(defender, kdPower)) {
        defender.knockDown();
        knockdown = true;
      }
    }

    return {
      type: 'hit', side: attacker.side, punch: punch.id, target: punch.target,
      damage: dmg, blocked, counter, knockdown, combo: comboName, interrupted,
    };
  },
};
