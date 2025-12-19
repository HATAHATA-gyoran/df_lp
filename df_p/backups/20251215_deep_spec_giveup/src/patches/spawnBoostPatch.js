// Spawn Boost Patch: increase fish spawns during speed boost based on multiplier
// ブースト中のみ追加スポーンを行い、加速倍率に応じて頻度・群れサイズを増やす。

import FishingScene from '../scenes/FishingScene.js';

(function(){
  if (!FishingScene || !FishingScene.prototype) return;
  const origMount = FishingScene.prototype.mount;
  if (typeof origMount !== 'function') return;

  FishingScene.prototype.mount = function(container, manager, state, data) {
    // 先に本来の初期化
    origMount.call(this, container, manager, state, data);

    const self = this;
    const origApply = this.applySpeedBoost;
    if (typeof origApply !== 'function') return;

    // 既存の applySpeedBoost を拡張
    this.applySpeedBoost = function(mul = 2, durationMs = 2000) {
      // 既存処理（速度倍率・エフェクトなど）はそのまま適用
      try { origApply.call(self, mul, durationMs); } catch (_) {}

      // 前回の追加スポーンを停止
      try { if (self._spawnBoostStop) self._spawnBoostStop(); } catch(_) {}

      // 追加スポーン・ドライバ
      let running = true;
      let last = performance.now();
      let credits = 0; // 積み上げたスポーン回数の小数

      // 1秒あたりの追加スポーン頻度（調整可）: mul=1.5 -> ~0.75/s, mul=3 -> ~3/s
      const baseRatePerSec = Math.max(0, (mul - 1)) * 1.5;
      // 安全上限: 画面内の魚総数が多すぎる場合はスポーンを抑制
      const MAX_FISH = 80;

      const pickActiveSpawner = () => {
        try {
          const depth = self._depthMeters || 0;
          const arr = (self._spawners || []).filter(sp => depth >= sp.startDepth && depth <= sp.endDepth);
          if (arr.length === 0) return null;
          return arr[Math.floor(Math.random() * arr.length)] || null;
        } catch(_) { return null; }
      };

      const spawnOnce = () => {
        if (!self._gameActive) return; // ゲーム中のみ
        if (!self._safe) return;
        if (Array.isArray(self._fishes) && self._fishes.length >= MAX_FISH) return;
        const sp = pickActiveSpawner();
        const rank = sp ? sp.rank : 0;
        let baseDef = null;
        try { baseDef = self._pickFishDefByRank?.(rank); } catch(_) {}
        if (!baseDef) {
          baseDef = { id: `rank${rank}`, name_ja:`R${rank}`, rank, movement:{ pattern:'rise', speed: 60, amplitude:0, frequency:0, sizeScale: 1 } };
        }
        // 特別ケース: 学習済みの既存ルールに合わせる
        try {
          // Respect per-species spawnChance if provided
          const ch = (typeof baseDef.spawnChance === 'number') ? Math.max(0, Math.min(1, baseDef.spawnChance)) : 1;
          if (Math.random() > ch) return; // skip this tick

          if (baseDef.id === 'maiwashi') {
            // 元は 10〜15。倍率に応じて +0〜+8 程度を加算
            const extra = Math.min(8, Math.max(0, Math.floor((mul - 1) * 5)));
            const count = 10 + Math.floor(Math.random()*6) + extra;
            const def = { ...baseDef, movement: { ...(baseDef.movement||{}), pattern: 'straight', allowOffscreenX: true, despawnOffX: Math.max(120, baseDef.movement?.despawnOffX||120) } };
            self._spawnSchoolFromSide?.(def, count);
          } else if (baseDef.id === 'sake') {
            const def = { ...baseDef, movement: { ...(baseDef.movement||{}), pattern: 'sine', allowOffscreenX: true, despawnOffX: Math.max(120, baseDef.movement?.despawnOffX||120) } };
            self._spawnFishFromSide?.(def, (Math.random()<0.5?'right':'left'));
          } else if (baseDef.id === 'masaba') {
            // 元は (3, 32)。個数のみ増加
            const count = Math.min(10, 3 + Math.max(0, Math.floor((mul - 1) * 2)));
            self._spawnColumnRise?.(baseDef, count, 32);
          } else {
            self._spawnFishFromBottom?.(baseDef);
          }
        } catch(_) {}
      };

      const tick = (now) => {
        if (!running) return;
        const dt = (now - last) / 1000; last = now;
        // 経過時間で停止
        // 注意: origApply 内部のタイマで速度倍率は戻るが、こちらは durationMs で確実に停止
        // （mul 再発火時は上書き停止される）
        if (dt < 0) { requestAnimationFrame(tick); return; }
        credits += baseRatePerSec * dt;
        // 端数を維持して安定したレートで spawn
        while (credits >= 1) { spawnOnce(); credits -= 1; }
        requestAnimationFrame(tick);
      };

      self._spawnBoostStop = () => {
        running = false;
        self._spawnBoostStop = null;
      };

      // duration 管理: 一定時間後に停止
      try { setTimeout(() => { if (self._spawnBoostStop) self._spawnBoostStop(); }, Math.max(0, durationMs|0)); } catch(_) {}
      requestAnimationFrame((t)=>{ last = t; requestAnimationFrame(tick); });
    };
  };
})();
