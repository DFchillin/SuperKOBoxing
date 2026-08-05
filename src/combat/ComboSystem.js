import { Config } from '../core/Config.js';
import { COMBOS_BY_LENGTH } from '../data/combos.js';

// Recognises ordered punch sequences thrown within timing limits. Each fighter
// keeps a short rolling history of landed punches; on every new landed punch we
// check whether the tail of that history completes a known combo the fighter
// has unlocked.
export const ComboSystem = {
  record(fighter, punchId, nowMs) {
    fighter.punchHistory.push({ id: punchId, t: nowMs });
    if (fighter.punchHistory.length > Config.combo.historyLength) {
      fighter.punchHistory.shift();
    }
  },

  // Returns the best combo completed by the most recent punch, or null.
  detect(fighter, nowMs) {
    const hist = fighter.punchHistory;
    for (const combo of COMBOS_BY_LENGTH) {
      if (!fighter.def.unlockedCombos.includes(combo.id)) continue;
      const len = combo.sequence.length;
      if (hist.length < len) continue;
      const tail = hist.slice(hist.length - len);
      let ok = true;
      for (let i = 0; i < len; i++) {
        if (tail[i].id !== combo.sequence[i]) { ok = false; break; }
        if (i > 0 && tail[i].t - tail[i - 1].t > combo.maxGapMs) { ok = false; break; }
      }
      if (!ok) continue;
      // Prevent the same completed combo from re-triggering on a stale history.
      if (fighter.lastComboFinishT === tail[len - 1].t &&
          fighter.lastComboId === combo.id) continue;
      fighter.lastComboFinishT = tail[len - 1].t;
      fighter.lastComboId = combo.id;
      return combo;
    }
    return null;
  },
};
