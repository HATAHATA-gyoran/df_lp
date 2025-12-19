export const SaveManager = {
  KEY: 'deepfisher.save',

  hasSave() {
    try { return !!localStorage.getItem(this.KEY); } catch (_) { return false; }
  },

  load(state) {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (Array.isArray(data.caught)) state.caught = data.caught;
        if (data.bait && typeof data.bait === 'object') {
          state.bait = { id: data.bait.id || 'ebi', rank: Number(data.bait.rank || 0) };
        }
        if (typeof data.maxDepth === 'number') {
          state.maxDepth = Math.max(0, Math.floor(data.maxDepth));
        }
        // Settings (0..10)
        const clamp01 = (v) => Math.max(0, Math.min(10, Math.floor(Number(v))));
        if (!state.settings) state.settings = {};
        if (data.settings && typeof data.settings === 'object') {
          state.settings.bgmVolume = clamp01(data.settings.bgmVolume);
          state.settings.sfxVolume = clamp01(data.settings.sfxVolume);
          state.settings.mouseSensitivity = clamp01(data.settings.mouseSensitivity);
        }
        // Defaults if missing
        if (typeof state.settings.bgmVolume !== 'number') state.settings.bgmVolume = 6;
        if (typeof state.settings.sfxVolume !== 'number') state.settings.sfxVolume = 10;
        if (typeof state.settings.mouseSensitivity !== 'number') state.settings.mouseSensitivity = 6;
        return true;
      }
    } catch (_) { }
    return false;
  },

  save(state) {
    try {
      const payload = {
        version: 1,
        caught: Array.isArray(state.caught) ? state.caught : [],
        bait: state.bait ? { id: state.bait.id || 'ebi', rank: Number(state.bait.rank || 0) } : { id: 'ebi', rank: 0 },
        maxDepth: Math.max(0, Math.floor(Number(state.maxDepth || 0))),
        settings: {
          bgmVolume: Math.max(0, Math.min(10, Math.floor(Number(state?.settings?.bgmVolume ?? 6)))),
          sfxVolume: Math.max(0, Math.min(10, Math.floor(Number(state?.settings?.sfxVolume ?? 10)))),
          mouseSensitivity: Math.max(0, Math.min(10, Math.floor(Number(state?.settings?.mouseSensitivity ?? 6))))
        }
      };
      if (payload.bait.id === 'ebi') {
        // console.log('[DEBUG] SaveManager.save: Saving bait as ebi!', new Error().stack);
      }
      localStorage.setItem(this.KEY, JSON.stringify(payload));
      return true;
    } catch (_) { return false; }
  },

  reset(state) {
    try { localStorage.removeItem(this.KEY); } catch (_) { }
    if (state) {
      try { state.caught = []; } catch (_) { }
      try { state.bait = { id: 'ebi', rank: 0 }; } catch (_) { }
      try { state.maxDepth = 0; } catch (_) { }
    }
    this.save(state);
  },

  recordCatch(state, def) {
    if (!state) return;
    const entry = {
      id: def?.id || 'unknown',
      name_ja: def?.name_ja || '',
      rank: Number(def?.rank || 0)
    };
    if (!Array.isArray(state.caught)) state.caught = [];
    // 重複登録を避ける（同じidは1件に）
    const exists = state.caught.some(f => f && f.id === entry.id);
    if (!exists) state.caught.push(entry);
  },

  setBait(state, id, rank) {
    if (!state) return;
    // console.log(`[DEBUG] SaveManager.setBait: id=${id}, rank=${rank}`, new Error().stack);
    state.bait = { id: id || 'ebi', rank: Number(rank || 0) };
  }
};
