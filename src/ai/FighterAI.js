import { PUNCHES } from '../data/punches.js';
import { COMBOS } from '../data/combos.js';
import { Config } from '../core/Config.js';
import { StaminaSystem } from '../combat/StaminaSystem.js';

// Personality-driven AI for the side-view footwork game. It manages horizontal
// distance (moveH: -1..1), picks weapons that suit the current range (straights
// outside, hooks/body inside), and paces itself on a think-timer — deliberate,
// not twitchy.

const PERSONALITIES = {
  aggressive: { aggression: 0.7, patience: 0.3, blockBias: 0.35, comboBias: 0.5 },
  counter:    { aggression: 0.35, patience: 0.8, blockBias: 0.6, comboBias: 0.4 },
  defensive:  { aggression: 0.3, patience: 0.85, blockBias: 0.75, comboBias: 0.3 },
  patient:    { aggression: 0.45, patience: 0.7, blockBias: 0.5, comboBias: 0.45 },
};

const COMBO_SEQ = Object.fromEntries(COMBOS.map((c) => [c.id, c.sequence]));

export class FighterAI {
  constructor(fighter, difficulty = 0.4) {
    this.f = fighter;
    this.difficulty = difficulty;
    this.p = PERSONALITIES[fighter.def.aiPersonality] || PERSONALITIES.patient;
    this.thinkTimer = 0;
    this.plan = null;
    this.moveH = 0;      // signed horizontal intent
    this.aggressive = false;
  }

  // Preferred fighting distance: out-boxers live outside, pressure fighters inside.
  get idealRange() {
    if (this.f.def.style === 'out_boxer') return Config.combat.outsideMin + 0.15;
    if (this.f.def.style === 'pressure_fighter') return Config.combat.insideMax - 0.05;
    return (Config.combat.insideMax + Config.combat.outsideMin) / 2;
  }

  distanceToOpp() {
    return Math.abs(this.f.pos.x - this.f.opponent.pos.x);
  }

  update(dtMs) {
    const f = this.f;
    if (!f.canAct()) { this.moveH = 0; return; }

    this.thinkTimer -= dtMs;
    // Slower, cerebral cadence (bigger gaps than an arcade brawler).
    const thinkGap = 420 - this.difficulty * 140;

    this._advancePlan();
    if (this.thinkTimer > 0) return;
    this.thinkTimer = thinkGap * (0.7 + Math.random() * 0.6);

    const opp = f.opponent;
    const dist = this.distanceToOpp();
    const toward = Math.sign(opp.pos.x - f.pos.x) || 1;
    f.blocking = false;

    // Defensive read: block or slip when the opponent commits in range.
    const oppPunching =
      opp.hands.left.phase === 'startup' || opp.hands.right.phase === 'startup' ||
      opp.hands.left.phase === 'active' || opp.hands.right.phase === 'active';
    if (oppPunching && dist < Config.combat.outsideMin + 0.2) {
      if (Math.random() < this.difficulty * (0.5 + this.p.blockBias)) {
        if (Math.random() < 0.35) f.startDodge(-toward); else f.blocking = true;
        this.moveH = 0;
        return;
      }
    }

    if (StaminaSystem.isExhausted(f)) {
      this.moveH = -toward;            // circle out and breathe
      this.aggressive = false;
      if (dist < Config.combat.insideMax && Math.random() < 0.5) f.blocking = true;
      return;
    }

    if (dist > this.idealRange + 0.2) {
      this.moveH = toward;             // close the distance
      this.aggressive = f.def.style === 'pressure_fighter' && Math.random() < this.p.aggression;
    } else if (dist < this.idealRange - 0.3 && f.def.style === 'out_boxer') {
      this.moveH = -toward;            // reset to range
      this.aggressive = false;
    } else {
      this.moveH = Math.random() < 0.35 ? -toward * 0.4 : 0; // hold / small feint
      this.aggressive = false;
      if (Math.random() < this.p.aggression * 0.6 + this.difficulty * 0.15) {
        this._chooseOffence(dist);
      } else if (Math.random() < this.p.patience * 0.35) {
        f.blocking = true;
      }
    }
  }

  _chooseOffence(dist) {
    const f = this.f;
    const inside = dist < Config.combat.insideMax;

    // Outside: pepper with the jab / an occasional Touch to measure.
    if (!inside && Math.random() < this.p.patience * 0.4) { this._throw('touch'); return; }

    // Commit to a combo sometimes, otherwise a single range-appropriate punch.
    const combos = f.def.unlockedCombos;
    if (Math.random() < this.p.comboBias && combos.length) {
      const id = combos[Math.floor(Math.random() * combos.length)];
      const seq = COMBO_SEQ[id];
      if (seq) { this.plan = [...seq]; this._advancePlan(); return; }
    }
    const outside = ['left_jab', 'right_cross'];
    const insideTools = ['left_hook', 'right_hook', 'left_body', 'right_body'];
    const pool = inside ? insideTools : outside;
    this._throw(pool[Math.floor(Math.random() * pool.length)]);
  }

  _advancePlan() {
    if (!this.plan || !this.plan.length) return;
    const punch = PUNCHES[this.plan[0]];
    if (this.f.handBusy(punch.hand)) return;
    if (this._throw(this.plan[0])) this.plan.shift();
    if (!this.plan.length) this.plan = null;
  }

  _throw(punchId) {
    const punch = PUNCHES[punchId];
    return this.f.startPunch(punch.hand, punch);
  }
}
