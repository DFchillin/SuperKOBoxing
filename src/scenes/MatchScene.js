import { Config } from '../core/Config.js';
import { PUNCHES } from '../data/punches.js';
import { FIGHTERS } from '../data/fighters.js';
import { Fighter } from '../combat/Fighter.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { MovementSystem } from '../combat/MovementSystem.js';
import { JudgeSystem } from '../combat/JudgeSystem.js';
import { FighterAI } from '../ai/FighterAI.js';
import { InputManager } from '../input/InputManager.js';
import { RingScene } from '../rendering/RingScene.js';
import { Hud } from '../ui/Hud.js';
import { AudioManager } from '../audio/AudioManager.js';

const HALF = Config.ring.halfSize;

// Top-level match orchestrator. Owns the round state machine and wires the
// systems together each frame. Rendering and game logic are kept separate so the
// same update path could later feed a headless multiplayer simulation.
export class MatchScene {
  constructor({ canvas, hudRoot, playerId = 'dex_kowalski', aiId = 'kenji_arata' }) {
    this.canvas = canvas;

    this.player = new Fighter(FIGHTERS[playerId], 'player');
    this.ai = new Fighter(FIGHTERS[aiId], 'ai');
    this.player.opponent = this.ai;
    this.ai.opponent = this.player;
    this.fighters = [this.player, this.ai];

    this.ring = new RingScene(canvas, this.fighters);
    this.hud = new Hud(hudRoot, this.player, this.ai);
    this.input = new InputManager();
    this.audio = new AudioManager();
    this.aiCtrl = new FighterAI(this.ai, 0.62);

    this.round = 1;
    this.phase = 'intro';
    this.phaseTimer = 1600;
    this.roundTime = Config.match.roundSeconds;
    this.countTimer = 0;
    this.willRise = false;
    this.downFighter = null;
    this.cards = [];
    this.matchResult = null;

    this._resetStats();
    this._placeCorners();

    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
    this._resize();

    this._onKey = (e) => {
      if (e.code === 'Backquote') { Config.debug = !Config.debug; }
      if (e.code === 'Enter' && this.phase === 'matchend') this._restart();
    };
    window.addEventListener('keydown', this._onKey);

    this.hud.setRound(this.round, Config.match.rounds);
    this.hud.announce(`${this.player.def.name}  VS  ${this.ai.def.name}`, 1600);
    this.last = performance.now();
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }

  _resetStats() {
    const blank = () => ({ landed: 0, damage: 0, knockdowns: 0, control: 0 });
    this.stats = { player: blank(), ai: blank() };
  }

  _placeCorners() {
    this.player.pos = { x: -1.3, z: 0 };
    this.ai.pos = { x: 1.3, z: 0 };
    MovementSystem.updateFacing(this.player, this.ai);
  }

  _resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.ring.resize(w, h);
  }

  _loop(now) {
    const dtMs = Math.min(50, now - this.last);
    this.last = now;
    this._update(dtMs, now);
    this.ring.render(now);
    this.hud.update(dtMs, this.roundTime);
    this._debug();
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }

  _update(dtMs, now) {
    switch (this.phase) {
      case 'intro': this._intro(dtMs); break;
      case 'fight': this._fight(dtMs, now); break;
      case 'count': this._count(dtMs); break;
      case 'roundend': this._roundEnd(dtMs); break;
      case 'between': this._between(dtMs); break;
      case 'matchend': default: break;
    }
    // Sprites/timers still advance visually when not fighting.
    if (this.phase !== 'fight') {
      for (const f of this.fighters) f.update(dtMs);
    }
  }

  _intro(dtMs) {
    this.phaseTimer -= dtMs;
    if (this.phaseTimer <= 0) {
      this.phase = 'fight';
      this.audio.play({ type: 'bell' });
      this.hud.announce('BOX!', 700);
    }
  }

  _fight(dtMs, now) {
    // --- Player intent ---
    if (this.player.canAct()) {
      this.player.blocking = this.input.isBlocking();
      const dodge = this.input.consumeDodge();
      if (dodge !== null) this.player.startDodge(dodge);
      // Buffered punch: fire the oldest still-valid press; keep it queued if the
      // one-active-punch rule blocks it for now (fires when the hand frees).
      const id = this.input.peekPunch(now, Config.input.bufferMs);
      if (id) {
        const p = PUNCHES[id];
        if (p && this.player.startPunch(p.hand, p)) this.input.popPunch();
      }
      const axis = this.input.axis();
      const fwd = Math.sign(this.ai.pos.x - this.player.pos.x) || 1;
      MovementSystem.move(this.player, { x: axis.x * fwd, z: axis.z }, dtMs, false);
    }

    // --- AI intent ---
    this.aiCtrl.update(dtMs);
    if (this.ai.canAct()) {
      MovementSystem.move(this.ai, this.aiCtrl.moveDir, dtMs, this.aiCtrl.aggressive);
    }

    MovementSystem.updateFacing(this.player, this.ai);

    // --- Advance state machines ---
    for (const f of this.fighters) f.update(dtMs);

    // --- Resolve combat ---
    const events = CombatSystem.update(this.fighters, now);
    for (const ev of events) this._processEvent(ev);

    // Health depletion forces a knockdown even without a KO-power shot.
    for (const f of this.fighters) {
      if (!f.down && f.health <= 0) f.knockDown();
    }

    if (this.player.down || this.ai.down) {
      this._enterCount(this.player.down ? this.player : this.ai);
      return;
    }

    // Round clock.
    this.roundTime -= dtMs / 1000;
    if (this.roundTime <= 0) {
      this.roundTime = 0;
      this._enterRoundEnd();
    }
  }

  _processEvent(ev) {
    this.audio.play(ev);
    if (ev.type !== 'hit') return;
    const s = this.stats[ev.side];
    s.landed += 1;
    s.damage += ev.damage;
    if (ev.knockdown) s.knockdowns += 1;
    if (ev.combo) {
      this.hud.showCombo(ev.combo);
      this.audio.play({ type: 'combo' });
    }
    if (ev.interrupted && ev.side === 'player') this.hud.showCombo('Interrupt');
    if (ev.knockdown) {
      this.hud.announce('DOWN!', 1200);
    }
  }

  _enterCount(f) {
    this.phase = 'count';
    this.countTimer = 0;
    this.downFighter = f;
    const heart = f.attr('heart') / 100;
    const healthFrac = f.health / Config.fighter.maxHealth;
    if (f.health <= 0) this.willRise = false;
    else {
      const chance = Math.min(0.95, Math.max(0.1,
        0.85 - f.knockdowns * 0.22 - (1 - healthFrac) * 0.5 + heart * 0.25));
      this.willRise = Math.random() < chance;
    }
  }

  _count(dtMs) {
    this.countTimer += dtMs / 1000;
    const n = Math.min(Config.match.knockdownCount, Math.ceil(this.countTimer));
    this.hud.announce(`COUNT… ${n}`, 400);

    const other = this.downFighter === this.player ? 'ai' : 'player';
    if (this.downFighter.knockdowns >= Config.match.maxKnockdownsBeforeTko) {
      this._endMatch(other, 'TKO'); return;
    }
    if (this.willRise) {
      if (this.countTimer >= Config.knockdown.getUpSeconds) {
        const f = this.downFighter;
        f.down = false;
        f.stun = 0;
        f.stamina = Math.max(f.stamina, 28);
        for (const h of Object.values(f.hands)) { h.phase = 'idle'; h.punch = null; }
        this.downFighter = null;
        this.phase = 'fight';
        this.hud.announce('BOX ON!', 800);
      }
    } else if (this.countTimer >= Config.match.knockdownCount) {
      this._endMatch(other, 'KO');
    }
  }

  _enterRoundEnd() {
    // Attribute rough ring-control credit from who spent more time forward.
    this.stats.player.control = Math.max(0, -this.player.pos.x + this.ai.pos.x);
    this.stats.ai.control = Math.max(0, -this.ai.pos.x + this.player.pos.x);
    const card = JudgeSystem.scoreRound(this.stats.player, this.stats.ai);
    this.cards.push(card);
    this.phase = 'roundend';
    this.phaseTimer = 2200;
    this.audio.play({ type: 'bell' });
    this.hud.announce(`END OF ROUND ${this.round} — ${card.player}-${card.ai}`, 2200);
  }

  _roundEnd(dtMs) {
    this.phaseTimer -= dtMs;
    if (this.phaseTimer > 0) return;
    if (this.round >= Config.match.rounds) {
      const d = JudgeSystem.decision(this.cards);
      this._endMatch(d.winner, 'decision', d);
    } else {
      this.phase = 'between';
      this.phaseTimer = Config.match.betweenRoundSeconds * 1000;
      this.hud.announce('CORNER — recover & reset', 1600);
    }
  }

  _between(dtMs) {
    this.phaseTimer -= dtMs;
    // Between-round recovery: stamina and guard come back, damage persists.
    for (const f of this.fighters) {
      f.stamina = Math.min(Config.fighter.maxStamina, f.stamina + (dtMs / 1000) * 22);
      f.guard = Config.defence.guardMax;
      f.stun = 0;
    }
    if (this.phaseTimer <= 0) {
      this.round += 1;
      this.roundTime = Config.match.roundSeconds;
      this._resetStats();
      this._placeCorners();
      this.hud.setRound(this.round, Config.match.rounds);
      this.phase = 'intro';
      this.phaseTimer = 1200;
      this.hud.announce(`ROUND ${this.round}`, 1000);
    }
  }

  _endMatch(winner, method, extra) {
    this.phase = 'matchend';
    this.audio.play({ type: 'bell' });
    let text;
    if (winner === 'draw') text = 'DRAW';
    else {
      const f = winner === 'player' ? this.player : this.ai;
      const m = method === 'decision'
        ? `by decision ${extra.p}-${extra.a}`
        : `by ${method}`;
      text = `${f.def.name} WINS ${m}!`;
    }
    this.matchResult = { winner, method };
    this.hud.announce(`${text}  ·  ENTER to rematch`, 999999);
    this.input.enabled = false;
  }

  _restart() {
    for (const f of this.fighters) {
      f.health = Config.fighter.maxHealth;
      f.stamina = Config.fighter.maxStamina;
      f.damage = { head: 0, body: 0 };
      f.stun = 0; f.guard = Config.defence.guardMax;
      f.knockdowns = 0; f.down = false;
      f.punchHistory = [];
      for (const h of Object.values(f.hands)) { h.phase = 'idle'; h.punch = null; }
    }
    this.round = 1;
    this.roundTime = Config.match.roundSeconds;
    this.cards = [];
    this.matchResult = null;
    this._resetStats();
    this._placeCorners();
    this.hud.setRound(this.round, Config.match.rounds);
    this.input.enabled = true;
    this.phase = 'intro';
    this.phaseTimer = 1200;
    this.hud.announce('REMATCH — BOX!', 1000);
  }

  _debug() {
    if (!Config.debug) { this.hud.setDebug([]); return; }
    const f = (x) => x.toFixed(1);
    const dist = Math.hypot(this.player.pos.x - this.ai.pos.x, this.player.pos.z - this.ai.pos.z);
    this.hud.setDebug([
      `phase=${this.phase} round=${this.round} t=${f(this.roundTime)}`,
      `dist=${f(dist)}`,
      `P hp=${f(this.player.health)} st=${f(this.player.stamina)} stun=${f(this.player.stun)} L=${this.player.hands.left.phase} R=${this.player.hands.right.phase}`,
      `A hp=${f(this.ai.health)} st=${f(this.ai.stamina)} plan=${this.aiCtrl.plan ? this.aiCtrl.plan.join(',') : '-'}`,
      `cards=${this.cards.map((c) => `${c.player}-${c.ai}`).join(' ')}`,
    ]);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKey);
    this.input.destroy();
  }
}
