# Super KO Boxing — Prototype

A browser-based retro 3D boxing game with **semi-independent hand control** and a
**data-driven combo system**. Original fighters, artwork and mechanics — inspired by
the movement/control philosophy of classic 3D boxing, not derived from it.

This is the **first playable prototype** (Milestones 1–5 of the brief): one ring,
two billboard-sprite fighters in a 3D venue, movement, punches, blocking, dodging,
stamina, head/body damage, combo recognition, knockdowns, rounds, judge scoring and
a basic tactical AI.

**▶ Play online:** https://dfchillin.github.io/SuperKOBoxing/ *(published by GitHub
Pages once enabled — see [Deployment](#deployment)).*

## Running it locally

No build step. It's vanilla ES modules; Three.js is vendored in `vendor/` and
resolved via an `importmap`, so any static file server works:

```bash
cd super-ko-boxing
python3 -m http.server 8080      # or:  npm run serve
# open http://localhost:8080
```

> It must be *served* over http:// (ES modules don't load from `file://`).

### Controls

| Action | Key |
| --- | --- |
| Move | `W` `A` `S` `D` |
| Left Jab | `Q` |
| Right Cross | `E` |
| Left Hook | `Z` |
| Right Hook | `C` |
| Body punch (modifier) | hold `Ctrl` + `Q`/`E` |
| Block (high guard) | `Shift` |
| Dodge (direction from `A`/`D`) | `Space` |
| Toggle debug overlay | `` ` `` (backtick) |
| Rematch (after result) | `Enter` |

**Try a combo:** `Q → E → Z` in quick succession triggers **One-Two Hook** for a
damage + stun bonus (shown centre-screen).

## Tests

Pure gameplay logic (combat, combos, stamina, damage) has no rendering dependency
and is unit-tested with the Node test runner — no framework, no install:

```bash
npm test        # node tests/combat.test.js
```

## Deployment

The site is static, so it deploys to **GitHub Pages** with no build step. A workflow
at `.github/workflows/deploy.yml` publishes the repo root on every push to `main`.

**One-time setup:** in the repo, go to **Settings → Pages → Build and deployment →
Source** and select **GitHub Actions**. The next push (or a manual
*Actions → Deploy to GitHub Pages → Run workflow*) publishes to
`https://dfchillin.github.io/SuperKOBoxing/`.

> GitHub Pages for a **private** repo requires a paid plan (GitHub Pro/Team). On a
> free account, either make the repo public or host the static files on Netlify /
> Vercel / Cloudflare Pages instead (all serve this repo as-is, no build command).

## Architecture

Game logic is deliberately decoupled from rendering so the same update path can
later drive a headless multiplayer simulation. Rendering only ever *reads* fighter
state.

```
super-ko-boxing/
├── index.html            # canvas + HUD shell, importmap for Three.js
├── style.css             # retro-arcade HUD / menu styling
├── vendor/three.module.js# vendored Three.js (offline, no CDN)
├── tests/combat.test.js  # Node tests for the pure systems
└── src/
    ├── main.js           # boot: one local player-vs-AI Quick Fight
    ├── core/
    │   └── Config.js     # all balance/tuning values (data, not code)
    ├── data/
    │   ├── punches.js    # PunchDef table (damage, timing, range, stun…)
    │   ├── combos.js     # ComboDef table (sequence, timing, multipliers)
    │   └── fighters.js   # fictional roster (attributes, style, colours)
    ├── combat/
    │   ├── Fighter.js         # state + per-hand state machine (no rendering)
    │   ├── CombatSystem.js    # range/hit-window resolution → events
    │   ├── ComboSystem.js     # rolling-history combo recognition
    │   ├── MovementSystem.js  # ring movement, ropes, separation, facing
    │   ├── StaminaSystem.js   # spend/regen + gas penalties
    │   ├── DamageSystem.js    # head/body damage, stun, knockdown odds
    │   └── JudgeSystem.js     # 10-point-must round scoring + decision
    ├── ai/
    │   └── FighterAI.js       # personality-driven, think-timer decisions
    ├── input/
    │   └── InputManager.js    # configurable keyboard → intents (gamepad-ready)
    ├── rendering/
    │   ├── RingScene.js       # Three.js ring/venue/lights/camera
    │   └── FighterSprite.js   # procedural billboard pixel-boxer (placeholder)
    ├── ui/
    │   └── Hud.js             # DOM HUD: bars, timer, combos, announcements
    ├── audio/
    │   └── AudioManager.js    # Web Audio placeholder SFX (no asset files)
    └── scenes/
        └── MatchScene.js      # round state machine, wires systems each frame
```

### Key design decisions

- **Semi-independent hands.** Each hand (`Fighter.hands.left/right`) is its own
  `idle → startup → active → recovery` state machine with its own timers, so you
  can start recovering one hand while the other throws — and reckless double-hand
  attacks leave you exposed. Combinations are *built* from individual punches, not
  played back as canned animations.
- **Data-driven combat & combos.** `punches.js` / `combos.js` are pure data.
  `CombatSystem` resolves hits with a reliable **range + active-window** model
  (no rigid-body fists) and emits events; `ComboSystem` matches the tail of a
  rolling punch history against unlocked combos and applies the multipliers.
- **Systems emit events; presentation consumes them.** `CombatSystem.update()`
  returns `hit/miss/slip/dodge` events that `MatchScene` fans out to audio, HUD
  and stats. Nothing in `combat/` imports Three.js or the DOM.
- **Stamina is central.** It gates punch quality, defence and footwork; body
  damage suppresses regen; whiffs cost extra.
- **Placeholder art, real systems.** `FighterSprite` draws a pixel boxer to a
  canvas each frame (pose driven by hand extension / lean / block / down). Replace
  that one module with sprite-sheet playback without touching game logic.

## What the prototype includes (brief's "First Prototype Scope")

One ring · two billboard fighters · free movement · jab / cross / hooks / body
punches · high block · directional dodge · stamina · head + body damage · combo
recognition (`One-Two`, `One-Two Hook`, `Body-Head`, `Check Hook`) · basic AI with
personalities · round timer · knockdowns + referee count · KO / TKO / decision win
conditions · judge scorecards · keyboard controls · debug overlay.

## Next recommended steps

1. **Art & animation** — replace procedural sprites with real sprite sheets and add
   a proper `AnimationController` (state blending, hit reactions, get-up).
2. **Defence depth** — parries, slipping/weaving, body block vs. high block as
   separate inputs, guard-break openings.
3. **Cuts & swelling** — the damage model already separates regions; add cosmetic
   + accuracy/vision effects and between-round corner treatment.
4. **AI difficulty tiers** — pattern recognition and stamina management rather than
   faster reactions; expose difficulty in a menu.
5. **Menus & mode select** — Quick Fight / Training / Combo Practice front-end;
   fighter + venue select screens.
6. **More content** — expand the roster, add venues (cosmetic first), signature
   combos and perks/abilities.
7. **Deterministic replay** — add a `MatchRecorder` over the existing event stream,
   seed the RNG, then build the asynchronous ("correspondence") multiplayer flow on
   top of a headless run of `MatchScene`'s update path.
```
