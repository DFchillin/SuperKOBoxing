import { MatchScene } from './scenes/MatchScene.js';

// Boot the prototype: one local player-vs-AI Quick Fight.
function boot() {
  const canvas = document.getElementById('game-canvas');
  const hudRoot = document.getElementById('hud');
  const scene = new MatchScene({ canvas, hudRoot });
  window._match = scene; // handy for debugging in the console

  // Kick the audio context on first interaction (browser autoplay policy).
  const resume = () => { scene.audio._ensure(); window.removeEventListener('pointerdown', resume); };
  window.addEventListener('pointerdown', resume);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
