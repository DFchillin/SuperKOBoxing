import { MatchScene } from './scenes/MatchScene.js';
import { MobileControls } from './input/MobileControls.js';

// Show the touch overlay on coarse-pointer devices, or when forced with ?touch=1.
function wantsTouchControls() {
  const forced = new URLSearchParams(location.search).has('touch');
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 820;
  return forced || coarse || touchCapable || smallScreen;
}

// Boot the prototype: one local player-vs-AI Quick Fight.
function boot() {
  const canvas = document.getElementById('game-canvas');
  const hudRoot = document.getElementById('hud');
  const scene = new MatchScene({ canvas, hudRoot });
  window._match = scene; // handy for debugging in the console

  if (wantsTouchControls()) {
    const stage = document.getElementById('stage');
    scene.mobile = new MobileControls(scene.input, stage);
    document.body.classList.add('touch-mode'); // hides the desktop controls card
  }

  // Kick the audio context on first interaction (browser autoplay policy).
  const resume = () => { scene.audio._ensure(); window.removeEventListener('pointerdown', resume); };
  window.addEventListener('pointerdown', resume);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
