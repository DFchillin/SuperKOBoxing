// Minimal Web Audio placeholder SFX so the prototype has punch/bell feedback
// without shipping audio files. Real samples can replace _blip() later.
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  _blip({ freq = 220, dur = 0.08, type = 'square', gain = 0.15, sweep = 0 }) {
    const ctx = this._ensure();
    if (!ctx || !this.enabled) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (sweep) osc.frequency.exponentialRampToValueAtTime(
      Math.max(30, freq + sweep), ctx.currentTime + dur,
    );
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  play(event) {
    switch (event.type) {
      case 'hit':
        if (event.knockdown) this._blip({ freq: 90, dur: 0.35, type: 'sawtooth', gain: 0.3, sweep: -60 });
        else if (event.blocked) this._blip({ freq: 300, dur: 0.05, type: 'triangle', gain: 0.12 });
        else if (event.target === 'body') this._blip({ freq: 130, dur: 0.12, type: 'square', gain: 0.2 });
        else this._blip({ freq: event.counter ? 520 : 340, dur: 0.09, type: 'square', gain: 0.2, sweep: -140 });
        break;
      case 'miss': this._blip({ freq: 600, dur: 0.05, type: 'sine', gain: 0.06, sweep: -300 }); break;
      case 'dodge':
      case 'slip': this._blip({ freq: 700, dur: 0.06, type: 'sine', gain: 0.08, sweep: 200 }); break;
      case 'bell': this._blip({ freq: 800, dur: 0.5, type: 'triangle', gain: 0.25 }); break;
      case 'combo': this._blip({ freq: 660, dur: 0.14, type: 'square', gain: 0.22, sweep: 220 }); break;
      default: break;
    }
  }
}
