import { SaveManager } from '../core/SaveManager.js';

export default class TitleScene {
  mount(container, manager, state) {
    this.container = container;
    this.manager = manager;
    this.state = state;

    this.root = document.createElement('div');
    this.root.className = 'scene scene--title';
    this.root.innerHTML = `
      <div class="title-layer frame-skin-default">
        <div class="title-bg" aria-hidden="true"></div>

        <div class="safe-viewport">
          <div class="title-ui">
            <div class="title-buttons">
              <button class="img-btn" id="btnStart" aria-label="START">
                <picture>
                  <source srcset="assets/START.webp" type="image/webp" />
                  <img src="assets/START.png" alt="START" loading="eager" decoding="async" />
                </picture>
              </button>
              <button class="img-btn" id="btnContinue" aria-label="CONTINUE">
                <picture>
                  <source srcset="assets/CONTINUE.webp" type="image/webp" />
                  <img src="assets/CONTINUE.png" alt="CONTINUE" loading="eager" decoding="async" />
                </picture>
              </button>
              <button class="img-btn" id="btnConfig" aria-label="CONFIG">
                <picture>
                  <source srcset="assets/CONFIG.webp" type="image/webp" />
                  <img src="assets/CONFIG.png" alt="CONFIG" decoding="async" />
                </picture>
              </button>
            </div>
          </div>
          <div class="title-reset">
            <button class="img-btn img-btn--sm" id="btnReset" aria-label="RESET">
              <picture>
                <source srcset="assets/RESET.webp" type="image/webp" />
                <img src="assets/RESET.png" alt="RESET" decoding="async" />
              </picture>
            </button>
          </div>
          <div class="title-aqua">
            <button class="img-btn" id="btnAquarium" aria-label="AQUARIUM">
              <picture>
                <source srcset="assets/AQUARIUM.webp" type="image/webp" />
                <img src="assets/AQUARIUM.png" alt="AQUARIUM" decoding="async" />
              </picture>
            </button>
          </div>
        </div>

        <div class="frame-svg" aria-hidden="true"></div>
      </div>
    `;

    container.replaceChildren(this.root);
    document.body.classList.add('title-full');
    // フルスクリーン時のsafe-viewport幅制限を解除（CSS上書き）
    try {
      const sid = 'df-safe-viewport-fs';
      let st = document.getElementById(sid);
      if (!st) {
        st = document.createElement('style');
        st.id = sid;
        st.textContent = 'body.title-full .safe-viewport, body.frame-full .safe-viewport{max-width:none}';
        document.head.appendChild(st);
      }
    } catch (_) { }

    // セーブの有無でCONTINUE/RESETを制御
    const hasSave = SaveManager.hasSave();
    const btnContinue = this.root.querySelector('#btnContinue');
    if (!hasSave) {
      btnContinue.setAttribute('disabled', 'true');
      btnContinue.title = 'セーブデータがありません';
    }
    const btnReset = this.root.querySelector('#btnReset');
    if (!hasSave) {
      btnReset.setAttribute('disabled', 'true');
      btnReset.title = 'セーブデータがありません';
    }

    // ハンドラ
    this.onStart = () => this._squareWipeToFishing?.('start');
    this.onContinue = () => {
      if (SaveManager.hasSave()) this._squareWipeToFishing?.('continue');
    };
    this.onConfig = () => this.manager.goTo('config');
    this.onAquarium = () => this.manager.goTo('aquarium');
    this.onReset = () => {
      this._openResetDialog?.();
    };

    this.root.querySelector('#btnStart').addEventListener('click', this.onStart);
    btnContinue.addEventListener('click', this.onContinue);
    this.root.querySelector('#btnConfig').addEventListener('click', this.onConfig);
    this.root.querySelector('#btnAquarium').addEventListener('click', this.onAquarium);
    if (btnReset) btnReset.addEventListener('click', this.onReset);

    // 釣りシーンの軽量プリロード
    this._prewarmFishing = () => {
      try {
        const g = (window.__df_preloads = window.__df_preloads || {});
        g.images = g.images || Object.create(null);
        // 主要画像（背景・餌・フレーム・魚汎用）
        const baseImgs = [
          'assets/game_start_2.png',
          'assets/lampbait.png',
          'assets/frame1.png',
          'assets/fish.png'
        ];
        // 指定パスのままプリロード（.webp 生成は行わない）
        const loadImg = (src) => new Promise((resolve) => {
          if (!src) return resolve(null);
          const key = src;
          if (g.images[key]) return resolve(g.images[key]);
          const im = new Image();
          try { im.decoding = 'async'; } catch (_) { }
          im.onload = () => { g.images[key] = im; resolve(im); };
          im.onerror = () => { resolve(null); };
          im.src = src;
        });
        const preloadFishJson = async () => {
          if (g.fishData) return g.fishData;
          try {
            const res = await fetch('src/data/fish.json', { cache: 'no-cache' });
            if (!res.ok) throw new Error('fish.json preload failed');
            const data = await res.json();
            g.fishData = data;
            return data;
          } catch (_) { return null; }
        };
        // 実行
        const run = async () => {
          // ベース画像を先行
          await Promise.all(baseImgs.map(loadImg));
          // fish.json を取得して先頭いくつかの魚スプライトも温める
          const data = await preloadFishJson();
          const fishSprites = Array.isArray(data?.fish) ? Array.from(new Set(data.fish.map(f => f?.sprite).filter(Boolean))).slice(0, 12) : [];
          // 魚スプライトは定義されたパスのまま温める（.webp は生成しない）
          await Promise.all(fishSprites.map(loadImg));
        };
        run();
      } catch (_) { }
    };

    // タイトル→釣り画面: 黒い四角が中心に集まり全黒→中心から拡散して開く演出
    this._squareWipeToFishing = (mode = 'start') => {
      if (this._transitioning) return;
      this._transitioning = true;
      // オーバーレイ（body直下に付け、シーン切替時も残す）
      const ov = document.createElement('div');
      ov.className = 'wipe-overlay';
      Object.assign(ov.style, { position: 'fixed', inset: '0', zIndex: '9999', pointerEvents: 'none', overflow: 'hidden' });
      const cvs = document.createElement('canvas');
      Object.assign(cvs.style, { display: 'block', width: '100%', height: '100%' });
      ov.appendChild(cvs);
      document.body.appendChild(ov);

      const ctx = cvs.getContext('2d');
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const W = Math.max(1, Math.floor(window.innerWidth));
      const H = Math.max(1, Math.floor(window.innerHeight));
      cvs.width = Math.max(1, Math.floor(W * dpr));
      cvs.height = Math.max(1, Math.floor(H * dpr));
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (ctx) ctx.imageSmoothingEnabled = false;

      const CX = W / 2, CY = H / 2;
      // ドット密度: 1ドットを大きく（間隔ゼロの被覆優先）
      let tile = Math.floor(Math.min(W, H) / 24);
      tile = Math.max(20, Math.min(tile, 72));
      const half = tile / 2;
      const squares = [];
      for (let y = -half; y < H + half; y += tile) {
        for (let x = -half; x < W + half; x += tile) {
          squares.push({ sx: x, sy: y });
        }
      }
      // サイズ・しきい値
      const maxDist = Math.hypot(Math.max(CX, W - CX), Math.max(CY, H - CY));
      const baseS = Math.max(4, tile * 0.9); // ドット一辺（最終）
      const ramp = Math.max(8, tile * 2.0);   // 成長/消失の遷移帯域（覆い用）
      const rampOpen = Math.max(12, tile * 4.0); // 開きフェーズ用の遷移帯域（初期をより小さく）
      const cellRadius = Math.SQRT2 * half; // 方形セルの外接円半径（角までの距離）
      const pad = 1; // 隙間防止のための1pxオーバーラップ

      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
      const easeInCubic = (t) => t * t * t;

      // 外側→内側に向けて黒ドット（タイルサイズ）で覆っていく（間隔ゼロ）
      const drawCover = (p) => {
        if (!ctx) return;
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000';
        const thr = maxDist * (1 - p); // しきい半径（だんだん内側へ）
        for (const s of squares) {
          const dx = s.sx - CX, dy = s.sy - CY;
          const d = Math.hypot(dx, dy);
          // セルがしきいの外側領域と交差していれば塗る（外接半径で包含判定）
          if (d + cellRadius >= thr) {
            const x0 = Math.floor(s.sx - half);
            const y0 = Math.floor(s.sy - half);
            ctx.fillRect(x0, y0, tile + pad, tile + pad);
          }
        }
        // フォールバックで全黒（万一の隙間を埋める）
        if (p >= 1) { ctx.fillRect(0, 0, W, H); }
      };

      let t0 = performance.now();
      let phase = 'in';
      let outInitDrawn = false; // 開きフェーズの初回は必ず p=0 で描画
      const durIn = 520; // ms（少し遅く）
      const durOut = 640; // ms（少し遅く）

      const step = (now) => {
        const dt = now - t0;
        if (phase === 'in') {
          const p = Math.min(1, dt / durIn);
          drawCover(easeOutCubic(p));
          if (p < 1) {
            requestAnimationFrame(step);
          } else {
            // 全黒になったら釣りシーンへ切替
            try { this.manager.goTo('fishing', { mode }); } catch (_) { }
            // 念のため全黒を維持
            if (ctx) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
            // 次フェーズ
            phase = 'out';
            // 新シーンの初回レイアウト/ペイント完了を待ってから開きを開始（2フレーム待機）
            requestAnimationFrame(() => {
              requestAnimationFrame((ts) => {
                // キック描画は行わず、小さな穴から徐々に開く
                t0 = ts; // 開きフェーズの時間基準をここに合わせる
                requestAnimationFrame(step);
              });
            });
          }
        } else {
          if (!ctx) { try { ov.remove(); } catch (_) { }; this._transitioning = false; return; }
          // 中心→外側に向けて黒ドットで切り抜く（小さく開始し徐々に拡大）
          const dtEff = outInitDrawn ? dt : 0; // 初回フレームは 0
          const p = Math.min(1, dtEff / durOut);
          outInitDrawn = true;
          const e = easeInCubic(p);
          ctx.globalCompositeOperation = 'destination-out';
          const thr = maxDist * e; // しきい半径（だんだん外側へ）
          for (const s of squares) {
            const dx = s.sx - CX, dy = s.sy - CY;
            const d = Math.hypot(dx, dy);
            // 交差度合いからサイズ係数を算出（0..1）: 初期は0から開始
            const l = Math.max(0, Math.min(1, (thr - d) / rampOpen));
            if (l <= 0) continue;
            const size = Math.max(1, Math.floor(tile * l));
            const halfS = Math.floor(size / 2);
            const x0 = Math.floor(s.sx - halfS);
            const y0 = Math.floor(s.sy - halfS);
            ctx.fillRect(x0, y0, size, size);
          }
          if (p < 1) {
            requestAnimationFrame(step);
          } else {
            try { ov.remove(); } catch (_) { }
            this._transitioning = false;
          }
        }
      };
      requestAnimationFrame(step);
    };

    // リセット確認ダイアログ（ゲーム内モーダル）
    this._openResetDialog = () => {
      // 既存があれば再利用
      if (this._resetOv && this._resetOv.isConnected) return;
      const ov = document.createElement('div');
      ov.className = 'modal-overlay';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      ov.innerHTML = `
        <div class="modal">
          <div class="modal-body">
            <div class="modal-title">Reset Save Data</div>
            <div class="modal-text small">Reset all save data? This action cannot be undone.</div>
          </div>
          <div class="modal-actions">
            <button class="btn" id="btnCancelReset">Cancel</button>
            <button class="btn btn-danger" id="btnDoReset">Reset</button>
          </div>
        </div>
      `;
      this.root.appendChild(ov);
      this._resetOv = ov;
      // ハンドラ
      const cancel = ov.querySelector('#btnCancelReset');
      const doReset = ov.querySelector('#btnDoReset');
      this._onCancelReset = () => { try { ov.remove(); } catch (_) { } };
      this._onDoReset = () => {
        SaveManager.reset(this.state);
        // UI更新
        try {
          const cont = this.root.querySelector('#btnContinue');
          const reset = this.root.querySelector('#btnReset');
          if (cont) { cont.setAttribute('disabled', 'true'); cont.title = 'セーブデータがありません'; }
          if (reset) { reset.setAttribute('disabled', 'true'); reset.title = 'セーブデータがありません'; }
        } catch (_) { }
        try { ov.remove(); } catch (_) { }
      };
      if (cancel) cancel.addEventListener('click', this._onCancelReset);
      if (doReset) doReset.addEventListener('click', this._onDoReset);
    };

    // フレーム: SVGマスクで中央をくり抜く
    const layer = this.root.querySelector('.title-layer');
    const svgHost = this.root.querySelector('.frame-svg');
    svgHost.style.visibility = 'hidden';
    svgHost.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <mask id="df-frame-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect x="0" y="0" width="100%" height="100%" fill="white"/>
            <rect id="df-mask-hole" x="0" y="0" width="0" height="0" fill="black"/>
          </mask>
        </defs>
        <image id="df-frame-img" x="0" y="0" width="100%" height="100%" href="assets/frame1.webp" preserveAspectRatio="xMidYMid slice" mask="url(#df-frame-mask)"/>
      </svg>
    `;
    // frame1.webp が無い環境では png にフォールバック
    try {
      const frameImgEl = svgHost.querySelector('#df-frame-img');
      const probe = new Image();
      probe.onload = () => { };
      probe.onerror = () => { try { frameImgEl?.setAttribute('href', 'assets/frame1.png'); } catch (_) { } };
      probe.src = 'assets/frame1.webp';
    } catch (_) { }

    const safe = this.root.querySelector('.safe-viewport');
    const hole = svgHost.querySelector('#df-mask-hole');
    const maskEl = svgHost.querySelector('#df-frame-mask');
    const SAFE_SCALE = 0.95; // フレーム幅を増やすため、穴を5%縮小
    const BG_OFFSET_Y_PX = 30; // 背景を下方向へシフトする量（px）
    const BG_SCALE = 1.20; // 背景を20%拡大（さらに+10%）

    const bgEl = this.root.querySelector('.title-bg');
    this._bgRatio = this._bgRatio || null;
    if (!this._bgRatio) {
      const img = new Image();
      img.onload = () => {
        this._bgRatio = img.naturalWidth / img.naturalHeight;
        updateMaskHole();
      };
      img.onerror = () => { try { img.onerror = null; img.src = 'assets/title5.png'; } catch (_) { } };
      img.src = 'assets/title5.webp';
      this._bgProbe = img;
    }

    const updateMaskHole = () => {
      if (!layer || !safe || !hole) return;
      const lr = layer.getBoundingClientRect();
      const Lw = lr.width, Lh = lr.height;
      const R = 16 / 9;
      // レイヤー内で最大の16:9を中央に配置
      let w = Math.min(Lw, Lh * R);
      let h = Math.min(Lh, Lw / R);
      // 数値誤差の調整
      if (w / h > R) w = h * R; else h = w / R;
      // 少し小さく（背景をより広く見せる）
      w *= SAFE_SCALE;
      h *= SAFE_SCALE;
      const x = (Lw - w) / 2;
      const y = (Lh - h) / 2;
      // サブピクセル差の低減（整数丸め）
      const rx = Math.round(x), ry = Math.round(y), rw = Math.round(w), rh = Math.round(h);
      hole.setAttribute('x', String(rx));
      hole.setAttribute('y', String(ry));
      hole.setAttribute('width', String(rw));
      hole.setAttribute('height', String(rh));
      if (maskEl) {
        maskEl.setAttribute('x', '0');
        maskEl.setAttribute('y', '0');
        maskEl.setAttribute('width', String(Lw));
        maskEl.setAttribute('height', String(Lh));
      }

      // UIのセーフエリアを穴に同期
      Object.assign(safe.style, {
        position: 'absolute', left: `${rx}px`, top: `${ry}px`, width: `${rw}px`, height: `${rh}px`
      });

      // 背景: セーフエリアを最小限カバーするサイズでpx指定（より多くの背景を見せる）
      if (this._bgRatio && bgEl) {
        const needWBase = Math.max(w, h * this._bgRatio);
        const needW = Math.max(1, Math.floor(needWBase * BG_SCALE));
        bgEl.style.backgroundSize = `${needW}px auto`;
        bgEl.style.backgroundPosition = `center calc(50% + ${BG_OFFSET_Y_PX}px)`;
        bgEl.style.backgroundRepeat = 'no-repeat';
      }
    };

    // Reset/Aquarium ボタンのY座標を Config ボタンのY（中心）に合わせる
    this._syncSideButtonsY = () => {
      try {
        const cfgBtn = this.root.querySelector('#btnConfig');
        const aquaHost = this.root.querySelector('.title-aqua');
        const resetHost = this.root.querySelector('.title-reset');
        if (!layer || !cfgBtn || !aquaHost || !resetHost) return;
        const lr = layer.getBoundingClientRect();
        const cr = cfgBtn.getBoundingClientRect();
        const centerY = cr.top + cr.height / 2;
        const topWithinLayer = Math.round(centerY - lr.top);
        aquaHost.style.top = `${topWithinLayer}px`;
        resetHost.style.top = `${topWithinLayer}px`;
        // 中央合わせ（各ホストの中心を指定topに合わせる）
        aquaHost.style.transform = 'translateY(-50%)';
        resetHost.style.transform = 'translateY(-50%)';
      } catch (_) { }
    };

    this._onResize = () => { updateMaskHole(); this._syncSideButtonsY?.(); };
    window.addEventListener('resize', this._onResize);
    // ResizeObserverで安定更新
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => { updateMaskHole(); this._syncSideButtonsY?.(); });
      this._ro.observe(layer);
      this._ro.observe(safe);
    }
    // 初回同期後に可視化
    const afterLayout = () => {
      updateMaskHole();
      // 画像読み込みによる高さ確定の遅延に備えて数フレーム再試行
      const retrySync = (tries = 0) => {
        try {
          const cfgBtn = this.root.querySelector('#btnConfig');
          const h = cfgBtn ? cfgBtn.getBoundingClientRect().height : 0;
          if (h && h > 0) { this._syncSideButtonsY?.(); return; }
        } catch (_) { }
        if (tries > 60) { this._syncSideButtonsY?.(); return; }
        requestAnimationFrame(() => retrySync(tries + 1));
      };
      retrySync(0);
      svgHost.style.visibility = 'visible';
      // 初回レイアウト後のアイドルタイミングでプリロード
      try {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => this._prewarmFishing?.(), { timeout: 1500 });
        } else {
          setTimeout(() => this._prewarmFishing?.(), 100);
        }
      } catch (_) { setTimeout(() => this._prewarmFishing?.(), 120); }
    };
    requestAnimationFrame(() => requestAnimationFrame(afterLayout));
  }

  unmount() {
    if (!this.root) return;
    const startBtn = this.root.querySelector('#btnStart');
    const contBtn = this.root.querySelector('#btnContinue');
    const cfgBtn = this.root.querySelector('#btnConfig');
    const aquaBtn = this.root.querySelector('#btnAquarium');
    const resetBtn = this.root.querySelector('#btnReset');
    if (startBtn) startBtn.removeEventListener('click', this.onStart);
    if (contBtn) contBtn.removeEventListener('click', this.onContinue);
    if (cfgBtn) cfgBtn.removeEventListener('click', this.onConfig);
    if (aquaBtn) aquaBtn.removeEventListener('click', this.onAquarium);
    if (resetBtn) resetBtn.removeEventListener('click', this.onReset);
    // モーダルの後始末
    if (this._resetOv) {
      try {
        const cancel = this._resetOv.querySelector('#btnCancelReset');
        const doReset = this._resetOv.querySelector('#btnDoReset');
        if (cancel && this._onCancelReset) cancel.removeEventListener('click', this._onCancelReset);
        if (doReset && this._onDoReset) doReset.removeEventListener('click', this._onDoReset);
      } catch (_) { }
      try { this._resetOv.remove(); } catch (_) { }
      this._resetOv = null;
      this._onCancelReset = null;
      this._onDoReset = null;
    }
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this._ro) { try { this._ro.disconnect(); } catch (e) { } this._ro = null; }
    this._bgProbe = null;
    this.root.remove();
    this.root = null;
    document.body.classList.remove('title-full');
  }
}
