// 10-point-must round scoring. Reads per-round stats and returns each fighter's
// round score plus the running match verdict.
export const JudgeSystem = {
  scoreRound(playerStats, aiStats) {
    const work = (s) => s.landed + s.damage * 0.35 + s.knockdowns * 12 + s.control * 0.5;
    const pw = work(playerStats);
    const aw = work(aiStats);

    let p = 10;
    let a = 10;
    if (pw > aw + 1) a = 9 - aiStats.knockdowns; // player wins the round
    else if (aw > pw + 1) p = 9 - playerStats.knockdowns;
    else { p = 10; a = 10; } // even round

    p -= playerStats.knockdowns; // being dropped costs the round
    a -= aiStats.knockdowns;
    return { player: Math.max(6, p), ai: Math.max(6, a) };
  },

  decision(cards) {
    let p = 0;
    let a = 0;
    for (const c of cards) { p += c.player; a += c.ai; }
    if (p > a) return { winner: 'player', p, a };
    if (a > p) return { winner: 'ai', p, a };
    return { winner: 'draw', p, a };
  },
};
