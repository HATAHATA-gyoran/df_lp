// Speed streaks graceful decay patch for DeepFisher
// 加速終了時に白い線（スピードストリーク）を即時消去せず、
// 余韻を残して上方向へ流れつつフェードアウトする挙動に置き換える。

import FishingScene from '../scenes/FishingScene.js';
import { SaveManager } from '../core/SaveManager.js';

(function(){
  if (!FishingScene || !FishingScene.prototype) return;
  const origMount = FishingScene.prototype.mount;
  if (typeof origMount !== 'function') return;

  FishingScene.prototype.mount = function(container, manager, state, data) {
    // まず本来の mount を実行
    origMount.call(this, container, manager, state, data);

    // 追加フラグ
    this._speedFxDecaying = false;

    const self = this;

    // セーブ済み最大深度を初期反映（UI即時更新）
    try {
      const saved = Math.max(0, Math.floor(Number(this.state?.maxDepth || 0)));
      if (!Number.isFinite(this._maxDepthMeters)) this._maxDepthMeters = 0;
      if (saved > (this._maxDepthMeters || 0)) this._maxDepthMeters = saved;
      this._renderDepth?.();
    } catch(_) {}

    // 最大深度の更新を保存するように _updateDepthAndSpawns をラップ
    try {
      const origUpd = this._updateDepthAndSpawns;
      if (typeof origUpd === 'function') {
        this._updateDepthAndSpawns = (dt) => {
          try { origUpd.call(this, dt); } catch(_) { /* fallthrough */ }
          try {
            const curMax = Math.floor(Number(this._maxDepthMeters || 0));
            if (curMax > Math.floor(Number(this.state?.maxDepth || 0))) {
              if (this.state) this.state.maxDepth = curMax;
              try { SaveManager.save(this.state); } catch(_) {}
            }
          } catch(_) {}
        };
      }
    } catch(_) {}

    // _initFishSystem で _maxDepthMeters が 0 に初期化されるため、保存値を復元して表示
    try {
      const origInit = this._initFishSystem;
      if (typeof origInit === 'function') {
        this._initFishSystem = () => {
          try { origInit.call(this); } catch(_) {}
          try {
            const saved = Math.max(0, Math.floor(Number(this.state?.maxDepth || 0)));
            if (saved > (this._maxDepthMeters || 0)) this._maxDepthMeters = saved;
            this._renderDepth?.();
          } catch(_) {}
        };
      }
    } catch(_) {}

    // 減衰対応版: スピードストリークを開始
    this._startSpeedStreaks = function() {
      try {
        if (!self._safe) return;
        self._speedFxDecaying = false; // 再開時は減衰解除
        if (!self._speedFxCanvas) {
          const cvs = document.createElement('canvas');
          cvs.className = 'speed-streaks';
          cvs.style.position = 'absolute';
          cvs.style.inset = '0';
          cvs.style.pointerEvents = 'none';
          cvs.style.zIndex = '8';
          self._safe.appendChild(cvs);
          self._speedFxCanvas = cvs;
          const resize = () => {
            try {
              const r = self._safe.getBoundingClientRect();
              const dpr = Math.max(1, window.devicePixelRatio || 1);
              cvs.width = Math.max(1, Math.floor(r.width * dpr));
              cvs.height = Math.max(1, Math.floor(r.height * dpr));
              cvs.style.width = r.width + 'px';
              cvs.style.height = r.height + 'px';
            } catch(_) {}
          };
          self._onResizeSpeedFx = resize;
          resize();
          try { window.addEventListener('resize', self._onResizeSpeedFx); } catch(_) {}
        }
        if (!self._speedFxRaf && self._speedFxCanvas) {
          const ctx = self._speedFxCanvas.getContext('2d');
          if (!ctx) return;
          const streaks = [];
          let last = performance.now();
          const loop = (t) => {
            const dt = (t - last) / 1000; last = t;
            const cvs = self._speedFxCanvas;
            if (!cvs) { self._speedFxRaf = null; return; }
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            const w = cvs.width, h = cvs.height;
            ctx.clearRect(0, 0, w, h);
            // 減衰中は新規生成を停止
            const mul = Math.max(1, self._scrollSpeedMul || 1);
            const decaying = !!self._speedFxDecaying;
            const spawn = decaying ? 0 : Math.min(200, Math.floor(10 * mul));
            for (let i = 0; i < spawn; i++) {
              streaks.push({
                x: Math.random() * w,
                y: h + Math.random() * h * 0.3,
                len: (10 + Math.random() * 50) * dpr * Math.min(1.5, mul * 0.2),
                vy: (-400 - Math.random() * 900) * (0.5 + (mul - 1) * 0.25),
                a: 0.15 + Math.random() * 0.25,
                w: Math.max(1, Math.floor((1 + Math.random() * 2) * dpr))
              });
            }
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#ffffff';
            for (let i = streaks.length - 1; i >= 0; i--) {
              const s = streaks[i];
              s.y += s.vy * dt;
              if (decaying) {
                // 徐々にフェードし、上方向への速度に少しブーストを与える
                s.a *= Math.pow(0.98, dt * 60);
                s.vy *= (1 + 0.35 * dt);
              }
              ctx.globalAlpha = Math.max(0, Math.min(1, s.a));
              ctx.lineWidth = s.w;
              ctx.beginPath();
              ctx.moveTo(s.x, s.y);
              ctx.lineTo(s.x, s.y - s.len);
              ctx.stroke();
              if (s.y < -s.len || s.a <= 0.02) streaks.splice(i, 1);
            }
            ctx.globalAlpha = 1;
            // 減衰中にすべて消えたら自動クリーンアップ
            if (decaying && streaks.length === 0) {
              self._speedFxRaf = null;
              try { if (self._onResizeSpeedFx) window.removeEventListener('resize', self._onResizeSpeedFx); } catch(_) {}
              self._onResizeSpeedFx = null;
              if (self._speedFxCanvas) { try { self._speedFxCanvas.remove(); } catch(_) {} self._speedFxCanvas = null; }
              self._speedFxDecaying = false;
              return;
            }
            self._speedFxRaf = requestAnimationFrame(loop);
          };
          self._speedFxRaf = requestAnimationFrame((t)=>{ last=t; self._speedFxRaf=requestAnimationFrame(loop); });
        }
      } catch(_) {}
    };

    // 減衰対応版: スピードストリーク停止（減衰モードへ移行）
    this._stopSpeedStreaks = function() {
      try {
        if (self._speedFxCanvas && self._speedFxRaf) {
          self._speedFxDecaying = true; // 生成停止→フェードアウト
          return;
        }
        // 実行していなければ即時後始末
        if (self._speedFxRaf) cancelAnimationFrame(self._speedFxRaf);
        self._speedFxRaf = null;
        if (self._onResizeSpeedFx) { try { window.removeEventListener('resize', self._onResizeSpeedFx); } catch(_) {} self._onResizeSpeedFx = null; }
        if (self._speedFxCanvas) { try { self._speedFxCanvas.remove(); } catch(_) {} self._speedFxCanvas = null; }
        self._speedFxDecaying = false;
      } catch(_) {}
    };
    // GET直前に白線（スピードストリーク）とロープを確実に消すためのフック
    try {
      const origOnGet = this._onGetFish;
      if (typeof origOnGet === 'function') {
        this._onGetFish = async function(...args) {
          // スピードストリーク停止＆強制除去
          try { this._stopSpeedStreaks?.(); } catch(_) {}
          try {
            if (this._speedFxRaf) { cancelAnimationFrame(this._speedFxRaf); this._speedFxRaf = null; }
            if (this._onResizeSpeedFx) { try { window.removeEventListener('resize', this._onResizeSpeedFx); } catch(_) {} this._onResizeSpeedFx = null; }
            if (this._speedFxCanvas) { try { this._speedFxCanvas.remove(); } catch(_) {} this._speedFxCanvas = null; }
          } catch(_) {}
          // ロープキャンバスの内容を明示クリア（display:none でも念のため）
          try { const ctx = this._ropeCanvas?.getContext?.('2d'); if (ctx && this._ropeCanvas) ctx.clearRect(0, 0, this._ropeCanvas.width, this._ropeCanvas.height); } catch(_) {}
          // 現在のスクロールpxから深度を最終反映し、最大深度を更新（表示も即時更新）
          try {
            const px = this._totalScrollPx || 0;
            const ppm = this._pxPerMeter || 4;
            this._depthMeters = px / ppm;
            if ((this._maxDepthMeters || 0) < (this._depthMeters || 0)) {
              this._maxDepthMeters = this._depthMeters;
            }
            this._renderDepth?.();
            // セーブへも反映
            try {
              const curMax = Math.floor(Number(this._maxDepthMeters || 0));
              if (this.state && curMax > Math.floor(Number(this.state?.maxDepth || 0))) {
                this.state.maxDepth = curMax;
                SaveManager.save(this.state);
              }
            } catch(_) {}
          } catch(_) {}
          return await origOnGet.apply(this, args);
        };
      }
    } catch(_) {}
  };
})();
