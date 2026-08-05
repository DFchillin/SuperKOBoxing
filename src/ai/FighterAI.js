import { PUNCHES } from '../data/punches.js';
import { StaminaSystem } from '../combat/StaminaSystem.js';

// Modular, personality-driven AI. It reads distance, stamina, guard and round
// context and makes tactical decisions on a think-timer rather than every frame.
// Difficulty raises decision quality (spacing, combos, patience), not raw speed.

const PERSONALITIES = {
  aggressive: { aggression: 0.85, patience: 0.25, blockBias: 0.3, comboBias: 0.6 },
  counter:    { aggression: 0.4,  patience: 0.75, blockBias: 0.6, comboBias: 0.4 },
  defensive:  { aggression: 0.3,  patience: 0.8,  blockBias: 0.75, comboBias: 0.3 },
  patient:    { aggression: 0.5,  patience: 0.7,  blockBias: 0.5, comboBias: 0.5 },
};

export class FighterAI {
  constructor(fighter, difficulty = 0.6) {
    this.f = fighter;
    this.difficulty = difficulty; // 0..1
    this.p = PERSONALITIES[fighter.def.aiPersonality] || PERSONALITIES.patient;
    this.thinkTimer = 0;
    this.plan = null; // queued combo punches
    this.moveDir = { x: 0, z: 0 };
    this.aggressive = false;
  }

  // Preferred striking distance for this fighter's style.
  get idealRange() {
    return this.f.def.style === 'out_boxer' ? 1.4 : 1.05;
  }

  distanceToOpp() {
    const o = this.f.opponent;
    return Math.hypot(this.f.pos.x - o.pos.x, this.f.pos.z - o.pos.z);
  }

  update(dtMs) {
    const f = this.f;
    if (!f.canAct()) { this.moveDir = { x: 0, z: 0 }; return; }

    this.thinkTimer -= dtMs;
    // Better AI reacts a little faster and re-plans more often.
    const thinkGap = 260 - this.difficulty * 120;

    // Fire any queued combo punches as hands free up (independent-hand feel).
    this._advancePlan();

    if (this.thinkTimer > 0) return;
    this.thinkTimer = thinkGap * (0.7 + Math.random() * 0.6);

    const dist = this.distanceToOpp();
    const opp = f.opponent;
    const lowStam = StaminaSystem.isExhausted(f);
    f.blocking = false;

    // Defensive read: if the opponent is committing a punch and we're in range,
    // sometimes block or slip based on personality + difficulty.
    const oppPunching =
      opp.hands.left.phase === 'startup' || opp.hands.right.phase === 'startup' ||
      opp.hands.left.phase === 'active' || opp.hands.right.phase === 'active';
    if (oppPunching && dist < 1.7) {
      const react = this.difficulty * (0.6 + this.p.blockBias);
      if (Math.random() < react) {
        if (Math.random() < 0.4) f.startDodge(Math.random() < 0.5 ? -1 : 1);
        else f.blocking = true;
        this.moveDir = { x: 0, z: 0 };
        return;
      }
    }

    // Spacing.
    const toOpp = { x: Math.sign(opp.pos.x - f.pos.x), z: Math.sign(opp.pos.z - f.pos.z) };
    if (lowStam) {
      // Recover: drift away and circle.
      this.moveDir = { x: -toOpp.x, z: (Math.random() < 0.5 ? 1 : -1) };
      this.aggressive = false;
      if (dist < 1.4 && Math.random() < 0.5) f.blocking = true;
      return;
    }

    if (dist > this.idealRange + 0.25) {
      // Close the distance.
      this.moveDir = { x: toOpp.x, z: (Math.random() < 0.35 ? toOpp.z : 0) };
      this.aggressive = Math.random() < this.p.aggression;
    } else if (dist < this.idealRange - 0.35 && f.def.style === 'out_boxer') {
      // Out-boxer resets range.
      this.moveDir = { x: -toOpp.x, z: Math.random() < 0.5 ? 1 : -1 };
      this.aggressive = false;
    } else {
      // In range — attack.
      this.moveDir = { x: 0, z: (Math.random() < 0.3 ? (Math.random() < 0.5 ? 1 : -1) : 0) };
      this.aggressive = false;
      if (Math.random() < this.p.aggression + this.difficulty * 0.2) {
        this._chooseOffence(dist);
      } else if (Math.random() < this.p.patience * 0.4) {
        f.blocking = true;
      }
    }
  }

  _chooseOffence() {
    const f = this.f;
    // Sometimes commit to a full unlocked combo, otherwise a single punch.
    const combos = f.def.unlockedCombos;
    if (Math.random() < this.p.comboBias && combos.length) {
      const comboId = combos[Math.floor(Math.random() * combos.length)];
      const seq = COMBO_SEQ[comboId];
      if (seq) { this.plan = [...seq]; this._advancePlan(); return; }
    }
    const singles = ['left_jab', 'right_cross', 'left_hook', 'left_body'];
    const pick = singles[Math.floor(Math.random() * singles.length)];
    this._throw(pick);
  }

  _advancePlan() {
    if (!this.plan || !this.plan.length) return;
    const next = this.plan[0];
    const punch = PUNCHES[next];
    if (this.f.handBusy(punch.hand)) return; // wait for the hand to free
    if (this._throw(next)) this.plan.shift();
    if (!this.plan.length) this.plan = null;
  }

  _throw(punchId) {
    const punch = PUNCHES[punchId];
    return this.f.startPunch(punch.hand, punch);
  }
}

// Local mirror of combo sequences so the AI can queue them without importing the
// full combo table shape.
import { COMBOS } from '../data/combos.js';
const COMBO_SEQ = Object.fromEntries(COMBOS.map((c) => [c.id, c.sequence]));
