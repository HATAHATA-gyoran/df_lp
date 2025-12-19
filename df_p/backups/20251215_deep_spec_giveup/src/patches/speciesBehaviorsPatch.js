// Species Behaviors Patch
// 各種のカスタム挙動をランタイムで注入（軽量・安全にスロットリング実装）

import FishingScene from '../scenes/FishingScene.js';
import Fish from '../entities/Fish.js';

(function () {
  if (!FishingScene || !FishingScene.prototype) return;
  const origMount = FishingScene.prototype.mount;
  const origUnmount = FishingScene.prototype.unmount;
  if (typeof origMount !== 'function') return;

  // ---- Helper: 一度だけ幅を倍率で拡大 ----
  const applyWidthScaleOnce = (fish, mul, flagName) => {
    try {
      if (!fish || !fish.el || !mul || mul === 1) return;
      if (fish[flagName]) return;
      const r = fish.el.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width * mul));
      fish._baseWidthPx = w; // 以降のパルス拡縮に反映される
      fish.el.style.width = `${w}px`;
      fish[flagName] = true;
    } catch (_) { }
  };

  // ---- Fish.applyMovementPreset をラップし、種別ごとに微調整 ----
  const origApply = Fish?.prototype?.applyMovementPreset;
  const origUpdate = Fish?.prototype?.update;
  if (typeof origApply === 'function') {
    Fish.prototype.applyMovementPreset = function (...args) {
      origApply.apply(this, args);
      try {
        const id = this?.def?.id || '';
        // sake: 出現直後から回転しながら餌にまとわりつく
        if (id === 'sake') {
          // 餌追尾を高頻度に
          this._sampleSeekEnabled = true;
          this._seekInterval = 0.12; // 120ms
          this._seekTimer = Math.random() * this._seekInterval;
          this._seekSpeed = 230;
          // 近距離での粘着性を補強
          this._chaseInRange = true;
          this._chaseRange = 300;
          this._chaseSpeed = 200;
          // 回転は update 側の円運動オフセット処理で付与するため、ここでは設定しない
        }
        // mebaru: 高精度追尾
        if (id === 'mebaru') {
          this._sampleSeekEnabled = true;
          this._seekInterval = 0.12; // 120ms
          this._seekTimer = Math.random() * this._seekInterval;
          this._seekSpeed = 260;
          this._chaseInRange = true;
          this._chaseRange = 360;
          this._chaseSpeed = 240;
        }
        // shimasoi: 大型化 + 横方向に波打つ
        if (id === 'shimasoi') {
          applyWidthScaleOnce(this, 1.35, '_sizeAdjShimasoi'); // オジサン(1.0)より大
          this._waveXEnabled = true;
          this._waveXAmplitude = 26;
          this._waveXOmega = 2 * Math.PI * 0.85; // Hz
        }
        // kue: かなり大きく
        if (id === 'kue') {
          applyWidthScaleOnce(this, 1.75, '_sizeAdjKue');
        }
        // shirowani: クエよりさらに大
        if (id === 'shirowani') {
          applyWidthScaleOnce(this, 2.2, '_sizeAdjShark');
        }
        // daariaisoginchaku: くるくる回転しながら移動
        if (id === 'daariaisoginchaku') {
          this._circleEnabled = true;
          this._circleRadius = 18;
          this._circleOmega = 2.2;
          this._ellipseXScale = 1.0;
          this._ellipseYScale = 1.0;
        }
        // buri: 大きいシルエット + 餌追尾強化（少し小さめに調整）
        if (id === 'buri') {
          applyWidthScaleOnce(this, 1.7, '_sizeAdjBuri');
          this._sampleSeekEnabled = true;
          this._seekInterval = 0.12;
          this._seekTimer = Math.random() * this._seekInterval;
          this._seekSpeed = 200;
          this._chaseInRange = true;
          this._chaseRange = 420;
          this._chaseSpeed = 180;
        }
        // kohada: 最初は小さく、徐々に成長
        if (id === 'kohada') {
          applyWidthScaleOnce(this, 0.7, '_sizeAdjKohadaInit');
          this._kohadaGrow = { t: 0, durMs: 4200, mulFrom: 0.7, mulTo: 1.25 };
        }
        // kamasu: ダツ/ハッカク類似の突進をさらに高速で
        if (id === 'kamasu') {
          this._dashArmed = true;
          this._dashSpeed = 680;
          this._dashRange = 700;
          this._dashCooldownMs = 900;
          this._dashLast = 0;
        }
        // akoudai: 放物線運動（上に凸）
        if (id === 'akoudai') {
          this._parabolaEnabled = true;
          this._vy = -100; // 初速（上向き）
          this._gravity = 40; // 重力（下向き加速度）
        }
        // ebodai: 三角軌道（個体ごとに位相をずらす）
        if (id === 'ebodai') {
          this._triEnabled = true;
          this._triRad = 28; // 半径
          this._triPeriod = 2.6; // 1周秒
          this._triTheta = Math.random(); // 0..1 周期位相
        }
        // akagenge: 上昇しながら横波
        if (id === 'akagenge') {
          this._waveXEnabled = true;
          this._waveXAmplitude = 20;
          this._waveXOmega = 2 * Math.PI * 0.7;
          this._upwardDrift = (this._upwardDrift || 0) + 28;
        }
        // sekitoriiwashi: 上昇速度を速く（上にはける）
        if (id === 'sekitoriiwashi') {
          this._upwardDrift = 100;
        }
        // kintokidai: 縦に波打つ
        if (id === 'kintokidai') {
          this._waveYEnabled = true;
          this._waveYAmplitude = 18;
          this._waveYOmega = 2 * Math.PI * 0.6;
        }
        // uchiwafugu: 餌接近で巨大化
        if (id === 'uchiwafugu') {
          this._swellEnabled = true;
          this._baseScale = this.scale || 1;
          this._swellScale = this._baseScale * 5;
          this._swellRange = 150;
        }
        // ginzame: 斜め移動 + 反射（速度初期化）
        if (id === 'ginzame') {
          this._reflectMode = true;
          if (!this._vx && !this._vy) {
            this._vx = (Math.random() < 0.5 ? 1 : -1) * 120;
            this._vy = (Math.random() < 0.5 ? 1 : -1) * 80;
          }
        }
        // abachan: 薄色から段々色づく + ふらふら揺れ
        if (id === 'abachan') {
          try { if (this.el) { this.el.style.opacity = '0.6'; this.el.style.filter = 'saturate(0.4) brightness(0.95)'; } } catch (_) { }
          this._fadeConf = { t: 0, durSec: 4 };
          this._sway = { t: 0, ax: 10, ay: 6, wX: 2.1, wY: 1.7, sx: Math.random() * Math.PI * 2, sy: Math.random() * Math.PI * 2, px: 0, py: 0 };
        }
        // ginmedai: ゆっくり餌追尾 + 多スポーンは JSON 側で設定済み
        if (id === 'ginmedai') {
          this._sampleSeekEnabled = true;
          this._seekInterval = 0.28; // 280ms
          this._seekTimer = Math.random() * this._seekInterval;
          this._seekSpeed = 120;
          this._chaseInRange = true;
          this._chaseRange = 420;
          this._chaseSpeed = 110;
        }
        if (id === 'nokogirizame') {
          this._circleEnabled = true;
          this._circleRadius = 14;
          this._circleOmega = 2.2;
          this._ellipseXScale = 1.0;
          this._ellipseYScale = 1.0;
        }
        if (id === 'nodoguro') {
          applyWidthScaleOnce(this, 1.4, '_sizeAdjNodoguro');
          this._sampleSeekEnabled = true;
          this._seekInterval = 0.9;
          this._seekTimer = Math.random() * this._seekInterval;
          this._seekSpeed = 30;
          this._circleEnabled = true;
          this._circleRadius = 36;
          this._circleOmega = 1.6;
          this._ellipseXScale = 1.8;
          this._ellipseYScale = 0.6;
          this._dartEnabled = true;
          this._dartSpeed = 140;
          this._dartDur = 0.18;
          this._dartReturnEnabled = true;
          this._dartReturnFrac = 0.45;
          this._dartReturnDur = 0.22;
          this._dartIntervalMin = 0.6;
          this._dartIntervalMax = 1.1;
        }
        if (id === 'akagutsu') {
          const sp = 60;
          this._pattern = 'straight';
          this.vx = ((this.direction === 'left') ? -1 : 1) * sp;
          this._amp = 0;
          this._omega = 0;
        }
        if (id === 'madara') {
          // 回転しながら渦上に外へ行く動き
          this._circleEnabled = true;
          this._circleRadius = 30;
          this._circleOmega = 2.5;
          this._ellipseXScale = 1.0;
          this._ellipseYScale = 1.0;
          this._spiralGrow = { t: 0, durSec: 8, from: 30, to: 120 };
          this._upwardDrift = 40; // 上昇速度
        }
        if (id === 'mahokke') {
          applyWidthScaleOnce(this, 1.5, '_sizeAdjMahokke');
          this._pattern = 'sine';
          this.vx = ((this.direction === 'left') ? -1 : 1) * 68;
          this._amp = 12;
          this._circleEnabled = true;
          this._circleRadius = 84;
          this._circleOmega = 1.6;
          this._ellipseXScale = 2.0;
          this._ellipseYScale = 0.5;
        }
      } catch (_) { }
    };
  }

  if (typeof origUpdate === 'function') {
    Fish.prototype.update = function (dt) {
      origUpdate.call(this, dt);
      try {
        const id = this?.def?.id || '';
        // 円運動/渦（sake, daariaisoginchaku 専用）
        // ※汎用の _circleEnabled は Fish.js 側で処理されるため、ここでは重複適用しない
        if ((id === 'sake' || id === 'daariaisoginchaku') && this.el) {
          const w = (this._circleOmega && this._circleOmega !== 0) ? this._circleOmega : 2.4;
          let rad = (this._circleRadius && this._circleRadius > 0) ? this._circleRadius : 30;
          if (rad > 0 && w !== 0) {
            const dts = Math.max(0.001, dt || 0);
            if (this._spiralGrow) {
              const g = this._spiralGrow; g.t = (g.t || 0) + dts;
              const p = Math.min(1, g.t / (g.durSec || 6));
              const r0 = g.from || rad, r1 = g.to || r0; rad = r0 + (r1 - r0) * p; this._circleRadius = rad;
            }
            this._circleTheta = (this._circleTheta || 0) + w * dts;
            const ox = rad * (this._ellipseXScale || 1) * Math.cos(this._circleTheta);
            const oy = rad * (this._ellipseYScale || 1) * Math.sin(this._circleTheta);
            const px = this._circlePrevOx || 0, py = this._circlePrevOy || 0;
            this.x += (ox - px);
            this.y += (oy - py);
            this._circlePrevOx = ox; this._circlePrevOy = oy;
            this.setPosition(this.x, this.y);
          }
        }
        // 横波/縦波オフセット
        if (this._waveXEnabled && this.el) {
          const dts = Math.max(0.001, dt || 0);
          this._waveXTheta = (this._waveXTheta || 0) + (this._waveXOmega || (2 * Math.PI * 0.8)) * dts;
          const ax = (this._waveXAmplitude || 16) * Math.sin(this._waveXTheta);
          const px = this._waveXPrev || 0; this.x += (ax - px); this._waveXPrev = ax; this.setPosition(this.x, this.y);
        }
        if (this._waveYEnabled && this.el) {
          const dts = Math.max(0.001, dt || 0);
          this._waveYTheta = (this._waveYTheta || 0) + (this._waveYOmega || (2 * Math.PI * 0.8)) * dts;
          const ay = (this._waveYAmplitude || 16) * Math.sin(this._waveYTheta);
          const py = this._waveYPrev || 0; this.y += (ay - py); this._waveYPrev = ay; this.setPosition(this.x, this.y);
        }
        // 上昇ドリフト
        if (this._upwardDrift && this.el) {
          const dts = Math.max(0.001, dt || 0);
          this.y -= this._upwardDrift * dts; this.setPosition(this.x, this.y);
        }
        // 放物線運動（重力）
        if (this._parabolaEnabled && this.el) {
          const dts = Math.max(0.001, dt || 0);
          this._vy = (this._vy || 0) + (this._gravity || 0) * dts;
          this.y += this._vy * dts;
          this.setPosition(this.x, this.y);
        }
        // 三角軌道（中心基準の三角周回）
        if (this._triEnabled && this.el) {
          const dts = Math.max(0.001, dt || 0);
          this._triTheta = (this._triTheta || 0) + dts / (this._triPeriod || 2.6);
          const u = (this._triTheta % 1 + 1) % 1;
          if (this._triCx == null || this._triCy == null) { this._triCx = this.x; this._triCy = this.y; }
          const R = this._triRad || 28;
          const v0 = { x: this._triCx + R, y: this._triCy };
          const v1 = { x: this._triCx - R / 2, y: this._triCy + R * Math.sqrt(3) / 2 };
          const v2 = { x: this._triCx - R / 2, y: this._triCy - R * Math.sqrt(3) / 2 };
          let tx = 0, ty = 0, p = 0;
          if (u < 1 / 3) { p = (u) / (1 / 3); tx = v0.x + (v1.x - v0.x) * p; ty = v0.y + (v1.y - v0.y) * p; }
          else if (u < 2 / 3) { p = (u - 1 / 3) / (1 / 3); tx = v1.x + (v2.x - v1.x) * p; ty = v1.y + (v2.y - v1.y) * p; }
          else { p = (u - 2 / 3) / (1 / 3); tx = v2.x + (v0.x - v2.x) * p; ty = v2.y + (v0.y - v2.y) * p; }
          const px = (this._triPrevX ?? this._triCx), py = (this._triPrevY ?? this._triCy);
          this.x += (tx - px); this.y += (ty - py);
          this._triPrevX = tx; this._triPrevY = ty; this.setPosition(this.x, this.y);
        }
        // kohada: 徐々に成長（幅を補間）
        if (id === 'kohada' && this.el) {
          const g = this._kohadaGrow;
          if (g) {
            const dts = Math.max(0.001, dt || 0);
            g.t = Math.min((g.t || 0) + dts * 1000, g.durMs || 4000);
            if (!this._kohadaBaseW) {
              const r = this.el.getBoundingClientRect();
              this._kohadaBaseW = Math.max(1, Math.round(r.width / (g.mulFrom || 0.7)));
            }
            const p = Math.min(1, (g.t / (g.durMs || 4000)));
            const mul = (g.mulFrom || 0.7) + ((g.mulTo || 1.25) - (g.mulFrom || 0.7)) * p;
            const w = Math.max(1, Math.round(this._kohadaBaseW * mul));
            this._baseWidthPx = w;
            this.el.style.width = `${w}px`;
          }
        }
        if (id === 'nodoguro' && this.el) {
          const dts = Math.max(0.001, dt || 0);
          this._shrimpTimer = (this._shrimpTimer == null) ? (0.4 + Math.random() * 0.6) : (this._shrimpTimer - dts);
          if (this._shrimpState !== 'dash' && this._shrimpTimer <= 0) {
            this._shrimpState = 'dash';
            this._shrimpLeft = 0.14;
            this._shrimpTimer = 0.7 + Math.random() * 0.7;
            const th = this._circleTheta || 0;
            const ux0 = Math.cos(th), uy0 = Math.sin(th);
            const sgn = (this.direction === 'left') ? -1 : 1;
            this._shrimpUx = (ux0 == null || !isFinite(ux0)) ? sgn : (sgn * Math.abs(ux0));
            this._shrimpUy = (uy0 == null || !isFinite(uy0)) ? 0 : uy0;
          }
          if (this._shrimpState === 'dash') {
            const sp = 120;
            this.x += sp * (this._shrimpUx || ((this.direction === 'left') ? -1 : 1)) * dts;
            this.y += sp * (this._shrimpUy || 0) * dts;
            this.setPosition(this.x, this.y);
            this._shrimpLeft -= dts;
            if (this._shrimpLeft <= 0) { this._shrimpState = 'return'; this._shrimpLeft = 0.16; }
          } else if (this._shrimpState === 'return') {
            const sp = 70;
            this.x -= sp * (this._shrimpUx || ((this.direction === 'left') ? -1 : 1)) * dts;
            this.y -= sp * (this._shrimpUy || 0) * dts;
            this.setPosition(this.x, this.y);
            this._shrimpLeft -= dts;
            if (this._shrimpLeft <= 0) { this._shrimpState = 'idle'; }
          }
        }
      } catch (_) { }
    };
  }

  // ---- FishingScene を拡張 ----
  FishingScene.prototype.mount = function (container, manager, state, data) {
    origMount.call(this, container, manager, state, data);

    const self = this;

    // ホタルイカ用: 光の墨ゾーンのスタイルを注入（ドット絵風）
    try {
      const sid = 'df-ink-style';
      if (!document.getElementById(sid)) {
        const st = document.createElement('style'); st.id = sid;
        st.textContent = `
          .ink-zone-hotaru{ position:absolute; pointer-events:none; border-radius:50%; overflow:hidden; clip-path: circle(50% at 50% 50%); isolation: isolate;
            /* 円形かつ外周をマスクで柔らかくフェード（開始をさらに早める） */
            -webkit-mask-image: radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%);
                    mask-image: radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%);
            image-rendering: pixelated; image-rendering: crisp-edges;
            mix-blend-mode: screen;
            transition: opacity 0.2s ease; opacity:0.98; z-index: 8; }
        `;
        document.head.appendChild(st);
      }
    } catch (_) { }

    // 光の墨ゾーン生成ヘルパ
    self._inkZones = [];
    self._ripples = []; // セキトリイワシ用波紋
    self._suppressInkZones = false;
    const createInkZone = (cx, cy, rad = 120, durMs = 2200) => {
      try {
        if (!self._safe || self._suppressInkZones) return null;
        // キャンバスでモザイク描画（ドット絵風）
        const el = document.createElement('canvas');
        el.className = 'ink-zone-hotaru';
        const size = rad * 2;
        const pad = Math.max(8, Math.floor(rad * 0.25));
        const total = size + pad * 2;
        el.width = total; el.height = total;
        el.style.width = `${total}px`; el.style.height = `${total}px`;
        el.style.left = `${Math.floor(cx - rad - pad)}px`; el.style.top = `${Math.floor(cy - rad - pad)}px`;
        const ctx = el.getContext('2d', { alpha: true });
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          const cell = 6;
          const cols = Math.ceil(total / cell);
          const rows = Math.ceil(total / cell);
          const cX = rad + pad, cY = rad + pad;
          const theta = Math.random() * Math.PI * 2;
          const feather = Math.max(10, Math.floor(rad * 0.35)); // 広めのフェザー幅
          const edgePow = 1.8; // 非線形フェード強度（やや強め）
          // 角度方向の輪郭ゆらぎ（円形すぎる印象を軽減）
          const phi1 = Math.random() * Math.PI * 2;
          const phi2 = Math.random() * Math.PI * 2;
          const phi3 = Math.random() * Math.PI * 2;
          const rimAmp = rad * 0.12; // わずかに増やして円周の規則性を崩す
          ctx.save();
          ctx.translate(cX, cY);
          ctx.rotate(theta);
          ctx.translate(-cX, -cY);
          // モザイク同士は加算合成で重なり境界を柔らかく
          const prevComp = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = 'lighter';
          // 下地の柔らかいグロー（うっすら）
          const glow = ctx.createRadialGradient(cX, cY, 0, cX, cY, rad);
          glow.addColorStop(0, 'rgba(255,255,180,0.10)');
          glow.addColorStop(1, 'rgba(255,255,180,0.00)');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(cX, cY, rad, 0, Math.PI * 2); ctx.fill();
          for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols; i++) {
              let px = i * cell + cell / 2;
              let py = j * cell + cell / 2;
              const jx = (Math.random() - 0.5) * cell * 0.6;
              const jy = (Math.random() - 0.5) * cell * 0.6;
              px += jx; py += jy;
              const dx = px - cX;
              const dy = py - cY;
              const d = Math.hypot(dx, dy);
              const ang = Math.atan2(dy, dx);
              const rim = rad - rimAmp * (0.5 * Math.sin(3 * ang + phi1) + 0.3 * Math.sin(5 * ang + phi2) + 0.2 * Math.sin(9 * ang + phi3));
              if (d > rim) continue;
              const norm = Math.max(0, 1 - (d / rad));
              const steps = 5;
              const q = Math.floor(norm * steps) / steps;
              const rnd = Math.random();
              const edge = Math.max(0, Math.min(1, (rim - d) / feather));
              if (rnd > (0.22 + q * 0.58 * edge)) continue; // 縁は疎にして輪郭をぼかす
              const t = q;
              const r = Math.round(255);
              const g = Math.round(240 + (255 - 240) * t);
              const b = Math.round(120 + (200 - 120) * t);
              const alpha = (0.10 + 0.42 * q) * Math.pow(edge, edgePow);
              ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
              const ts = Math.max(2, cell * (0.55 + 0.45 * edge));
              ctx.fillRect(px - ts / 2, py - ts / 2, ts, ts);
            }
          }
          ctx.globalCompositeOperation = prevComp;
          ctx.restore();
          // ラジアルフェードで外周をさらに馴染ませる
          ctx.save();
          ctx.globalCompositeOperation = 'destination-in';
          const g = ctx.createRadialGradient(cX, cY, Math.max(1, rad * 0.38), cX, cY, rad + Math.floor(pad * 0.75));
          g.addColorStop(0, 'rgba(0,0,0,1)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cX, cY, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          // 端のランダム侵食（微小な穴を開けて機械的な輪郭を崩す）
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          const samples = Math.floor(90 + rad * 0.5);
          for (let k = 0; k < samples; k++) {
            const ang2 = Math.random() * Math.PI * 2;
            const rr = rad * (0.80 + Math.random() * 0.20);
            const sx = cX + Math.cos(ang2) * rr;
            const sy = cY + Math.sin(ang2) * rr;
            const er = 1.5 + Math.random() * 2.5; // 1.5〜4px程度
            ctx.beginPath();
            ctx.arc(sx, sy, er, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fill();
          }
          ctx.restore();
        }
        self._safe.appendChild(el);
        const z = { el, cx, cy, rad, end: performance.now() + durMs };
        self._inkZones.push(z);
        // フェードアウトしてから除去
        setTimeout(() => { try { el.style.opacity = '0'; } catch (_) { } }, Math.max(0, durMs - 180));
        setTimeout(() => {
          try { el.remove(); } catch (_) { };
          try { const i = self._inkZones.indexOf(z); if (i >= 0) self._inkZones.splice(i, 1); } catch (_) { }
        }, durMs);
        return z;
      } catch (_) { return null; }
    };

    try {
      const prevOnGet = this._onGetFish;
      if (typeof prevOnGet === 'function') {
        this._onGetFish = async function (...args) {
          try {
            this._suppressInkZones = true;
            try {
              const zs = this._inkZones || [];
              for (const z of zs) { try { z?.el?.remove?.(); } catch (_) { } }
              this._inkZones = [];
              const rs = this._ripples || [];
              for (const r of rs) { try { r?.el?.remove?.(); } catch (_) { } }
              this._ripples = [];
            } catch (_) { }
            try {
              const fis = this._fishes || [];
              for (const g of fis) {
                if (!g || !g.el) continue;
                if (g._inkHidden) { g._inkHidden = false; try { g.el.style.opacity = ''; } catch (_) { } }
              }
            } catch (_) { }
          } catch (_) { }
          return await prevOnGet.apply(this, args);
        };
      }
    } catch (_) { }

    // ---- 基礎スポーン率倍率（1.5x）: 既存ロジックを維持したまま間隔だけ短縮 ----
    try { self._spawnRateMul = 1.5; } catch (_) { }

    // 初期解放直後に作成されるスポーナーの nextAtSec を短縮
    const prevTryUnlock = this._tryUnlockRanks;
    if (typeof prevTryUnlock === 'function') {
      this._tryUnlockRanks = function (...args) {
        prevTryUnlock.apply(self, args);
        try {
          const now = self._clockSec || 0;
          const mul = self._spawnRateMul || 1;
          if (mul > 1 && Array.isArray(self._spawners)) {
            for (const sp of self._spawners) {
              if (!sp || sp._rateAdjApplied) continue;
              const dt = (sp.nextAtSec - now);
              if (Number.isFinite(dt) && dt > 0) {
                sp.nextAtSec = now + dt / mul;
                sp._rateAdjApplied = true;
              }
            }
          }
        } catch (_) { }
      };
    }

    try {
      const prevInit2 = this._initFishSystem;
      if (typeof prevInit2 === 'function') {
        this._initFishSystem = function (...args) {
          let ret;
          try { ret = prevInit2.apply(self, args); } catch (_) { }
          try { self._suppressInkZones = false; } catch (_) { }
          return ret;
        };
      }
    } catch (_) { }

    // スポーンが発生した直後に更新される次回スケジュールも短縮
    const prevUpd = this._updateDepthAndSpawns;
    if (typeof prevUpd === 'function') {
      this._updateDepthAndSpawns = function (dt) {
        const prevMap = new Map();
        try {
          if (Array.isArray(self._spawners)) {
            for (const s of self._spawners) prevMap.set(s, s?.nextAtSec);
          }
        } catch (_) { }
        prevUpd.call(self, dt);
        try {
          const now = self._clockSec || 0;
          const mul = self._spawnRateMul || 1;
          if (mul > 1 && Array.isArray(self._spawners)) {
            for (const sp of self._spawners) {
              if (!sp) continue;
              const old = prevMap.get(sp);
              if (sp.nextAtSec != null && sp.nextAtSec !== old) {
                if (sp._lastAdjAt !== now) {
                  const dt2 = sp.nextAtSec - now;
                  if (Number.isFinite(dt2) && dt2 > 0) {
                    sp.nextAtSec = now + dt2 / mul;
                    sp._lastAdjAt = now;
                  }
                }
              }
            }
          }
        } catch (_) { }
      };
    }

    // 1) 鰯/ニシン/シマガツオ: 連結隊列スポーン
    const prevSpawnSchool = this._spawnSchoolFromSide;
    this._spawnSchoolFromSide = function (def, count = 10) {
      try {
        if (!def || !self._safe) return prevSpawnSchool?.call(self, def, count);
        const id = def.id;
        const r = self._safe.getBoundingClientRect();
        // シマガツオ: 横から出て横に列を組む（一直線）
        if (id === 'shimagatsuo') {
          const dir = (Math.random() < 0.5) ? 'right' : 'left';
          const yBase = Math.floor(r.height * (0.25 + Math.random() * 0.5));
          const spacingX = 40;
          const desired = Math.min(14, Math.max(6, Math.floor(count * 1.2)));
          const baseDef = { ...def, movement: { ...(def.movement || {}), pattern: 'straight', allowOffscreenX: true, despawnOffX: Math.max(120, def.movement?.despawnOffX || 120) } };
          for (let i = 0; i < desired; i++) {
            self._spawnFishFromSide?.(baseDef, dir, yBase);
            const fish = (self._fishes && self._fishes[self._fishes.length - 1]) || null;
            if (fish) {
              const off = spacingX * i;
              const xPos = (dir === 'right') ? (-30 - off) : (r.width + 30 + off);
              fish.setPosition(xPos, yBase);
            }
          }
          return;
        }
        // 鰯: 連結ジグザグ
        if (id === 'maiwashi' || id === 'iwashi' || id === 'nishin') {
          const dir = (Math.random() < 0.5) ? 'right' : 'left';
          const yBase = Math.floor(r.height * (0.33 + Math.random() * 0.34));
          const sizeScale = 0.55;
          const amplitude = 22;
          const frequency = 1.6;
          const phaseStep = Math.PI / 8;
          const spacingX = 22;
          const mul = 1.6;
          const desired = Math.min(48, Math.max(20, Math.floor(count * mul)));
          const MAX_FISH = 80;
          if (Array.isArray(self._fishes) && self._fishes.length >= MAX_FISH) return;
          for (let i = 0; i < desired; i++) {
            const phase = i * phaseStep;
            const tri = (2 / Math.PI) * Math.asin(Math.sin(phase));
            const yOff = Math.round(amplitude * tri);
            const fDef = { ...def, movement: { ...(def.movement || {}), pattern: 'zigzag', amplitude, frequency, sizeScale, allowOffscreenX: true, despawnOffX: Math.max(120, (def.movement?.despawnOffX || 120)) } };
            self._spawnFishFromSide?.(fDef, dir, yBase + yOff);
            const fish = (self._fishes && self._fishes[self._fishes.length - 1]) || null;
            if (fish) {
              fish._phase = phase;
              const off = spacingX * i;
              const xPos = (dir === 'right') ? (-30 - off) : (r.width + 30 + off);
              fish.setPosition(xPos, fish.y);
            }
          }
          return;
        }
      } catch (_) { }
      return prevSpawnSchool?.call(self, def, count);
    };

    // 2) サバ: 三角フォーメーションで回転しながら上昇
    const prevColumnRise = this._spawnColumnRise;
    this._spawnColumnRise = function (def, count = 3, spacing = 28) {
      try {
        if (!def || !self._safe) return prevColumnRise?.call(self, def, count, spacing);
        if (def.id !== 'masaba') return prevColumnRise?.call(self, def, count, spacing);
        const r = self._safe.getBoundingClientRect();
        const x = Math.floor(r.width * (0.2 + Math.random() * 0.6));
        const base = { ...def, movement: { ...(def.movement || {}), pattern: 'rise', circleMove: true, circleRadius: 26, circleOmega: 1.8, ellipseXScale: 1, ellipseYScale: 1, patrolX: true, patrolSpeed: 30 } };
        const phases = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
        for (let i = 0; i < 3; i++) {
          const fish = new Fish({ parent: self._safe, def: { ...base }, direction: (Math.random() < 0.5 ? 'left' : 'right'), overrideSprite: 'assets/fish.png' });
          try { fish.mount(); } catch (_) { continue; }
          const y = r.height + 30 + i * 18;
          fish.setPosition(x, y);
          fish.applyMovementPreset();
          fish._circleTheta = phases[i];
          try { self._applySilhouetteForFish?.(fish); } catch (_) { }
          self._fishes.push(fish);
        }
      } catch (_) { return prevColumnRise?.call(self, def, count, spacing); }
    };
    // 3) クエ: 下から要求されたら横断スポーンに差し替え
    const prevSpawnBottom = this._spawnFishFromBottom;
    this._spawnFishFromBottom = function (def) {
      try {
        if (!def || !self._safe) return prevSpawnBottom?.call(self, def);
        if (def.id === 'sayori') {
          const fDef = { ...def, movement: { ...(def.movement || {}), speed: 10, sampleSeekBait: true, seekIntervalMs: 700, seekSpeed: 22 } };
          return prevSpawnBottom?.call(self, fDef);
        } else if (def.id === 'shimagatsuo') {
          const r = self._safe.getBoundingClientRect();
          const dir = (Math.random() < 0.5) ? 'right' : 'left';
          const yBase = Math.floor(r.height * (0.25 + Math.random() * 0.5));
          const baseDef = { ...def, movement: { ...(def.movement || {}), pattern: 'straight', allowOffscreenX: true, despawnOffX: Math.max(120, def.movement?.despawnOffX || 120) } };
          self._spawnSchoolFromSide?.(baseDef, 10 + Math.floor(Math.random() * 6));
          return;

        } else if (def.id === 'tobiuo') {
          return self._spawnFishFromSide?.(def, (Math.random() < 0.5 ? 'left' : 'right'));
        } else if (def.id === 'hoteieso') {
          const fDef = { ...def, movement: { ...(def.movement || {}), pattern: 'straight', allowOffscreenX: true, despawnOffX: Math.max(120, def.movement?.despawnOffX || 120) } };
          return self._spawnFishFromSide?.(fDef, (Math.random() < 0.5 ? 'left' : 'right'));
        } else if (def.id === 'yunohanagani') {
          const baseDef = { ...def, movement: { ...(def.movement || {}), pattern: 'drift', speed: 0, amplitude: 0, frequency: 0, allowOffscreenX: true, despawnOffX: Math.max(120, (def.movement?.despawnOffX || 120)) } };
          const fis = self._fishes || [];
          const baitRankObj = (typeof self._bait?.getRank === 'function') ? Number(self._bait.getRank() || 0) : 0;
          const baitRankState = Number(self?.state?.bait?.rank ?? 0);
          const baitRankCur = Math.max(baitRankObj, baitRankState);
          if (self._silhBaitRank !== baitRankCur) { self._silhBaitRank = baitRankCur; for (let i = 0; i < fis.length; i++) { const g = fis[i]; try { self._applySilhouetteForFish?.(g); } catch (_) { } } }
          let existing = 0; for (let j = 0; j < fis.length; j++) { const o = fis[j]; if (o && o.def && o.def.id === 'yunohanagani') existing++; }
          const cap = 24;
          const room = Math.max(0, cap - existing);
          if (room <= 0) { return; }
          const batchDir = (Math.random() < 0.5) ? 'left' : 'right';
          const r = self._safe.getBoundingClientRect();
          const spawnOne = () => {
            try {
              if (!self || !self._safe) return;
              const arr = self._fishes || [];
              let cur = 0; for (let k = 0; k < arr.length; k++) { const g = arr[k]; if (g && g.def && g.def.id === 'yunohanagani') cur++; }
              if (cur >= cap) return;
              const fish = new Fish({ parent: self._safe, def: { ...baseDef }, direction: batchDir, overrideSprite: 'assets/fish.png' });
              try { fish.mount(); } catch (_) { return; }
              const x = Math.floor(r.width * (0.1 + Math.random() * 0.8));
              const y = r.height + 30;
              fish.setPosition(x, y);
              fish.applyMovementPreset();
              try { self._applySilhouetteForFish?.(fish); } catch (_) { }
              self._fishes.push(fish);
            } catch (_) { }
          };
          const per = Math.min(room, 3 + Math.floor(Math.random() * 3));
          for (let i = 0; i < per; i++) {
            const delay = Math.floor(i * 80 + Math.random() * 80);
            setTimeout(spawnOne, delay);
          }
          const extraGroups = 1 + Math.floor(Math.random() * 2);
          for (let g = 1; g <= extraGroups; g++) {
            const start = 300 * g + Math.floor(Math.random() * 180);
            for (let i = 0; i < per; i++) {
              const d = start + i * 80 + Math.floor(Math.random() * 80);
              setTimeout(spawnOne, d);
            }
          }
          return;
        }
      } catch (_) { }

      // Hook for blocking AND Manual Spawn for Shironagasukujira
      try {
        if (def && def.id === 'shironagasukujira') {
          if (self._shironagasuHasSpawned) return null; // Block duplicates

          // Manual Spawn to avoid 'prevSpawnBottom' default position flash
          const sr = self._safe.getBoundingClientRect();
          const fDef = { ...def, movement: { ...(def.movement || {}), pattern: 'rise', allowOffscreenX: true } }; // Ensure 'rise' or controlled move
          const fish = new Fish({ parent: self._safe, def: fDef, direction: 'left' });

          // Set position immediately (Deep)
          fish.x = sr.width / 2;
          fish.y = sr.height + 900;
          fish.setPosition(fish.x, fish.y);

          try { fish.mount(); } catch (_) { return null; }

          // Re-assert position after mount just in case
          fish.el.style.transform = `translate(${fish.x}px, ${fish.y}px) rotate(0deg) scale(${fDef.movement?.sizeScale || 1}, ${fDef.movement?.sizeScale || 1})`;

          fish.applyMovementPreset();
          try { self._applySilhouetteForFish?.(fish); } catch (_) { }
          self._fishes.push(fish);

          // Flags
          self._shironagasuActive = fish;
          self._shironagasuHasSpawned = true;
          fish._kujiraInit = true;

          return fish;
        }
      } catch (_) { }

      const f = prevSpawnBottom?.call(self, def);
      return f;
    };
    const prevSpawnSide = this._spawnFishFromSide;
    this._spawnFishFromSide = function (def, dir, y) {
      try {
        if (!def || !self._safe) return prevSpawnSide?.call(self, def, dir, y);
        // Block Shironagasu here too just in case
        if (def.id === 'shironagasukujira' && self._shironagasuHasSpawned) return null;

        if (def.id === 'shimagatsuo') {
          const r = self._safe.getBoundingClientRect();
          const mv = def.movement || {};
          const fDef = { ...def, movement: { ...mv, pattern: 'rise', patrolX: true, patrolSpeed: Math.max(0, mv.patrolSpeed || mv.speed || 40), allowOffscreenX: true, despawnOffX: Math.max(120, (mv.despawnOffX || 120)) } };
          const d = dir || ((Math.random() < 0.5) ? 'right' : 'left');
          const fish = new Fish({ parent: self._safe, def: fDef, direction: d, overrideSprite: 'assets/fish.png' });
          try { fish.mount(); } catch (_) { return; }
          const yBase = Math.floor(r.height * (0.66 + Math.random() * 0.22));
          const x = (d === 'right') ? -30 : (r.width + 30);
          fish.setPosition(x, yBase);
          fish.applyMovementPreset();
          try { self._applySilhouetteForFish?.(fish); } catch (_) { }
          self._fishes.push(fish);
          return fish;
        }
        if (def.id !== 'tobiuo') return prevSpawnSide?.call(self, def, dir, y);
        const r = self._safe.getBoundingClientRect();
        const br = (self._bait?.getBounds?.() || self._bait?.getHitRect?.());
        const bx = br ? (br.left - r.left + br.width / 2) : (r.width / 2);
        const fDef = { ...def, movement: { ...(def.movement || {}), pattern: 'straight', allowOffscreenX: true, despawnOffX: Math.max(120, def.movement?.despawnOffX || 120) } };
        const fish = new Fish({ parent: self._safe, def: fDef, direction: (Math.random() < 0.5 ? 'left' : 'right') });
        try { fish.mount(); } catch (_) { return; }
        fish.setPosition(Math.floor(bx + (Math.random() * 80 - 40)), -40);
        fish.applyMovementPreset();
        self._fishes.push(fish);
        return fish;
      } catch (_) { }
      return prevSpawnSide?.call(self, def, dir, y);
    };

    let raf = null;
    let lastSpecB = 0;
    const loop = () => {
      try {
        if (!self._safe) { raf = requestAnimationFrame(loop); self._speciesRaf = raf; return; }
        const now = performance.now();
        const sr = self._safe.getBoundingClientRect();
        if ((now - lastSpecB) >= 100) {
          // Reset One-Time Flag if at Surface (New Cast)
          if ((self._totalScrollPx || 0) < 100) {
            self._shironagasuHasSpawned = false;
          }

          const dsec = Math.max(0.016, (now - lastSpecB) / 1000);
          const brAbs = (self._bait?.getBounds?.() || self._bait?.getHitRect?.());
          let bx = null, by = null;
          if (brAbs) { const bait = self._rectToLocal(brAbs, sr); bx = bait.x + bait.width / 2; by = bait.y + bait.height / 2; }

          // --- Ripple Update Logic ---
          if (self._handlingGet) {
            // Force cleanup if catching
            if (self._ripples && self._ripples.length > 0) {
              self._ripples.forEach(r => { try { r.el.remove(); } catch (_) { } });
              self._ripples = [];
            }
          } else {
            // Ripple update
            const rs = self._ripples || [];
            for (let i = rs.length - 1; i >= 0; i--) {
              const r = rs[i];
              r.time += dsec;
              r.radius += r.speed * dsec;
              if (r.radius > r.maxRad || r.time > r.life) {
                try { r.el.remove(); } catch (_) { }
                rs.splice(i, 1);
                continue;
              }
              try {
                const op = Math.max(0, 1 - r.time / r.life);
                r.el.style.width = `${Math.floor(r.radius * 2)}px`;
                r.el.style.height = `${Math.floor(r.radius * 2)}px`;
                r.el.style.opacity = op.toFixed(2);
                // Collision with bait
                if (!r.hitBait && bx != null && by != null) {
                  const dx = bx - r.x;
                  const dy = by - r.y;
                  const dist = Math.hypot(dx, dy);
                  if (Math.abs(dist - r.radius) < 20) {
                    r.hitBait = true;
                    // Knockback
                    const ux = dx / (dist || 1);
                    const uy = dy / (dist || 1);
                    const push = 200;
                    try {
                      if (self._baitPosX != null && self._baitPosY != null) {
                        self._baitPosX += ux * push; self._baitPosY += uy * push;
                        self._baitTargetX = (self._baitTargetX != null) ? (self._baitTargetX + ux * push) : self._baitPosX;
                        self._baitTargetY = (self._baitTargetY != null) ? (self._baitTargetY + uy * push) : self._baitPosY;
                        const rr = self._safe?.getBoundingClientRect?.();
                        if (rr) {
                          self._baitPosX = Math.max(0, Math.min(self._baitPosX, rr.width));
                          self._baitPosY = Math.max(0, Math.min(self._baitPosY, rr.height));
                          self._baitTargetX = Math.max(0, Math.min(self._baitTargetX, rr.width));
                          self._baitTargetY = Math.max(0, Math.min(self._baitTargetY, rr.height));
                        }
                        self._bait?.setPosition?.(self._baitPosX, self._baitPosY);
                      }
                    } catch (_) { }
                  }
                }
              } catch (_) { }
            }
          }

          const fis = self._fishes || [];
          const baitRankObj = (typeof self._bait?.getRank === 'function') ? Number(self._bait.getRank() || 0) : 0;
          const baitRankState = Number(self?.state?.bait?.rank ?? 0);
          const baitRankCur = Math.max(baitRankObj, baitRankState);
          if (self._silhBaitRank !== baitRankCur) { self._silhBaitRank = baitRankCur; for (let i = 0; i < fis.length; i++) { const g = fis[i]; try { self._applySilhouetteForFish?.(g); } catch (_) { } } }

          // Yunohanagani Swarm Timer
          let triggerYuno = false;
          if (!self._yunoNextMove || now >= self._yunoNextMove) {
            self._yunoNextMove = now + 1500 + Math.random() * 1000; // 1.5 - 2.5s interval
            triggerYuno = true;
          }

          let sparkBudget = 24;
          for (let i = 0; i < fis.length; i++) {
            const f = fis[i]; if (!f || !f.el) continue; const fid = f.def?.id;
            if (fid === 'abachan') {
              const conf = f._fadeConf; if (conf) { conf.t = (conf.t || 0) + dsec; const pp = Math.min(1, conf.t / (conf.durSec || 4)); try { f.el.style.opacity = (0.55 + 0.45 * pp).toFixed(2); f.el.style.filter = `saturate(${(0.4 + 0.6 * pp).toFixed(2)}) brightness(${(0.95 + 0.1 * pp).toFixed(2)})`; } catch (_) { } }
              const sw = f._sway; if (sw) { sw.t += dsec; const ax = sw.ax * Math.sin(sw.wX * sw.t + sw.sx), ay = sw.ay * Math.sin(sw.wY * sw.t + sw.sy); const px = sw.px || 0, py = sw.py || 0; f.x += (ax - px); f.y += (ay - py); sw.px = ax; sw.py = ay; f.setPosition(f.x, f.y); }
            }
            if (fid === 'inugochi' && bx != null) {
              if (!f._stepNext || now >= f._stepNext) {
                const dx = bx - f.x, dy = by - f.y; const ln = Math.hypot(dx, dy) || 1; const ux = dx / ln, uy = dy / ln;
                const step = 50; f.x += ux * step; f.y += uy * step; f.direction = (ux >= 0) ? 'right' : 'left'; f.setPosition(f.x, f.y);
                f._stepNext = now + 200;
              }
            }
            if (fid === 'uchiwafugu' && bx != null) {
              const dx = f.x - bx, dy = f.y - by; const dist = Math.hypot(dx, dy) || 1;
              if (dist < 140 && (!f._inflateCooldown || now >= f._inflateCooldown)) {
                try { f.el.style.transition = 'transform 250ms ease'; f.el.style.transform = 'scale(1.7)'; } catch (_) { }
                f._inflateUntil = now + 900; f._inflateCooldown = now + 1400;
              }
              if (f._inflateUntil && now >= f._inflateUntil) { try { f.el.style.transform = ''; } catch (_) { } f._inflateUntil = 0; }
            }
            if (fid === 'ginzame') {
              const vx = f._vx || 0, vy = f._vy || 0; f.x += vx * dsec; f.y += vy * dsec; let rvx = vx, rvy = vy;
              if (f.x < 6) { f.x = 6; rvx = Math.abs(rvx); } else if (f.x > sr.width - 40) { f.x = sr.width - 40; rvx = -Math.abs(rvx); }
              if (f.y < 6) { f.y = 6; rvy = Math.abs(rvy); } else if (f.y > sr.height - 40) { f.y = sr.height - 40; rvy = -Math.abs(rvy); }
              for (let j = 0; j < fis.length; j++) { if (i === j) continue; const o = fis[j]; if (!o || !o.el) continue; try { const a = f.getBounds?.(), b = o.getBounds?.(); if (a && b) { const ix = !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom); if (ix) { const dx = (a.left + a.right) / 2 - (b.left + b.right) / 2; const dy = (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2; if (Math.abs(dx) > Math.abs(dy)) rvx = -rvx; else rvy = -rvy; } } } catch (_) { } }
              f._vx = rvx; f._vy = rvy; f.setPosition(f.x, f.y);
            }
            if (fid === 'ginmedai' && bx != null) {
              const dx = bx - f.x, dy = by - f.y; const ln = Math.hypot(dx, dy) || 1; const ux = dx / ln, uy = dy / ln; const sp = 90; f.x += ux * sp * dsec; f.y += uy * sp * dsec; f.direction = (ux >= 0) ? 'right' : 'left'; f.setPosition(f.x, f.y);
            }
            if (fid === 'nodoguro' && bx != null) {
              f._seekTimer = (f._seekTimer || 0) + dsec;
              const interval = Math.max(0.05, (f._seekInterval || 0.9));
              if (f._seekTimer >= interval) {
                f._seekTimer = 0;
                const dx = bx - f.x, dy = by - f.y; const ln = Math.hypot(dx, dy) || 1; f._seekUx = dx / ln; f._seekUy = dy / ln;
              }
              const sp = Math.max(0, f._seekSpeed || 30);
              if (f._seekUx != null && f._seekUy != null && sp > 0) {
                f.x += sp * f._seekUx * dsec; f.y += sp * f._seekUy * dsec; f.direction = (f._seekUx >= 0) ? 'right' : 'left'; f.setPosition(f.x, f.y);
              }
            }
            // if (fid === 'kichiji') { ... } Removed conflicting logic
            if (fid === 'sekitoriiwashi') {
              if (!f._waveNext || now >= f._waveNext) {
                createRipple(f.x, f.y);
                f._waveNext = now + 1800 + Math.random() * 600;
              }
            }
            if (fid === 'yokozunaiwashi') {
              if (!f._waveNext || now >= f._waveNext) {
                createRipple(f.x, f.y);
                f._waveNext = now + 2500;
                // Blow away HIGHER rank fish
                const myRank = f.def.rank || 96;
                for (const g of fis) {
                  if (g === f || !g.el || (g.def.rank || 0) <= myRank || g.def.id === 'shironagasukujira') continue;
                  const dx = g.x - f.x, dy = g.y - f.y;
                  const dist = Math.hypot(dx, dy);
                  if (dist < 220) {
                    const angle = Math.atan2(dy, dx);
                    const pushDist = 120 * (1 - dist / 220); // Stronger when closer
                    g.x += Math.cos(angle) * pushDist;
                    g.y += Math.sin(angle) * pushDist;
                    g.setPosition(g.x, g.y);
                  }
                }
              }
            }
            if (fid === 'hoshieso') {
              if (!f._blinkAt || now >= f._blinkAt) { try { if (f.el) f.el.style.visibility = (f.el.style.visibility === 'hidden') ? 'visible' : 'hidden'; } catch (_) { } f._blinkAt = now + 120; }
              if (bx != null && by != null) {
                const dx = bx - f.x, dy = by - f.y;
                if (by < f.y - 10 && Math.abs(dx) <= 16) {
                  const ln = Math.hypot(dx, dy) || 1; const ux = dx / ln, uy = dy / ln; const sp = 450; f.x += ux * sp * dsec; f.y += uy * sp * dsec; f.direction = (ux >= 0) ? 'right' : 'left'; f.setPosition(f.x, f.y);
                }
              }
            }
            if (fid === 'bouzuginpo' && bx != null) {
              const dx = bx - f.x, dy = by - f.y; const dist = Math.hypot(dx, dy) || 1;
              if (dist < 60) { const ux = dx / dist, uy = dy / dist; const sx = -uy, sy = ux; const side = (Math.random() < 0.5 ? -1 : 1); const evade = 180; f.x += (sx * side) * evade * dsec; f.y += (sy * side) * evade * dsec; f.direction = ((sx * side) >= 0) ? 'right' : 'left'; f.setPosition(f.x, f.y); }
            }
            if (fid === 'urokomushi') {
              // 1. Target Selection
              if (!f._urokoTarget || !f._urokoTarget.el) {
                // Pick random non-urokomushi
                const candidates = fis.filter(t => t.def.id !== 'urokomushi' && t.el && !t._isInfected);
                if (candidates.length > 0) {
                  f._urokoTarget = candidates[Math.floor(Math.random() * candidates.length)];
                }
              }
              // 2. Chase & Infect
              if (f._urokoTarget && f._urokoTarget.el) {
                const t = f._urokoTarget;
                const dx = t.x - f.x, dy = t.y - f.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 20) {
                  // Chase
                  const speed = 180; // Fast chase
                  const ux = dx / dist, uy = dy / dist;
                  f.x += ux * speed * dsec;
                  f.y += uy * speed * dsec;
                  f.direction = (ux >= 0) ? 'right' : 'left';
                  f.setPosition(f.x, f.y);
                } else {
                  // Contact (Infect)
                  if (!t._isInfected) {
                    t._isInfected = true; // Mark as infected to prevent double targeting
                    // Transform effect
                    setTimeout(() => {
                      if (t.el) {
                        try {
                          const tx = t.x, ty = t.y;
                          t.unmount(); // Remove victim
                          self._spawnFish('urokomushi', tx, ty); // Spawn new Urokomushi
                        } catch (_) { }
                      }
                    }, 0);
                    f._urokoTarget = null; // Reset target
                  }
                }
              }
            }
            if (fid === 'rabuka') {
              // Predation on Urokomushi
              if (!f._rabukaTarget || !f._rabukaTarget.el) {
                // Find Urokomushi
                const preys = fis.filter(t => t.def.id === 'urokomushi' && t.el && !t._isHunted);
                if (preys.length > 0) {
                  f._rabukaTarget = preys[Math.floor(Math.random() * preys.length)];
                }
              }
              if (f._rabukaTarget && f._rabukaTarget.el) {
                const t = f._rabukaTarget;
                const dx = t.x - f.x, dy = t.y - f.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 40) {
                  const speed = 100;
                  const ux = dx / dist, uy = dy / dist;
                  f.x += ux * speed * dsec;
                  f.y += uy * speed * dsec;
                  f.direction = (ux >= 0) ? 'right' : 'left';
                  f.setPosition(f.x, f.y);
                } else {
                  // Eat
                  if (!t._isHunted) {
                    t._isHunted = true;
                    setTimeout(() => { if (t.el) try { t.unmount(); } catch (_) { } }, 0);
                    f._rabukaTarget = null;
                  }
                }
              }
            }
            if (fid === 'uchiwafugu' && f._swellEnabled) {
              let dist = Infinity;
              if (bx != null && by != null) {
                const dx = f.x - bx;
                const dy = f.y - by;
                dist = Math.hypot(dx, dy);
              }
              const targetScale = (dist < f._swellRange) ? f._swellScale : f._baseScale;
              if (!f._currentScale) f._currentScale = f._baseScale;
              const diff = targetScale - f._currentScale;
              if (Math.abs(diff) > 0.01) {
                f._currentScale += diff * 5 * dsec;
                f.scale = f._currentScale;
                if (f.el) f.el.style.transform = `translate(-50%, -50%) scale(${f.direction === 'right' ? -f.scale : f.scale}, ${f.scale})`;
              }
            }
            if (fid === 'madara') {
              // マダラの子生成を無効化（上昇しながら拡散する動きに統一）
              /*
              if (!f._vortexSpawned && !f._vortexChild) {
                f._vortexSpawned = true;
                const n = 6;
                for (let k = 0; k < n; k++) {
                  const ang = (Math.PI*2)*(k/n);
                  const def = { ...f.def, movement: { pattern:'straight', speed: 0, sizeScale: (f.def?.movement?.sizeScale||1)*0.8 } };
                  const child = new Fish({ parent: self._safe, def, direction: (Math.random()<0.5?'left':'right') });
                  try { child.mount(); } catch(_) { continue; }
                  const rx = f.x + Math.cos(ang)*20; const ry = f.y + Math.sin(ang)*20;
                  child.setPosition(rx, ry);
                  child.applyMovementPreset();
                  child._circleEnabled = true; child._circleRadius = 20; child._circleOmega = 2.0; child._ellipseXScale = 1; child._ellipseYScale = 1; child._spiralGrow = { t:0, durSec:4, from: 20, to: 70 };
                  child._vortexChild = true; child._vortexSpawned = true;
                  self._fishes.push(child);
                }
              }
              */
            }
            if (fid === 'daiougusokumushi') {
              if (!f._gusokuInit) {
                f._gusokuInit = true;
                // Force spawn at bottom corners
                const fromRight = Math.random() < 0.5;
                f.x = fromRight ? sr.width + 100 : -100;
                f.y = sr.height + 100; // Below screen
                // Diagonal Upward velocity
                const speed = 60;
                // Vector: Up (-Y) and Center-ward (+-X)
                const vx = fromRight ? -1.0 : 1.0; // Inward
                const vy = -0.5 - Math.random() * 0.4; // Shallow Upward (was 0.8)
                const ln = Math.hypot(vx, vy);
                f._gusokuVx = (vx / ln) * speed;
                f._gusokuVy = (vy / ln) * speed;
                f.direction = fromRight ? 'left' : 'right';
                f.setPosition(f.x, f.y);
              }
              // Apply velocity override
              if (f._gusokuVx != null) {
                f.x += f._gusokuVx * dsec;
                f.y += f._gusokuVy * dsec;
                f.setPosition(f.x, f.y);
                // If flies off top/sides too far, let it go.
              }
            }
            if (fid === 'shironagasukujira') {
              // ONCE PER SESSION enforcement
              if (self._shironagasuHasSpawned) {
                // Already spawned in this session. Remove any new ones.
                // Treat the 'Active' one as valid, but if a new one spawns while active or after, reject it?
                // Wait, if active exists, we want to keep it.
                // If not active (despawned), we reject new ones.
                // So if !f._kujiraInit (newly spawned) AND _shironagasuHasSpawned, reject.
                if (!f._kujiraInit) {
                  setTimeout(() => { try { f.unmount(); } catch (_) { } }, 0);
                  return;
                }
              }

              // Singleton enforcement (Active Check)
              if (self._shironagasuActive && self._shironagasuActive !== f) {
                const others = fis.filter(o => o.def.id === 'shironagasukujira' && o !== f);
                if (others.length > 0) {
                  setTimeout(() => { try { f.unmount(); } catch (_) { } }, 0);
                  return;
                }
              } else {
                self._shironagasuActive = f;
              }
              if (!f._kujiraInit) {
                f._kujiraInit = true;
                self._shironagasuHasSpawned = true;
                // Center Bottom Spawn
                f.x = sr.width / 2;
                f.y = sr.height + 900; // Deep bottom
                f.direction = 'left'; // Doesn't matter for vertical rise? Or sprite faces left?
                const speed = f.def.movement?.speed || 70;
                f._shironagasuVy = -speed * 0.5; // Rise slowly
                f.setPosition(f.x, f.y);
              }
              // Force vertical rise
              f.y += (f._shironagasuVy || -30) * dsec;
              f.x = sr.width / 2; // Keep center
              f.setPosition(f.x, f.y);
            }
            if (fid === 'okikihoubou') {
              if (!f._vx && !f._vy) { f._vx = (Math.random() < 0.5 ? 1 : -1) * (200 + Math.random() * 120); f._vy = (Math.random() < 0.5 ? 1 : -1) * (160 + Math.random() * 120); }
              f.x += f._vx * dsec; f.y += f._vy * dsec; let rvx = f._vx, rvy = f._vy;
              if (f.x < 6) { f.x = 6; rvx = Math.abs(rvx); } else if (f.x > sr.width - 40) { f.x = sr.width - 40; rvx = -Math.abs(rvx); }
              if (f.y < 6) { f.y = 6; rvy = Math.abs(rvy); } else if (f.y > sr.height - 40) { f.y = sr.height - 40; rvy = -Math.abs(rvy); }
              f._vx = rvx; f._vy = rvy; f.direction = (rvx >= 0) ? 'right' : 'left'; f.setPosition(f.x, f.y);
            }
            if (fid === 'benimanjukurage') {
              if (!f._bmState) { f._bmState = 'float1'; f._bmTimer = 0; }
              f._bmTimer += (now - lastSpecB);
              const step = dsec * 26;
              if (f._bmState === 'float1') { f.y -= step; if (f._bmTimer >= 600) { f._bmState = 'float2'; f._bmTimer = 0; } }
              else if (f._bmState === 'float2') { f.y -= step; if (f._bmTimer >= 600) { f._bmState = 'sink'; f._bmTimer = 0; } }
              else if (f._bmState === 'sink') { f.y += dsec * 80; if (f._bmTimer >= 700) { f._bmState = 'rise'; f._bmTimer = 0; } }
              else if (f._bmState === 'rise') { f.y -= dsec * 40; if (f._bmTimer >= 900) { f._bmState = 'float1'; f._bmTimer = 0; } }
              f.x += Math.sin((now % 1000) / 1000 * Math.PI * 2) * 6 * dsec;
              f.setPosition(f.x, f.y);
            }
            if (fid === 'kujirauo') {
              let nearest = null, nd2 = Infinity, idx = -1;
              const fr = f.getBounds?.();
              for (let j = 0; j < fis.length; j++) {
                if (i === j) continue; const o = fis[j]; if (!o || !o.el) continue; if (o.isFleeing?.()) continue;
                try { const a = fr, b = o.getBounds?.(); if (!a || !b) continue; const aw = a.width, bw = b.width; if (!(bw < aw)) continue; const dx = (o.x - f.x), dy = (o.y - f.y); const d2 = dx * dx + dy * dy; if (d2 < nd2) { nd2 = d2; nearest = o; idx = j; } } catch (_) { }
              }
              if (nearest) {
                const dx = nearest.x - f.x, dy = nearest.y - f.y; const ln = Math.hypot(dx, dy) || 1; const ux = dx / ln, uy = dy / ln; const sp = 200; f.x += ux * sp * dsec; f.y += uy * sp * dsec; f.direction = (ux >= 0) ? 'right' : 'left'; f.setPosition(f.x, f.y);
                try { const srAbs = f.getBounds?.(); const prAbs = nearest.getBounds?.(); if (srAbs && prAbs) { const ix = !(srAbs.right < prAbs.left || srAbs.left > prAbs.right || srAbs.bottom < prAbs.top || srAbs.top > prAbs.bottom); if (ix) { try { nearest.unmount?.(); } catch (_) { } if (idx >= 0) { self._fishes.splice(idx, 1); } } } } catch (_) { }
              }
            }
            if (fid === 'kinmedai') {
              // Chase & Rotate
              if (bx != null && by != null) {
                const dx = bx - f.x;
                const dy = by - f.y;
                const dist = Math.hypot(dx, dy) || 1;
                const speed = 100;
                f.x += (dx / dist) * speed * dsec;
                f.y += (dy / dist) * speed * dsec;
                f.setPosition(f.x, f.y);

                f._spinAngle = (f._spinAngle || 0) + 360 * dsec;
                const flip = (f.direction === 'left') ? 1 : -1;
                if (f.el) f.el.style.transform = `translate(-50%, -50%) scale(${flip}, 1) rotate(${f._spinAngle}deg)`;
              }

              if (!f._sparkNext || now >= f._sparkNext) {
                const emit = Math.min(2, sparkBudget);
                for (let s = 0; s < emit; s++) { const ang = Math.random() * Math.PI * 2; const rad = 8 + Math.random() * 18; createSpark(f.x + Math.cos(ang) * rad, f.y + Math.sin(ang) * rad); }
                sparkBudget -= emit;
                f._sparkNext = now + 180;
              }
            }
            if (fid === 'konnyakukajika') {
              if (!f._wig) { f._wig = { vx: (Math.random() < 0.5 ? 1 : -1) * (80 + Math.random() * 60), vy: (Math.random() < 0.5 ? 1 : -1) * (60 + Math.random() * 50), th: Math.random() * Math.PI * 2 }; f._waveYEnabled = true; f._waveYAmplitude = 10; f._waveYOmega = 2 * Math.PI * 0.8; }
              f._wig.th += dsec * 2.2; f.x += f._wig.vx * dsec + Math.cos(f._wig.th) * 10 * dsec; f.y += f._wig.vy * dsec + Math.sin(f._wig.th) * 6 * dsec; f.setPosition(f.x, f.y);
              try { const pr = self._safe?.getBoundingClientRect?.(); const er = f.el?.getBoundingClientRect?.(); if (pr && er) { const halfW = Math.max(1, er.width / 2), halfH = Math.max(1, er.height / 2); if (f.x <= halfW || f.x >= pr.width - halfW) f._wig.vx = -f._wig.vx; if (f.y <= halfH || f.y >= pr.height - halfH) f._wig.vy = -f._wig.vy; } } catch (_) { }
            }
            if (fid === 'urokofunetamagai') {
              // Flocking Behavior (Cohesion + Separation) + Horizontal Drift
              const neighbors = fis.filter(o => o !== f && o.def.id === 'urokofunetamagai');
              let cohX = 0, cohY = 0, sepX = 0, sepY = 0, count = 0;

              for (const n of neighbors) {
                const dx = n.x - f.x;
                const dy = n.y - f.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 300) { // Attraction Range
                  cohX += n.x;
                  cohY += n.y;
                  count++;

                  if (dist < 50 && dist > 0) { // Separation Range (Avoid Overlap)
                    // Push away
                    const strength = (50 - dist) / 50;
                    sepX -= (dx / dist) * strength * 200;
                    sepY -= (dy / dist) * strength * 200;
                  }
                }
              }

              let vx = 30; // Base Horizontal Speed (Right)
              let vy = 0;

              if (count > 0) {
                // Cohesion: Move towards center of mass
                const centerX = cohX / count;
                const centerY = cohY / count;
                vx += (centerX - f.x) * 1.5; // Attraction Strength
                vy += (centerY - f.y) * 1.5;
              }

              // Apply Separation
              vx += sepX;
              vy += sepY;

              // Apply Velocity
              f.x += vx * dsec;
              f.y += vy * dsec;

              // Clamp to screen Y (partially) to keep them in view? Or let them offscreen?
              // Base logic allows offscreen X.

              f.setPosition(f.x, f.y);
            }
            if (fid === 'douketsuebi') {
              // Symbiosis: Seek Kairoudouketsu
              const host = fis.find(o => o.def.id === 'kairoudouketsu');
              if (host && host.el && !host.isFleeing?.()) {
                const dx = host.x - f.x;
                const dy = host.y - f.y;
                const dist = Math.hypot(dx, dy);

                if (dist < 40) {
                  // Lock-on (Inside host)
                  // Add subtle wobble to feel alive inside
                  const t = performance.now() / 300;
                  f.x = host.x + Math.sin(t) * 10;
                  f.y = host.y + Math.cos(t * 1.3) * 10;
                  f.setPosition(f.x, f.y);
                } else {
                  // Seek
                  const speed = 150;
                  f.x += (dx / dist) * speed * dsec;
                  f.y += (dy / dist) * speed * dsec;
                  f.direction = (dx >= 0) ? 'right' : 'left';
                  f.setPosition(f.x, f.y);
                }
              } else {
                // No host, just drift (or custom logic if needed)
                // Original logic continues if we don't return or override position
              }
            }
            if (fid === 'marianasuneirufisshu') {
              // Flee from Bait
              if (bx != null) {
                const dx = f.x - bx; // Vector FROM bait TO fish
                const dy = f.y - by;
                const dist = Math.hypot(dx, dy) || 1;

                if (dist < 250) { // Flee Range
                  const speed = 300; // Flee Speed
                  const ux = dx / dist;
                  const uy = dy / dist;

                  f.x += ux * speed * dsec;
                  f.y += uy * speed * dsec;

                  // Face away from bait? Or face movement direction?
                  // Usually face movement.
                  f.direction = (ux >= 0) ? 'right' : 'left';
                  f.setPosition(f.x, f.y);
                }
              }
            }
            if (fid === 'chouchinankou') {
              if (!f._decoy) {
                const el = document.createElement('img'); el.src = 'assets/fish.png'; el.style.position = 'absolute'; el.style.left = `${Math.floor(f.x + 14)}px`; el.style.top = `${Math.floor(f.y - 10)}px`; el.style.width = '12px'; el.style.height = 'auto'; el.style.pointerEvents = 'none'; el.style.opacity = '0.8'; el.style.transform = 'translate(-50%, -50%)';
                self._safe.appendChild(el); f._decoy = el;
              }
              if (bx != null) {
                const dx = bx - f.x, dy = by - f.y; const dist = Math.hypot(dx, dy) || 1; if (dist < 200) { const ux = dx / dist, uy = dy / dist; const sp = 1100; f.x += ux * sp * dsec; f.y += uy * sp * dsec; f.direction = (ux >= 0) ? 'right' : 'left'; f.setPosition(f.x, f.y); }
              }
            }
            if (fid === 'yunohanagani') {
              if (triggerYuno || !f._swarmVx) {
                const ang = Math.random() * Math.PI * 2;
                const sp = 60 + Math.random() * 80;
                f._swarmVx = Math.cos(ang) * sp;
                f._swarmVy = Math.sin(ang) * sp;
              }
              f.x += (f._swarmVx || 0) * dsec;
              f.y += (f._swarmVy || 0) * dsec;
              f.direction = ((f._swarmVx || 0) >= 0) ? 'right' : 'left';

              // Bounce off screen edges
              if (f.x < 10) { f.x = 10; f._swarmVx = Math.abs(f._swarmVx || 0); }
              else if (f.x > sr.width - 10) { f.x = sr.width - 10; f._swarmVx = -Math.abs(f._swarmVx || 0); }
              if (f.y < 10) { f.y = 10; f._swarmVy = Math.abs(f._swarmVy || 0); }
              else if (f.y > sr.height - 10) { f.y = sr.height - 10; f._swarmVy = -Math.abs(f._swarmVy || 0); }


              f.setPosition(f.x, f.y);
            }
            if (fid === 'hoteieso') {
              // Predation: Eat fish on contact
              const fr = f.getBounds?.();
              if (fr) {
                for (let j = 0; j < fis.length; j++) {
                  if (i === j) continue;
                  const o = fis[j];
                  if (!o || !o.el || o.isFleeing?.()) continue;
                  // Only eat smaller/lower rank fish? Or just any fish? User said "touched fish".
                  // Let's assume it eats anything it touches for now, maybe exclude itself.
                  if (o.def?.id === 'hoteieso') continue;

                  try {
                    const br = o.getBounds?.();
                    if (br) {
                      // Simple AABB collision
                      if (fr.right > br.left && fr.left < br.right && fr.bottom > br.top && fr.top < br.bottom) {
                        // Eat it
                        try { o.unmount?.(); } catch (_) { }
                        self._fishes.splice(j, 1);
                        j--; // adjust index
                        // Optional: Play crunch sound or effect?
                      }
                    }
                  } catch (_) { }
                }
              }
            }
            if (fid === 'houraieso') {
              if (bx != null && by != null) {
                const dx = Math.abs(bx - f.x);
                // Trigger if bait is horizontally close and vertically above
                if (dx < 24 && by < f.y && (f.y - by) < 500) {
                  // Rapid upward surge
                  const surgeSpeed = 500;
                  f.y -= surgeSpeed * dsec;
                  f.setPosition(f.x, f.y);
                }
              }
            }
            if (fid === 'hohojirozame') {
              // 1. Find target if none or invalid
              if (!f._targetFish || !f._targetFish.el || !fis.includes(f._targetFish)) {
                f._targetFish = null;
                let maxD2 = -1;
                let furthest = null;
                for (let j = 0; j < fis.length; j++) {
                  if (i === j) continue;
                  const o = fis[j];
                  if (!o || !o.el) continue;
                  if (o.def?.id === 'hohojirozame') continue; // Don't eat other sharks
                  const dx = o.x - f.x;
                  const dy = o.y - f.y;
                  const d2 = dx * dx + dy * dy;
                  if (d2 > maxD2) {
                    maxD2 = d2;
                    furthest = o;
                  }
                }
                if (furthest) {
                  f._targetFish = furthest;
                }
              }

              // 2. Charge and Eat
              if (f._targetFish) {
                const t = f._targetFish;
                const dx = t.x - f.x;
                const dy = t.y - f.y;
                const dist = Math.hypot(dx, dy) || 1;

                // Super high speed charge
                const speed = 800;
                f.x += (dx / dist) * speed * dsec;
                f.y += (dy / dist) * speed * dsec;
                f.direction = (dx >= 0) ? 'right' : 'left';
                f.setPosition(f.x, f.y);

                // Collision / Predation
                if (dist < 60) { // Eat range
                  try { t.unmount?.(); } catch (_) { }
                  const idx = fis.indexOf(t);
                  if (idx !== -1) {
                    fis.splice(idx, 1);
                    if (idx < i) i--; // Adjust current index if we removed a previous fish
                  }
                  f._targetFish = null; // Reset for next turn
                  // Optional: Effect
                  createRipple(f.x, f.y);
                }
              }
            }
          }
          lastSpecB = now;
        }
      } finally {
        raf = requestAnimationFrame(loop);
        self._speciesRaf = raf;
      }
    };

    const createRipple = (x, y) => {
      try {
        if (!self._safe || self._handlingGet) return;
        const el = document.createElement('div');
        el.className = 'ripple-effect'; // Added class for cleanup
        Object.assign(el.style, {
          position: 'absolute',
          left: '0', top: '0',
          width: '0px', height: '0px',
          borderRadius: '50%',
          border: '2px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
          transform: `translate(${x}px, ${y}px)`,
          pointerEvents: 'none',
          zIndex: '1'
        });
        self._safe.appendChild(el);
        if (!self._ripples) self._ripples = [];
        self._ripples.push({ el, x, y, time: 0, radius: 0, maxRad: 220, speed: 180, life: 1.2, hitBait: false });
      } catch (_) { }
    };
    const createSpark = (x, y) => {
      try {
        if (!self._safe) return;
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = `${Math.floor(x)}px`;
        el.style.top = `${Math.floor(y)}px`;
        el.style.width = '3px';
        el.style.height = '3px';
        el.style.borderRadius = '50%';
        el.style.pointerEvents = 'none';
        el.style.transform = 'translate(-50%, -50%) scale(0.8)';
        el.style.transition = 'transform 350ms ease, opacity 350ms ease, filter 350ms ease';
        el.style.opacity = '0.95';
        el.style.background = 'radial-gradient(circle, rgba(255,240,200,1) 0%, rgba(255,200,120,1) 40%, rgba(255,180,80,0.8) 70%, rgba(255,160,60,0.0) 100%)';
        el.style.filter = 'brightness(1.2) saturate(1.4)';
        self._safe.appendChild(el);
        requestAnimationFrame(() => { try { el.style.transform = 'translate(-50%, -50%) scale(2.4)'; el.style.opacity = '0'; el.style.filter = 'brightness(0.9) saturate(0.9)'; } catch (_) { } });
        setTimeout(() => { try { el.remove(); } catch (_) { } }, 360);
      } catch (_) { }
    };
    try { if (self._speciesRaf) cancelAnimationFrame(self._speciesRaf); } catch (_) { }
    raf = requestAnimationFrame(loop);
    self._speciesRaf = raf;
  };

  FishingScene.prototype.unmount = function (...args) {
    try { if (this._speciesRaf) cancelAnimationFrame(this._speciesRaf); } catch (_) { }
    this._speciesRaf = null;
    try {
      const zs = this._inkZones || [];
      for (const z of zs) { try { z?.el?.remove?.(); } catch (_) { } }
      this._inkZones = [];
      const rs = this._ripples || [];
      for (const r of rs) { try { r?.el?.remove?.(); } catch (_) { } }
      this._ripples = [];
    } catch (_) { }
    try { this._suppressInkZones = false; } catch (_) { }
    if (typeof origUnmount === 'function') return origUnmount.apply(this, args);
  };
})();
