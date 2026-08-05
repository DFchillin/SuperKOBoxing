// Plain Node test runner (no framework, no build). Exercises the pure gameplay
// systems, which have no Three.js dependency.
//   Run:  node tests/combat.test.js
import assert from 'node:assert';
import { PUNCHES } from '../src/data/punches.js';
import { Fighter } from '../src/combat/Fighter.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { ComboSystem } from '../src/combat/ComboSystem.js';
import { StaminaSystem } from '../src/combat/StaminaSystem.js';
import { DamageSystem } from '../src/combat/DamageSystem.js';
import { Config } from '../src/core/Config.js';

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ok  ${name}`); }
  catch (e) { console.error(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; }
}

// A minimal fighter def so we don't depend on the roster balance.
function def(overrides = {}) {
  return {
    id: 'test', name: 'Test', nickname: 'T', country: 'XX', style: 'pressure_fighter',
    attributes: {
      power: 50, handSpeed: 50, movementSpeed: 50, stamina: 50, chin: 50,
      bodyDurability: 50, defence: 50, accuracy: 50, recovery: 50, reach: 50,
      footwork: 50, counter: 50, combination: 50, heart: 50,
    },
    colors: { skin: '#000', trunks: '#000', gloves: '#000', accent: '#000' },
    unlockedCombos: ['one_two', 'one_two_hook'],
    aiPersonality: 'aggressive',
    ...overrides,
  };
}

function pair() {
  const a = new Fighter(def(), 'player');
  const b = new Fighter(def(), 'ai');
  a.opponent = b; b.opponent = a;
  a.pos = { x: 0, z: 0 }; b.pos = { x: 0.9, z: 0 }; // in jab range
  return [a, b];
}

test('combo: one-two-hook recognised within timing', () => {
  const [a] = pair();
  ComboSystem.record(a, 'left_jab', 0);
  ComboSystem.record(a, 'right_cross', 200);
  ComboSystem.record(a, 'left_hook', 400);
  const combo = ComboSystem.detect(a, 400);
  assert.ok(combo, 'expected a combo');
  assert.strictEqual(combo.id, 'one_two_hook');
});

test('combo: broken timing does not trigger', () => {
  const [a] = pair();
  ComboSystem.record(a, 'left_jab', 0);
  ComboSystem.record(a, 'right_cross', 200);
  ComboSystem.record(a, 'left_hook', 2000); // way outside maxGapMs
  const combo = ComboSystem.detect(a, 2000);
  assert.strictEqual(combo, null);
});

test('combo: does not re-trigger on stale history', () => {
  const [a] = pair();
  ComboSystem.record(a, 'left_jab', 0);
  ComboSystem.record(a, 'right_cross', 200);
  assert.ok(ComboSystem.detect(a, 200));   // first detect fires
  assert.strictEqual(ComboSystem.detect(a, 200), null); // same tail, no re-fire
});

test('stamina: spend, regen and exhaustion penalties', () => {
  const [a] = pair();
  StaminaSystem.spend(a, 90);
  assert.ok(a.stamina <= 10);
  assert.ok(StaminaSystem.isExhausted(a));
  assert.ok(StaminaSystem.speedMult(a) < 1);
  StaminaSystem.regen(a, 2);
  assert.ok(a.stamina > 10, 'stamina should recover over time');
});

test('damage: head/body reduce shared health pool', () => {
  const [a] = pair();
  const start = a.health;
  DamageSystem.apply(a, 20, 'head');
  DamageSystem.apply(a, 20, 'body');
  assert.ok(a.health < start);
  assert.ok(a.damage.head > 0 && a.damage.body > 0);
});

test('combat: a landed jab damages the opponent', () => {
  const rnd = Math.random;
  Math.random = () => 0; // force the accuracy/knockdown rolls to succeed/whatever
  try {
    const [a, b] = pair();
    const jab = PUNCHES.left_jab;
    assert.ok(a.startPunch('left', jab));
    a.update(jab.startupMs + 1);            // advance into the active window
    assert.strictEqual(a.hands.left.phase, 'active');
    const before = b.health;
    CombatSystem.update([a, b], 100);
    assert.ok(b.health < before, 'defender should take damage');
    assert.ok(a.hands.left.resolved, 'punch should be marked resolved');
  } finally { Math.random = rnd; }
});

test('combat: block reduces incoming head damage', () => {
  const rnd = Math.random;
  Math.random = () => 0.99; // avoid knockdown; still lands (accuracy path uses >)
  try {
    // Landing check uses `Math.random() > acc - evasion`; 0.99 would miss, so
    // instead force a mid value that lands but never knocks down.
    Math.random = () => 0.2;
    const [a, b] = pair();
    b.blocking = true;
    const cross = PUNCHES.right_cross;
    a.startPunch('right', cross);
    a.update(cross.startupMs + 1);
    const before = b.health;
    CombatSystem.update([a, b], 100);
    const blockedLoss = before - b.health;

    const [c, d] = pair();
    c.startPunch('right', PUNCHES.right_cross);
    c.update(cross.startupMs + 1);
    const before2 = d.health;
    CombatSystem.update([c, d], 100);
    const cleanLoss = before2 - d.health;

    assert.ok(blockedLoss < cleanLoss, 'blocked punch should hurt less');
  } finally { Math.random = rnd; }
});

console.log(`\n${passed} passing`);
