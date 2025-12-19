import Bait from '../entities/Bait.js';
import Fish from '../entities/Fish.js';
import { SaveManager } from '../core/SaveManager.js';

export default class FishingScene {
  mount(container, manager, state, data) {
    this.container = container;
    this.manager = manager;
    this.state = state;
    this._mode = data.mode || 'start';
    console.log(`[DEBUG] FishingScene.mount: mode=${this._mode}, state.bait=`, JSON.stringify(this.state?.bait));

    // Parse URL Debug Params
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const kReq = sp.get('kraken_req');
      this._krakenReqCount = (kReq != null) ? parseInt(kReq, 10) : null;
      this._krakenInfinite = (sp.get('kraken_inf') === '1' || sp.get('kraken_inf') === 'true');
      console.log(`[DEBUG] URL Params: kraken_req=${this._krakenReqCount}, kraken_inf=${this._krakenInfinite}`);

      window.debugCthulhu = () => { console.log('Forces Cthulhu'); this._triggerBossEvent?.('cthulhu'); };
      // Map debugKraken to triggerBossEvent('kraken') which we will support
      window.debugKraken = () => { console.log('Forces Kraken'); this._triggerBossEvent?.('kraken'); };
      window.debugFuji = () => { console.log('Forces Fuji'); this._triggerBossEvent?.('fuji'); };
      window.debugMega = () => { console.log('Forces Mega'); this._triggerBossEvent?.('mega'); };
    }

    this._sessionCatchCount = 0;

    this.root = document.createElement('div');
    this.root.className = 'scene scene--fishing';
    this.root.innerHTML = `
      <div class="fish-layer frame-skin-default">
        <div class="fish-bg" aria-hidden="true">
          <video id="introVideo" src="assets/turigamennsyoki.mp4" autoplay muted playsinline webkit-playsinline preload="auto" loop></video>
        </div>

        <div class="safe-viewport"></div>

        <div class="frame-svg" aria-hidden="true"></div>

        <div class="topbar fish-topbar">
          <div class="topset" id="topsetGroup">
            <div class="left depth-group">
              <button class="img-combo-btn img-combo-btn--sm topset-item" id="btnBack" aria-label="TITLE">
                <picture>
                  <source srcset="assets/yajirushi.webp" type="image/webp" />
                  <img class="back-arrow" src="assets/yajirushi.png" alt="Back" />
                </picture>
                <picture>
                  <source srcset="assets/TITLE.webp" type="image/webp" />
                  <img class="back-title" src="assets/TITLE.png" alt="TITLE" />
                </picture>
              </button>
              <div class="depth current-depth topset-item">
                <picture>
                  <source srcset="assets/suisinhakari.webp" type="image/webp" />
                  <img class="depth-bg" src="assets/suisinhakari.png" alt="Depth" />
                </picture>
                <div class="depth-text" id="depthNow">00000</div>
              </div>
              <div class="depth max-depth topset-item">
                <picture>
                  <source srcset="assets/suisinhakari-max.webp" type="image/webp" />
                  <img class="depth-bg" src="assets/suisinhakari-max.png" alt="Max Depth" />
                </picture>
                <picture>
                  <source srcset="assets/MAX.webp" type="image/webp" />
                  <img class="depth-max-label" src="assets/MAX.png" alt="MAX" />
                </picture>
                <div class="depth-text" id="depthMax">00000</div>
              </div>
            </div>
            <div class="right right-group">
              <div class="esabako-mini topset-item" id="esabakoMini"></div>
            </div>
          </div>

          <div class="gamehud" id="gameHud" style="display:none">
            <div class="left depth-group">
              <div class="depth current-depth topset-item">
                <picture>
                  <source srcset="assets/suisinhakari.webp" type="image/webp" />
                  <img class="depth-bg" src="assets/suisinhakari.png" alt="Depth" />
                </picture>
                <div class="depth-text" id="depthNowGame">00000</div>
              </div>
            </div>
            <div class="right right-group">
              <div class="esabako-mini topset-item" id="esabakoMiniGame"></div>
            </div>

          </div>
        </div>
      </div>
    `;

    container.replaceChildren(this.root);

    // Test Button Logic


    // UI全体のY方向オフセット（負で上へ）
    const UI_OFFSET_Y_PX = -70; // 要望: 上に70px
    // UIオーバーライドCSS（深度数字を下へ15px/右へ5px、戻る矢印を1.3倍）
    try {
      const sid = 'df-fishing-ui-overrides';
      let st = document.getElementById(sid);
      if (!st) { st = document.createElement('style'); st.id = sid; document.head.appendChild(st); }
      st.textContent = `
        .scene--fishing .depth .depth-text{ left: calc(50% - 5px + 5px) !important; top: calc(50% - 3px + 62px) !important; }
        .scene--fishing .depth { position: relative; top: -15px; }
        .scene--fishing .img-combo-btn--sm .back-arrow{ width: calc(clamp(58px, 11vw, 128px) * 1.3); }
        .scene--fishing .depth.max-depth .depth-max-label{ position:absolute; left: calc(50% - 5px + 5px); top: calc(50% - 3px + 62px - 6px); transform: translate(-50%, -100%); width: clamp(40px, 8vw, 90px); height:auto; image-rendering: pixelated; pointer-events:none; }
        /* タイトルへ戻るボタンだけ30px下げる */
        .scene--fishing #btnBack{ position: relative; top: 30px; }
        /* 魚表示エリアを背景より手前に（Z-index修正） */
        .scene--fishing .safe-viewport { position: relative; z-index: 5; }
        /* 餌箱の餌を7px下げる（ミニ&通常） */
        .scene--fishing .ebi-img-mini{ transform: translate(-30px, -13px) !important; }
        .scene--fishing .esabako-group .ebi-img{ transform: translate(-30px, -13px) !important; }
        /* TAPガイド（投げる前の点滅表示） */
        .scene--fishing .area-cutin-box {
          background: linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%);
          padding: 12px 80px 12px 24px;
          border-left: 6px solid #00ffff;
          transform: translate(-100%, 50%) skewX(-20deg);
          opacity: 0;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;
          margin-bottom: 8px;
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
        }
        .area-cutin-box.show {
          transform: translate(0, 0) skewX(0deg);
          opacity: 1;
        }
        .area-cutin-container {
          position: absolute;
          bottom: 40px;
          left: 0;
          width: 100%;
          pointer-events: none;
          z-index: 1000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-left: 0;
        }
        .area-cutin-title {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 64px;
          line-height: 1.0;
          color: #fff;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
          margin-bottom: 4px;
        }
        .area-cutin-subtitle {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 500;
          font-size: 32px;
          color: #ccffff;
          letter-spacing: 0.1em;
        }
        .scene--fishing .tap-guide{
          position:absolute; left: calc(50% + 100px); top: calc(42% - 130px + ${UI_OFFSET_Y_PX + 120}px);
          transform: translate(-50%, -50%);
          width: clamp(60px, 10vw, 160px);
          height:auto;
          image-rendering: pixelated;
          pointer-events: none;
          z-index: 9;
          animation: df-tap-blink 1.05s ease-in-out infinite;
          opacity: 0.9;
        }
        @keyframes df-tap-blink{
          0%,100%{ opacity: 0.35; }
          50%{ opacity: 1; }
        }
        .scene--fishing .esabako-mini{ position: relative; }
        .scene--fishing #esabakoMini{ position: relative; left: clamp(-100px, -6vw, -20px); z-index: 3; }
        .scene--fishing .esabako-mini .bait-nav{ position:absolute; inset:0; display:flex; align-items:center; justify-content:space-between; z-index:12; pointer-events:auto; }
        .scene--fishing .esabako-mini .bait-nav .arrow-btn{ position:absolute; width: clamp(24px, 3.4vw, 40px); height:auto; image-rendering: pixelated; cursor: pointer; pointer-events:auto; opacity:0.95; touch-action: manipulation; z-index:13; animation: df-tap-blink 1.05s ease-in-out infinite; }
        .scene--fishing .esabako-mini .bait-nav .arrow-left{ transform: scaleX(-1); }
        .scene--fishing .esabako-mini .bait-nav .arrow-btn:hover{ opacity: 1; }
        .scene--fishing .dialogue-overlay{ position:absolute; left:0; right:0; bottom:clamp(6px, 3vh, 28px); z-index:15; display:flex; justify-content:center; pointer-events:none; }
        .scene--fishing .dialogue-overlay .dialogue-text{ color:#fff; font-weight:700; text-shadow:0 0 8px rgba(0,0,0,.6); font-size:clamp(14px,2.6vw,24px); background:transparent; padding:8px 12px; border-radius:10px; max-width:86%; white-space:pre-wrap; letter-spacing:.02em; }
      `;
    } catch (_) { }

    // 動的にベースURLを解決する関数（ローカルとデプロイ環境の差異を吸収）
    this._getAssetPath = (relativePath) => {
      try {
        // 現在のスクリプトのベースURLを取得
        const scriptBase = document.currentScript ? new URL(document.currentScript.src).origin : window.location.origin;
        // デプロイ環境かどうかを判定（localhostでなければデプロイ環境とみなす）
        const isDeployed = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

        if (isDeployed) {
          // デプロイ環境では絶対パスを使用
          return `${scriptBase}/${relativePath.replace(/^\/+/, '')}`;
        } else {
          // ローカル環境では相対パスを使用
          return relativePath;
        }
      } catch (_) {
        // エラー時は相対パスをフォールバック
        return relativePath;
      }
    };

    this._initComboSystem = () => {
      this._comboCount = 0;
      this._comboTimer = 0;
      this._comboTimeoutSec = 1.6;
      this._comboColorStage = 0; // 0:<30, 1:>=30, 2:>=50, 3:>=70, 4:>=100
      if (!this._layer) return;
      if (!this._comboEl) {
        const el = document.createElement('div');
        el.className = 'combo-overlay';
        Object.assign(el.style, { position: 'absolute', left: '50%', top: '20%', transform: 'translate(-50%,-50%)', fontWeight: '800', color: '#ffd84a', textShadow: '0 2px 0 rgba(0,0,0,.5), 0 0 12px rgba(255,220,80,.9)', fontSize: 'clamp(22px,4vw,44px)', zIndex: '100001', pointerEvents: 'none', opacity: '0', transition: 'opacity .12s ease, transform .18s cubic-bezier(0.16,1,0.3,1)' });
        this._comboEl = el;
        this._layer.appendChild(el);
      }
      this._updateComboOverlay?.(true);
    };

    this._updateComboOverlay = (instant = false) => {
      const el = this._comboEl; if (!el) return;
      if (this._comboCount <= 0) { el.style.opacity = '0'; return; }
      el.textContent = `×${this._comboCount}`;
      try {
        const br = this._bait?.getHitRect?.();
        const sr = this._safe?.getBoundingClientRect?.();
        if (br && sr) {
          const x = (br.left - sr.left) + br.width * 0.5;
          const y = (br.top - sr.top) - 28;
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.style.transform = 'translate(-50%,-50%) scale(1)';
        }
      } catch (_) { }
      const n = this._comboCount || 0;
      if (n >= 100) {
        const t = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const p = 0.5 + 0.5 * Math.sin(t / 180);
        const g1 = 12 + Math.floor(8 * p);
        const g2 = 24 + Math.floor(12 * p);
        el.style.color = '#ffd84a';
        el.style.textShadow = `0 2px 0 rgba(0,0,0,.45), 0 0 ${g1}px rgba(255,220,120,.95), 0 0 ${g2}px rgba(255,240,180,.55)`;
      } else if (n >= 70) {
        el.style.color = '#a960ff';
        el.style.textShadow = '0 2px 0 rgba(0,0,0,.5), 0 0 12px rgba(169,96,255,.9), 0 0 22px rgba(140,60,255,.45)';
      } else if (n >= 50) {
        el.style.color = '#ff3b3b';
        el.style.textShadow = '0 2px 0 rgba(0,0,0,.5), 0 0 12px rgba(255,59,59,.9), 0 0 18px rgba(255,80,80,.4)';
      } else if (n >= 30) {
        el.style.color = '#ff7ac8';
        el.style.textShadow = '0 2px 0 rgba(0,0,0,.5), 0 0 12px rgba(255,122,200,.9), 0 0 18px rgba(255,150,220,.35)';
      } else {
        el.style.color = '#ffd84a';
        el.style.textShadow = '0 2px 0 rgba(0,0,0,.5), 0 0 12px rgba(255,220,80,.9)';
      }
      // 色段階の変化を検知して一瞬だけ強いポップ＋軽いシェイク
      const prevStage = Number(this._comboColorStage || 0);
      let stage = 0;
      if (n >= 100) stage = 4; else if (n >= 70) stage = 3; else if (n >= 50) stage = 2; else if (n >= 30) stage = 1; else stage = 0;
      if (stage !== prevStage) {
        this._comboColorStage = stage;
        const base = 'translate(-50%,-50%)';
        const pop = stage >= 4 ? 1.30 : stage >= 3 ? 1.26 : stage >= 2 ? 1.22 : 1.18;
        const rot = stage >= 4 ? 1.6 : stage >= 3 ? 1.2 : stage >= 2 ? 1.0 : 0.8;
        el.style.opacity = '1';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try { el.style.transform = `${base} scale(${pop}) rotate(${rot}deg)`; } catch (_) { }
            requestAnimationFrame(() => { requestAnimationFrame(() => { try { el.style.transform = `${base} scale(1)`; } catch (_) { } }); });
          });
        });
        return;
      }
      if (instant) { el.style.opacity = '1'; return; }
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%,-50%) scale(1.08)';
      requestAnimationFrame(() => { requestAnimationFrame(() => { try { el.style.transform = 'translate(-50%,-50%) scale(1)'; } catch (_) { } }); });
    };

    this._tickCombo = (dt) => {
      if (this._comboCount > 0) {
        this._comboTimer += dt;
        this._updateComboOverlay?.(true);
        if (this._comboTimer >= (this._comboTimeoutSec || 1.6)) { this._resetCombo?.(); }
      }
    };

    this._resetCombo = () => {
      this._comboCount = 0;
      this._comboTimer = 0;
      this._updateComboOverlay?.(true);
    };

    this._playComboSfx = (n = 1) => {
      try {
        const ctx = this._audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        this._audioCtx = ctx;
        const now = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const base = 660;
        const step = 38;
        const freq = Math.min(2200, base + step * Math.min(30, n - 1));
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.20, now + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        o.connect(g); g.connect(ctx.destination);
        o.start(now);
        o.stop(now + 0.14);
      } catch (_) { }
    };

    // 餌箱（ミニ）生成（投げる前UI／右上）
    this._spawnEsabakoMini = () => {
      try {
        const host = this.root?.querySelector?.('#esabakoMini');
        if (!host) return;
        if (!host.firstElementChild) {
          const wrap = document.createElement('div');
          wrap.className = 'esabako-mini-wrap';
          wrap.innerHTML = `
            <picture>
              <source srcset="assets/esabako.webp" type="image/webp" />
              <img class="esabako-img-mini" src="assets/esabako.png" alt="esabako" />
            </picture>
            <img class="ebi-img-mini" src="assets/taiwoturuebi.webp" alt="ebi" />
          `;
          host.appendChild(wrap);
          // フォールバック: ebi webp→png
          try {
            const ebi = host.querySelector('.ebi-img-mini');
            if (ebi) {
              ebi.decoding = 'async';
              const png = 'assets/taiwoturuebi.png';
              ebi.onerror = () => { if (ebi.src.endsWith('.webp')) { ebi.onerror = null; ebi.src = png; } };
            }
          } catch (_) { }
        }
        this._esabakoMini = host;
      } catch (_) { }
    };

    // 低ランク魚を黄色シルエットに差し替え (Modified to strict silhouette logic)
    // 優先順位: Special Rank > 格下(Yellow) > その他(White)
    this._applySilhouetteForFish = (fish) => {
      try {
        if (!fish || !fish.el) return;
        const img = fish.el;

        // 判定済みフラグ(dataset._silType)を利用して無駄なDOM更新を防ぐ

        // 1. Special Rank (Highest Priority)
        // fish.def.specialRank がある場合 (例: 'f30', 'f50')
        if (fish.def?.specialRank) {
          const sRank = fish.def.specialRank;
          if (img.dataset._silType !== sRank) {
            // "f30" -> "30"
            const num = sRank.replace(/^f/, '');
            const targetSrc = `assets/fish${num}.png`;

            img.onerror = () => {
              // 読み込み失敗時は白シルエットへフォールバック
              img.onerror = null;
              const mbSrc = this._getAssetPath?.('assets/fish.png') || 'assets/fish.png';
              if (img.src !== mbSrc) img.src = mbSrc;
              img.style.filter = '';
              img.dataset._silType = 'fallback_white';
            };

            img.src = this._getAssetPath?.(targetSrc) || targetSrc;
            img.style.filter = 'none';
            img.dataset._silType = sRank;
          }
          return;
        }

        // ランク比較
        const fishRank = Number(fish?.def?.rank ?? Infinity);
        const baitFromObj = (typeof this._bait?.getRank === 'function') ? Number(this._bait.getRank() || 0) : 0;
        const baitFromState = Number(this?.state?.bait?.rank ?? 0);
        const baitRank = Math.max(baitFromObj, baitFromState);

        // 2. Lower Rank (Yellow)
        if (Number.isFinite(fishRank) && Number.isFinite(baitRank) && fishRank < baitRank) {
          if (img.dataset._silType !== 'yellow') {
            const targetSrc = 'assets/fish_yellow.png';

            img.onerror = () => {
              // fish_yellow.png がない場合は fish.png + フィルター
              img.onerror = null;
              const mbSrc = this._getAssetPath?.('assets/fish.png') || 'assets/fish.png';
              if (img.src !== mbSrc) img.src = mbSrc;
              img.style.filter = 'sepia(1) saturate(2.2) hue-rotate(-28deg) brightness(1.12)';
              img.dataset._silType = 'yellow_fallback';
            };

            img.src = this._getAssetPath?.(targetSrc) || targetSrc;
            img.style.filter = 'none';
            img.dataset._silType = 'yellow';
          }
          return;
        }

        // 3. Default/Higher/Equal Rank (White)
        if (img.dataset._silType !== 'white') {
          const targetSrc = 'assets/fish.png';
          // 既に white なら更新しない
          if (img.dataset._silType === 'fallback_white') return;

          img.onerror = null; // reset logic if any
          img.src = this._getAssetPath?.(targetSrc) || targetSrc;
          img.style.filter = 'none';
          img.dataset._silType = 'white';
        }

      } catch (_) { }
    };


    this._applySettings = () => {
      try {
        const s = this.state?.settings || {};
        const sens = Math.max(0, Math.min(10, Number(s.mouseSensitivity ?? 6)));
        const alpha = 0.05 + (sens / 10) * 0.55;
        this._baitFollowAlpha = Math.max(0.01, Math.min(0.8, alpha));
        const sfxVol = Math.max(0, Math.min(1, Number((s.sfxVolume ?? 10) / 10)));
        const bgmVol = Math.max(0, Math.min(1, Number((s.bgmVolume ?? 6) / 10)));
        if (this._bgmAudio) {
          try { this._bgmAudio.volume = bgmVol; } catch (_) { }
          if (bgmVol <= 0) { try { this._bgmAudio.pause(); } catch (_) { } this._bgmAudio = null; }
        }
        if (this._bubbleAudio) {
          try { this._bubbleAudio.volume = sfxVol; } catch (_) { }
          if (sfxVol <= 0) { try { this._bubbleAudio.pause(); } catch (_) { } this._bubbleAudio = null; }
        }
      } catch (_) { }
    };

    // クラーケン専用のポストGET台詞表示（3行を下部に同時表示）
    this._showKrakenDialogueLines = (lines = []) => new Promise((resolve) => {
      try {
        if (!this._layer) { resolve(); return; }
        const ov = document.createElement('div');
        ov.className = 'kraken-dialogue-overlay';
        Object.assign(ov.style, {
          position: 'absolute', inset: '0', zIndex: '15', pointerEvents: 'none',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 20px 10%'
        });
        const wrap = document.createElement('div');
        Object.assign(wrap.style, { display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center' });
        for (const t of lines) {
          const d = document.createElement('div');
          d.textContent = String(t || '');
          Object.assign(d.style, {
            color: '#fff', fontWeight: '700',
            textShadow: '0 0 8px rgba(0,0,0,.65)',
            fontSize: 'clamp(16px, 3.2vw, 26px)',
            opacity: '0', transform: 'translateY(6px)',
            transition: 'opacity .25s ease, transform .25s ease'
          });
          wrap.appendChild(d);
          requestAnimationFrame(() => { requestAnimationFrame(() => { d.style.opacity = '1'; d.style.transform = 'translateY(0)'; }); });
        }
        ov.appendChild(wrap);
        this._layer.appendChild(ov);
        const done = () => { try { ov.style.transition = 'opacity .25s ease'; ov.style.opacity = '0'; } catch (_) { }; setTimeout(() => { try { ov.remove(); } catch (_) { }; resolve(); }, 260); };
        setTimeout(done, 3200);
      } catch (_) { resolve(); }
    });

    this._triggerKrakenEvent = () => {
      if (this._krakenTriggered) return;
      try { if (!this._krakenMulti && Array.isArray(this.state?.caught) && this.state.caught.some(e => e && e.id === 'kura-ken')) return; } catch (_) { }
      this._krakenTriggered = true;
      // 全魚の当たり判定を無効化し、即時フェードアウト
      this._globalFishCollisionsDisabled = true;
      try { if (Array.isArray(this._fishes)) { for (const ff of this._fishes) { try { if (ff) ff.startShrinkAndFadeOut?.(600, 0.2); } catch (_) { } } } } catch (_) { }
      try { this._spawners = []; } catch (_) { }
      try {
        this._lockBaitPos = true;
        const be = this._bait?.el; if (be) {
          be.style.transition = 'transform 0.6s ease, opacity 0.55s ease';
          be.style.transformOrigin = '50% 50%';
          be.style.transform = 'translate(-50%, -50%) scale(1)';
          be.style.opacity = '1';
          requestAnimationFrame(() => { try { be.style.transform = 'translate(-50%, -50%) scale(0.2)'; be.style.opacity = '0'; } catch (_) { } });
          setTimeout(() => { try { this._bait?.hide?.(); } catch (_) { } }, 620);
        }
        if (this._ropeCanvas) {
          const rc = this._ropeCanvas;
          rc.style.transition = 'transform 0.6s ease, opacity 0.55s ease';
          rc.style.transformOrigin = '50% 50%';
          rc.style.opacity = '1';
          requestAnimationFrame(() => { try { rc.style.transform = 'scale(0.7)'; rc.style.opacity = '0'; } catch (_) { } });
          setTimeout(() => { try { this._ropeEnabled = false; rc.style.display = 'none'; rc.style.transform = ''; rc.style.opacity = ''; rc.style.transition = ''; } catch (_) { } }, 620);
        }
      } catch (_) { }
      const krakenDef = { id: 'kura-ken', name_ja: 'クラーケン', rank: 999 };
      // 特別映像（クロマキー）を有効化→映像（フル再生）→GETの順で表示
      this._specialGetVideoSrc = 'assets/kura-ken.mp4';
      this._specialGetWaitForEnd = true; // フル再生を待つ
      this._specialGetVideoHoldMs = 0;   // ホールドは未使用
      this._specialChromaKey = null;
      this._onGetFish?.(krakenDef);
    };

    // ChromaKey: WebGLキャンバスを生成して video をキー合成描画
    this._startChromaKeyPlayback = () => {
      try {
        if (!this._specialChromaKey || !this._videoEl || !this._layer) return;
        if (this._chromaCanvas) return;
        // 動画直後ろのバックドロップ（平均色）はクロマ中は非表示（緑が差し込まないように）
        try { if (this._videoBackdrop) this._videoBackdrop.style.display = 'none'; } catch (_) { }
        const cvs = document.createElement('canvas');
        this._chromaCanvas = cvs;
        Object.assign(cvs.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2', transform: 'translateY(0px)' });
        this._layer.appendChild(cvs);
        const gl = cvs.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
        if (!gl) { this._chromaCanvas.remove(); this._chromaCanvas = null; return; }
        this._chromaGl = gl;
        try { gl.disable(gl.BLEND); } catch (_) { }
        try { if (this._videoEl) { this._videoEl.style.visibility = 'hidden'; this._videoEl.style.pointerEvents = 'none'; } } catch (_) { }
        try { if (this._blackBelow) this._blackBelow.style.display = 'block'; } catch (_) { }
        try { if (this._scrollBg) this._scrollBg.style.display = 'none'; } catch (_) { }
        try { if (this._scrollMidLayer) this._scrollMidLayer.style.display = 'none'; } catch (_) { }
        try { if (this._scrollFarLayer) this._scrollFarLayer.style.display = 'none'; } catch (_) { }
        try { if (this._gameBlackBg) this._gameBlackBg.style.display = 'block'; } catch (_) { }
        try { this._origLayerBg = this._layer?.style?.background; if (this._layer) { this._layer.style.background = '#000'; this._layer.style.backgroundImage = 'none'; } } catch (_) { }
        const vsSrc = `
          attribute vec2 a_pos; varying vec2 v_uv; void main(){ v_uv = (a_pos+1.0)*0.5; gl_Position = vec4(a_pos,0.0,1.0); }
        `;
        const fsSrc = `
          precision mediump float; varying vec2 v_uv; uniform sampler2D u_tex; uniform vec3 u_key; uniform float u_sim; uniform float u_smooth; uniform float u_spill; uniform vec4 u_uvRect; uniform float u_gx0; uniform float u_gx1; uniform float u_zero; uniform float u_acut; uniform float u_afeather; uniform float u_cdHard; uniform float u_gxHard; uniform vec2 u_texel; uniform float u_erode; uniform float u_rg0; uniform float u_rg1; uniform float u_dilate; uniform float u_fillGx; uniform float u_alphaFloor; uniform float u_whiteY; uniform float u_whiteSat; uniform float u_whiteFeather; uniform float u_whiteStrength; uniform float u_whiteDespill; uniform float u_whiteHard;
          
          // RGB -> YCbCr（BT.601近似）
          vec3 rgb2ycbcr(vec3 c) {
            float Y  = dot(c, vec3(0.299, 0.587, 0.114));
            float Cb = (c.b - Y) * 0.565;
            float Cr = (c.r - Y) * 0.713;
            return vec3(Y, Cb, Cr);
          }
          
          float alphaFromUV(vec2 uv){
            vec4 c = texture2D(u_tex, uv);
            vec3 ycc = rgb2ycbcr(c.rgb);
            vec3 kcc = rgb2ycbcr(u_key);
            float cd = distance(ycc.yz, kcc.yz);
            float aC = smoothstep(u_sim, u_sim + u_smooth, cd);
            float greenExcess = max(0.0, c.g - max(c.r, c.b));
            float greenCut   = smoothstep(u_gx0, u_gx1, greenExcess);
            float a = min(aC, 1.0 - greenCut);
            // G比率（G / (R+B)）由来の追加カット（暗部残り・色ムラ対策）: 有効時のみ
            if (u_rg1 > u_rg0) {
              float ratio = c.g / max(0.001, c.r + c.b);
              float rcut = smoothstep(u_rg0, u_rg1, ratio);
              a = min(a, 1.0 - rcut);
            }
            // ハード背景カット: いずれかの閾値が有効時のみ
            if (u_cdHard > 0.0 || u_gxHard > 0.0) {
              float hardBg = step(cd, u_cdHard) + step(u_gxHard, greenExcess);
              if (hardBg > 0.0) a = 0.0;
            }
            // しきい値以下は完全透明化: 有効時のみ
            if (u_zero > 0.0) {
              a = mix(0.0, a, step(u_zero, a));
            }
            // カット/フェザー（二値寄せ）: 有効時のみ
            if (u_acut > 0.0 || u_afeather > 0.0) {
              float af = max(0.0, u_afeather);
              a = (af <= 0.0) ? step(u_acut, a) : smoothstep(u_acut, u_acut + af, a);
            }
            return a;
          }

          void main(){
            vec2 uv = mix(u_uvRect.xy, u_uvRect.zw, v_uv);
            float alpha = alphaFromUV(uv);
            if (u_sim <= 0.0 && (u_gx1 - u_gx0) <= 0.0) {
              alpha = 1.0;
            }
            // 近傍5点の最小アルファ（収縮）で背景の半透明を削る
            if (u_erode > 0.0) {
              vec2 t = u_texel * u_erode;
              alpha = min(alpha, alphaFromUV(uv + vec2( t.x, 0.0)));
              alpha = min(alpha, alphaFromUV(uv + vec2(-t.x, 0.0)));
              alpha = min(alpha, alphaFromUV(uv + vec2(0.0,  t.y)));
              alpha = min(alpha, alphaFromUV(uv + vec2(0.0, -t.y)));
              alpha = min(alpha, alphaFromUV(uv + vec2( t.x,  t.y)));
              alpha = min(alpha, alphaFromUV(uv + vec2( t.x, -t.y)));
              alpha = min(alpha, alphaFromUV(uv + vec2(-t.x,  t.y)));
              alpha = min(alpha, alphaFromUV(uv + vec2(-t.x, -t.y)));
            }
            // 軽い膨張で内部の点抜けを緩和（縁の肥大を避けるため弱めにブレンド）
            if (u_dilate > 0.0) {
              vec2 t2 = u_texel * u_dilate;
              float aD = alpha;
              aD = max(aD, alphaFromUV(uv + vec2( t2.x, 0.0)));
              aD = max(aD, alphaFromUV(uv + vec2(-t2.x, 0.0)));
              aD = max(aD, alphaFromUV(uv + vec2(0.0,  t2.y)));
              aD = max(aD, alphaFromUV(uv + vec2(0.0, -t2.y)));
              aD = max(aD, alphaFromUV(uv + vec2( t2.x,  t2.y)));
              aD = max(aD, alphaFromUV(uv + vec2( t2.x, -t2.y)));
              aD = max(aD, alphaFromUV(uv + vec2(-t2.x,  t2.y)));
              aD = max(aD, alphaFromUV(uv + vec2(-t2.x, -t2.y)));
              alpha = max(alpha, mix(alpha, aD, 0.35));
            }
            vec3 rgb = texture2D(u_tex, uv).rgb;
            float greenExcess = max(0.0, rgb.g - max(rgb.r, rgb.b));
            float spillAmt = greenExcess * (1.0 - alpha);
            rgb.g = max(0.0, rgb.g - spillAmt * u_spill);
            // 白さの指標（輝度高・低彩度）
            float mx0 = max(rgb.r, max(rgb.g, rgb.b));
            float mn0 = min(rgb.r, min(rgb.g, rgb.b));
            float sat0 = mx0 - mn0;
            float wy0 = smoothstep(u_whiteY, min(1.0, u_whiteY + max(0.0001, u_whiteFeather)), dot(rgb, vec3(0.299, 0.587, 0.114)));
            float ws0 = 1.0 - smoothstep(u_whiteSat, u_whiteSat + max(0.0001, u_whiteFeather), sat0);
            float wh0 = clamp(wy0 * ws0, 0.0, 1.0);
            // 非緑領域のアルファ下限は、白ではない領域のみに適用
            if (u_alphaFloor > 0.0 && greenExcess < u_fillGx && wh0 < 0.25) {
              alpha = max(alpha, u_alphaFloor);
            }
            if (u_whiteStrength > 0.0) {
              float mx = max(rgb.r, max(rgb.g, rgb.b));
              float mn = min(rgb.r, min(rgb.g, rgb.b));
              float sat = mx - mn;
              float wy = smoothstep(u_whiteY, min(1.0, u_whiteY + max(0.0001, u_whiteFeather)), dot(rgb, vec3(0.299, 0.587, 0.114)));
              float ws = 1.0 - smoothstep(u_whiteSat, u_whiteSat + max(0.0001, u_whiteFeather), sat);
              float wcut = clamp(wy * ws, 0.0, 1.0) * clamp(u_whiteStrength, 0.0, 1.0);
              alpha = mix(alpha, 0.0, wcut);
              alpha *= (1.0 - wcut);
              float whard = step(u_whiteHard, wcut);
              alpha *= (1.0 - whard);
            }
            if (u_whiteDespill > 0.0) {
              float mx2 = max(rgb.r, max(rgb.g, rgb.b));
              float mn2 = min(rgb.r, min(rgb.g, rgb.b));
              float sat2 = mx2 - mn2;
              float wy2 = smoothstep(u_whiteY, min(1.0, u_whiteY + max(0.0001, u_whiteFeather)), dot(rgb, vec3(0.299, 0.587, 0.114)));
              float ws2 = 1.0 - smoothstep(u_whiteSat, u_whiteSat + max(0.0001, u_whiteFeather), sat2);
              float wh = clamp(wy2 * ws2, 0.0, 1.0);
              float edge = smoothstep(0.0, 0.6, 1.0 - alpha);
              vec3 tgt = rgb * alpha;
              rgb = mix(rgb, tgt, clamp(u_whiteDespill, 0.0, 1.0) * wh * edge);
            }
            rgb *= alpha;
            gl_FragColor = vec4(rgb, alpha);
          }
        `;
        const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
        const prog = gl.createProgram(); gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc)); gl.linkProgram(prog);
        this._chromaProg = prog; gl.useProgram(prog);
        const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'a_pos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const uTex = gl.getUniformLocation(prog, 'u_tex'); gl.uniform1i(uTex, 0);
        const uKey = gl.getUniformLocation(prog, 'u_key'); const uSim = gl.getUniformLocation(prog, 'u_sim'); const uSm = gl.getUniformLocation(prog, 'u_smooth'); const uSp = gl.getUniformLocation(prog, 'u_spill'); const uRect = gl.getUniformLocation(prog, 'u_uvRect'); const uG0 = gl.getUniformLocation(prog, 'u_gx0'); const uG1 = gl.getUniformLocation(prog, 'u_gx1'); const uZero = gl.getUniformLocation(prog, 'u_zero'); const uAcut = gl.getUniformLocation(prog, 'u_acut'); const uAfeather = gl.getUniformLocation(prog, 'u_afeather'); const uCdHard = gl.getUniformLocation(prog, 'u_cdHard'); const uGxHard = gl.getUniformLocation(prog, 'u_gxHard'); const uTexel = gl.getUniformLocation(prog, 'u_texel'); const uErode = gl.getUniformLocation(prog, 'u_erode'); const uRg0 = gl.getUniformLocation(prog, 'u_rg0'); const uRg1 = gl.getUniformLocation(prog, 'u_rg1'); const uDil = gl.getUniformLocation(prog, 'u_dilate'); const uFill = gl.getUniformLocation(prog, 'u_fillGx'); const uAFloor = gl.getUniformLocation(prog, 'u_alphaFloor'); const uWhiteY = gl.getUniformLocation(prog, 'u_whiteY'); const uWhiteSat = gl.getUniformLocation(prog, 'u_whiteSat'); const uWhiteFeather = gl.getUniformLocation(prog, 'u_whiteFeather'); const uWhiteStr = gl.getUniformLocation(prog, 'u_whiteStrength'); const uWhiteDespill = gl.getUniformLocation(prog, 'u_whiteDespill'); const uWhiteHard = gl.getUniformLocation(prog, 'u_whiteHard');
        const ck = this._specialChromaKey; gl.uniform3f(uKey, ck.keyR || 0, ck.keyG || 1, ck.keyB || 0); gl.uniform1f(uSim, Math.max(0.0, ck.similarity || 0.30)); gl.uniform1f(uSm, Math.max(0.0, ck.smooth || 0.07)); gl.uniform1f(uSp, Math.max(0.0, ck.spill || 0.35)); gl.uniform1f(uG0, Math.max(0.0, ck.gx0 || 0.04)); gl.uniform1f(uG1, Math.max(ck.gx0 || 0.04, ck.gx1 || 0.40));
        const tex = gl.createTexture(); this._chromaTex = tex; gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // 自動キー色推定（枠周りの緑を平均）
        let probeCvs = null, probeCtx = null; let didAutoKey = false; let autoKeyFrames = 0; let autoKeyR = 0, autoKeyG = 1, autoKeyB = 0;
        try { probeCvs = document.createElement('canvas'); probeCtx = probeCvs.getContext('2d', { willReadFrequently: true }); } catch (_) { }
        const updateAutoKey = () => {
          try {
            if (!probeCtx || !this._videoEl) return;
            const w = 64, h = 64; probeCvs.width = w; probeCvs.height = h;
            probeCtx.drawImage(this._videoEl, 0, 0, w, h);
            const data = probeCtx.getImageData(0, 0, w, h).data;
            let rSum = 0, gSum = 0, bSum = 0, cnt = 0;
            for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                const edge = (x < w * 0.15) || (x > w * 0.85) || (y < h * 0.15) || (y > h * 0.85);
                if (!edge) continue;
                const i = (y * w + x) * 4; const r = data[i] / 255; const g = data[i + 1] / 255; const b = data[i + 2] / 255;
                if (g > r * 1.12 && g > b * 1.12 && g > 0.06) { rSum += r; gSum += g; bSum += b; cnt++; }
              }
            }
            if (cnt > 40) {
              autoKeyR = rSum / cnt; autoKeyG = gSum / cnt; autoKeyB = bSum / cnt;
              didAutoKey = true;
            }
          } catch (_) { }
        };

        const fit = () => {
          try {
            // CSS表示サイズ（クロマキャンバス自身のボックス）にバッファを合わせる
            const br = cvs.getBoundingClientRect();
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            const w = Math.max(2, Math.floor(br.width * dpr));
            const h = Math.max(2, Math.floor(br.height * dpr));
            if (cvs.width !== w) cvs.width = w; if (cvs.height !== h) cvs.height = h;
            gl.viewport(0, 0, w, h);
          } catch (_) { }
        };
        fit();
        const loop = () => {
          if (!this._chromaCanvas || !this._chromaGl) return;
          fit();
          try {
            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            // object-fit: cover ＋ overscan と bottomアンカー
            const v = this._videoEl; const sw = Math.max(2, v.videoWidth || 2); const sh = Math.max(2, v.videoHeight || 2);
            const tw = cvs.width; const th = cvs.height;
            const cfg = this._specialChromaKey || {};
            const over = Math.max(1.0, Number(cfg.coverScale || 1.18));
            const scale = Math.max(tw / sw, th / sh) * over;
            const uSpan = Math.min(1.0, tw / (sw * scale));
            const vSpan = Math.min(1.0, th / (sh * scale));
            const uOff = (1.0 - uSpan) * 0.5;
            // 特殊（クロマキー）時は下合わせ（bottomアンカー）
            const vOff = (this._specialChromaKey ? Math.max(0.0, 1.0 - vSpan) : (1.0 - vSpan) * 0.5);
            gl.uniform4f(uRect, uOff, vOff, uOff + uSpan, vOff + vSpan);
            // 動画テクスチャの1ピクセルUV（ソース基準）
            const texelU = 1.0 / sw;
            const texelV = 1.0 / sh;
            gl.uniform2f(uTexel, texelU, texelV);
            // ランタイム調整を反映（DevToolsから値変更に追随）
            const cfg2 = this._specialChromaKey || {};
            // 起動して最初の数フレームでキー色を自動推定（許可時）
            if (!didAutoKey && autoKeyFrames < 12 && cfg2.autoKey !== false) { autoKeyFrames++; updateAutoKey(); }
            const kR = didAutoKey ? autoKeyR : (cfg2.keyR || 0);
            const kG = didAutoKey ? autoKeyG : (cfg2.keyG || 1);
            const kB = didAutoKey ? autoKeyB : (cfg2.keyB || 0);
            gl.uniform3f(uKey, kR, kG, kB);
            gl.uniform1f(uSim, Math.max(0.0, cfg2.similarity != null ? cfg2.similarity : 0.28));
            gl.uniform1f(uSm, Math.max(0.0, cfg2.smooth != null ? cfg2.smooth : 0.08));
            gl.uniform1f(uSp, Math.max(0.0, cfg2.spill != null ? cfg2.spill : 0.50));
            gl.uniform1f(uG0, Math.max(0.0, cfg2.gx0 != null ? cfg2.gx0 : 0.02));
            gl.uniform1f(uG1, Math.max(cfg2.gx0 != null ? cfg2.gx0 : 0.02, cfg2.gx1 != null ? cfg2.gx1 : 0.24));
            // 追加段は既定無効（0）: 指定時のみ有効化される
            gl.uniform1f(uZero, Math.max(0.0, cfg2.alphaZero != null ? cfg2.alphaZero : 0.0));
            gl.uniform1f(uAcut, Math.max(0.0, cfg2.alphaCut != null ? cfg2.alphaCut : 0.0));
            gl.uniform1f(uAfeather, Math.max(0.0, cfg2.alphaFeather != null ? cfg2.alphaFeather : 0.0));
            gl.uniform1f(uCdHard, Math.max(0.0, cfg2.cdHard != null ? cfg2.cdHard : 0.0));
            gl.uniform1f(uGxHard, Math.max(0.0, cfg2.gxHard != null ? cfg2.gxHard : 0.0));
            gl.uniform1f(uErode, Math.max(0.0, cfg2.erode != null ? cfg2.erode : 0.0));
            gl.uniform1f(uRg0, Math.max(0.0, cfg2.rg0 != null ? cfg2.rg0 : 0.0));
            gl.uniform1f(uRg1, Math.max(0.0, cfg2.rg1 != null ? cfg2.rg1 : 0.0));
            gl.uniform1f(uDil, Math.max(0.0, cfg2.dilate != null ? cfg2.dilate : 0.0));
            gl.uniform1f(uFill, Math.max(0.0, cfg2.fillGx != null ? cfg2.fillGx : 0.0));
            gl.uniform1f(uAFloor, Math.max(0.0, cfg2.alphaFloor != null ? cfg2.alphaFloor : 0.0));
            gl.uniform1f(uWhiteY, Math.max(0.0, Math.min(1.0, cfg2.whiteY != null ? cfg2.whiteY : 0.88)));
            gl.uniform1f(uWhiteSat, Math.max(0.0, Math.min(1.0, cfg2.whiteSat != null ? cfg2.whiteSat : 0.08)));
            gl.uniform1f(uWhiteFeather, Math.max(0.0, Math.min(1.0, cfg2.whiteFeather != null ? cfg2.whiteFeather : 0.10)));
            gl.uniform1f(uWhiteStr, Math.max(0.0, Math.min(1.0, cfg2.whiteStrength != null ? cfg2.whiteStrength : 0.9)));
            gl.uniform1f(uWhiteDespill, Math.max(0.0, Math.min(1.0, cfg2.whiteDespill != null ? cfg2.whiteDespill : 0.7)));
            gl.uniform1f(uWhiteHard, Math.max(0.0, Math.min(1.0, cfg2.whiteHard != null ? cfg2.whiteHard : 0.8)));
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._videoEl);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          } catch (_) { }
          this._chromaRAF = requestAnimationFrame(loop);
        };
        this._chromaRAF = requestAnimationFrame(loop);
      } catch (_) { }
    };
    this._stopChromaKeyPlayback = () => {
      try { if (this._chromaRAF) cancelAnimationFrame(this._chromaRAF); } catch (_) { }
      this._chromaRAF = null;
      try { if (this._chromaCanvas) this._chromaCanvas.remove(); } catch (_) { }
      this._chromaCanvas = null;
      // バックドロップを復帰
      try { if (this._videoBackdrop) this._videoBackdrop.style.display = ''; } catch (_) { }
      try { if (this._videoEl) { this._videoEl.style.visibility = ''; this._videoEl.style.pointerEvents = ''; } } catch (_) { }
      try { if (this._blackBelow) this._blackBelow.style.display = ''; } catch (_) { }
      try { if (this._layer) this._layer.style.background = (this._origLayerBg || ''); } catch (_) { }
      try { this._chromaGl = null; this._chromaProg = null; this._chromaTex = null; } catch (_) { }
    };

    // 餌箱（ミニ・ゲームHUD側）生成（投げた後の右上）
    this._spawnEsabakoMiniGame = () => {
      try {
        const host = this.root?.querySelector?.('#esabakoMiniGame');
        if (!host) return;
        if (!host.firstElementChild) {
          const wrap = document.createElement('div');
          wrap.className = 'esabako-mini-wrap';
          wrap.innerHTML = `
            <picture>
              <source srcset="assets/esabako.webp" type="image/webp" />
              <img class="esabako-img-mini" src="assets/esabako.png" alt="esabako" />
            </picture>
            <img class="ebi-img-mini" src="assets/taiwoturuebi.webp" alt="ebi" />
          `;
          host.appendChild(wrap);
          // フォールバック: ebi webp→png
          try {
            const ebi = host.querySelector('.ebi-img-mini');
            if (ebi) {
              ebi.decoding = 'async';
              const png = 'assets/taiwoturuebi.png';
              ebi.onerror = () => { if (ebi.src.endsWith('.webp')) { ebi.onerror = null; ebi.src = png; } };
            }
          } catch (_) { }
        }
        this._esabakoMiniGame = host;
        // CONTINUE直後やHUD切替直後でも現在ランクに合わせて餌箱見た目を再描画
        try {
          const rr = (this._currentBaitRank != null) ? this._currentBaitRank : (this.state?.bait?.rank || 0);
          // 修正: _refreshEsabakoForRank は存在しないため _refreshEsabakoForCurrent を使用
          this._refreshEsabakoForCurrent?.();
        } catch (_) { }
      } catch (_) { }
    };

    // 水深メーターDOM参照＆表示関数
    this._depthNowEl = this.root.querySelector('#depthNow');
    this._depthNowGameEl = this.root.querySelector('#depthNowGame');
    this._depthMaxEl = this.root.querySelector('#depthMax');
    this._maxDepthMeters = 0;
    this._fmtDepth = (m) => {
      const v = Math.max(0, Math.min(99999, Math.floor(m || 0)));
      return String(v).padStart(5, '0');
    };
    this._renderDepth = () => {
      try { if (this._depthNowEl) this._depthNowEl.textContent = this._fmtDepth(this._depthMeters || 0); } catch (_) { }
      try { if (this._depthNowGameEl) this._depthNowGameEl.textContent = this._fmtDepth(this._depthMeters || 0); } catch (_) { }
      try { if (this._depthMaxEl) this._depthMaxEl.textContent = this._fmtDepth(this._maxDepthMeters || 0); } catch (_) { }

      // Deep Sea Background Logic (4000m+)
      const d = this._depthMeters || 0;
      if (d >= 4000) {
        if (!this._isDeepMode) {
          this._isDeepMode = true;
          console.log('[DeepFisher] Entering DEEP MODE (4000m+)');
          document.body.classList.add('deep-mode');
          // Try both root and document for background video
          const bg = this.root.querySelector('.fish-bg') || document.querySelector('.fish-bg');
          if (bg) {
            bg.style.transition = 'opacity 2s ease';
            bg.style.opacity = '0';
          } else {
            console.warn('[DeepFisher] .fish-bg video not found!');
          }
          this._startDeepEffects?.();
        }
      } else {
        if (this._isDeepMode) {
          this._isDeepMode = false;
          console.log('[DeepFisher] Exiting DEEP MODE');
          document.body.classList.remove('deep-mode');
          const bg = this.root.querySelector('.fish-bg') || document.querySelector('.fish-bg');
          if (bg) {
            bg.style.transition = 'opacity 2s ease';
            bg.style.opacity = '1';
          }
          this._stopDeepEffects?.();
        }
      }


      // Periodic update moved to main loop (_startScrollBg) for constant animation
    };

    // Deep Sea Effects Implementation
    this._deepEffectsLayer = null;
    this._deepEffectTimer = 0;

    this._startDeepEffects = () => {
      if (this._deepEffectsLayer) return;
      console.log('[DeepFisher] Starting Deep Effects Layer');
      this._deepEffectsLayer = document.createElement('div');
      this._deepEffectsLayer.className = 'deep-effects-layer';

      // Inline styles to ensure visibility (Bypass CSS potential issues)
      // "White Veil" gradient matches user request
      this._deepEffectsLayer.style.background = 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(200, 240, 255, 0.2) 100%)';
      this._deepEffectsLayer.style.position = 'absolute';
      this._deepEffectsLayer.style.inset = '0';
      this._deepEffectsLayer.style.pointerEvents = 'none';

      // Insert into Scene Root, BEFORE the Frame (so Frame covers it)
      const frameEl = this.root.querySelector('.frame-svg');
      if (frameEl) {
        this.root.insertBefore(this._deepEffectsLayer, frameEl);
      } else {
        this.root.appendChild(this._deepEffectsLayer);
      }

      // Start independent cycle Loop (50ms = 20fps check)
      if (this._deepEffectInterval) clearInterval(this._deepEffectInterval);
      this._deepEffectInterval = setInterval(() => {
        this._updateDeepEffects();
      }, 50);

      // Initial burst
      for (let i = 0; i < 10; i++) this._spawnDeepParticle();
      this._spawnDeepRay?.();
    };

    this._stopDeepEffects = () => {
      if (this._deepEffectInterval) {
        clearInterval(this._deepEffectInterval);
        this._deepEffectInterval = null;
      }
      if (this._deepEffectsLayer) {
        try { if (this._deepEffectsLayer.parentNode) this._deepEffectsLayer.parentNode.removeChild(this._deepEffectsLayer); } catch (_) { }
        this._deepEffectsLayer = null;
      }
    };

    this._updateDeepEffects = () => {
      if (!this._deepEffectsLayer) return;
      this._deepEffectTimer++;

      // Spawn Particles (Marine Snow)
      if (this._deepEffectTimer % 20 === 0) { // Approx 3 times/sec at 60fps
        if (this._deepEffectsLayer.childElementCount < 50) {
          this._spawnDeepParticle();
        }
      }

      // Spawn Holy Rays
      if (Math.random() < 0.02) { // Increased freq (was 0.005)
        this._spawnDeepRay();
      }
    };

    this._spawnDeepParticle = () => {
      if (!this._deepEffectsLayer) return;
      const p = document.createElement('div');
      p.className = 'deep-particle';
      const size = 2 + Math.random() * 4;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.bottom = `-20px`; // Start below
      p.style.animationDuration = `${5 + Math.random() * 5}s`;
      this._deepEffectsLayer.appendChild(p);

      // Cleanup
      setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 10000);
    };

    this._spawnDeepRay = () => {
      if (!this._deepEffectsLayer) return;
      console.log('[DEBUG] Spawning Deep Ray');
      const r = document.createElement('div');
      r.className = 'deep-ray';
      r.style.left = `${Math.random() * 100}%`;
      r.style.width = `${40 + Math.random() * 100}px`;
      r.style.animationDuration = `${4 + Math.random() * 4}s`;
      this._deepEffectsLayer.appendChild(r);

      // Cleanup
      setTimeout(() => { if (r.parentNode) r.parentNode.removeChild(r); }, 8000);
    };
    this._renderDepth();

    // フルスクリーン枠適用（アクアリウム以外で共通）
    document.body.classList.add('frame-full');

    // クリックイベント
    this.onBack = () => {
      try { this._stopBgm?.(); } catch (_) { }
      // Stop persistent boss music
      try { if (this._bossSfx) { this._bossSfx.pause(); this._bossSfx = null; } } catch (_) { }
      // Reset Deep Mode
      if (this._isDeepMode) {
        this._isDeepMode = false;
        try { document.body.classList.remove('deep-mode'); } catch (_) { }
        try { const bg = this.root.querySelector('.fish-bg'); if (bg) bg.style.opacity = '1'; } catch (_) { }
        this._stopDeepEffects?.();
      }
      this.manager.goTo('title');
    };
    this._btnBack = this.root.querySelector('#btnBack');
    if (this._btnBack) this._btnBack.addEventListener('click', this.onBack);
    // ESCキーでタイトルへ戻る
    this._onKeyDown = (ev) => {
      try {
        const k = ev.key || ev.code;
        if (k === 'Escape' || k === 'Esc') {
          ev.preventDefault?.();
          this.onBack?.();
        }
      } catch (_) { }
    };
    window.addEventListener('keydown', this._onKeyDown);
    // 戻るボタンの表示/非表示
    this._setBackVisible = (v) => {
      try { if (this._btnBack) this._btnBack.style.display = v ? '' : 'none'; } catch (_) { }
    };
    // トップセットのアニメーション
    this._animateTopSet = () => {
      try {
        const items = this.root.querySelectorAll('.topset-item');
        let delay = 0;
        items.forEach((el) => {
          el.style.animationDelay = `${delay}s`;
          el.classList.add('enter');
          delay += 0.05;
        });

        // 動画メタデータ（videoWidth/Height）が得られるのを待つ
        this._waitForVideoMeta = (timeoutMs = 1200) => new Promise((resolve) => {
          const v = this._videoEl; if (!v) { resolve(); return; }
          try {
            if ((v.videoWidth || 0) > 0 && (v.videoHeight || 0) > 0) { resolve(); return; }
          } catch (_) { }
          let to = null;
          const done = () => { try { v.removeEventListener('loadedmetadata', onMeta); } catch (_) { }; if (to) clearTimeout(to); resolve(); };
          const onMeta = () => done();
          try { v.addEventListener('loadedmetadata', onMeta, { once: true }); } catch (_) { }
          try { to = setTimeout(done, timeoutMs); } catch (_) { }
        });

      } catch (_) { }
    };

    // トップセットを引き上げて非表示
    this._hideTopset = () => {
      try {
        const group = this.root.querySelector('#topsetGroup');
        if (!group || group.style.display === 'none') return;
        const items = group.querySelectorAll('.topset-item');
        items.forEach(el => { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('exit'); });
        setTimeout(() => { try { group.style.display = 'none'; } catch (_) { } }, 380);
      } catch (_) { }
    };

    // ゲームHUDを表示（左:現在水深 / 右:餌箱）
    this._showGameHud = () => {
      try {
        const hud = this.root.querySelector('#gameHud');
        if (!hud) return;
        hud.style.display = '';
        // 餌箱（ゲーム用）生成
        this._spawnEsabakoMiniGame?.();
        // アニメ入場
        const items = hud.querySelectorAll('.topset-item');
        let delay = 0;
        items.forEach((el) => { el.style.animationDelay = `${delay}s`; el.classList.add('enter'); delay += 0.03; });
        // 表示直後に水深を即時反映
        this._renderDepth?.();
      } catch (_) { }
    };
    // 餌が可視になったタイミングでHUDを表示
    this._showHudWhenBaitVisible = () => {
      try {
        const check = (tries = 0) => {
          const isGame = !!this._gameActive;
          let baitVisible = false;
          try {
            const el = this._bait?.el;
            if (el) {
              const cs = window.getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              baitVisible = cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && el.isConnected;
            }
          } catch (_) { }
          if (isGame && baitVisible) { this._showGameHud?.(); return; }
          if (tries > 60) { this._showGameHud?.(); return; } // ~1秒でフォールバック
          requestAnimationFrame(() => check(tries + 1));
        };
        check(0);
      } catch (_) { this._showGameHud?.(); }
    };
    // 初期は「動画画面」なので表示
    this._setBackVisible(true);
    // 設定反映→BGM開始（固定0.7秒ディレイ）
    this._applySettings?.();
    this._bgmDelaySec = 0.7;
    try { if (this._bgmDelayedTimer) { clearTimeout(this._bgmDelayedTimer); this._bgmDelayedTimer = null; } } catch (_) { }
    this._bgmDelayedTimer = setTimeout(() => { try { this._startBgm?.(); } catch (_) { } }, Math.floor(this._bgmDelaySec * 1000));

    // 動画エラーフォールバック
    const video = this.root.querySelector('#introVideo');
    // 動画の直後ろに黒背景を挿入（videoの直前に置く）
    const fishBgEl = this.root.querySelector('.fish-bg');
    this._videoBackdrop = document.createElement('div');
    this._videoBackdrop.className = 'video-backdrop';
    if (fishBgEl && video) fishBgEl.insertBefore(this._videoBackdrop, video);
    this._fishBg = fishBgEl;
    // 動画スケール（>1 でズームイン、<1 でズームアウト）
    const VIDEO_SCALE = 1.26; // クラーケン時はさらに拡大
    // 通常時とクラーケン再生時のYオフセット（px）
    const DEFAULT_VIDEO_OFFSET_Y_PX = -120; // 通常は上へ持ち上げ（従来値）
    const KRAKEN_VIDEO_OFFSET_Y_PX = -40;   // クラーケン時のみさらに上げて上の空白を解消
    this._videoRatio = null;
    if (video) {
      // フルカバー（トリミング）で常に画面全体にフィット（縮小ではなくクロップ）
      Object.assign(video.style, {
        position: 'absolute', left: '0px', top: '0px', right: '0px', bottom: '0px', transform: 'none',
        width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center',
        // 下端を黒にフェード（黒下敷きとブレンド）
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(255,255,255,1) 94%, rgba(255,255,255,0) 100%)',
        maskImage: 'linear-gradient(to bottom, rgba(255,255,255,1) 94%, rgba(255,255,255,0) 100%)',
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%'
      });

      // 餌本体を少しだけ上方向へ持ち上げる（短い引き上げ演出）
      this._liftBaitShort = () => new Promise((resolve) => {
        try {
          const r = this._safe?.getBoundingClientRect();
          const bx = this._baitPosX ?? (() => { const br = this._bait?.getBounds?.(); return br ? (br.left - r.left + br.width / 2) : (r?.width ?? 0) / 2; })();
          const by = this._baitPosY ?? (() => { const br = this._bait?.getBounds?.(); return br ? (br.top - r.top + br.height / 2) : (r?.height ?? 0) / 2; })();
          const lift = Math.min((r?.height || 240) * 0.08, 48);
          const y0 = by; const y1 = Math.max(0, y0 - lift);
          const dur = 260; const start = performance.now();
          const step = (t) => {
            const p = Math.min(1, (t - start) / dur); const ease = 1 - Math.pow(1 - p, 3);
            const y = y0 + (y1 - y0) * ease;
            try { this._bait?.setPosition?.(bx, y); } catch (_) { }
            this._baitPosX = bx; this._baitTargetX = bx;
            this._baitPosY = y; this._baitTargetY = y;
            if (p < 1) requestAnimationFrame(step); else resolve();
          };
          requestAnimationFrame(step);
        } catch (_) { resolve(); }
      });

      // 動画下端1pxを縦方向へストレッチして下敷きへ描画
      this._paintBlackBelowStrip = () => {
        try {
          // クロマキー再生中は下敷きに緑のストリップを描かない（完全に黒でOK）
          if (this._specialChromaKey) {
            try {
              if (this._blackBelowCanvas) {
                const ctx = this._blackBelowCanvas.getContext('2d');
                if (ctx) { ctx.clearRect(0, 0, this._blackBelowCanvas.width, this._blackBelowCanvas.height); }
              }
            } catch (_) { }
            try { this._lastBottomColor = { r: 0, g: 0, b: 0 }; } catch (_) { }
            try { if (this._videoBackdrop) { this._videoBackdrop.style.background = '#000'; } } catch (_) { }
            return;
          }
          const v = this._videoEl, c = this._blackBelowCanvas; if (!v || !c) return;
          const vw = v.videoWidth || 0, vh = v.videoHeight || 0; if (!vw || !vh) return;
          const ctx = c.getContext('2d', { willReadFrequently: true }); if (!ctx) return;
          // 1pxラインを全域に引き伸ばす
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, c.width, c.height);
          ctx.drawImage(v, 0, vh - 1, vw, 1, 0, 0, c.width, c.height);
          // 最上段1行から平均色を算出（横方向平均）
          try {
            const row = ctx.getImageData(0, 0, c.width, 1).data;
            let r = 0, g = 0, b = 0, n = c.width;
            for (let i = 0; i < row.length; i += 4) { r += row[i]; g += row[i + 1]; b += row[i + 2]; }
            if (n > 0) {
              this._lastBottomColor = {
                r: Math.round(r / n),
                g: Math.round(g / n),
                b: Math.round(b / n)
              };
              // 任意: CSSカスタムプロパティにも反映
              this._layer?.style.setProperty('--video-bottom-color', `rgb(${this._lastBottomColor.r}, ${this._lastBottomColor.g}, ${this._lastBottomColor.b})`);
              // 動画の直後ろバックドロップに平均色を適用
              if (this._videoBackdrop) {
                const col = `rgb(${this._lastBottomColor.r}, ${this._lastBottomColor.g}, ${this._lastBottomColor.b})`;
                this._videoBackdrop.style.background = col;
                this._videoBackdrop.style.backgroundImage = 'none';
              }
            }
          } catch (_) { }
        } catch (_) { /* ignore */ }
      };

      // 起点（アンカー）方向へ一直線に引き上げて、yTopで止める
      this._pullBaitTowardAnchorLine = (durationMs = 180, yTop = -40) => new Promise((resolve) => {
        try {
          if (!this._safe || !this._bait) { resolve(); return; }
          const r = this._safe.getBoundingClientRect();
          // 現在位置
          const x0 = (this._baitPosX != null) ? this._baitPosX : Math.floor(r.width / 2);
          const y0 = (this._baitPosY != null) ? this._baitPosY : Math.floor(r.height / 2);
          // アンカー座標
          const ax = (this._ropeAnchorX == null) ? (r.width / 2) : this._ropeAnchorX;
          const ay = (this._ropeAnchorY ?? -240);
          // 目標: 直線S->A上で y = yTop となる点
          let t = (yTop - y0) / ((ay - y0) || 1e-6);
          // 0..1にクランプ（異常時はフォールバックとして真上）
          if (!isFinite(t) || t <= 0 || t > 1.2) { this._pullBaitUpStraight?.(durationMs); setTimeout(resolve, durationMs); return; }
          const x1 = x0 + (ax - x0) * t;
          const y1 = yTop;
          const start = performance.now();
          const step = (tms) => {
            const p = Math.min(1, (tms - start) / Math.max(1, durationMs));
            const ease = 1 - Math.pow(1 - p, 3);
            const x = x0 + (x1 - x0) * ease;
            const y = y0 + (y1 - y0) * ease;
            this._baitPosX = x; this._baitTargetX = x;
            this._baitPosY = y; this._baitTargetY = y;
            this._bait.setPosition(x, y);
            if (p < 1) requestAnimationFrame(step); else resolve();
          };
          requestAnimationFrame(step);
        } catch (_) { resolve(); }
      });

      // ヒット直後の「一瞬下へ引っ張られる」演出
      this._tugBaitDown = (distancePx = 28, durationMs = 110) => new Promise((resolve) => {
        try {
          if (!this._safe || !this._bait) { resolve(); return; }
          const r = this._safe.getBoundingClientRect();
          const x0 = (this._baitPosX != null) ? this._baitPosX : Math.floor(r.width / 2);
          const y0 = (this._baitPosY != null) ? this._baitPosY : Math.floor(r.height / 2);
          const y1 = y0 + Math.max(6, distancePx);
          const start = performance.now();
          const step = (tms) => {
            const p = Math.min(1, (tms - start) / Math.max(1, durationMs));
            // easeOutCubic
            const ease = 1 - Math.pow(1 - p, 3);
            const y = y0 + (y1 - y0) * ease;
            this._baitPosX = x0; this._baitTargetX = x0;
            this._baitPosY = y; this._baitTargetY = y;
            this._bait.setPosition(x0, y);
            if (p < 1) requestAnimationFrame(step); else resolve();
          };
          requestAnimationFrame(step);
        } catch (_) { resolve(); }
      });

      // 糸を張って浮きを上昇させる簡易アニメ
      this._playTautAndFloatAnim = () => new Promise((resolve) => {
        try {
          // ロープを強めに、海流は抑制
          const prev = { it: this._ropeIters, dp: this._ropeDamp, cf: this._water?.currentForce };
          this._ropeIters = 20; this._ropeDamp = 0.9995;
          if (this._water) this._water.currentForce = 0;
          // 浮きを表示＆位置合わせ
          this._positionFloat?.();
          if (this._floatEl) this._floatEl.style.display = 'block';
          // 300msで浮きを上方向へ引き上げ
          const start = performance.now();
          const r = this._safe?.getBoundingClientRect();
          const y0 = this._floatEl ? parseFloat(this._floatEl.style.top || '6') || 6 : 6;
          const lift = Math.min((r?.height || 240) * 0.08, 40); // 最大40px持ち上げ
          const dur = 320;
          const step = (t) => {
            const p = Math.min(1, (t - start) / dur);
            const ease = 1 - Math.pow(1 - p, 3);
            if (this._floatEl) this._floatEl.style.top = `${Math.max(-20, y0 - lift * ease)}px`;
            if (p < 1) {
              requestAnimationFrame(step);
            } else {
              // 値を戻す
              this._ropeIters = prev.it; this._ropeDamp = prev.dp;
              if (this._water) this._water.currentForce = prev.cf;
              // 浮きは少し間を置いて非表示
              setTimeout(() => { if (this._floatEl) this._floatEl.style.display = 'none'; resolve(); }, 80);
            }
          };
          requestAnimationFrame(step);
        } catch (_) { resolve(); }
      });

      // 公開: 動画最下ピクセル（横方向平均）の現在色を返す
      this.getVideoBottomAverageColor = () => {
        try {
          this._paintBlackBelowStrip?.();
          return this._lastBottomColor || null;
        } catch (_) { return null; }
      };
      this._onVideoMeta = () => {
        const vw = video.videoWidth || 16; const vh = video.videoHeight || 9;
        this._videoRatio = vw / vh;
        // メタデータ取得後に一度採色して適用
        this._paintBlackBelowStrip?.();
      };
      video.addEventListener('loadedmetadata', this._onVideoMeta);
    }
    // 動画アニメ用のオフセット（px）
    this._videoAnimY = 0;
    this._videoTriedAlt = false;
    this._awaitingRestart = false;
    this._lockBaitPos = false;
    this._skipPreTautFlow = false;
    this._getPatternIdx = 0;
    this._krakenEscapeCount = 0;
    this._krakenTriggered = false;
    // クラーケン閾値（デフォルト100）。デバッグ時は URL パラメータで上書き可能: ?kraken=3 など
    this._krakenThreshold = (() => {
      try {
        const usp = new URLSearchParams(location.search || '');
        let v = parseInt(usp.get('kraken') || usp.get('krakenThreshold') || '');
        if (!Number.isFinite(v) || v <= 0) {
          try { const ls = (typeof localStorage !== 'undefined') ? localStorage.getItem('df.krakenThresholdOverride') : null; if (ls) { const t = parseInt(ls); if (Number.isFinite(t) && t > 0) v = t; } } catch (_) { }
        }
        if (Number.isFinite(v) && v > 0) return v;
      } catch (_) { }
      return 70;
    })();
    // デバッグ: 二回目以降もクラーケン可（?krakenMulti=1 など）
    this._krakenMulti = (() => {
      try {
        const usp = new URLSearchParams(location.search || '');
        const v = usp.get('krakenMulti') || usp.get('krakenAgain') || usp.get('debugKraken') || usp.get('kdebug');
        return (v != null && String(v).toLowerCase() !== '0' && String(v).toLowerCase() !== 'false');
      } catch (_) { return false; }
    })();
    // デバッグ: 深度上限の上書き（デフォルト1000）
    this._krakenDepthLimit = (() => {
      try { const usp = new URLSearchParams(location.search || ''); const v = parseInt(usp.get('krakenDepth') || usp.get('krakenDepthLimit') || ''); return (Number.isFinite(v) && v > 0) ? v : 1000; } catch (_) { return 1000; }
    })();
    // デバッグ: ロープ当たり判定の太さ（デフォルト8）
    this._krakenRopeHitRadius = (() => {
      try { const usp = new URLSearchParams(location.search || ''); const v = parseInt(usp.get('krakenRadius') || usp.get('krakenRopeRadius') || ''); return (Number.isFinite(v) && v > 0) ? v : 8; } catch (_) { return 8; }
    })();
    // デバッグ: ゲーム開始後に自動発火
    this._krakenAuto = (() => {
      try { const usp = new URLSearchParams(location.search || ''); const v = usp.get('krakenAuto') || usp.get('forceKraken') || usp.get('kauto'); return (v != null && String(v).toLowerCase() !== '0' && String(v).toLowerCase() !== 'false'); } catch (_) { return false; }
    })();
    // クラーケン専用の仮想スロット（ランクに依存しない非使用スロット）
    this._krakenSlotRank = -9999;
    this._specialGetVideoSrc = null;
    this._specialGetWaitForEnd = false;
    this._globalFishCollisionsDisabled = false;
    this._specialChromaKey = null; // { src, keyR,keyG,keyB (0..1), similarity, smooth, spill }
    this._isKrakenVideoActive = false; // クラーケン動画再生中のみ true（レイアウト補正用）
    this.onVideoError = () => {
      // 一度だけ、同一パスで再試行（キャッシュや一時エラー回避）
      if (video && !this._videoTriedAlt) {
        this._videoTriedAlt = true;
        // MP4 へ明示フォールバック
        video.src = 'assets/turigamennsyoki.mp4';
        video.load();
        video.play?.().catch(() => { });
        return;
      }
      const warn = document.createElement('div');
      warn.className = 'small';
      warn.style.position = 'absolute';
      warn.style.left = '50%';
      warn.style.top = '50%';
      warn.style.transform = 'translate(-50%, -50%)';
      warn.style.background = 'rgba(0,0,0,0.35)';
      warn.style.padding = '8px 12px';
      warn.style.borderRadius = '8px';
      warn.textContent = '動画アセット（assets/turigamennsyoki.mp4）が見つからないか再生できません。';
      this.root.querySelector('.fish-layer').appendChild(warn);
    };
    if (video) {
      video.addEventListener('error', this.onVideoError);
      // 初期は自動再生（muted+autoplay 許可）
      video.muted = true;
      try { video.play?.(); } catch (_) { }
    }

    // フレーム: SVGマスクで中央をくり抜く（16:9）
    const layer = this.root.querySelector('.fish-layer');
    const svgHost = this.root.querySelector('.frame-svg');
    svgHost.style.visibility = 'hidden';
    svgHost.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <mask id="df-fish-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect x="0" y="0" width="100%" height="100%" fill="white"/>
            <rect id="df-fish-hole" x="0" y="0" width="0" height="0" fill="black"/>
          </mask>
          <!-- Heat Haze Turbulance Filter -->
          <filter id="df-heat-haze">
            <feTurbulence type="turbulence" baseFrequency="0.015 0.005" numOctaves="2" result="turbulence" seed="0" />
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="12" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <image id="df-fish-frame" x="0" y="0" width="100%" height="100%" href="assets/frame1.webp" preserveAspectRatio="xMidYMid slice" mask="url(#df-fish-mask)"/>
      </svg>
    `;
    // frame1.webp が無い環境では png にフォールバック
    try {
      const frameImgEl = svgHost.querySelector('#df-fish-frame');
      const probe = new Image();
      probe.onload = () => { };
      probe.onerror = () => { try { frameImgEl?.setAttribute('href', 'assets/frame1.png'); } catch (_) { } };
      probe.src = 'assets/frame1.webp';
    } catch (_) { }

    const safe = this.root.querySelector('.safe-viewport');
    // 参照を保持（unmount用）
    this._layer = layer;
    this._safe = safe;
    this._videoEl = video;
    this._gameActive = false; // ゲーム進行中（当たり判定ON）
    try { this._initComboSystem?.(); } catch (_) { }

    // TAPガイド（投げる前の点滅）
    this._tapGuideEl = document.createElement('img');
    this._tapGuideEl.className = 'tap-guide';
    this._tapGuideEl.decoding = 'async';
    this._tapGuideEl.alt = 'TAP';
    this._tapGuideEl.onerror = () => {
      if (this._tapGuideEl && this._tapGuideEl.src.endsWith('.webp')) {
        this._tapGuideEl.onerror = null; this._tapGuideEl.src = 'assets/TAP.png';
      }
    };
    this._tapGuideEl.src = 'assets/TAP.webp';
    if (this._safe) this._safe.appendChild(this._tapGuideEl);
    try { this._tapGuideEl.style.display = 'none'; } catch (_) { }
    this._showTapGuide = () => { try { if (this._tapGuideEl) this._tapGuideEl.style.display = ''; } catch (_) { } };
    this._hideTapGuide = () => { try { if (this._tapGuideEl) this._tapGuideEl.style.display = 'none'; } catch (_) { } };

    // 付加レイヤー準備
    // 動画のすぐ下を黒で埋める下敷き
    this._blackBelow = document.createElement('div');
    this._blackBelow.className = 'black-below';
    layer.appendChild(this._blackBelow);
    // 下敷き描画用キャンバス（ボトムピクセル拡張）
    this._blackBelowCanvas = document.createElement('canvas');
    this._blackBelowCanvas.className = 'black-below-canvas';
    Object.assign(this._blackBelowCanvas.style, { display: 'block', width: '100%', height: '100%' });
    this._blackBelow.appendChild(this._blackBelowCanvas);
    // フェード（黒）
    this._fade = document.createElement('div');
    this._fade.className = 'fade-overlay';
    layer.appendChild(this._fade);
    try { this._fade.style.display = 'none'; } catch (_) { }
    // バブルキャンバス
    this._bubbleCanvas = document.createElement('canvas');
    this._bubbleCanvas.className = 'bubble-canvas';
    layer.appendChild(this._bubbleCanvas);
    // セーフエリア内スクロール背景（ゲーム画面）
    // 先に黒背景レイヤー（黒画像相当）
    this._gameBlackBg = document.createElement('div');
    this._gameBlackBg.className = 'game-bg-black';
    try {
      Object.assign(this._gameBlackBg.style, {
        position: 'absolute', left: '0', top: '0', width: '100%', height: '100%',
        background: '#000', zIndex: '0', pointerEvents: 'none'
      });
    } catch (_) { }
    safe.appendChild(this._gameBlackBg);
    this._scrollBg = document.createElement('div');
    this._scrollBg.className = 'game-scroll';
    // いったん追加は後回し（far/mid を配置した後に最前面へ移動）
    // スクロール画像の縦横比（高さ/幅）を取得
    this._scrollRatioHPerW = null;
    const _scrollImg = new Image();
    _scrollImg.onload = () => {
      this._scrollRatioHPerW = _scrollImg.naturalHeight / _scrollImg.naturalWidth;
      // レイアウトに反映
      if (typeof updateMaskHole === 'function') updateMaskHole();
    };
    _scrollImg.src = 'assets/game_start_2.png';
    this._scrollProbe = _scrollImg;
    // パララックス: 既存near層（ループ）をベースに、中面/後面を追加
    try { this._scrollBg.style.animation = 'none'; } catch (_) { }
    // 後面レイヤー（far）
    this._scrollFarLayer = document.createElement('div');
    Object.assign(this._scrollFarLayer.style, { position: 'absolute', inset: '0', display: 'none', pointerEvents: 'none', zIndex: '1', overflow: 'hidden' });
    this._scrollFarImg = new Image();
    try { this._scrollFarImg.decoding = 'async'; } catch (_) { }
    this._scrollFarImg.alt = 'far-bg';
    Object.assign(this._scrollFarImg.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: 'auto', transform: 'translateY(100%)', willChange: 'transform' });
    this._scrollFarImg.src = 'assets/area_kura-ken2.png';
    this._scrollFarLayer.appendChild(this._scrollFarImg);
    // 中面レイヤー（mid）
    this._scrollMidLayer = document.createElement('div');
    Object.assign(this._scrollMidLayer.style, { position: 'absolute', inset: '0', display: 'none', pointerEvents: 'none', zIndex: '1', overflow: 'hidden' });
    this._scrollMidImg = new Image();
    try { this._scrollMidImg.decoding = 'async'; } catch (_) { }
    this._scrollMidImg.alt = 'mid-bg';
    Object.assign(this._scrollMidImg.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: 'auto', transform: 'translateY(100%)', willChange: 'transform' });
    this._scrollMidImg.src = 'assets/area_kura-ken1.png';
    this._scrollMidLayer.appendChild(this._scrollMidImg);

    // --- Megalodon Area Layers (1000m-2000m) ---
    // Far Layer Mega
    this._scrollFarLayerMega = document.createElement('div');
    Object.assign(this._scrollFarLayerMega.style, { position: 'absolute', inset: '0', display: 'none', pointerEvents: 'none', zIndex: '1', overflow: 'hidden' });
    this._scrollFarImgMega = new Image();
    try { this._scrollFarImgMega.decoding = 'async'; } catch (_) { }
    this._scrollFarImgMega.alt = 'far-bg-mega';
    Object.assign(this._scrollFarImgMega.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: 'auto', transform: 'translateY(100%)', willChange: 'transform' });
    this._scrollFarImgMega.src = 'assets/area_megarodon2.png';
    this._scrollFarLayerMega.appendChild(this._scrollFarImgMega);

    // Mid Layer Mega
    this._scrollMidLayerMega = document.createElement('div');
    Object.assign(this._scrollMidLayerMega.style, { position: 'absolute', inset: '0', display: 'none', pointerEvents: 'none', zIndex: '1', overflow: 'hidden' });
    this._scrollMidImgMega = new Image();
    try { this._scrollMidImgMega.decoding = 'async'; } catch (_) { }
    this._scrollMidImgMega.alt = 'mid-bg-mega';
    Object.assign(this._scrollMidImgMega.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: 'auto', transform: 'translateY(100%)', willChange: 'transform' });
    this._scrollMidImgMega.src = 'assets/area_megarodon1.png';
    this._scrollMidLayerMega.appendChild(this._scrollMidImgMega);

    // --- Fuji Area Layer (2000m-3000m) ---
    this._scrollLayerFuji = document.createElement('div');
    Object.assign(this._scrollLayerFuji.style, { position: 'absolute', inset: '0', display: 'none', pointerEvents: 'none', zIndex: '1', overflow: 'hidden' });
    this._scrollImgFuji = new Image();
    try { this._scrollImgFuji.decoding = 'async'; } catch (_) { }
    this._scrollImgFuji.alt = 'bg-fuji';
    Object.assign(this._scrollImgFuji.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: 'auto', transform: 'translateY(100%)', willChange: 'transform' });
    this._scrollImgFuji.src = 'assets/area_fujisan.png';
    this._scrollLayerFuji.appendChild(this._scrollImgFuji);

    // --- Cthulhu Area Layer (3000m-4000m) ---
    this._scrollCthulhuLayer = document.createElement('div');
    Object.assign(this._scrollCthulhuLayer.style, { position: 'absolute', inset: '0', display: 'none', pointerEvents: 'none', zIndex: '1', overflow: 'hidden' });
    this._scrollCthulhuImg = new Image();
    try { this._scrollCthulhuImg.decoding = 'async'; } catch (_) { }
    this._scrollCthulhuImg.alt = 'bg-cthulhu';
    Object.assign(this._scrollCthulhuImg.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: 'auto', transform: 'translateY(100%)', willChange: 'transform' });
    this._scrollCthulhuImg.src = 'assets/area_cthulhu.png';
    this._scrollCthulhuLayer.appendChild(this._scrollCthulhuImg);

    // 近景（near）は既存の this._scrollBg を利用し、z-indexを明示
    try { this._scrollBg.style.zIndex = '1'; } catch (_) { }
    // 追加レイヤーをセーフエリアに配置（blackの上）
    safe.appendChild(this._scrollFarLayer);
    safe.appendChild(this._scrollMidLayer);
    safe.appendChild(this._scrollFarLayerMega);
    safe.appendChild(this._scrollMidLayerMega);
    safe.appendChild(this._scrollLayerFuji);
    safe.appendChild(this._scrollCthulhuLayer);
    // Red Heat Overlay (2000m-3000m)
    this._heatOverlay = document.createElement('div');
    Object.assign(this._heatOverlay.style, {
      position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '5',
      background: 'radial-gradient(circle, rgba(255, 60, 0, 0.15) 20%, rgba(255, 0, 0, 0.4) 100%)',
      mixBlendMode: 'overlay', opacity: '0', transition: 'opacity 0.5s ease', display: 'none'
    });
    safe.appendChild(this._heatOverlay);
    // near を最後に追加して背景層の最前面に（魚は z-index:3 でさらに上）
    safe.appendChild(this._scrollBg);
    // レイヤーのサイズスケール（ユーザー要望）
    this._farScale = 0.9; // 後面は少し小さく
    this._midScale = 1.8; // 中面をさらに大きく
    // 後面の仮想深度オフセット（-200mから出始めるイメージで+200m進める）
    this._farDepthOffsetMeters = 200;
    // 餌（Baitオブジェクト）: 従来通りランプ餌（マウス追従用の見た目）
    this._bait = new Bait({
      parent: safe,
      initialType: { id: 'lampbait', name: 'ランプ餌', rank: 0, src: 'assets/lampbait.png' }
    });
    this._bait.mount();
    // 餌を発光させる（ランプ系の柔らかい光）
    try { this._bait?.el?.classList?.add('glow'); } catch (_) { }
    // 糸（ロープ）キャンバス（餌の下に配置）
    this._ropeCanvas = document.createElement('canvas');
    this._ropeCanvas.className = 'rope-canvas';
    Object.assign(this._ropeCanvas.style, { position: 'absolute', inset: '0', zIndex: '6', pointerEvents: 'none', display: 'none' });
    this._ropeEnabled = false; // 動画中は表示しない
    this._ropeAnchorY = -240; // 起点をさらに上（画面外）へ
    this._ropeAnchorX = null; // null=自動的にセーフ中央
    if (this._bait?.el?.parentNode) this._bait.el.parentNode.insertBefore(this._ropeCanvas, this._bait.el);
    // 浮き（上端付近に表示、通常は非表示）
    this._initFloat = () => {
      if (!this._safe) return;
      if (this._floatEl) return;
      const f = document.createElement('div');
      f.className = 'float-bob';
      f.style.display = 'none';
      this._safe.appendChild(f);
      this._floatEl = f;
      this._positionFloat?.();
    };
    this._positionFloat = () => {
      if (!this._floatEl || !this._safe) return;
      const r = this._safe.getBoundingClientRect();
      const x = Math.floor(r.width / 2);
      this._floatEl.style.left = `${x}px`;
      this._floatEl.style.top = `6px`;
    };
    // 海水パラメータ（浮力・海流・うねり）
    this._water = {
      // 浮力（0..1）: 値が大きいほど有効重力が小さくなる
      buoyancy: 0.9,
      // 横方向の海流: 振幅/周波数/位相速度
      currentForce: 160,
      currentFreq: 0.18,
      currentPhaseSpeed: 0.7,
      // 縦方向のうねり（浮力に乗る上下動の加速度成分）
      swellForce: 200,
      swellFreq: 0.4
    };
    // ロープ剛性（可変）
    this._ropeDamp = 0.998;
    this._ropeIters = 10;
    this._waterPhase = 0;
    // デバッグ: ヒットボックス可視化キャンバス
    if (this.root.classList.contains('debug-colliders')) {
      this._hitboxCanvas = document.createElement('canvas');
      this._hitboxCanvas.className = 'hitbox-canvas';
      this._hitboxCanvas.style.position = 'absolute';
      this._hitboxCanvas.style.inset = '0';
      this._hitboxCanvas.style.zIndex = '7';
      this._hitboxCanvas.style.pointerEvents = 'none';
      safe.appendChild(this._hitboxCanvas);
    }
    // マウス慣性追従
    this._baitFollowAlpha = 0.2; // 0..1 大きいほど速く追従
    this._baitTargetX = null; this._baitTargetY = null;
    this._baitPosX = null; this._baitPosY = null;
    // マウス（ポインタ）追従
    this._onPointerMove = (ev) => {
      if (!this._safe || !this._bait?.setPosition) return;
      // GET中・ロック中はポインタ追従を停止（真上に引き上げを維持）
      if (this._handlingGet || this._lockBaitPos) return;
      const r = this._safe.getBoundingClientRect();
      const x = Math.max(0, Math.min(ev.clientX - r.left, r.width));
      const y = Math.max(0, Math.min(ev.clientY - r.top, r.height));
      this._baitTargetX = x; this._baitTargetY = y;
      // 初回はワープ
      if (this._baitPosX == null || this._baitPosY == null) {
        this._baitPosX = x; this._baitPosY = y;
        this._bait.setPosition(x, y);
      }
    };
    // 上部UI帯（.fish-topbar）上でも追従させるため、レイヤーにバインド
    layer.addEventListener('pointermove', this._onPointerMove);
    layer.addEventListener('pointerdown', this._onPointerMove);
    // 慣性ループ
    this._baitFollowStep = (t) => {
      const now = t || performance.now();
      const last = this._lastBaitFollowT || now; this._lastBaitFollowT = now;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      // GET中/ロック中/ゲーム非アクティブ時は慣性追従を停止
      if (!(this._handlingGet || this._lockBaitPos || !this._gameActive)) {
        if (this._baitTargetX != null && this._baitTargetY != null && this._baitPosX != null && this._baitPosY != null) {
          const a = this._baitFollowAlpha;
          this._baitPosX += (this._baitTargetX - this._baitPosX) * a;
          this._baitPosY += (this._baitTargetY - this._baitPosY) * a;
          this._bait.setPosition(this._baitPosX, this._baitPosY);
        }
      }
      // ロープ更新・描画
      this._updateRope?.(dt);
      this._drawRope?.();
      this._baitFollowRaf = requestAnimationFrame(this._baitFollowStep);
    };
    this._baitFollowRaf = requestAnimationFrame(this._baitFollowStep);
    // 魚データ読み込み（ローマ字ID、ランク、ムーブプリセット）
    this._fishData = null;
    this._movementPresets = null;
    this._loadFishData = async () => {
      console.log('[DEBUG] _loadFishData started');
      try {
        // タイトル側プリロードを優先
        const pre = (typeof window !== 'undefined' && window.__df_preloads && window.__df_preloads.fishData) ? window.__df_preloads.fishData : null;
        let data = pre;
        if (!data) {
          const res = await fetch('src/data/fish.json', { cache: 'no-store' });
          if (!res.ok) throw new Error('fish.json load failed');
          data = await res.json();
        }
        this._fishData = data?.fish || [];
        this._movementPresets = data?.movementPresets || {};
        // baitTypes から ebi を優先適用（sprite→src マッピング）。無ければ現状維持
        const toType = (b) => b ? ({ id: b.id, name: b.name_ja || b.id, rank: Number(b.rank || 0), src: b.src || b.sprite }) : null;
        const ebi = (data?.baitTypes || []).find(b => b.id === 'ebi');
        const first = (data?.baitTypes || [])[0];
        const chosen = toType(ebi) || toType(first);
        if (chosen) {
          // マウス追従の餌見た目は変更しない。
          // 餌箱を更新するのは START（新規）時のみ。CONTINUE はセーブの餌を優先。
          if (this._mode === 'start') this._setEsabakoSprite?.(chosen.src, chosen.name);
        }
        // インデックスを再構築し、現在ランクで初期化
        try { this._fishByRank = null; this._rankList = null; } catch (_) { }
        try {
          this._buildFishIndex?.();
          this._buildFishIndex?.();
          console.log('[DEBUG] _loadFishData: built index. availableBaits length=', this._availableBaits?.length);
          // 餌の初期化・復元
          console.log('[DEBUG] _loadFishData: mode=', this._mode, 'state.bait=', JSON.stringify(this.state?.bait));
          if (this._mode === 'start') {
            // スタート時は強制的にエビ
            this._setBaitByIndex?.(0);
            SaveManager.setBait?.(this.state, 'ebi', 0);
          } else {
            // コンティニュー時は保存されたIDから復元
            const targetId = this.state?.bait?.id || 'ebi';
            console.log('[DEBUG] restoring bait:', targetId);
            let idx = this._availableBaits?.findIndex(b => b.id === targetId);

            // IDで見つからない場合、ランクで探す（救済措置）
            if (idx < 0 && typeof this.state?.bait?.rank === 'number') {
              console.log('[DEBUG] ID not found, fallback to rank:', this.state.bait.rank);
              idx = this._availableBaits?.findIndex(b => b.rank === this.state.bait.rank);
            }

            console.log('[DEBUG] found index:', idx);
            if (idx >= 0) {
              this._setBaitByIndex?.(idx);
            }
          }
        } catch (_) { }
      } catch (e) { console.warn('fish.json load error', e); }
    };
    const hole = svgHost.querySelector('#df-fish-hole');
    const maskEl = svgHost.querySelector('#df-fish-mask');
    const R = 16 / 9;
    const SAFE_SCALE = 0.80; // 釣り専用: 左右のみ0.80、縦はフル
    const updateMaskHole = () => {
      if (!layer || !safe || !hole) return;
      const lr = layer.getBoundingClientRect();
      const Lw = lr.width, Lh = lr.height;
      let w = Math.min(Lw, Lh * R);
      let h = Math.min(Lh, Lw / R);
      if (w / h > R) w = h * R; else h = w / R;
      // タイトルと同一: 少し小さく（背景/動画より穴を基準に）
      w *= SAFE_SCALE;
      h *= SAFE_SCALE;
      const x = (Lw - w) / 2;
      const y = (Lh - h) / 2;
      // サブピクセル差の低減（整数丸め）
      const rx = Math.round(x), ry = Math.round(y), rw = Math.round(w), rh = Math.round(h);

      // 穴は16:9基準を横幅に採用しつつ、縦は上下フル（釣りのみ上下フレーム非表示）
      hole.setAttribute('x', String(rx));
      hole.setAttribute('y', '0');
      hole.setAttribute('width', String(rw));
      hole.setAttribute('height', String(Lh));
      if (maskEl) {
        maskEl.setAttribute('x', '0');
        maskEl.setAttribute('y', '0');
        maskEl.setAttribute('width', String(Lw));
        maskEl.setAttribute('height', String(Lh));
      }
      // UIセーフエリアも縦フルに（左右は0.80の幅、上下はフル）
      const uiW = rw;
      const uiH = Math.round(Lh);
      const uiX = rx;
      const uiY = 0;
      Object.assign(safe.style, {
        position: 'absolute', left: `${uiX}px`, top: `${uiY}px`, width: `${uiW}px`, height: `${uiH}px`
      });
      // トップバーをセーフエリアに追従配置（フレーム外に押し出されて見切れないように）
      try {
        const topbar = this.root.querySelector('.fish-topbar');
        if (topbar) {
          topbar.style.left = `${uiX + 4}px`;
          topbar.style.top = `${uiY + 6 + UI_OFFSET_Y_PX}px`;
          topbar.style.width = `${Math.max(0, uiW - 8)}px`;
          topbar.style.right = 'auto';
          topbar.style.position = 'absolute';
          topbar.style.zIndex = '12';
          topbar.style.overflow = 'visible';
        }
        this._fitTopset?.();
      } catch (_) { }

      // スクロール背景のタイル高さを計算（横幅100%に拡大するため、tileH = 幅 * (imgH/imgW)）
      if (this._scrollBg) {
        const ratioHPW = this._scrollRatioHPerW || 1; // デフォルト1:1
        this._tileH = Math.max(1, Math.floor(uiW * ratioHPW));
        // CSSアニメは無効化（JSでループ制御）
        this._scrollBg.style.animation = 'none';
        this._scrollBg.style.backgroundSize = '100% auto';
        this._scrollBg.style.backgroundRepeat = 'repeat-y';
      }

      // 動画の見せ方: 穴幅(uiW)を基準に VIDEO_SCALE 倍で縮小（縦は黒下敷きで補完）
      if (video) {
        // 穴の横幅を基準にし、上下は黒下敷きで補完
        const ratio = this._videoRatio || (16 / 9);
        const needWBase = uiW;
        const isFuji = (this._activeBossId === 'fujisan');
        const isIgyo = (this._activeBossId === 'igyounokami');
        let scaleMult = 1.0;
        if (isFuji) scaleMult = 1.08;
        if (isIgyo) scaleMult = 1.25; // 1.20 -> 1.25 (User request: Enlarge)

        const baseScale = (this._isKrakenVideoActive ? VIDEO_SCALE : 1.00) * scaleMult;
        let needW = Math.max(1, Math.floor(needWBase * baseScale));
        // 上端をフレーム（セーフエリア）上端に合わせ、水平はセーフエリア中央
        let centerX = Lw / 2;
        let yOffset = (this._isKrakenVideoActive ? KRAKEN_VIDEO_OFFSET_Y_PX : DEFAULT_VIDEO_OFFSET_Y_PX);
        if (isFuji) yOffset -= 32; // 富士山: 少し上
        if (isIgyo) yOffset += 41; // 異形の神: さらに上へ (+56 -> +41)

        let topY = uiY + yOffset;
        // クラーケン再生中は最初に算出したジオメトリを固定して再利用
        if (this._isKrakenVideoActive) {
          if (!this._krakenFixedVideo) {
            this._krakenFixedVideo = { needW, centerX, topY };
          } else {
            needW = this._krakenFixedVideo.needW;
            centerX = this._krakenFixedVideo.centerX;
            topY = this._krakenFixedVideo.topY;
          }
        } else {
          this._krakenFixedVideo = null;
        }
        video.style.width = `${needW}px`;
        video.style.height = 'auto';
        video.style.left = `${centerX}px`;
        video.style.top = `${topY}px`;
        video.style.right = 'auto';
        video.style.bottom = 'auto';
        video.style.transform = `translate(-50%, ${this._videoAnimY || 0}px)`;
        // クロマキー再生中は下端マスクを無効化（欠け防止）。通常は元のグラデを適用
        try {
          if (this._isKrakenVideoActive) {
            video.style.WebkitMaskImage = 'none';
            video.style.maskImage = 'none';
          } else {
            video.style.WebkitMaskImage = 'linear-gradient(to bottom, rgba(255,255,255,1) 94%, rgba(255,255,255,0) 100%)';
            video.style.maskImage = 'linear-gradient(to bottom, rgba(255,255,255,1) 94%, rgba(255,255,255,0) 100%)';
          }
        } catch (_) { }
        // 黒下敷きを動画の下端から下方向に敷く（移動は transform で同期）
        if (this._blackBelow) {
          const ratio = this._videoRatio || (16 / 9);
          const needH = Math.floor(needW / ratio);
          const baseTop = topY; // アニメオフセットは transform で適用
          const belowTop = Math.floor(baseTop + needH);
          const lr = layer.getBoundingClientRect();
          const Lh = lr.height;
          const hPx = Math.max(0, Math.floor(Lh - belowTop));
          Object.assign(this._blackBelow.style, {
            position: 'absolute', left: `${uiX}px`, width: `${uiW}px`, top: `${belowTop}px`, height: `${hPx}px`, background: '#000', zIndex: '0'
          });
          // キャンバス実サイズを更新
          const dpr = Math.max(1, window.devicePixelRatio || 1);
          if (this._blackBelowCanvas) {
            const cw = Math.max(1, Math.floor(uiW * dpr));
            const ch = Math.max(1, Math.floor(hPx * dpr));
            if (this._blackBelowCanvas.width !== cw) this._blackBelowCanvas.width = cw;
            if (this._blackBelowCanvas.height !== ch) this._blackBelowCanvas.height = ch;
            // 動画最下1pxを縦にストレッチ
            this._paintBlackBelowStrip?.();
          }
        }
        // クロマキー用キャンバスのジオメトリを動画と一致させる
        if (this._specialChromaKey && this._chromaCanvas) {
          // セーフエリア全面を覆うサイズにして、動画を cover で拡大表示（下の隙間を埋める）
          const fillW = uiW;
          const fillH = Math.floor(Lh);
          const fillTop = uiY; // セーフエリア上端
          Object.assign(this._chromaCanvas.style, {
            position: 'absolute', left: `${centerX}px`, top: `${fillTop}px`, width: `${fillW}px`, height: `${fillH}px`, transform: `translate(-50%, ${this._videoAnimY || 0}px)`, zIndex: '2', pointerEvents: 'none', display: 'block'
          });
        }
      }
    };
    this._onResize = () => { updateMaskHole(); this._initRope?.(); this._positionFloat?.(); this._positionBaitNavArrows?.(); };
    window.addEventListener('resize', this._onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => updateMaskHole());
      this._ro.observe(layer);
      this._ro.observe(safe);
    }
    const afterLayout = () => {
      updateMaskHole(); this._paintBlackBelowStrip?.(); svgHost.style.visibility = 'visible';
      // 初期: 動画画面の現在水深を0mで明示
      try { this._totalScrollPx = 0; this._depthMeters = 0; this._renderDepth?.(); } catch (_) { }
      // トップセット表示
      this._spawnEsabakoMini?.();
      this._spawnBaitNav?.();
      this._animateTopSet?.();
      this._fitTopset?.();
      this._installTopsetObservers?.();
      // 保存されているエサ情報をUIへ反映（論理のみ＋右上の餌箱）
      // 保存されているエサ情報をUIへ反映（論理のみ＋右上の餌箱）
      // -> _loadFishData 内で行うためここでは削除
      try {
        // 何もしない（_loadFishDataに委譲）
      } catch (_) { }
      this._loadFishData?.(); this._initRope?.(); this._initFloat?.();
      this._showTapGuide?.();
      // 直後にもう一度レイアウト確定後の位置合わせを実行（初回表示時のズレ防止）
      requestAnimationFrame(() => { try { updateMaskHole(); } catch (_) { } });
      // 可変幅フォント等のロード完了後にも再度合わせる（フォント計測差分対策）
      try { if (document.fonts && document.fonts.ready) { document.fonts.ready.then(() => { try { updateMaskHole(); } catch (_) { } }); } } catch (_) { }
    };
    requestAnimationFrame(() => requestAnimationFrame(afterLayout));

    // タップでシーケンス起動
    this._seqStarted = false;
    this._applyVideoAnim = (y) => {
      this._videoAnimY = y;
      if (this._videoEl) {
        const yb = y + (this._specialChromaKey?.yOffsetPx || 0);
        this._videoEl.style.transform = `translate(-50%, ${yb}px)`;
      }
      if (this._blackBelow) {
        const yb = y + (this._specialChromaKey?.yOffsetPx || 0);
        this._blackBelow.style.transform = `translateY(${yb}px)`;
      }
      if (this._chromaCanvas) {
        try {
          const yb = y + (this._specialChromaKey?.yOffsetPx || 0);
          this._chromaCanvas.style.transform = `translate(-50%, ${yb}px)`;
        } catch (_) { }
      }
    };
    // 動画を上から元位置(0px)へスライドさせる
    this._playVideoSlideFromTop = (durationMs = 800, startOffsetPx = -100) => new Promise((resolve) => {
      try {
        // 初期オフセットを適用
        this._applyVideoAnim?.(startOffsetPx);
        const start = performance.now();
        const y0 = startOffsetPx, y1 = 0;
        const step = (t) => {
          const p = Math.min(1, (t - start) / durationMs);
          const ease = 1 - Math.pow(1 - p, 3);
          const y = y0 + (y1 - y0) * ease;
          this._applyVideoAnim?.(y);
          if (p < 1) requestAnimationFrame(step); else resolve();
        };
        requestAnimationFrame(step);
      } catch (_) { resolve(); }
    });
    this._startVideoBounceAndAscend = () => new Promise((resolve) => {
      const downDur = 160; // ms
      const yDown = 22; // px
      const upAcc = -0.004; // px/ms^2（上向き加速）
      const upV0 = -0.20; // px/ms（初速）
      // 目標オフセット: 動画の下端がレイヤー上端よりさらに上になるまで（= 完全に画面外）
      let endY = -600; // フォールバック
      try {
        const ratio = this._videoRatio || (16 / 9);
        // スタイルから表示幅を取得（未設定時はセーフエリアから推定）
        let vidW = parseFloat(this._videoEl?.style.width || '0') || 0;
        if (!vidW && this._safe) {
          const r = this._safe.getBoundingClientRect();
          const baseW = Math.max(r.width, r.height * ratio);
          vidW = baseW * (typeof VIDEO_SCALE !== 'undefined' ? VIDEO_SCALE : 1);
        }
        if (vidW > 0) {
          const vidH = vidW / ratio;
          const topY = parseFloat(this._videoEl?.style.top || '0') || 0;
          endY = -(topY + vidH) - 8; // 余白8pxで完全に抜ける
        }
      } catch (_) { }
      let start = 0;
      const step = (t) => {
        if (!start) start = t;
        const dt = t - start;
        let y = 0;
        if (dt <= downDur) {
          const p = dt / downDur; // easeOutCubic
          y = yDown * (1 - Math.pow(1 - p, 3));
        } else {
          const t2 = dt - downDur;
          y = yDown + upV0 * t2 + 0.5 * upAcc * t2 * t2;
          if (y <= endY) {
            this._applyVideoAnim(endY);
            resolve();
            return;
          }
        }
        this._applyVideoAnim(y);
        this._animRaf = requestAnimationFrame(step);
      };
      this._animRaf = requestAnimationFrame(step);
    });

    this._startBubbles = (durationMs = 1000) => new Promise((resolve) => {
      try { this._startBubbleSfx?.(); } catch (_) { }
      // キャンバスが消されていた場合は再生成
      if (!this._bubbleCanvas) {
        this._bubbleCanvas = document.createElement('canvas');
        this._bubbleCanvas.className = 'bubble-canvas';
        this._layer?.appendChild(this._bubbleCanvas);
      }
      const cvs = this._bubbleCanvas;
      const ctx = cvs.getContext('2d');
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const fit = () => {
        const r = layer.getBoundingClientRect();
        cvs.width = Math.max(1, Math.floor(r.width * dpr));
        cvs.height = Math.max(1, Math.floor(r.height * dpr));
        cvs.style.width = r.width + 'px';
        cvs.style.height = r.height + 'px';
      };
      fit();
      let bubbles = [];
      const spawn = (n) => {
        const rw = cvs.width, rh = cvs.height;
        for (let i = 0; i < n; i++) {
          // 大小混在：80%は小粒 3..6px、20%は大粒 8..12px（CSS px相当）
          const big = Math.random() < 0.2;
          const sizeCss = big ? (8 + Math.floor(Math.random() * 5)) : (3 + Math.floor(Math.random() * 4));
          const s = sizeCss * dpr; // デバイスpxに変換
          const x = Math.floor(Math.random() * rw);
          const y = rh + Math.floor(Math.random() * (50 * dpr));
          const vy = -(0.35 + Math.random() * 0.70) * dpr; // px/ms（上方向）: 高速化
          bubbles.push({ x, y, s, vy });
        }
      };
      // 初期大量スポーン
      spawn(400);
      let last = performance.now();
      let elapsed = 0;
      const run = (t) => {
        const dt = t - last; last = t; elapsed += dt;
        // 追加スポーンで画面を覆っていく
        if (elapsed < durationMs) {
          spawn(80);
        }
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#9fdcf9';
        for (let i = bubbles.length - 1; i >= 0; i--) {
          const b = bubbles[i];
          b.y += b.vy * dt;
          // ドット描画
          ctx.fillRect(b.x, b.y, b.s, b.s);
          if (b.y < -10 * dpr) bubbles.splice(i, 1);
        }
        this._bubbleRaf = requestAnimationFrame(run);
      };
      this._bubbleRaf = requestAnimationFrame(run);
      // 指定時間後に次へ
      this._bubbleTimer = setTimeout(() => resolve(), durationMs);
      this._onResizeBubbles = () => fit();
      window.addEventListener('resize', this._onResizeBubbles);
    });

    this._stopBubbles = () => {
      if (this._bubbleRaf) cancelAnimationFrame(this._bubbleRaf);
      this._bubbleRaf = null;
      if (this._bubbleTimer) { clearTimeout(this._bubbleTimer); this._bubbleTimer = null; }
      try { this._stopBubbleSfx?.(); } catch (_) { }
      if (this._onResizeBubbles) window.removeEventListener('resize', this._onResizeBubbles);
      if (this._bubbleCanvas) this._bubbleCanvas.remove();
      this._bubbleCanvas = null;
    };

    this._startGetRippleRings = (durationMs = 900, rings = 3) => {
      if (!this._layer || !this._safe) return;
      const cvs = document.createElement('canvas');
      cvs.className = 'get-ripple-canvas';
      try {
        Object.assign(cvs.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '1' });
        // 先頭に挿入して背面に置く
        if (this._layer.firstChild) this._layer.insertBefore(cvs, this._layer.firstChild); else this._layer.appendChild(cvs);
      } catch (_) { this._layer.appendChild(cvs); }
      const fit = () => {
        const r = this._safe.getBoundingClientRect();
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        cvs.width = Math.max(1, Math.floor(r.width * dpr));
        cvs.height = Math.max(1, Math.floor(r.height * dpr));
        cvs.style.width = r.width + 'px';
        cvs.style.height = r.height + 'px';
        return { r, dpr };
      };
      let { r, dpr } = fit();
      const ctx = cvs.getContext('2d', { alpha: true }); if (!ctx) { try { cvs.remove(); } catch (_) { } return; }
      ctx.imageSmoothingEnabled = true;
      // 中心はセーフ中央
      const cx = Math.floor((r.width * dpr) / 2);
      const cy = Math.floor((r.height * dpr) / 2.2);
      const start = performance.now();
      const colors = ['rgba(180,220,255,0.45)', 'rgba(160,210,255,0.35)', 'rgba(130,190,255,0.25)'];
      const maxR = Math.hypot(cx, cy) * 1.2;
      const loop = (t) => {
        if (!cvs.isConnected) return;
        const p = Math.min(1, (t - start) / Math.max(1, durationMs));
        const ease = 1 - Math.pow(1 - p, 2);
        // リサイズ追随
        const rNow = this._safe.getBoundingClientRect();
        if (Math.abs(rNow.width - r.width) > 1 || Math.abs(rNow.height - r.height) > 1) { ({ r, dpr } = fit()); }
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        for (let i = 0; i < Math.max(1, rings); i++) {
          const localP = Math.min(1, Math.max(0, ease - i * 0.18));
          const rr = maxR * localP;
          const a = Math.max(0, 1.0 - localP) * (0.5 - i * 0.12);
          if (a <= 0) continue;
          ctx.beginPath();
          ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.strokeStyle = colors[i % colors.length].replace(/0\.[0-9]+\)$/, (m) => String(a) + ')');
          ctx.lineWidth = Math.max(1, 6 * dpr * (1 - localP));
          ctx.stroke();
        }
        if (p < 1) requestAnimationFrame(loop); else { try { cvs.remove(); } catch (_) { } }
      };
      requestAnimationFrame(loop);
    };

    // 即時に餌を画面上部外へ移動させる（ヒット直後の見た目用）
    this._forceBaitOffscreenTop = () => {
      try {
        if (!this._safe || !this._bait) return;
        const r = this._safe.getBoundingClientRect();
        // 現在位置（なければ中心）
        const bx = (this._baitPosX != null) ? this._baitPosX : Math.floor(r.width / 2);
        const yTop = -40; // 画面上部外
        this._baitPosX = bx; this._baitPosY = yTop;
        this._baitTargetX = bx; this._baitTargetY = yTop;
        this._bait.setPosition(bx, yTop);
      } catch (_) { }
    };

    // 真上にのみ素早く引き上げる（X固定）
    this._pullBaitUpStraight = (durationMs = 160) => {
      try {
        if (!this._safe || !this._bait) return;
        const r = this._safe.getBoundingClientRect();
        const bx = (this._baitPosX != null) ? this._baitPosX : Math.floor(r.width / 2);
        const by = (this._baitPosY != null) ? this._baitPosY : Math.floor(r.height / 2);
        const y1 = -40;
        const y0 = by;
        const start = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - start) / Math.max(1, durationMs));
          const ease = 1 - Math.pow(1 - p, 3);
          const y = y0 + (y1 - y0) * ease;
          this._baitPosX = bx; this._baitPosY = y;
          this._baitTargetX = bx; this._baitTargetY = y;
          this._bait.setPosition(bx, y);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      } catch (_) { }
    };

    // ロープの起点（アンカーY）を素早く上へ移動してピンと張る
    this._animRopeAnchorTo = (targetY, durationMs = 160) => new Promise((resolve) => {
      try {
        const startY = this._ropeAnchorY ?? -30;
        const start = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - start) / durationMs);
          const ease = 1 - Math.pow(1 - p, 3);
          this._ropeAnchorY = startY + (targetY - startY) * ease;
          if (p < 1) requestAnimationFrame(step); else resolve();
        };
        requestAnimationFrame(step);
      } catch (_) { resolve(); }
    });

    // フェード汎用: transitionend が来ない場合に備えてタイムアウトを入れる
    this._fadeTo = (to = 0, timeoutMs = 900) => new Promise((resolve) => {
      if (!this._fade) { resolve(); return; }
      let done = false; let timer = null;
      const onEnd = () => { if (done) return; done = true; try { this._fade.removeEventListener('transitionend', onEnd); } catch (_) { }; if (timer) clearTimeout(timer); resolve(); };
      try { this._fade.addEventListener('transitionend', onEnd); } catch (_) { }
      try { timer = setTimeout(onEnd, timeoutMs); } catch (_) { }
      requestAnimationFrame(() => { this._fade.style.opacity = String(to); });
    });
    // 表示/非表示を伴うフェード
    this._showBlack = (timeoutMs = 900) => { try { this._fade.style.display = 'block'; } catch (_) { }; return this._fadeTo(1, timeoutMs); };
    this._hideBlack = (timeoutMs = 900) => this._fadeTo(0, timeoutMs).then(() => { try { this._fade.style.display = 'none'; } catch (_) { } });
    this._fadeInBlack = () => this._showBlack();

    // 動画の先頭フレームが描画可能になるのを待つ（最大timeoutMs）
    this._waitForVideoReady = (timeoutMs = 800) => new Promise((resolve) => {
      const v = this._videoEl; if (!v) { resolve(); return; }
      try {
        if ((v.readyState || 0) >= 2) { resolve(); return; } // HAVE_CURRENT_DATA
      } catch (_) { }
      let to = null;
      const done = () => { try { v.removeEventListener('canplay', onCanPlay); } catch (_) { }; if (to) clearTimeout(to); resolve(); };
      const onCanPlay = () => done();
      try { v.addEventListener('canplay', onCanPlay, { once: true }); } catch (_) { }
      try { to = setTimeout(done, timeoutMs); } catch (_) { }
    });

    // 動画が黒フレームのままにならないよう、わずかに先頭をシークして再生を確実にする
    this._ensureVideoVisible = async () => {
      const v = this._videoEl; if (!v) return;
      try {
        v.muted = true; v.playsInline = true; v.autoplay = true;
        // 先頭フレームで黒い場合があるため、わずかに進める
        try { if ((v.currentTime || 0) < 0.05) v.currentTime = 0.05; } catch (_) { }
        try { await v.play?.(); } catch (_) { }
        await new Promise((resolve) => {
          let to = null; const cleanup = () => { try { v.removeEventListener('timeupdate', onReady); v.removeEventListener('canplay', onReady); } catch (_) { }; if (to) clearTimeout(to); };
          const onReady = () => { cleanup(); resolve(); };
          try { v.addEventListener('timeupdate', onReady, { once: true }); } catch (_) { }
          try { v.addEventListener('canplay', onReady, { once: true }); } catch (_) { }
          to = setTimeout(() => { cleanup(); resolve(); }, 800);
        });
      } catch (_) { }
    };

    this._showBait = () => new Promise((resolve) => {
      try { this._setBackVisible?.(false); this._bait?.show?.(); } catch (_) { }
      setTimeout(resolve, 400);
    });

    this._switchToGameScroll = () => {
      this._hideTapGuide?.();
      // 釣り開始（ゲーム画面）では「タイトルへ」非表示
      this._setBackVisible?.(false);
      // 背景を切替（動画は停止・非表示）
      try { this._videoEl?.pause(); } catch (_) { }
      if (this._videoEl) this._videoEl.style.display = 'none';
      if (this._gameBlackBg) this._gameBlackBg.style.display = 'block';
      if (this._scrollBg) { this._scrollBg.style.display = 'block'; this._scrollBg.style.animation = 'none'; }
      if (this._scrollMidLayer) this._scrollMidLayer.style.display = 'block';
      if (this._scrollFarLayer) this._scrollFarLayer.style.display = 'block';
      if (this._blackBelow) this._blackBelow.style.display = 'none';
      try { if (this._safe) this._safe.style.display = 'block'; } catch (_) { }
      try {
        const be = this._bait?.el;
        if (be) { be.style.transition = ''; be.style.transform = ''; be.style.opacity = ''; }
        this._bait?.setVisible?.(true);
        this._resetBaitToCenter?.();
      } catch (_) { }
      // クラーケン出現用カウンタは「投げる」たびにリセット
      try { this._krakenEscapeCount = 0; this._krakenTriggered = false; } catch (_) { }
      // ボス出現用カウンター（糸に触れた数）もリセット
      try { this._bossTouchCounts = { mega: 0, fuji: 0, cthulhu: 0 }; this._bossTriggered = false; } catch (_) { }
      // バブル終了
      this._stopBubbles();
      // 黒フェードを戻して表示
      requestAnimationFrame(() => { this._fade.style.opacity = '0'; });
      // スクロール開始
      this._handlingGet = false; // GET演出終了
      this._initFishSystem?.();
      // 念のためDOMに残った魚も全消去（Ghost Fish対策）
      try { this._safe?.querySelectorAll?.('.fish-sprite')?.forEach(el => el.remove()); } catch (_) { }
      // 入力をブロックする可能性のあるオーバーレイを全て削除
      try {
        this._layer?.querySelectorAll?.('.get-overlay,.wipe-overlay,.caught-fish-overlay,.get-badge-overlay,.get-backdrop-overlay,.get-backdrop-canvas')
          ?.forEach(el => el.remove());
      } catch (_) { }
      this._resetCombo?.();
      this._resetCombo?.();
      this._startScrollBg?.();
      // ロープ有効化（動画画面では表示しないためここでON）
      this._ropeEnabled = true;
      if (this._ropeCanvas) this._ropeCanvas.style.display = 'block';
      this._initRope?.();
      this._resetRopeAnchorXToCenter?.();
      // 自動デバッグ発火 or URL Param Logic
      // URL Param Logic is moved to _updateRope (Touch based)
      try {
        if (this._krakenAuto && !this._krakenTriggered) {
          setTimeout(() => { try { this._triggerBossEvent?.('kraken'); } catch (_) { } }, 1200);
        }
      } catch (_) { }
      this._showHudWhenBaitVisible?.();
      this._gameActive = true;

      // Igyounokami Special: Do not restart BGM (Stay silent)
      if (this._activeBossId === 'igyounokami') {
        // Keep silent
      } else {
        this._startBgm?.();
      }

      // GET中にロックした餌の慣性追従を解除
      this._lockBaitPos = false;
    };

    // 餌の位置を中央へリセット
    this._resetBaitToCenter = () => {
      try {
        if (!this._safe || !this._bait) return;
        const r = this._safe.getBoundingClientRect();
        const cx = Math.floor(r.width / 2);
        const cy = Math.floor(r.height / 2);
        this._baitTargetX = cx; this._baitTargetY = cy;
        this._baitPosX = cx; this._baitPosY = cy;
        this._bait.setPosition(cx, cy);
      } catch (_) { }
    };

    this._runFishingIntroSequence = async () => {
      try { this._playCastSfx?.(); } catch (_) { }
      // 動画モードを明示的に復帰
      if (this._videoEl) {
        this._videoEl.style.display = 'block';
        try { this._videoEl.play?.(); } catch (_) { }
      }
      // 動画画面では現在水深を0mにリセットして表示
      try { this._totalScrollPx = 0; this._depthMeters = 0; this._renderDepth?.(); } catch (_) { }
      // タップ直後: トップセットを引き上げて非表示、HUDも隠す
      try {
        this._hideTopset?.();
        const hud = this.root.querySelector('#gameHud');
        if (hud) hud.style.display = 'none';
      } catch (_) { }
      if (this._gameBlackBg) this._gameBlackBg.style.display = 'none';
      if (this._scrollBg) this._scrollBg.style.display = 'none';
      if (this._scrollMidLayer) this._scrollMidLayer.style.display = 'none';
      if (this._scrollFarLayer) this._scrollFarLayer.style.display = 'none';
      if (this._scrollMidLayerMega) this._scrollMidLayerMega.style.display = 'none';
      if (this._scrollFarLayerMega) this._scrollFarLayerMega.style.display = 'none';
      if (this._scrollLayerFuji) this._scrollLayerFuji.style.display = 'none';
      if (this._scrollCthulhuLayer) this._scrollCthulhuLayer.style.display = 'none';
      if (this._blackBelow) this._blackBelow.style.display = 'block';
      // フェードを消す（display:noneまで）
      try { await this._hideBlack(0); } catch (_) { }
      // 餌の位置を中央にリセット
      this._resetBaitToCenter?.();
      // まずボトムピクセル拡張の下敷きを描画
      this._paintBlackBelowStrip();
      await this._startVideoBounceAndAscend();
      await this._fadeInBlack();
      // 念のため、投げる直前にセーブデータから餌を復元（表示ズレ防止の最終手段）
      try {
        const savedId = this.state?.bait?.id;
        if (savedId && savedId !== 'ebi' && this._availableBaits) {
          const idx = this._availableBaits.findIndex(b => b.id === savedId);
          if (idx >= 0 && this._currentBaitIndex !== idx) {
            console.log(`[DEBUG] _runFishingIntroSequence: forcing restore of ${savedId}`);
            this._setBaitByIndex?.(idx);
          }
        }
      } catch (_) { }
      // 餌を並行で出す
      this._showBait();
      // 1.5秒だけ泡を出したら切替
      await this._startBubbles(900);
      this._switchToGameScroll();
    };

    this._isCaught = (id) => {
      try {
        if (!this.state || !Array.isArray(this.state.caught)) return false;
        return this.state.caught.some(c => c.id === id);
      } catch (_) { return false; }
    };

    // 低ランク魚を黄色シルエットに差し替え (Modified to strict silhouette logic)
    // 優先順位: Special Rank > 格下(Yellow) > その他(White)
    this._applySilhouetteForFish = (fish) => {
      try {
        if (!fish || !fish.el) return;
        const img = fish.el;

        // 判定済みフラグ(dataset._silType)を利用して無駄なDOM更新を防ぐ

        // 1. Special Rank (Highest Priority)
        if (fish.def?.specialRank) {
          const sRank = fish.def.specialRank;
          if (img.dataset._silType !== sRank) {
            const num = sRank.replace(/^f/, '');
            const targetSrc = `assets/fish${num}.png`;

            img.onerror = () => {
              img.onerror = null;
              const mbSrc = this._getAssetPath?.('assets/fish.png') || 'assets/fish.png';
              if (img.src !== mbSrc) img.src = mbSrc;
              img.style.filter = '';
              img.dataset._silType = 'fallback_white';
            };

            img.src = this._getAssetPath?.(targetSrc) || targetSrc;
            img.style.filter = 'none';
            img.dataset._silType = sRank;
          }
          return;
        }

        // ランク比較
        const fishRank = Number(fish?.def?.rank ?? Infinity);
        const baitFromObj = (typeof this._bait?.getRank === 'function') ? Number(this._bait.getRank() || 0) : 0;
        const baitFromState = Number(this?.state?.bait?.rank ?? 0);
        const baitRank = Math.max(baitFromObj, baitFromState);

        // 2. Lower Rank (Yellow)
        if (Number.isFinite(fishRank) && Number.isFinite(baitRank) && fishRank < baitRank) {
          if (img.dataset._silType !== 'yellow') {
            const targetSrc = 'assets/fish_yellow.png';

            img.onerror = () => {
              img.onerror = null;
              const mbSrc = this._getAssetPath?.('assets/fish.png') || 'assets/fish.png';
              if (img.src !== mbSrc) img.src = mbSrc;
              img.style.filter = 'sepia(1) saturate(2.2) hue-rotate(-28deg) brightness(1.12)';
              img.dataset._silType = 'yellow_fallback';
            };

            img.src = this._getAssetPath?.(targetSrc) || targetSrc;
            img.style.filter = 'none';
            img.dataset._silType = 'yellow';
          }
          return;
        }

        // 3. Default/Higher/Equal Rank (White)
        if (img.dataset._silType !== 'white') {
          const targetSrc = 'assets/fish.png';
          if (img.dataset._silType === 'fallback_white') return;

          img.onerror = null;
          img.src = this._getAssetPath?.(targetSrc) || targetSrc;
          img.style.filter = 'none';
          img.dataset._silType = 'white';
        }

      } catch (_) { }
    };

    this._triggerBossEvent = (type) => {
      console.log(`[Boss] Triggered: ${type}`);
      let fishId = null, video = null, sfx = null;
      let nameJa = '';
      if (type === 'mega') {
        fishId = 'megarodon'; video = 'assets/megarodon.mp4'; sfx = 'assets/megarodon.mp3'; nameJa = 'メガロドン';
      } else if (type === 'fuji') {
        fishId = 'fujisan'; video = 'assets/fujisan.mp4'; sfx = null; nameJa = '富士山';
      } else if (type === 'cthulhu') {
        fishId = 'igyounokami'; video = 'assets/igyounokami.mp4'; sfx = 'assets/igyounokami.wav'; nameJa = '異形の神';
      } else if (type === 'kraken') {
        fishId = 'kura-ken'; video = 'assets/kura-ken.mp4'; sfx = null; nameJa = 'クラーケン';
      }

      if (fishId) {
        // フラグを立てて更新ループを停止させる（水深停止・スポーン停止）
        this._handlingGet = true;

        // Universal BGM Stop for all bosses (User request)
        // Ensures stage BGM stops even if boss has no SFX (e.g. Fujisan)
        try { this._stopBgm?.(); } catch (_) { }

        // SFX再生
        if (sfx) {
          const s = this.state?.settings || {};
          const vol = Math.max(0, Math.min(1, Number((s.sfxVolume ?? 5) / 10)));
          if (vol > 0) {
            if (this._bossSfx) { try { this._bossSfx.pause(); } catch (_) { } this._bossSfx = null; }

            const doPlay = () => {
              const a = new Audio(sfx);
              a.volume = vol;
              a.play().catch(() => { });
              this._bossSfx = a;
            };

            if (fishId === 'igyounokami') {
              setTimeout(doPlay, 900);
            } else {
              doPlay();
            }
          }
        }
        // 特殊動画設定
        this._specialGetVideoSrc = video;
        this._specialGetWaitForEnd = true; // 動画終了を待つ
        // GETシーケンスへ移行
        // IDに対応する定義を取得（なければダミー生成）
        const def = (this._fishData || []).find(f => f.id === fishId) || { id: fishId, name_ja: nameJa, rank: 999 };
        this._onGetFish(def);
      }
    };

    this._onTap = (e) => {
      if (e?.target && e.target.closest('.bait-nav')) { try { e.preventDefault?.(); e.stopPropagation?.(); } catch (_) { } return; }
      // 「タイトルへ」ボタンだけは無視し、それ以外のトップバー上クリックは許可
      if (e?.target && e.target.closest('#btnBack')) return;
      try {
        if (this._isBaitUnknown?.()) { this._startBaitUnknownDialogue?.(); return; }
      } catch (_) { }
      if (this._seqStarted) return;
      if (this._handlingGet) return; // GET処理中は入力無視
      // GET表示中/ワイプ中/釣れた魚表示中/GETバッジ表示中/バックドロップ表示中は割り込み禁止（自動復帰に任せる）
      try { if (this._layer?.querySelector?.('.get-overlay,.wipe-overlay,.caught-fish-overlay,.get-badge-overlay,.get-backdrop-overlay,.get-backdrop-canvas')) return; } catch (_) { }
      // TAPガイドを隠す
      this._hideTapGuide?.();
      if (this._awaitingRestart) {
        // GET後の再スタート
        try { this._layer?.querySelectorAll?.('.get-overlay,.wipe-overlay,.caught-fish-overlay,.get-badge-overlay,.get-backdrop-overlay,.get-backdrop-canvas')?.forEach(el => el.remove()); } catch (_) { }
        this._awaitingRestart = false;
        try { this._videoEl?.play?.(); } catch (_) { }
        this._seqStarted = true;
        this._runFishingIntroSequence();
        return;
      }
      // 初回スタート
      try { this._layer?.querySelectorAll?.('.get-overlay,.wipe-overlay,.caught-fish-overlay,.get-badge-overlay,.get-backdrop-overlay,.get-backdrop-canvas')?.forEach(el => el.remove()); } catch (_) { }
      this._seqStarted = true;
      this._runFishingIntroSequence();
    };
    layer.addEventListener('pointerdown', this._onTap);

    // 背景スクロールループ（rAF）
    // スクロール速度倍率（加速用）
    this._scrollSpeedMul = 1;
    this._speedBoostTimer = null;
    this._speedFxRaf = null;
    this._speedFxCanvas = null;
    this.applySpeedBoost = (mul = 2, durationMs = 2000) => {
      try { if (this._speedBoostTimer) clearTimeout(this._speedBoostTimer); } catch (_) { }
      this._scrollSpeedMul = Math.max(0.1, mul);
      // 視覚演出（白いスピードストリーク）開始
      this._startSpeedStreaks?.();
      this._speedBoostTimer = setTimeout(() => {
        this._scrollSpeedMul = 1;
        this._speedBoostTimer = null;
        // 視覚演出終了
        this._stopSpeedStreaks?.();
      }, durationMs);
    };

    this._showAreaCutin = (title, subtitle) => {
      if (!this._layer) return;
      const container = document.createElement('div');
      container.className = 'area-cutin-container';
      Object.assign(container.style, {
        zIndex: '1000'
      });

      const box = document.createElement('div');
      box.className = 'area-cutin-box';

      const tEl = document.createElement('div');
      tEl.className = 'area-cutin-title';
      tEl.textContent = title;

      box.appendChild(tEl);
      if (subtitle) {
        const sEl = document.createElement('div');
        sEl.className = 'area-cutin-subtitle';
        sEl.textContent = subtitle;
        box.appendChild(sEl);
      }

      container.appendChild(box);
      this._layer.appendChild(container);

      // Animate
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          box.classList.add('show');
        });
      });

      // Remove
      setTimeout(() => {
        box.classList.remove('show');
        setTimeout(() => {
          container.remove();
        }, 600);
      }, 4500);
    };

    // 加速演出: 白い線が上方向に走るスピードストリーク
    this._startSpeedStreaks = () => {
      try {
        if (!this._safe) return;
        if (!this._speedFxCanvas) {
          const cvs = document.createElement('canvas');
          cvs.className = 'speed-streaks';
          cvs.style.position = 'absolute';
          cvs.style.inset = '0';
          cvs.style.pointerEvents = 'none';
          cvs.style.zIndex = '8';
          this._safe.appendChild(cvs);
          this._speedFxCanvas = cvs;
          const resize = () => {
            try {
              const r = this._safe.getBoundingClientRect();
              const dpr = Math.max(1, window.devicePixelRatio || 1);
              cvs.width = Math.max(1, Math.floor(r.width * dpr));
              cvs.height = Math.max(1, Math.floor(r.height * dpr));
              cvs.style.width = r.width + 'px';
              cvs.style.height = r.height + 'px';
            } catch (_) { }
          };
          this._onResizeSpeedFx = resize;
          resize();
          try { window.addEventListener('resize', this._onResizeSpeedFx); } catch (_) { }
        }
        if (!this._speedFxRaf && this._speedFxCanvas) {
          const ctx = this._speedFxCanvas.getContext('2d');
          if (!ctx) return;
          const streaks = [];
          let last = performance.now();
          const step = (t) => {
            const dt = (t - last) / 1000; last = t;
            const cvs = this._speedFxCanvas;
            if (!cvs) { this._speedFxRaf = null; return; }
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            const w = cvs.width, h = cvs.height;
            ctx.clearRect(0, 0, w, h);
            // ブースト倍率に応じた生成・速度
            const mul = Math.max(1, this._scrollSpeedMul || 1);
            const spawn = Math.min(200, Math.floor(10 * mul));
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
              ctx.globalAlpha = Math.max(0, Math.min(1, s.a));
              ctx.lineWidth = s.w;
              ctx.beginPath();
              ctx.moveTo(s.x, s.y);
              ctx.lineTo(s.x, s.y - s.len);
              ctx.stroke();
              if (s.y < -s.len) streaks.splice(i, 1);
            }
            ctx.globalAlpha = 1;
            this._speedFxRaf = requestAnimationFrame(step);
          };
          this._speedFxRaf = requestAnimationFrame((t) => { last = t; this._speedFxRaf = requestAnimationFrame(step); });
        }
      } catch (_) { }
    };
    this._stopSpeedStreaks = () => {
      try {
        if (this._speedFxRaf) cancelAnimationFrame(this._speedFxRaf);
        this._speedFxRaf = null;
        if (this._onResizeSpeedFx) { try { window.removeEventListener('resize', this._onResizeSpeedFx); } catch (_) { } this._onResizeSpeedFx = null; }
        if (this._speedFxCanvas) { try { this._speedFxCanvas.remove(); } catch (_) { } this._speedFxCanvas = null; }
      } catch (_) { }
    };

    // 餌の種類（画像・ランク）を切替
    this.setBaitType = (type) => {
      try { this._bait?.setType?.(type); } catch (_) { }
    };

    // --- 魚スポーン/深度更新（欠落していたため復元） ---
    if (this._pxPerMeter == null) this._pxPerMeter = 16;
    if (this._rankStepMeters == null) this._rankStepMeters = 50;
    if (this._rankWindowMeters == null) this._rankWindowMeters = 200;
    if (!Array.isArray(this._fishes)) this._fishes = [];
    if (!Array.isArray(this._spawners)) this._spawners = [];
    if (this._lastUnlockedIndex == null) this._lastUnlockedIndex = -1;

    this._initFishSystem = () => {
      this._depthMeters = 0;
      this._maxDepthMeters = 0;
      this._clockSec = 0;
      this._totalScrollPx = 0;
      this._spawners = [];
      this._fishes = [];
      this._lastUnlockedIndex = -1;
      this._shownCutin200 = false;
      this._shownCutin1000 = false;
      this._shownCutin2000 = false;
      this._shownCutin3000 = false;
      this._shownCutin4000 = false;
      this._tryUnlockRanks?.();
      this._renderDepth?.();
    };

    this._tryUnlockRanks = () => {
      const depth = Math.floor(this._depthMeters || 0);
      const unlockIdx = Math.floor(depth / this._rankStepMeters);
      while (this._lastUnlockedIndex < unlockIdx) {
        const nextIdx = this._lastUnlockedIndex + 1;
        const rank = 1 + nextIdx;
        const maxRank = Array.isArray(this._fishData) ? this._fishData.reduce((m, f) => Math.max(m, f.rank || 0), 0) : 0;

        if (Object.is(rank, -0)) rank = 0; // safety
        // Cap regular fish at Rank 105 (Marianasnailfish)
        // User requested: "Stop spawning after Marianasnailfish (Rank 105)"
        // Bosses (900+) are still allowed.
        if (rank > 105 && rank < 900) { this._lastUnlockedIndex = nextIdx; continue; }

        if (rank <= 0 || (maxRank && rank > maxRank)) { this._lastUnlockedIndex = nextIdx; continue; }
        const startDepth = nextIdx * this._rankStepMeters;
        const endDepth = startDepth + this._rankWindowMeters;
        this._spawners.push({ rank, startDepth, endDepth, nextAtSec: (this._clockSec || 0) + Math.random() * 1.2 + 0.6 });
        this._lastUnlockedIndex = nextIdx;
      }
    };

    this._pickFishDefByRank = (rank) => {
      const list = (this._fishData || []).filter(f => f.rank === rank);
      if (!list.length) return null;
      return list[Math.floor(Math.random() * list.length)];
    };

    this._spawnFishFromBottom = (def) => {
      if (!def || !this._safe) return;

      // Special handling for vertical school (e.g. Hinoobikurage)
      if (def.movement?.spawnColumn) {
        const count = def.movement.columnCount || 3;
        const spacing = def.movement.columnSpacing || 32;
        this._spawnColumnRise(def, count, spacing);
        return;
      }

      const dir = Math.random() < 0.5 ? 'left' : 'right';
      const fish = new Fish({ parent: this._safe, def: { ...def, movement: { ...(def.movement || {}), pattern: 'rise' } }, direction: dir });
      try { fish.mount(); } catch (_) { return; }
      const r = this._safe.getBoundingClientRect();
      const x = Math.floor(r.width * (0.1 + Math.random() * 0.8));
      const y = r.height + 30;
      fish.setPosition(x, y);
      fish.applyMovementPreset();
      fish.applyMovementPreset();
      try { this._applySilhouetteForFish?.(fish); } catch (_) { }
      // 追加: 子魚生成コールバック
      fish.onSpawnChild = (x, y, childId) => {
        const childDef = this._fishData.find(f => f.id === childId);
        if (childDef) {
          const def = { ...childDef, movement: { ...(childDef.movement || {}), pattern: 'sine' } };
          this._spawnFishFromSide(def, (Math.random() < 0.5 ? 'right' : 'left'), y);
          // 位置を親の場所に上書き
          const last = this._fishes[this._fishes.length - 1];
          if (last) last.setPosition(x, y);
        }
      };
      try {
        const mv = fish.def?.movement || {};
        if (mv.rushToBaitX) {
          const baitRect = (this._bait?.getHitRect?.() || this._bait?.getBounds?.());
          if (baitRect && this._safe) {
            const sr = this._safe.getBoundingClientRect();
            const lc = this._rectToLocal?.(baitRect, sr) || { x: baitRect.left - sr.left, y: baitRect.top - sr.top, width: baitRect.width, height: baitRect.height };
            const bx = lc.x + lc.width / 2;
            const by = lc.y + lc.height / 2;
            fish._rushTargetX = bx;
            fish._rushTargetY = by;
            if (!mv.rushHoming) {
              const dx = bx - fish.x; const dy = by - fish.y;
              const len = Math.hypot(dx, dy) || 1e-4;
              fish._rushUx = dx / len; fish._rushUy = dy / len;
            }
          }
        }
      } catch (_) { }
      this._fishes.push(fish);
    };

    this._spawnFishFromSide = (def, dir = (Math.random() < 0.5 ? 'right' : 'left'), yPos = null) => {
      if (!def || !this._safe) return;
      const fish = new Fish({ parent: this._safe, def: { ...def }, direction: dir });
      try { fish.mount(); } catch (_) { return; }
      const r = this._safe.getBoundingClientRect();
      const y = (yPos != null) ? yPos : Math.floor(r.height * (0.25 + Math.random() * 0.5));
      const x = (dir === 'right') ? -30 : (r.width + 30);
      fish.setPosition(x, y);
      fish.applyMovementPreset();
      fish.applyMovementPreset();
      try { this._applySilhouetteForFish?.(fish); } catch (_) { }
      // 追加: 子魚生成コールバック
      fish.onSpawnChild = (x, y, childId) => {
        const childDef = this._fishData.find(f => f.id === childId);
        if (childDef) {
          const def = { ...childDef, movement: { ...(childDef.movement || {}), pattern: 'sine' } };
          this._spawnFishFromSide(def, (Math.random() < 0.5 ? 'right' : 'left'), y);
          // 位置を親の場所に上書き
          const last = this._fishes[this._fishes.length - 1];
          if (last) last.setPosition(x, y);
        }
      };
      this._fishes.push(fish);
    };

    this._spawnSchoolFromSide = (def, count = 10) => {
      if (!def || !this._safe) return;
      const dir = (Math.random() < 0.5) ? 'right' : 'left';
      const r = this._safe.getBoundingClientRect();
      const yBase = Math.floor(r.height * (0.3 + Math.random() * 0.4));

      // Determine pattern (allow sine if defined, otherwise default to straight)
      const pattern = def.movement?.pattern || 'straight';
      // If sine, we probably want them to follow a leader (line formation)
      // If straight, maybe a cluster (school) is fine, but user asked for "line" for Nishin
      const isLine = (pattern === 'sine' || def.id === 'nishin' || def.id === 'maiwashi');

      for (let i = 0; i < Math.max(1, count); i++) {
        const fDef = { ...def, movement: { ...(def.movement || {}), pattern: pattern, allowOffscreenX: true, despawnOffX: Math.max(120, def.movement?.despawnOffX || 120) } };

        if (isLine) {
          // Line Formation (delayed by index to creating a trailing school effect)
          // We can't strictly delay creation here easily without timers, but we can offset X.
          // Since they move at same speed, offsetting X works.
          const spacingX = 60 + Math.random() * 20;
          const offsetX = i * spacingX;

          this._spawnFishFromSide(fDef, dir, yBase);
          const f = this._fishes[this._fishes.length - 1]; // Just added
          if (f) {
            const r = this._safe.getBoundingClientRect();
            // Adjust X based on dir
            let startX = (dir === 'right') ? (-30 - offsetX) : (r.width + 30 + offsetX);
            f.setPosition(startX, yBase);
            // Verify phase for sine wave?
            // To make them "wave" in sync or snake, we can adjust phase.
            // Snake: same phase, different X. Or different phase?
            // If phase is time based: y = sin(t). All sync.
            // If we want snake: y = sin(t - x).
            // Current Fish.js sine uses: sin(this._phase + this._omega * this.t)
            // _phase is random.
            // Force phase to 0 or sequential to create a "wave train"
            f._phase = i * 0.5;
          }
        } else {
          // Cluster (original behavior)
          const jitterY = Math.round((Math.random() - 0.5) * 70);
          this._spawnFishFromSide(fDef, dir, yBase + jitterY);
        }
      }
    };

    this._spawnColumnRise = (def, count = 3, spacing = 28) => {
      if (!def || !this._safe) return;
      const r = this._safe.getBoundingClientRect();
      const x = Math.floor(r.width * (0.2 + Math.random() * 0.6));
      for (let i = 0; i < Math.max(1, count); i++) {
        const fish = new Fish({ parent: this._safe, def: { ...def, movement: { ...(def.movement || {}), pattern: 'rise' } }, direction: (Math.random() < 0.5 ? 'left' : 'right') });
        try { fish.mount(); } catch (_) { continue; }
        const y = r.height + 30 + i * spacing;
        fish.setPosition(x, y);
        fish.applyMovementPreset();
        try { this._applySilhouetteForFish?.(fish); } catch (_) { }
        this._fishes.push(fish);
      }
    };

    this._spawnRocketSchool = (def, count) => {
      if (!def || !this._safe) return;
      const r = this._safe.getBoundingClientRect();
      const originX = r.width * 0.5;
      const originY = r.height + 60;
      for (let i = 0; i < count; i++) {
        const speed = 180 + Math.random() * 120; // High speed
        const vx = (Math.random() - 0.5) * 240; // Wide scatter
        const fish = new Fish({
          parent: this._safe,
          def: { ...def, movement: { ...(def.movement || {}), pattern: 'rise', speed: speed } },
          direction: vx >= 0 ? 'right' : 'left'
        });
        fish.vx = vx;
        try { fish.mount(); } catch (_) { continue; }
        fish.setPosition(originX + (Math.random() - 0.5) * 80, originY + Math.random() * 100);
        fish.applyMovementPreset();
        try { this._applySilhouetteForFish?.(fish); } catch (_) { }
        this._fishes.push(fish);
      }
    };

    this._updateDepthAndSpawns = (dt) => {
      // GET演出中（動画再生中）は深度更新・スポーンを停止
      if (this._handlingGet) return;

      const px = this._totalScrollPx || 0;
      const ppm = this._pxPerMeter || 4;
      this._depthMeters = px / ppm;
      if ((this._maxDepthMeters || 0) < (this._depthMeters || 0)) {
        this._maxDepthMeters = this._depthMeters;
      }
      this._renderDepth?.();
      this._tryUnlockRanks?.();

      // Area Cut-in Triggers
      const d = this._depthMeters || 0;
      if (d >= 200 && !this._shownCutin200) {
        this._shownCutin200 = true;
        this._showAreaCutin('ZONE 1', "KRAKEN'S LAIR");
      }
      if (d >= 1000 && !this._shownCutin1000) {
        this._shownCutin1000 = true;
        this._showAreaCutin('ZONE 2', "MEGALODON TRENCH");
      }
      if (d >= 2000 && !this._shownCutin2000) {
        this._shownCutin2000 = true;
        this._showAreaCutin('ZONE 3', "VOLCANIC RIFT");
      }
      if (d >= 3000 && !this._shownCutin3000) {
        this._shownCutin3000 = true;
        this._showAreaCutin('ZONE 4', "ELDRITCH DOMAIN");
      }
      if (d >= 4000 && !this._shownCutin4000) {
        this._shownCutin4000 = true;
        this._showAreaCutin('ZONE 5', "LUMINESCENT ABYSS");
      }

      const now = this._clockSec || 0;
      for (const sp of this._spawners) {
        if (this._depthMeters < sp.startDepth || this._depthMeters > sp.endDepth) continue;
        if (now >= sp.nextAtSec) {
          const baseDef = this._pickFishDefByRank(sp.rank) || { id: `rank${sp.rank}`, name_ja: `R${sp.rank}`, rank: sp.rank, movement: { pattern: 'rise', speed: 60, amplitude: 0, frequency: 0, sizeScale: 1 } };
          const chance = (baseDef && typeof baseDef.spawnChance === 'number') ? Math.max(0, Math.min(1, baseDef.spawnChance)) : 1;
          if (Math.random() <= chance) {


            if (baseDef.id === 'maiwashi' || baseDef.id === 'nishin') {
              const def = { ...baseDef, movement: { ...(baseDef.movement || {}), pattern: 'sine', allowOffscreenX: true, despawnOffX: Math.max(120, baseDef.movement?.despawnOffX || 120) } };
              this._spawnSchoolFromSide(def, 10 + Math.floor(Math.random() * 6));
            } else if (baseDef.id === 'surumeika') {
              this._spawnRocketSchool(baseDef, 5 + Math.floor(Math.random() * 4));
            } else if (baseDef.id === 'sake') {
              const def = { ...baseDef, movement: { ...(baseDef.movement || {}), pattern: 'sine', allowOffscreenX: true, despawnOffX: Math.max(120, baseDef.movement?.despawnOffX || 120) } };
              this._spawnFishFromSide(def, (Math.random() < 0.5 ? 'right' : 'left'));
            } else if (baseDef.id === 'masaba') {
              this._spawnColumnRise(baseDef, 3, 32);
            } else if (baseDef.id === 'hinobikurage') {
              this._spawnColumnRise(baseDef, 12, 30);
            } else if (baseDef.id === 'takanohadai' || (baseDef.movement && baseDef.movement.polyMove)) {
              const def = { ...baseDef, movement: { ...(baseDef.movement || {}), polyMove: true } };
              this._spawnFishFromSide(def, (Math.random() < 0.5 ? 'right' : 'left'));
            } else if (baseDef.id === 'sayori' || baseDef.id === 'jinbeezame') {
              const def = { ...baseDef, movement: { ...(baseDef.movement || {}), pattern: 'sine', allowOffscreenX: true, despawnOffX: Math.max(120, baseDef.movement?.despawnOffX || 120) } };
              this._spawnFishFromSide(def, (Math.random() < 0.5 ? 'right' : 'left'));
            } else {
              this._spawnFishFromBottom(baseDef);
            }
          }
          sp.nextAtSec = now + (0.8 + Math.random() * 0.8);
        }
      }
    };

    this._updateFishes = (dt) => {
      if (!this._gameActive) return;
      if (this._handlingGet) return;
      const baitRect = (this._bait?.getHitRect?.() || this._bait?.getBounds?.()) || null;

      // Collect Stealth Sources (e.g. Hotaruika)
      const stealthSources = [];
      for (const f of this._fishes) {
        if (f.def && f.def.stealthRadius && !f.isFleeing?.() && !f._shrinking && f.el) {
          stealthSources.push({ src: f, x: f.x, y: f.y, rSq: f.def.stealthRadius * f.def.stealthRadius });
        }
      }
      for (let i = this._fishes.length - 1; i >= 0; i--) {
        const f = this._fishes[i];
        let baitCX = null, baitCY = null;
        try {
          if (baitRect && this._safe) {
            const sr = this._safe.getBoundingClientRect();
            const lc = this._rectToLocal?.(baitRect, sr) || { x: baitRect.left - sr.left, y: baitRect.top - sr.top, width: baitRect.width, height: baitRect.height };
            baitCX = lc.x + lc.width / 2;
            baitCY = lc.y + lc.height / 2;
          }
        } catch (_) { }
        try { if (f && f._avoidFromBaitX && baitCX != null) f._avoidTargetX = baitCX; } catch (_) { }
        try { if (f && f._rushToBaitX && baitCX != null && baitCY != null) { f._rushTargetX = baitCX; f._rushTargetY = baitCY; } } catch (_) { }
        try { if (f && f._sampleSeekEnabled && baitCX != null && baitCY != null) { f._seekTargetX = baitCX; f._seekTargetY = baitCY; } } catch (_) { }
        try { if (f && f._chaseInRange && baitCX != null && baitCY != null) { f._chaseTargetX = baitCX; f._chaseTargetY = baitCY; } } catch (_) { }


        // Seek Nearest Fish (Dangouo)
        try {
          if (f && f._seekNearestFish) {
            let nearest = null;
            let minD = Infinity;
            for (const g of this._fishes) {
              if (g === f) continue;
              if (!g.el || g.isFleeing?.()) continue;
              const dx = g.x - f.x;
              const dy = g.y - f.y;
              const d = Math.hypot(dx, dy);
              if (d < minD) { minD = d; nearest = g; }
            }
            if (nearest) {
              f._seekOtherTargetX = nearest.x;
              f._seekOtherTargetY = nearest.y;
            }
          }
        } catch (_) { }

        // Predatory Behavior (Shirowani etc)
        try {
          if (f && f._eatFishOnContact) {
            let nearest = null;
            let minD = Infinity;
            // Find nearest lower-rank fish
            for (const g of this._fishes) {
              if (g === f) continue;
              if (!g.el || g.isFleeing?.()) continue;
              if ((g.def?.rank || 0) < (f.def?.rank || 0)) {
                const dx = g.x - f.x;
                const dy = g.y - f.y;
                const d = Math.hypot(dx, dy);
                if (d < minD) { minD = d; nearest = g; }
              }
            }

            if (nearest) {
              // Set chase target for Fish.js seek logic
              f._seekOtherTargetX = nearest.x;
              f._seekOtherTargetY = nearest.y;

              // Eat if within range
              if (minD < (f._eatRange || 60)) {
                // If we remove something *after* i (which is already processed), it's also fine.
                // But we need to find its index.
                const idx = this._fishes.indexOf(nearest);
                if (idx >= 0) {
                  this._fishes.splice(idx, 1);
                  if (idx <= i) i--; // Adjust current index if we removed current or previous
                }
              }
            }
          }
        } catch (_) { }
        try { f.worldSpeedMul = this._scrollSpeedMul || 1; } catch (_) { }
        try { f.update(dt); } catch (_) { }

        // Stealth Check (Hotaruika Ink)
        let inStealth = false;
        if (stealthSources.length > 0 && !f.isFleeing?.() && !f._shrinking) {
          for (const s of stealthSources) {
            if (s.src === f) continue; // Don't hide self
            const dx = f.x - s.x;
            const dy = f.y - s.y;
            if (dx * dx + dy * dy < s.rSq) { inStealth = true; break; }
          }
        }
        if (inStealth) {
          if (!f._hiddenByStealth) {
            if (f.el) f.el.style.opacity = '0';
            f._hiddenByStealth = true;
          }
        } else {
          if (f._hiddenByStealth) {
            const baseOp = (f.def?.movement?.opacity !== undefined) ? f.def.movement.opacity : 1;
            if (f.el) f.el.style.opacity = String(baseOp);
            f._hiddenByStealth = false;
          }
        }
        if (!f.el || f.y < -200) { try { f.unmount(); } catch (_) { } this._fishes.splice(i, 1); continue; }
        try {
          f._reflectCooldown = Math.max(0, (f._reflectCooldown || 0) - dt);
          if (f._reflectOnFishHit && f._randStraightEnabled && f._randStraightSpeed > 0 && f._reflectCooldown <= 0) {
            const fr = f.el?.getBoundingClientRect?.();
            if (fr) {
              const r1 = Math.max(2, fr.width * 0.45);
              for (let j = 0; j < this._fishes.length; j++) {
                if (j === i) continue;
                const g = this._fishes[j];
                if (!g || !g.el || g.isFleeing?.()) continue;
                const gr = g.el.getBoundingClientRect?.();
                if (!gr) continue;
                const dx = (f.x - g.x);
                const dy = (f.y - g.y);
                const dist = Math.hypot(dx, dy);
                const r2 = Math.max(2, gr.width * 0.45);
                if (isFinite(dist) && dist > 0 && dist < (r1 + r2)) {
                  const nx = dx / dist, ny = dy / dist;
                  let ux = f._randUx || 0, uy = f._randUy || 0;
                  const dot = ux * nx + uy * ny;
                  ux = ux - 2 * dot * nx; uy = uy - 2 * dot * ny;
                  const ln = Math.hypot(ux, uy) || 1;
                  f._randUx = ux / ln; f._randUy = uy / ln;
                  f.direction = (f._randUx >= 0) ? 'right' : 'left';
                  f.x += nx * 3; f.y += ny * 3;
                  f._reflectCooldown = 0.2;
                  break;
                }
              }
            }
          }
        } catch (_) { }
        try {
          if (f._allowOffscreenX && this._safe) {
            const sr = this._safe.getBoundingClientRect();
            const off = Math.max(0, f._despawnOffX || 100);
            if (f.x < -off || f.x > (sr.width + off)) { try { f.unmount(); } catch (_) { } this._fishes.splice(i, 1); continue; }
          }
        } catch (_) { }
        const fishRect = f.getHitRect?.();
        // --- Boss Trigger: Rope Contact Check ---
        try {
          // Boss Trigger logic moved to _updateRope (where collision is actually calculated)
        } catch (e) { console.error(e); }

        if (baitRect && fishRect && this._intersects?.(baitRect, fishRect)) {
          // Special Rank Check: If combo is too low, ignore collision (uncatchable)
          if (f.def?.specialRank) {
            const req = parseInt(f.def.specialRank.replace('f', ''), 10) || 0;
            if ((this._comboCount || 0) < req) continue;
          }

          const baitRank = this._bait?.getRank?.() || 0;
          const fishRank = f.def?.rank || 0;

          // Special Rank Override: If combo requirement is met, force catchable regardless of bait rank
          let forceCatch = false;
          if (f.def?.specialRank) {
            const req = parseInt(f.def.specialRank.replace('f', ''), 10) || 0;
            if ((this._comboCount || 0) >= req) {
              forceCatch = true;
            }
          }

          if (forceCatch || baitRank <= fishRank) {
            if (this._handlingGet) { } else { this._handlingGet = true; }
            try { this._playCatchSfx?.(f.def); } catch (_) { }
            try { this._screenShake?.(220, 14); } catch (_) { }
            try { this._flashWhite?.(120, 0.16); } catch (_) { }
            try { this._duckBgm?.(0.45, 500); } catch (_) { }
            try {
              const yTopOff = -220; const anchorY = -360;
              this._tugBaitDown?.(28, 80)
                .then(() => this._animRopeAnchorTo?.(anchorY, 110))
                .then(() => this._pullBaitTowardAnchorLine?.(160, yTopOff))
                .then(() => { this._skipPreTautFlow = true; this._onGetFish?.(f.def); });
            } catch (_) { this._skipPreTautFlow = true; this._onGetFish?.(f.def); }
            // Force cleanup of ripples
            try { this._layer?.querySelectorAll('.ripple-effect').forEach(el => el.remove()); } catch (_) { }
          } else {
            const gap = Math.max(0, (baitRank || 0) - (fishRank || 0));
            let mul = 1 + gap * 0.25; mul = Math.min(12, Math.max(1.5, mul));
            let dur = Math.min(12000, Math.floor(1200 + gap * 300));
            this.applySpeedBoost?.(mul, dur);
            this._comboCount = (this._comboCount || 0) + 1;
            this._comboTimer = 0;
            this._updateComboOverlay?.();
            this._playComboSfx?.(this._comboCount);
            try { this._screenShake?.(120, Math.min(14, 6 + (this._comboCount || 0) * 0.6)); } catch (_) { }
          }
          try { f.unmount(); } catch (_) { }
          this._fishes.splice(i, 1);
        }
      }
      this._drawHitDebug?.();
    };

    this._startScrollBg = () => {
      if (!this._scrollBg) return;
      const speedSecPerTile = 8; // 1タイルを8秒で流す（以前と同等）
      let last = performance.now();
      let offset = 0; // px
      const loop = (t) => {
        const dt = (t - last) / 1000; last = t;
        const tileH = this._tileH || this._scrollBg.clientHeight || 1024;
        const base = tileH / speedSecPerTile; // px/s
        const speed = base * (this._scrollSpeedMul || 1);
        offset = (offset + speed * dt) % tileH;
        this._scrollBg.style.backgroundPosition = `center ${-Math.floor(offset)}px`;
        // 深度更新（px→m換算）
        this._totalScrollPx = (this._totalScrollPx || 0) + speed * dt;
        this._clockSec = (this._clockSec || 0) + dt;
        this._updateDepthAndSpawns?.(dt);
        // パララックス層の更新（色調/位置/フェード）
        this._updateParallaxLayers?.(dt);
        this._updateFishes?.(dt);
        this._tickCombo?.(dt);
        this._scrollRaf = requestAnimationFrame(loop);
      };
      if (this._scrollRaf) cancelAnimationFrame(this._scrollRaf);
      this._scrollRaf = requestAnimationFrame((t) => { last = t; this._scrollRaf = requestAnimationFrame(loop); });
    };
    this._stopScrollBg = () => { if (this._scrollRaf) cancelAnimationFrame(this._scrollRaf); this._scrollRaf = null; };

    // 深度に応じたパララックス層のスタイル更新
    this._updateParallaxLayers = (dt) => {
      try {
        // 動画モード中（ゲーム非アクティブ）は中面/後面・特殊演出を出さない
        if (!this._gameActive || this._handlingGet) {
          try { if (this._scrollMidLayer) this._scrollMidLayer.style.display = 'none'; } catch (_) { }
          try { if (this._scrollFarLayer) this._scrollFarLayer.style.display = 'none'; } catch (_) { }
          try { if (this._scrollLayerFuji) this._scrollLayerFuji.style.display = 'none'; } catch (_) { }
          try { if (this._scrollMidLayerMega) this._scrollMidLayerMega.style.display = 'none'; } catch (_) { }
          try { if (this._scrollFarLayerMega) this._scrollFarLayerMega.style.display = 'none'; } catch (_) { }
          try { if (this._heatOverlay) this._heatOverlay.style.display = 'none'; } catch (_) { }
          try { if (this._safe) this._safe.style.filter = 'none'; } catch (_) { }
          return;
        }

        const d = Math.max(0, this._depthMeters || 0);
        const clamp01 = (x) => Math.max(0, Math.min(1, x));
        const easeInOutCubic = (x) => (x < 0.5) ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
        const safeRect = this._safe?.getBoundingClientRect?.();
        const H = safeRect?.height || 520;
        const W = safeRect?.width || 920;

        // Near: 既存タイルの色味・明度・透明度を深度で変化（0→1000m）
        try {
          const tt = clamp01(d / 1000);
          const opacity = 0.85 + (0.65 - 0.85) * tt;
          const hue = -12 * tt;
          const sat = 0.96 + (0.88 - 0.96) * tt;
          const br = 1.00 + (0.88 - 1.00) * tt;
          if (this._scrollBg) {
            this._scrollBg.style.opacity = String(opacity);
            this._scrollBg.style.filter = `hue-rotate(${hue}deg) saturate(${sat}) brightness(${br})`;
          }
        } catch (_) { }

        // --- Megalodon Area (1000m - 2000m) ---
        // Far: 1000m -> 2000m
        try {
          if (this._scrollFarLayerMega) {
            // Appear 1000-1100, Disappear 2100-2200 (Extended to 2200m)
            const dMega = d;
            if (dMega >= 1000 && dMega <= 2200) {
              this._scrollFarLayerMega.style.display = 'block';
              const img = this._scrollFarImgMega;
              if (img) {
                const iW = img.naturalWidth || 0;
                const iH = img.naturalHeight || 0;
                const sFar = Math.max(0.1, this._farScale || 1);
                img.style.width = `${sFar * 100}%`;
                img.style.left = `${(1 - sFar) * 50}%`;
                const dispH = (iW > 0) ? (W * (iH / iW) * sFar) : (H * sFar);
                // Move up/down logic (similar to Kraken but for this range)
                const yStart = H + 8;
                const yEnd = -dispH - 8;
                // Normalize 1000->2200 to 0->1
                let tFar = clamp01((dMega - 1000) / 1200);
                tFar = easeInOutCubic(tFar);
                const y = yStart + (yEnd - yStart) * tFar;
                img.style.transform = `translateY(${Math.round(y)}px)`;

                // Fade In/Out
                const aIn = clamp01((dMega - 1000) / 100);
                const aOut = 1 - clamp01((dMega - 2100) / 100);
                const op = Math.max(0, Math.min(1, Math.min(aIn, aOut))) * 0.6; // Slightly darker?
                this._scrollFarLayerMega.style.opacity = String(op);
              }
            } else {
              this._scrollFarLayerMega.style.display = 'none';
            }
          }
        } catch (_) { }

        // Mid: 1300m -> 2000m
        try {
          if (this._scrollMidLayerMega) {
            const dMega = d;
            if (dMega >= 1300 && dMega <= 2000) {
              this._scrollMidLayerMega.style.display = 'block';
              const img = this._scrollMidImgMega;
              if (img) {
                const iW = img.naturalWidth || 0;
                const iH = img.naturalHeight || 0;
                const sMid = Math.max(0.1, this._midScale || 1);
                img.style.width = `${sMid * 100}%`;
                img.style.left = `${(1 - sMid) * 50}%`;
                const dispH = (iW > 0) ? (W * (iH / iW) * sMid) : (H * sMid);

                const yStart = H + 10;
                const yEnd = -dispH - 10;
                // Normalize 1300->2000 to 0->1
                let tMid = clamp01((dMega - 1300) / 700);
                tMid = easeInOutCubic(tMid);
                const y = yStart + (yEnd - yStart) * tMid;
                img.style.transform = `translateY(${Math.round(y)}px)`;

                // Fade In/Out
                const aIn = clamp01((dMega - 1300) / 100);
                const aOut = 1 - clamp01((dMega - 1900) / 100);
                const op = Math.max(0, Math.min(1, Math.min(aIn, aOut)));
                this._scrollMidLayerMega.style.opacity = String(op);
              }
            } else {
              this._scrollMidLayerMega.style.display = 'none';
            }
          }
        } catch (_) { }

        // --- Fuji Area (2000m - 3000m) ---
        try {
          if (this._scrollLayerFuji) {
            const dFuji = d;
            // 2000m~3000mの間表示。フェードイン・アウト
            if (dFuji >= 2000 && dFuji <= 3200) {
              this._scrollLayerFuji.style.display = 'block';
              const img = this._scrollImgFuji;
              if (img) {
                const iW = img.naturalWidth || 0;
                const iH = img.naturalHeight || 0;
                // 富士山は巨大な一枚絵
                const sFuji = Math.max(0.1, this._midScale || 1.8);
                img.style.width = `${sFuji * 100}%`;
                img.style.left = `${(1 - sFuji) * 50}%`;

                const dispH = (iW > 0) ? (W * (iH / iW) * sFuji) : (H * sFuji);

                // 下から上へ移動
                const yStart = H + 10;
                const yEnd = -dispH - 10;

                // 2000mから開始、3000mで終了
                let tFuji = clamp01((dFuji - 2000) / 1000);
                tFuji = easeInOutCubic(tFuji);

                const y = yStart + (yEnd - yStart) * tFuji;
                img.style.transform = `translateY(${Math.round(y)}px)`;

                // Fade In: 2000-2100m, Fade Out: 2900-3000m
                const aIn = clamp01((dFuji - 2000) / 100);
                const aOut = 1 - clamp01((dFuji - 2900) / 100);
                const op = Math.max(0, Math.min(1, Math.min(aIn, aOut)));

                this._scrollLayerFuji.style.opacity = String(op);
              }
            } else {
              this._scrollLayerFuji.style.display = 'none';
            }
          }
        } catch (_) { }

        // --- Cthulhu Area (3000m - 4000m) ---
        // 3000m -> 4000m Scroll Up. Fade In 3000-3200, Fade Out 3800-4000
        try {
          if (this._scrollCthulhuLayer && this._scrollCthulhuImg) {
            const dCthulhu = d;
            if (dCthulhu >= 2800 && dCthulhu <= 4200) {
              this._scrollCthulhuLayer.style.display = 'block';
              const img = this._scrollCthulhuImg;
              const iW = img.naturalWidth || 0;
              const iH = img.naturalHeight || 0;
              const sCthulhu = 1.0;
              img.style.width = `${sCthulhu * 100}%`;
              img.style.left = `${(1 - sCthulhu) * 50}%`;

              const dispH = (iW > 0) ? (W * (iH / iW) * sCthulhu) : (H * sCthulhu);
              const yStart = H + 10;
              const yEnd = -dispH - 10;

              // Map 3000..4000 to 0..1
              let tCthulhu = clamp01((dCthulhu - 3000) / 1000);
              tCthulhu = easeInOutCubic(tCthulhu);

              const y = yStart + (yEnd - yStart) * tCthulhu;
              img.style.transform = `translateY(${Math.round(y)}px)`;

              // Fade In: 3000-3100m, Fade Out: 3900-4000m
              const aIn = clamp01((dCthulhu - 3000) / 100);
              const aOut = 1 - clamp01((dCthulhu - 3900) / 100);
              const op = Math.max(0, Math.min(1, Math.min(aIn, aOut)));

              this._scrollCthulhuLayer.style.opacity = String(op);
            } else {
              this._scrollCthulhuLayer.style.display = 'none';
            }
          }
        } catch (_) { }

        // --- Volcano Effects (2000m - 3000m) ---
        // Red Glow & Heat Haze
        try {
          const dVolc = d;
          if (dVolc >= 1800 && dVolc <= 3300) {
            // Calculate Intensity (0..1)
            // Enter: 1800-2200 (400m Fade In), Peak: 2200-2800, Exit: 2800-3300 (500m Fade Out)
            let intensity = 0;
            if (dVolc < 2200) intensity = (dVolc - 1800) / 400;
            else if (dVolc > 2800) intensity = 1 - (dVolc - 2800) / 500;
            else intensity = 1;

            intensity = Math.max(0, Math.min(1, intensity));

            // Red Flash at 2000m entry (Pulse)
            let flash = 0;
            if (dVolc >= 1950 && dVolc <= 2150) {
              const p = (dVolc - 1950) / 200; // 0..1
              flash = Math.sin(p * Math.PI) * 0.5;
            }

            // Apply Red Overlay
            if (this._heatOverlay) {
              this._heatOverlay.style.display = 'block';
              // Change blend mode to 'hard-light' for better visibility on dark background
              this._heatOverlay.style.mixBlendMode = 'hard-light';

              // Base opacity depends on intensity
              const baseOp = 0.35 * intensity;
              // Flash adds to it
              const totalOp = Math.min(0.85, baseOp + flash);
              this._heatOverlay.style.opacity = String(totalOp);

              // Dynamic pulsing if hot
              if (intensity > 0.5) {
                const pulse = (Math.sin(performance.now() / 400) + 1) * 0.5 * 0.12;
                this._heatOverlay.style.opacity = String(Math.min(1, totalOp + pulse));
              }
            }

            // Apply Heat Haze (SVG Filter)
            if (this._safe) {
              if (intensity > 0.05) {
                const filter = document.getElementById('df-heat-haze');
                const turb = filter ? filter.querySelector('feTurbulence') : null;
                const disp = filter ? filter.querySelector('feDisplacementMap') : null;

                if (turb) {
                  const t = performance.now() / 1000;
                  // Shift frequency slightly to create shimmering
                  const bfX = 0.015 + Math.sin(t) * 0.002;
                  const bfY = 0.005 + Math.cos(t * 1.3) * 0.002;
                  turb.setAttribute('baseFrequency', `${bfX} ${bfY}`);
                }
                // Adjust scale based on intensity
                if (disp) {
                  disp.setAttribute('scale', String(15 * intensity));
                }
                this._safe.style.filter = 'url(#df-heat-haze)';
              } else {
                this._safe.style.filter = 'none';
              }
            }

          } else {
            if (this._heatOverlay) this._heatOverlay.style.display = 'none';
            if (this._safe) this._safe.style.filter = 'none';
          }
        } catch (_) { }


        // Mid: 300→900m で下→上へ通過。フェードは 300→380m IN, 820→900m OUT
        try {
          if (this._scrollMidLayer && this._scrollMidImg) {
            const img = this._scrollMidImg;
            // Only show if in range (optimization)
            if (d < 1300) {
              this._scrollMidLayer.style.display = 'block';
              const iW = img.naturalWidth || 0;
              const iH = img.naturalHeight || 0;
              const sMid = Math.max(0.1, this._midScale || 1);
              img.style.width = `${sMid * 100}%`;
              img.style.left = `${(1 - sMid) * 50}%`;
              const dispH = (iW > 0) ? (W * (iH / iW) * sMid) : (H * sMid);
              const yStart = H + 10;       // 画面下外
              const yEnd = -dispH - 10;  // 画面上外
              let tMid = clamp01(d / 1500);
              tMid = easeInOutCubic(tMid);
              const y = yStart + (yEnd - yStart) * tMid;
              img.style.transform = `translateY(${Math.round(y)}px)`;
              const aIn = clamp01(d / 80);
              const aOut = 1 - clamp01((d - 1200) / 100);
              const op = Math.max(0, Math.min(1, Math.min(aIn, aOut)));
              this._scrollMidLayer.style.opacity = String(op);
            } else {
              this._scrollMidLayer.style.display = 'none';
            }
          }
        } catch (_) { }

        // Far: 0→1500m で下→上へゆっくり通過。フェードは 0→120m IN, 1380→1500m OUT
        try {
          if (this._scrollFarLayer && this._scrollFarImg) {
            const img = this._scrollFarImg;
            // Only show if in range
            if (d < 1600) {
              this._scrollFarLayer.style.display = 'block';
              const iW = img.naturalWidth || 0;
              const iH = img.naturalHeight || 0;
              const sFar = Math.max(0.1, this._farScale || 1);
              // スケールを width% と left% で適用（中央寄せ）
              img.style.width = `${sFar * 100}%`;
              img.style.left = `${(1 - sFar) * 50}%`;
              const dispH = (iW > 0) ? (W * (iH / iW) * sFar) : (H * sFar);
              const yStart = H + 8;
              const yEnd = -dispH - 8;
              const dAdj = d + (this._farDepthOffsetMeters || 0);
              let tFar = clamp01(dAdj / 1500);
              tFar = easeInOutCubic(tFar);
              const y = yStart + (yEnd - yStart) * tFar;
              img.style.transform = `translateY(${Math.round(y)}px)`;
              const aIn = clamp01(dAdj / 80);
              const aOut = 1 - clamp01((dAdj - 1380) / 120);
              const baseOp = Math.max(0, Math.min(1, Math.min(aIn, aOut)));
              const op = baseOp * 0.45;
              this._scrollFarLayer.style.opacity = String(op);
            } else {
              this._scrollFarLayer.style.display = 'none';
            }
          }
        } catch (_) { }
      } catch (_) { }
    };

    // 餌箱（右上 or ミニ）の魚画像を差し替え（任意src）
    this._setEsabakoSprite = (src, alt) => {
      try {
        // 旧: 右上版がなければミニを生成
        if (!this._esabakoMini) this._spawnEsabakoMini?.();
        const imgMini = this._esabakoMini?.querySelector?.('.ebi-img-mini');
        if (imgMini && src) {
          try { imgMini.onerror = null; imgMini.onload = () => { try { this._positionBaitNavArrows?.(); } catch (_) { } }; if (imgMini.complete) this._positionBaitNavArrows?.(); } catch (_) { }
          imgMini.src = src;
          imgMini.alt = alt || 'bait';
        }
        // ゲームHUD側のミニも同期
        const imgMiniGame = this._esabakoMiniGame?.querySelector?.('.ebi-img-mini');
        if (imgMiniGame && src) {
          try { imgMiniGame.onerror = null; imgMiniGame.onload = () => { try { this._positionBaitNavArrows?.(); } catch (_) { } }; if (imgMiniGame.complete) this._positionBaitNavArrows?.(); } catch (_) { }
          imgMiniGame.src = src;
          imgMiniGame.alt = alt || 'bait';
        }
        // 右上版もあれば同期
        const img = this._esabakoGroup?.querySelector?.('.ebi-img');
        if (img && src) {
          try { img.onerror = null; } catch (_) { }
          img.src = src;
          img.alt = alt || 'bait';
        }
      } catch (_) { }
    };
    // 餌箱（ミニ優先）の魚画像を差し替え（id基準）
    // fishes/ と fish/ の両方を試し、既知の別名も考慮。最終的に共通シルエットへフォールバック。
    this._setEsabakoById = (id) => {
      try {
        if (!id) return;
        const altMap = {
          maaji: 'aji',
          maiwashi: 'iwashi',
          masaba: 'saba',
          madai: 'tai',
          shiirakansu: 'si-rakansu',
          atorantikkusaamon: 'atoranteikkusaamon'
        };
        const alts = [id];
        if (altMap[id]) alts.push(altMap[id]);
        // 候補（pngベースを列挙）: fishes/ → fish/ → 別名（同順）
        const bases = [];
        for (const name of alts) {
          bases.push(this._getAssetPath(`assets/fishes/${name}.png`));
          bases.push(this._getAssetPath(`assets/fish/${name}.png`));
        }
        bases.push(this._getAssetPath('assets/fish.png')); // 最終退避

        // 画像要素ターゲット（存在するもの全てを同期更新）
        const targets = [];
        try { if (!this._esabakoMini) this._spawnEsabakoMini?.(); } catch (_) { }
        const t1 = this._esabakoMini?.querySelector?.('.ebi-img-mini');
        const t2 = this._esabakoMiniGame?.querySelector?.('.ebi-img-mini');
        const t3 = this._esabakoGroup?.querySelector?.('.ebi-img');
        if (t1) targets.push(t1);
        if (t2) targets.push(t2);
        if (t3) targets.push(t3);
        if (!targets.length) return;

        // 個々の <img> に対して順次フォールバック（png→次候補）
        const applyWithFallback = (imgEl) => {
          let idx = 0;
          const trySet = () => {
            const base = bases[Math.min(idx, bases.length - 1)];
            if (!base) return;
            try { imgEl.onload = () => { try { this._positionBaitNavArrows?.(); } catch (_) { } }; if (imgEl.complete) this._positionBaitNavArrows?.(); } catch (_) { }
            imgEl.onerror = () => {
              // 次の候補へ
              idx += 1;
              if (idx < bases.length) { trySet(); }
            };
            // 初手は png
            imgEl.src = base;
            try { imgEl.alt = id || 'bait'; } catch (_) { }
          };
          trySet();
        };

        for (const img of targets) applyWithFallback(img);
      } catch (_) { }
    };

    this._buildFishIndex = () => {
      try {
        // 全魚データ（_fishData）をベースにリスト構築
        // 常に初期餌（ランク0）を先頭に
        const list = [{ id: 'ebi', rank: 0, name_ja: 'エビ', sprite: 'assets/taiwoturuebi.png', locked: false }];

        // 獲得済み魚のIDセット
        const caughtSet = new Set();
        if (Array.isArray(this.state?.caught)) {
          this.state.caught.forEach(c => { if (c && c.id) caughtSet.add(c.id); });
        }

        // 全魚データをランク順 > ID順にソート
        const allFish = [...(this._fishData || [])].sort((a, b) => {
          const ra = Number(a.rank || 0);
          const rb = Number(b.rank || 0);
          if (ra !== rb) return ra - rb;
          return (a.id || '').localeCompare(b.id || '');
        });

        const seen = new Set(['ebi']);
        for (const fish of allFish) {
          if (!fish || !fish.id) continue;
          if (seen.has(fish.id)) continue;
          // クラーケンも除外せずに追加する（ボス扱いだが餌として選択可能にする）
          // if (fish.id === 'kura-ken') continue;

          seen.add(fish.id);

          // 獲得済みかチェック
          const isCaught = caughtSet.has(fish.id);

          list.push({
            ...fish,
            locked: !isCaught // 未獲得ならロック
          });
        }

        // ... (lines omitted) ...



        this._availableBaits = list;

        // 現在の餌インデックス更新
        const curId = this.state?.bait?.id || 'ebi';
        const idx = list.findIndex(b => b.id === curId);
        this._currentBaitIndex = (idx >= 0) ? idx : 0;

      } catch (_) { }
    };

    this._getMaxRank = () => {
      let m = 0;
      try { for (const f of this._fishData || []) { const r = Number(f?.rank || 0); if (r > m) m = r; } } catch (_) { }
      try { for (const c of (this.state?.caught || [])) { const r = Number(c?.rank || 0); if (r > m) m = r; } } catch (_) { }
      return m;
    };

    this._chooseCaughtFishForRank = (rank) => {
      try {
        const rr = Number(rank || 0);
        const list = Array.isArray(this.state?.caught) ? this.state.caught : [];
        const hit = list.find(e => Number(e?.rank || 0) === rr);
        return hit ? (hit.id || null) : null;
      } catch (_) { return null; }
    };

    this._refreshEsabakoForCurrent = () => {
      try {
        if (!this._availableBaits || !this._availableBaits.length) this._buildFishIndex?.();
        const idx = this._currentBaitIndex || 0;
        const bait = this._availableBaits[idx];

        if (!bait) return;

        // アニメーション適用（クラスを付け外し）
        const applyAnim = () => {
          try {
            const host = this._esabakoMini;
            const img = host?.querySelector?.('.ebi-img-mini');
            if (img) {
              img.classList.remove('bait-switch-blink');
              void img.offsetWidth; // リフロー強制
              img.classList.add('bait-switch-blink');
            }
          } catch (_) { }
        };

        if (bait.locked) {
          // 未獲得魚：？マーク表示
          this._setEsabakoSprite?.(this._getAssetPath('assets/Q.png'), 'unknown');
        } else if (bait.id === 'ebi') {
          this._setEsabakoSprite?.(this._getAssetPath('assets/taiwoturuebi.png'), 'ebi');
        } else {
          this._setEsabakoById?.(bait.id);
        }

        this._positionBaitNavArrows?.();
        applyAnim();

      } catch (_) { }
    };

    this._setBaitByIndex = (index) => {
      console.log('[DEBUG] _setBaitByIndex called with index:', index, 'seqStarted:', this._seqStarted);
      // GUARD: 投げる動作中（_seqStarted=true）に、意図せずエビ（index=0）に戻されるのを防ぐ
      if (this._seqStarted && index === 0 && this._currentBaitIndex > 0) {
        console.warn(`[GUARD] Blocked bait reset to 0 during sequence! Current: ${this._currentBaitIndex}`);
        // console.log(new Error().stack);
        return;
      }
      // console.log(new Error().stack);
      try {
        if (!this._availableBaits) this._buildFishIndex?.();
        const list = this._availableBaits || [];
        if (!list.length) return;

        const idx = Math.max(0, Math.min(list.length - 1, index));
        this._currentBaitIndex = idx;
        const bait = list[idx];

        // 餌オブジェクト更新（ロックされていても論理的にはセットするが、保存時はロック状態を考慮してもよい）
        // ここではロックされていても「その魚を選んでいる」状態として保存する（次回起動時に復元するため）
        this._bait?.setLogicalRank?.(bait.rank, bait.id);

        // 画像も更新
        const src = bait.sprite || bait.src || 'assets/taiwoturuebi.png';
        this._bait?.setType?.({
          id: bait.id,
          name: bait.name_ja || bait.name,
          rank: bait.rank,
          src: src
        });

        // セーブ
        try {
          SaveManager.setBait?.(this.state, bait.id, bait.rank);
          SaveManager.save?.(this.state);
        } catch (_) { }

        // 表示更新
        this._refreshEsabakoForCurrent?.();

      } catch (_) { }
    };

    this._ensureFishDataLoaded = async () => {
      try {
        if (Array.isArray(this._fishData) && this._fishData.length) return;
        await this._loadFishData?.();
      } catch (_) { }
    };

    this._stepBaitRank = async (dir) => {
      try {
        await this._ensureFishDataLoaded?.();
        if (!this._availableBaits) this._buildFishIndex?.();

        const len = this._availableBaits?.length || 0;
        if (len <= 1) return;

        let next = (this._currentBaitIndex || 0) + (dir < 0 ? -1 : 1);
        if (next < 0) next = len - 1; // ループさせる
        if (next >= len) next = 0;

        this._setBaitByIndex?.(next);
      } catch (_) { }
    };

    this._spawnBaitNav = () => {
      console.log('[DEBUG] _spawnBaitNav called');
      try {
        if (!this._esabakoMini) this._spawnEsabakoMini?.();
        const host = this._esabakoMini;
        if (!host) { console.warn('[DEBUG] _spawnBaitNav: no host'); return; }
        if (this._baitNav) { console.log('[DEBUG] _spawnBaitNav: already exists'); return; }
        const nav = document.createElement('div');
        nav.className = 'bait-nav';
        const mk = (cls, label) => {
          const img = document.createElement('img');
          img.className = 'arrow-btn ' + cls;
          try { img.decoding = 'async'; } catch (_) { }
          img.alt = label || '';
          const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><polygon points="10,40 70,10 70,70" fill="white"/></svg>';
          img.onerror = () => {
            try {
              if (/triangle\.png$/i.test(img.src)) img.src = 'assets/yajirushi.png';
              else if (/yajirushi\.png$/i.test(img.src)) img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
              else img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
            } catch (_) { }
          };
          img.src = 'assets/triangle.png';
          return img;
        };
        const left = mk('arrow-left', 'prev');
        const right = mk('arrow-right', 'next');
        nav.appendChild(left);
        nav.appendChild(right);
        const wrap = host.querySelector?.('.esabako-mini-wrap') || host;
        wrap.appendChild(nav);
        try { nav.style.display = 'block'; } catch (_) { }
        this._baitNav = nav;
        this._baitNavLeft = left;
        this._baitNavRight = right;
        try {
          left.style.left = '0px'; left.style.top = '50%'; left.style.transform = 'scaleX(-1)';
          right.style.right = '';
          right.style.left = 'calc(100% - 40px)'; right.style.top = '50%'; right.style.transform = '';
        } catch (_) { }
        const stopEvt = (ev) => { try { ev.preventDefault?.(); ev.stopPropagation?.(); } catch (_) { } };
        this._onBaitPrev = async (ev) => { stopEvt(ev); await this._stepBaitRank?.(-1); };
        this._onBaitNext = async (ev) => { stopEvt(ev); await this._stepBaitRank?.(1); };
        this._onBaitNavStop = () => {
          try { if (this._baitNavHoldTimer) clearTimeout(this._baitNavHoldTimer); } catch (_) { }
          try { if (this._baitNavHoldLoopTimer) clearTimeout(this._baitNavHoldLoopTimer); } catch (_) { }
          this._baitNavHoldTimer = null;
          this._baitNavHoldLoopTimer = null;
          this._baitNavHoldDelay = null;
        };
        const beginAuto = (dir) => {
          this._baitNavHoldDelay = 260;
          const loop = () => {
            this._stepBaitRank?.(dir);
            this._baitNavHoldDelay = Math.max(60, (this._baitNavHoldDelay || 260) - 18);
            this._baitNavHoldLoopTimer = setTimeout(loop, this._baitNavHoldDelay);
          };
          this._baitNavHoldLoopTimer = setTimeout(loop, this._baitNavHoldDelay);
        };
        const startHold = (dir) => {
          this._onBaitNavStop?.();
          this._baitNavHoldTimer = setTimeout(() => { beginAuto(dir); }, 380);
        };
        left.addEventListener('pointerdown', (ev) => { stopEvt(ev); this._stepBaitRank?.(-1); startHold(-1); });
        right.addEventListener('pointerdown', (ev) => { stopEvt(ev); this._stepBaitRank?.(1); startHold(1); });
        left.addEventListener('pointerup', (ev) => { stopEvt(ev); this._onBaitNavStop?.(); });
        right.addEventListener('pointerup', (ev) => { stopEvt(ev); this._onBaitNavStop?.(); });
        left.addEventListener('pointercancel', (ev) => { stopEvt(ev); this._onBaitNavStop?.(); });
        right.addEventListener('pointercancel', (ev) => { stopEvt(ev); this._onBaitNavStop?.(); });
        left.addEventListener('pointerleave', (ev) => { stopEvt(ev); this._onBaitNavStop?.(); });
        right.addEventListener('pointerleave', (ev) => { stopEvt(ev); this._onBaitNavStop?.(); });
        nav.addEventListener('pointerdown', (ev) => { stopEvt(ev); });
        nav.addEventListener('pointerup', (ev) => { stopEvt(ev); this._onBaitNavStop?.(); });
        requestAnimationFrame(() => { this._positionBaitNavArrows?.(); });
        try {
          const start = performance.now();
          const pump = (t) => {
            this._positionBaitNavArrows?.();
            if (t - start < 800) requestAnimationFrame(pump);
          };
          requestAnimationFrame(pump);
        } catch (_) { }
        try { const imgMini = host.querySelector?.('.ebi-img-mini'); if (imgMini && !imgMini.complete) imgMini.addEventListener('load', () => { this._positionBaitNavArrows?.(); }, { once: true }); } catch (_) { }
        const initRank = (this.state?.bait?.rank != null) ? this.state.bait.rank : 0;
        // 初期化時にインデックスを構築し、保存されているIDに合わせてセット
        this._buildFishIndex?.();
        this._refreshEsabakoForCurrent?.();
      } catch (_) { }
    };

    this._positionBaitNavArrows = () => {
      try {
        const host = this._esabakoMini;
        const nav = this._baitNav;
        const left = this._baitNavLeft;
        const right = this._baitNavRight;
        const wrap = host?.querySelector?.('.esabako-mini-wrap') || host;
        const bait = wrap?.querySelector?.('.ebi-img-mini');
        if (!host || !nav || !left || !right || !bait) return;
        const hr = wrap.getBoundingClientRect();
        const ir = bait.getBoundingClientRect();
        const lw = Math.max(1, Math.floor(left.getBoundingClientRect().width || left.width || 24));
        const lh = Math.max(1, Math.floor(left.getBoundingClientRect().height || left.height || 24));
        const rw = Math.max(1, Math.floor(right.getBoundingClientRect().width || right.width || 24));
        const rh = Math.max(1, Math.floor(right.getBoundingClientRect().height || right.height || 24));
        const dx = ir.left - hr.left;
        const dy = ir.top - hr.top;
        const gap = Math.max(6, Math.round(ir.width * 0.10));
        let lX = Math.floor(dx - lw - gap);
        let rX = Math.floor(dx + ir.width + gap);
        let cY = Math.floor(dy + ir.height / 2);
        let lY = Math.floor(cY - lh / 2);
        let rY = Math.floor(cY - rh / 2);
        const maxW = Math.floor(hr.width);
        const maxH = Math.floor(hr.height);
        if (lX < 0) lX = 0;
        if (rX + rw > maxW) rX = Math.max(0, maxW - rw);
        if (lY < 0) lY = 0;
        if (rY < 0) rY = 0;
        if (lY + lh > maxH) lY = Math.max(0, maxH - lh);
        if (rY + rh > maxH) rY = Math.max(0, maxH - rh);
        left.style.position = 'absolute';
        right.style.position = 'absolute';
        left.style.right = '';
        right.style.right = '';
        left.style.left = lX + 'px';
        left.style.top = lY + 'px';
        right.style.left = rX + 'px';
        right.style.top = rY + 'px';
      } catch (_) { }
    };

    // GET演出: 動画画面へ遷移し、GETテキストと魚名画像を表示、餌を差し替え
    this._onGetFish = async (def) => {
      if (this._handlingGet && !this._skipPreTautFlow && !this._specialGetWaitForEnd) return;
      this._handlingGet = true;
      try {
        // Increment session catch count
        this._sessionCatchCount = (this._sessionCatchCount || 0) + 1;
        // 演出のリセットは不要（沈み演出を廃止）
        // まず糸を張って浮きを上昇（当たり停止）
        this._gameActive = false;
        this._resetCombo?.();
        try { if (def && def.id === 'kura-ken') this._stopBgm?.(); } catch (_) { }
        this._stopScrollBg?.();
        if (!this._skipPreTautFlow) {
          await this._playTautAndFloatAnim?.();
          await this._liftBaitShort?.();
        }
        // Reset Deep Mode if active (so Get screen is clean)
        if (this._isDeepMode) {
          this._isDeepMode = false;
          try { document.body.classList.remove('deep-mode'); } catch (_) { }
          try { const bg = this.root.querySelector('.fish-bg'); if (bg) bg.style.opacity = '1'; } catch (_) { }
          this._stopDeepEffects?.();
        }
        // 以降はロープ無効化
        this._ropeEnabled = false; if (this._ropeCanvas) this._ropeCanvas.style.display = 'none';
        // 黒フェードで一旦ブロック
        await this._showBlack();
        // 動画画面へ切り戻し（turigamennsyoki.mp4 を再生して表示）
        if (this._videoEl) {
          this._videoEl.style.display = 'block';
          this._videoEl.style.visibility = 'visible';
          // クラーケンまたはボスID判定
          const isBoss = def && (def.id === 'kura-ken' || def.id === 'megarodon' || def.id === 'fujisan' || def.id === 'igyounokami');
          // クラーケン再生フラグON（レイアウト補正に使用）
          this._isKrakenVideoActive = !!isBoss;
          this._activeBossId = isBoss ? def.id : null;
          try {
            if (isBoss) {
              this._videoEl.style.WebkitMaskImage = 'none';
              this._videoEl.style.maskImage = 'none';
            }
          } catch (_) { }
          try {
            const desiredSrc = (isBoss && this._specialGetVideoSrc)
              ? this._specialGetVideoSrc
              : 'assets/turigamennsyoki.mp4';
            const cur = (this._videoEl.currentSrc || this._videoEl.src || '');
            if (!cur.endsWith(desiredSrc)) {
              this._videoEl.src = desiredSrc;
              try { this._videoEl.load(); } catch (_) { }
            }
            try { this._videoEl.loop = !this._specialGetWaitForEnd; } catch (_) { }
            // 音声設定は _ensureVideoVisible 後に行うためここでは行わない
            try { this._videoEl.play?.(); } catch (_) { }
          } catch (_) { }
        }
        // 餌は動画復帰中は非表示
        try { this._bait?.hide?.(); } catch (_) { }
        // ロープは動画中は描画しない
        try { this._ropeEnabled = false; if (this._ropeCanvas) this._ropeCanvas.style.display = 'none'; } catch (_) { }
        // セーフエリア（魚・浮き等）を非表示にして動画に被らないようにする
        try { if (this._safe) this._safe.style.display = 'none'; } catch (_) { }
        // 既存の魚をすべて消す（念のためDOM掃除も）
        try { this._safe?.querySelectorAll?.('.fish-sprite')?.forEach(el => el.remove()); } catch (_) { }
        try { this._layer?.querySelectorAll?.('.area-cutin')?.forEach(el => el.remove()); } catch (_) { }
        if (this._scrollBg) this._scrollBg.style.display = 'none';
        if (this._scrollMidLayer) this._scrollMidLayer.style.display = 'none';
        if (this._scrollFarLayer) this._scrollFarLayer.style.display = 'none';
        if (this._scrollMidLayerMega) this._scrollMidLayerMega.style.display = 'none';
        if (this._scrollFarLayerMega) this._scrollFarLayerMega.style.display = 'none';
        if (this._scrollLayerFuji) this._scrollLayerFuji.style.display = 'none';
        if (this._scrollCthulhuLayer) this._scrollCthulhuLayer.style.display = 'none';
        if (this._heatOverlay) this._heatOverlay.style.display = 'none';
        if (this._safe) this._safe.style.filter = 'none';
        if (this._gameBlackBg) this._gameBlackBg.style.display = 'none';
        if (this._blackBelow) this._blackBelow.style.display = 'block';
        // 既存の魚を配列側でもすべて消す
        try {
          for (const ff of this._fishes || []) { try { ff.unmount(); } catch (_) { } }
        } catch (_) { }
        this._fishes = [];
        this._spawners = [];
        // 餌・餌箱の更新はワイプ終了後に行う（ここでは保留）。クラーケンは対象外。
        // 餌・餌箱の更新はワイプ終了後に行う（ここでは保留）。クラーケンも対象にする。
        if (def) {
          this._pendingBaitId = def?.id;
          this._pendingBaitRank = def?.rank || 0;
        } else {
          this._pendingBaitId = null;
          this._pendingBaitRank = null;
        }
        // 自動セーブ：釣った魚を記録
        try {
          SaveManager.recordCatch(this.state, def);
          // 餌リストの再構築と反映は、ここでの即時実行をやめて復帰時（_runWipeAndReturn）に行う
          // これによりGET演出中の「ネタバレ」を防ぐ
        } catch (_) { }
        // 動画を確実に可視化→黒を外して見せる
        await this._ensureVideoVisible();

        // 音声設定（_ensureVideoVisibleでミュートされるため再設定）
        try {
          const isBoss = def && (def.id === 'kura-ken' || def.id === 'megarodon' || def.id === 'fujisan' || def.id === 'igyounokami');
          const useVideoAudio = (def && def.id === 'fujisan');
          if (this._videoEl) {
            this._videoEl.defaultMuted = !useVideoAudio;
            this._videoEl.muted = !useVideoAudio;
            if (useVideoAudio) {
              const s = this.state?.settings || {};
              const vol = Math.max(0, Math.min(1, Number((s.sfxVolume ?? 5) / 10)));
              this._videoEl.volume = vol;
            } else {
              this._videoEl.volume = 0;
            }
          }
        } catch (_) { }
        await this._waitForVideoReady(1200);
        await this._waitForVideoMeta(1200);

        // 新しい動画サイズ/比率に合わせて再レイアウト（クラーケン時はスライド演出を無効化し位置固定）
        if (def && def.id === 'kura-ken') {
          try { this._videoAnimY = 0; this._onResize?.(); } catch (_) { }
          await this._hideBlack();
          try { this._playKrakenSfx?.(); } catch (_) { }
        } else {
          try { this._onResize?.(); } catch (_) { }
          // まず動画を上から元位置へスライドダウンする演出
          try { this._applyVideoAnim?.(-100); } catch (_) { }
          await this._hideBlack();
          await this._playVideoSlideFromTop(800, -100);
        }
        // 動画画面に復帰したので「タイトルへ」を表示
        this._setBackVisible?.(true);
        // 既存の魚オーバーレイ/裏キャンバスが残っていれば掃除
        try { this._layer?.querySelectorAll?.('.caught-fish-overlay,.get-backdrop-canvas')?.forEach(el => el.remove()); } catch (_) { }
        if (!this._specialGetWaitForEnd) {
          // 映像を所定時間だけ見せるホールド（指定時）
          try { const holdMs = Math.max(0, this._specialGetVideoHoldMs || 0); if (holdMs) { await new Promise(r => setTimeout(r, holdMs)); } } catch (_) { }
          // GETオーバーレイ直前に背景スクロールを停止・非表示にする
          try {
            this._stopScrollBg?.();
            if (this._scrollBg) this._scrollBg.style.display = 'none';
            if (this._scrollMidLayer) this._scrollMidLayer.style.display = 'none';
            if (this._scrollFarLayer) this._scrollFarLayer.style.display = 'none';
            if (this._scrollMidLayerMega) this._scrollMidLayerMega.style.display = 'none';
            if (this._scrollFarLayerMega) this._scrollFarLayerMega.style.display = 'none';
            if (this._gameBlackBg) this._gameBlackBg.style.display = 'none';
            if (this._blackBelow) this._blackBelow.style.display = 'block';
            // クラーケン再生フラグOFF（通常レイアウトへ）
            this._isKrakenVideoActive = false;
            if (this._videoEl) {
              this._videoEl.style.WebkitMaskImage = 'linear-gradient(to bottom, rgba(255,255,255,1) 94%, rgba(255,255,255,0) 100%)';
              this._videoEl.style.maskImage = 'linear-gradient(to bottom, rgba(255,255,255,1) 94%, rgba(255,255,255,0) 100%)';
            }
          } catch (_) { }
          // 背面バックドロップはGET中は非表示
          try { if (this._videoBackdrop) this._videoBackdrop.style.display = 'none'; } catch (_) { }
          this._showCaughtFish?.(def);
          try { this._screenShake?.(160, 8); } catch (_) { }
          try { this._startGetWaterWobble?.(1100, 10); } catch (_) { }
          try { this._startGetRippleRings?.(900, 3); } catch (_) { }
          setTimeout(() => { this._runWipeAndReturn?.(); }, 1200);
          // → 次以降で誤適用されないよう即クリア
          try { this._specialGetVideoSrc = null; this._specialGetVideoHoldMs = 0; this._specialGetWaitForEnd = false; } catch (_) { }
          this._seqStarted = false;
          this._awaitingRestart = false;
        } else {
          try {
            const v = this._videoEl;
            if (v) {
              const onEnd = async () => {
                try { v.removeEventListener('ended', onEnd); } catch (_) { }
                try { if (toEnd) clearTimeout(toEnd); } catch (_) { }
                // Stop any boss SFX (Except Igyounokami: User wants it to persist)
                if (this._bossSfx && (!def || def.id !== 'igyounokami')) {
                  try { this._bossSfx.pause(); } catch (_) { }
                  this._bossSfx = null;
                }

                // 切替中のフレーム露出を防ぐため黒で覆い、バックドロップを先に隠す
                try { await this._showBlack?.(180); } catch (_) { }
                try { if (this._videoBackdrop) this._videoBackdrop.style.display = 'none'; } catch (_) { }
                try { v.style.visibility = 'hidden'; } catch (_) { }

                // イントロ動画へ切替して見せる（投げる前の画面に戻してからGETを重ねる）
                try {
                  const intro = 'assets/turigamennsyoki.mp4';
                  const cur = (v.currentSrc || v.src || '');
                  if (!cur.endsWith(intro)) { v.src = intro; try { v.load(); } catch (_) { } }
                  v.loop = true;
                  // イントロは常にミュート
                  try { v.defaultMuted = true; } catch (_) { }
                  try { v.muted = true; } catch (_) { }
                  try { v.volume = 0; } catch (_) { }
                  v.style.display = 'block';
                  v.style.visibility = 'visible';
                  try { v.play?.(); } catch (_) { }
                  // 先頭フレームの描画準備を待ってから可視化
                  try { await this._waitForVideoReady?.(800); } catch (_) { }
                  try { await this._waitForVideoMeta?.(800); } catch (_) { }
                  try { v.style.visibility = 'visible'; } catch (_) { }
                } catch (_) { }
                // クラーケン再生フラグOFF（通常レイアウトへ）
                try { this._isKrakenVideoActive = false; } catch (_) { }
                try {
                  if (this._videoEl) {
                    this._videoEl.style.WebkitMaskImage = 'linear-gradient(to bottom, rgba(255,255,255,1) 94%, rgba(255,255,255,0) 100%)';
                    this._videoEl.style.maskImage = 'linear-gradient(to bottom, rgba(255,255,255,1) 94%, rgba(255,255,255,0) 100%)';
                  }
                } catch (_) { }
                // マスクやジオメトリの復帰
                try { this._onResize?.(); } catch (_) { }
                // GETオーバーレイ表示中は背景を隠し、スクロールも停止
                try {
                  this._stopScrollBg?.();
                  if (this._scrollBg) this._scrollBg.style.display = 'none';
                  if (this._scrollMidLayer) this._scrollMidLayer.style.display = 'none';
                  if (this._scrollFarLayer) this._scrollFarLayer.style.display = 'none';
                  if (this._scrollMidLayerMega) this._scrollMidLayerMega.style.display = 'none';
                  if (this._scrollFarLayerMega) this._scrollFarLayerMega.style.display = 'none';
                  if (this._scrollLayerFuji) this._scrollLayerFuji.style.display = 'none';
                  if (this._scrollCthulhuLayer) this._scrollCthulhuLayer.style.display = 'none';
                  if (this._gameBlackBg) this._gameBlackBg.style.display = 'none';
                  if (this._blackBelow) this._blackBelow.style.display = 'block';
                } catch (_) { }
                try { if (this._videoBackdrop) this._videoBackdrop.style.display = 'none'; } catch (_) { }
                this._showCaughtFish?.(def);
                try { this._screenShake?.(160, 8); } catch (_) { }
                try { this._startGetWaterWobble?.(1100, 10); } catch (_) { }
                try { this._startGetRippleRings?.(900, 3); } catch (_) { }
                // GETオーバーレイ表示後に黒を外す（背景フレーム露出防止のため切替完了まで維持）
                try { await this._hideBlack?.(180); } catch (_) { }
                // クラーケンはワイプ後（復帰後）に台詞を出すため保留フラグを立てる
                // Boss Narration Flag (Kraken & Others)
                const narrationTargets = ['kura-ken', 'megarodon', 'fujisan', 'igyounokami'];
                if (def && narrationTargets.includes(def.id)) {
                  try { this._bossNarrationPendingId = def.id; } catch (_) { }
                }
                setTimeout(() => { this._runWipeAndReturn?.(); }, 1200);
                this._seqStarted = false;
                this._awaitingRestart = false;

              };
              v.addEventListener('ended', onEnd, { once: true });
              let toEnd = null;
              // User request: Play Cthulhu video to the end (Extending safety timeout)
              const safetyMs = (def && def.id === 'igyounokami') ? 35000 : 10500;
              try { toEnd = setTimeout(onEnd, safetyMs); } catch (_) { }
            } else {
              // video 要素が無い場合もフラグOFF
              try { this._isKrakenVideoActive = false; } catch (_) { }
              this._showCaughtFish?.(def);
              setTimeout(() => { this._runWipeAndReturn?.(); }, 1200);
              this._seqStarted = false;
              this._awaitingRestart = false;
            }
          } finally {
            this._specialGetWaitForEnd = false;
            this._specialGetVideoSrc = null;
          }
        }
      } finally {
        // this._handlingGet = false; // ここでは戻さない（ワイプ後の再開時に戻す）
        this._skipPreTautFlow = false;
      }
    };

    // GETオーバーレイの生成と一時表示
    this._showGetOverlay = (def) => {
      if (!this._layer) return;
      const ov = document.createElement('div');
      ov.className = 'get-overlay';
      const getText = document.createElement('div');
      getText.className = 'get-text';
      getText.textContent = 'GET';
      const nameWrap = document.createElement('div');
      nameWrap.className = 'get-namewrap';
      const nameImg = document.createElement('img');
      nameImg.className = 'name-img';
      const base = 'assets/fishes';
      const jaPath = def?.name_ja ? `${base}/${def.name_ja}.png` : '';
      const idPath = `${base}/${def?.id || 'unknown'}.png`;
      // 日本語名優先、無ければidにフォールバック
      nameImg.src = jaPath || idPath;
      nameImg.alt = def?.name_ja || def?.id || 'fish';
      nameImg.onerror = () => { if (nameImg.src !== idPath) nameImg.src = idPath; else nameImg.style.display = 'none'; };
      const nameText = document.createElement('div');
      nameText.className = 'name-text';
      nameText.textContent = def?.name_ja || def?.id || '';
      nameWrap.appendChild(nameImg);
      nameWrap.appendChild(nameText);
      ov.appendChild(getText);
      ov.appendChild(nameWrap);
      this._layer.appendChild(ov);
      // 一定時間後にフェードアウトして削除→ワイプ→自動復帰
      setTimeout(() => { ov.classList.add('fadeout'); }, 1100);
      setTimeout(() => { try { ov.remove(); } catch (_) { } this._runWipeAndReturn?.(); }, 1700);
    };

    // God Rays (光の柱) 演出
    this._showGodRays = () => {
      if (!this._layer) return;
      const ov = document.createElement('div');
      ov.className = 'god-rays-overlay';
      // 複数の光の柱を生成
      for (let i = 0; i < 5; i++) {
        const ray = document.createElement('div');
        ray.className = 'god-ray';
        // ランダムな角度と幅
        const degStart = -25 + Math.random() * 50;
        const degEnd = degStart + (Math.random() * 10 - 5);
        const scale = 0.5 + Math.random() * 1.5;
        ray.style.setProperty('--r-start', `${degStart}deg`);
        ray.style.setProperty('--r-end', `${degEnd}deg`);
        ray.style.setProperty('--w-scale', scale);
        ray.style.animation = `rayRotate ${2 + Math.random()}s ease-in-out infinite alternate`;
        ray.style.left = `${40 + Math.random() * 20}%`; // 中央付近から
        ov.appendChild(ray);
      }
      this._layer.appendChild(ov);
      // 魚表示が終わる頃に消す
      setTimeout(() => {
        ov.style.transition = 'opacity 0.5s';
        ov.style.opacity = '0';
        setTimeout(() => ov.remove(), 500);
      }, 2500);
    };

    // Sparkles (キラキラ) 演出
    this._spawnSparkles = () => {
      if (!this._layer) return;
      const cnt = 12;
      for (let i = 0; i < cnt; i++) {
        const s = document.createElement('div');
        s.className = 'sparkle';
        const size = 4 + Math.random() * 8;
        const dx = (Math.random() - 0.5) * 200;
        const dy = (Math.random() - 0.5) * 200;
        const dur = 0.6 + Math.random() * 0.8;
        s.style.setProperty('--size', `${size}px`);
        s.style.setProperty('--dx', `${dx}px`);
        s.style.setProperty('--dy', `${dy}px`);
        s.style.setProperty('--dur', `${dur}s`);
        s.style.left = '50%';
        s.style.top = '50%';
        this._layer.appendChild(s);
        setTimeout(() => s.remove(), dur * 1000 + 100);
      }
    };

    // Ripple (波紋) 演出
    this._spawnRipple = () => {
      if (!this._layer) return;
      const r = document.createElement('div');
      r.className = 'ripple-ring';
      this._layer.appendChild(r);
      // アニメーション後に削除
      setTimeout(() => r.remove(), 1000); // Assuming a 1s animation
    };

    // 釣れた魚スプライトを中央表示
    this._showCaughtFish = (def) => {
      if (!this._layer) return;

      // 演出開始
      this._spawnRipple?.();
      setTimeout(() => this._spawnSparkles?.(), 100);

      const ov = document.createElement('div');
      ov.className = 'caught-fish-overlay';
      const img = document.createElement('img');
      img.className = 'caught-fish-img';
      // 画像は定義の sprite を優先。無ければ id ベース（rankXX は除外）→ 最後に共通シルエット
      let src = '';
      try {
        if (def?.sprite) {
          src = this._getAssetPath(def.sprite);
        } else if (def?.id && !/^rank\d+$/i.test(def.id)) {
          src = this._getAssetPath(`assets/fishes/${def.id}.png`);
        }
      } catch (_) { }
      if (src) img.src = src; else try { img.src = this._getAssetPath('assets/fish.png'); } catch (_) { }
      img.alt = def?.name_ja || def?.id || 'fish';
      // 読み込み失敗時はシルエットで代替し、最終的に何も出ない状態を回避
      img.onerror = () => {
        if (img.src.includes('assets/fish.png')) { return; }
        try { img.src = this._getAssetPath('assets/fish.png'); } catch (_) { }
      };

      // Boss Scale: Enlargen special fish (1.5x / 2.5x for Megalodon)
      const bosses = ['kura-ken', 'megarodon', 'fujisan', 'igyounokami'];
      if (def && bosses.includes(def.id)) {
        const scale = (def.id === 'megarodon') ? 2.5 : 1.5;
        img.style.transform = `scale(${scale})`;
        img.style.transformOrigin = 'center center';
      }

      // コンテナを作成（画像とテキストをグループ化）
      const container = document.createElement('div');
      container.className = 'caught-fish-container';

      // テキストラベル（一文字ずつアニメーション）
      const label = document.createElement('div');
      label.className = 'caught-fish-label';

      const text = def?.name_ja || def?.id || '';
      // 文字をspanに分割
      [...text].forEach((char, i) => {
        const span = document.createElement('span');
        span.textContent = char;
        span.className = 'char-anim';
        span.style.setProperty('--delay', `${i * 0.06}s`); // 0.06秒ずつずらす
        label.appendChild(span);
      });

      // GETバッジ (魚の後ろに配置)
      const badge = document.createElement('img');
      badge.className = 'caught-fish-get-badge';
      badge.src = 'assets/GET.png';
      badge.alt = 'GET';
      container.appendChild(badge);

      container.appendChild(img);
      container.appendChild(label);
      ov.appendChild(container);

      this._layer.appendChild(ov);
      try { ov.style.opacity = '0'; ov.style.transform = 'scale(0.92) rotate(-2deg)'; ov.style.transition = 'opacity 160ms ease, transform 300ms cubic-bezier(0.16,1,0.3,1)'; } catch (_) { }
      requestAnimationFrame(() => { requestAnimationFrame(() => { try { ov.style.opacity = '1'; ov.style.transform = 'scale(1) rotate(0deg)'; } catch (_) { } }); });

      // GETバッジの演出
      try { badge.style.opacity = '0'; badge.style.transform = 'scale(0.85) rotate(-8deg)'; badge.style.transition = 'opacity 160ms ease, transform 260ms cubic-bezier(0.16,1,0.3,1)'; } catch (_) { }
      requestAnimationFrame(() => { requestAnimationFrame(() => { try { badge.style.opacity = '1'; badge.style.transform = 'scale(1.0) rotate(0deg)'; } catch (_) { } }); });
      // Play impact sound for GET badge
      try {
        const s = this.state?.settings || {};
        const vol = Math.max(0, Math.min(1, Number((s.sfxVolume ?? 5) / 10)));
        if (vol > 0) {
          const a = new Audio('assets/get.mp3');
          a.volume = Math.max(0, vol * 0.9);
          a.play().catch(() => { });
        }
      } catch (_) { }
    };

    this._screenShake = (durationMs = 200, amp = 12) => {
      const host = this._layer; if (!host) return;
      // 進行中のシェイクがあれば中断してベースへ戻す
      try {
        if (this._shakeRaf) { cancelAnimationFrame(this._shakeRaf); this._shakeRaf = null; }
        if (this._shakeBase != null) { host.style.transform = this._shakeBase; }
      } catch (_) { }
      const start = performance.now();
      const base = host.style.transform || '';
      this._shakeBase = base;
      const step = (t) => {
        const p = Math.min(1, (t - start) / Math.max(1, durationMs));
        const k = (1 - p);
        const dx = (Math.random() * 2 - 1) * amp * k;
        const dy = (Math.random() * 2 - 1) * amp * k;
        try { host.style.transform = `${base} translate(${dx}px, ${dy}px)`; } catch (_) { }
        if (p < 1 && host.isConnected) {
          this._shakeRaf = requestAnimationFrame(step);
        } else {
          try { host.style.transform = base; } catch (_) { }
          this._shakeRaf = null; this._shakeBase = null;
        }
      };
      this._shakeRaf = requestAnimationFrame(step);
    };

    /**
     * フラッシュ（白）演出
     */
    this._flashWhite = (durationMs = 120, opacity = 0.18) => {
      if (!this._layer) return;
      const ov = document.createElement('div');
      ov.className = 'soft-flash-overlay';
      try {
        ov.style.position = 'absolute'; ov.style.inset = '0'; ov.style.background = '#fff';
        ov.style.opacity = String(Math.max(0, Math.min(1, opacity)));
        ov.style.transition = `opacity ${Math.max(60, durationMs)}ms ease`;
        ov.style.pointerEvents = 'none'; ov.style.zIndex = '99999';
      } catch (_) { }
      this._layer.appendChild(ov);
      requestAnimationFrame(() => { requestAnimationFrame(() => { try { ov.style.opacity = '0'; } catch (_) { } }); });
      setTimeout(() => { try { ov.remove(); } catch (_) { } }, Math.max(80, durationMs) + 80);
    };

    this._duckBgm = (duckTo = 0.45, holdMs = 500) => {
      try {
        if (!this._bgmAudio) return;
        const a = this._bgmAudio;
        const prev = Math.max(0, Math.min(1, Number(a.volume || 0)));
        const to = Math.max(0, Math.min(1, Number(duckTo)));
        try { a.volume = Math.min(prev, to); } catch (_) { }
        if (this._duckRestoreTimer) { try { clearTimeout(this._duckRestoreTimer); } catch (_) { } this._duckRestoreTimer = null; }
        this._duckRestoreTimer = setTimeout(() => { try { a.volume = prev; } catch (_) { } }, Math.max(0, Number(holdMs || 0)));
      } catch (_) { }
    };

    this._startGetWaterWobble = (durationMs = 1100, strength = 10) => {
      const host = this._layer; if (!host) return;
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      try { svg.setAttribute('style', 'position:absolute;width:0;height:0;'); } catch (_) { }
      const defs = document.createElementNS(ns, 'defs');
      const filter = document.createElementNS(ns, 'filter');
      const fid = 'df-get-wobble-' + Math.floor(Math.random() * 1e6);
      filter.setAttribute('id', fid);
      const turb = document.createElementNS(ns, 'feTurbulence');
      turb.setAttribute('type', 'fractalNoise');
      turb.setAttribute('baseFrequency', '0.012 0.08');
      turb.setAttribute('numOctaves', '1');
      turb.setAttribute('seed', String(Math.floor(Math.random() * 1000)));
      turb.setAttribute('result', 'turb');
      const disp = document.createElementNS(ns, 'feDisplacementMap');
      disp.setAttribute('in', 'SourceGraphic');
      disp.setAttribute('in2', 'turb');
      disp.setAttribute('xChannelSelector', 'R');
      disp.setAttribute('yChannelSelector', 'G');
      disp.setAttribute('scale', String(Math.max(0, Number(strength || 0))));
      filter.appendChild(turb);
      filter.appendChild(disp);
      defs.appendChild(filter);
      svg.appendChild(defs);
      try { (this.root || document.body).appendChild(svg); } catch (_) { try { document.body.appendChild(svg); } catch (_) { } }
      const prev = host.style.filter || '';
      try { host.style.filter = `url(#${fid})`; } catch (_) { }
      let raf = null; const start = performance.now();
      const baseX = 0.012, baseY = 0.08;
      const anim = (t) => {
        const p = Math.min(1, (t - start) / Math.max(1, durationMs));
        const k = (1 - p);
        const tt = (t - start) / 1000;
        const fx = Math.max(0.001, baseX + 0.006 * Math.sin(tt * 2.2));
        const fy = Math.max(0.001, baseY + 0.05 * Math.cos(tt * 1.6));
        try { turb.setAttribute('baseFrequency', fx + ' ' + fy); } catch (_) { }
        try { disp.setAttribute('scale', String(Math.max(0, strength * (0.55 + 0.45 * Math.sin(tt * 3.0)) * k))); } catch (_) { }
        if (p < 1 && host.isConnected) { raf = requestAnimationFrame(anim); } else {
          try { host.style.filter = prev; } catch (_) { }
          try { svg.remove(); } catch (_) { }
          raf = null;
        }
      };
      raf = requestAnimationFrame(anim);
    };

    this._dialogueRunning = false;
    this._dialoguesData = null;
    this._ensureDialogues = async () => {
      try {
        if (this._dialoguesData) return;
        const res = await fetch('src/data/dialogues.json', { cache: 'no-store' });
        if (!res.ok) return;
        this._dialoguesData = await res.json();
      } catch (_) { }
    };
    this._ensureDialogueOverlay = () => {
      if (!this._layer) return null;
      let ov = this._layer.querySelector('.dialogue-overlay');
      if (!ov) {
        ov = document.createElement('div');
        ov.className = 'dialogue-overlay';
        const text = document.createElement('div');
        text.className = 'dialogue-text';
        ov.appendChild(text);
        this._layer.appendChild(ov);
      }
      return ov;
    };
    this._typeLine = (text, charIntervalMs = 28) => new Promise((resolve) => {
      try {
        const ov = this._ensureDialogueOverlay?.();
        const box = ov?.querySelector?.('.dialogue-text');
        if (!box) { resolve(); return; }
        box.textContent = '';
        let i = 0;
        const step = () => {
          if (!box.isConnected) { resolve(); return; }
          if (i >= (text?.length || 0)) { resolve(); return; }
          box.textContent += text.charAt(i++);
          this._dialogueTypeTimer = setTimeout(step, Math.max(5, charIntervalMs));
        };
        step();
      } catch (_) { resolve(); }
    });
    this._playSfxOnce = (file) => new Promise((resolve) => {
      try {
        const s = this.state?.settings || {};
        const vol = Math.max(0, Math.min(1, Number((s.sfxVolume ?? 5) / 10)));
        if (vol <= 0) { resolve(); return; }
        if (this._dialogueAudio) { try { this._dialogueAudio.pause(); } catch (_) { } }
        const au = new Audio(file || 'assets/katakata.wav');
        this._dialogueAudio = au;
        try { au.volume = vol; } catch (_) { }
        au.addEventListener('ended', () => resolve(), { once: true });
        au.addEventListener('error', () => resolve(), { once: true });
        const p = au.play();
        if (p && typeof p.then === 'function') p.catch(() => resolve());
      } catch (_) { resolve(); }
    });
    // BGM
    this._startBgm = () => {
      try {
        // Enforce silence for Igyounokami
        if (this._activeBossId === 'igyounokami') return;

        const s = this.state?.settings || {};
        const vol = Math.max(0, Math.min(1, Number((s.bgmVolume ?? 5) / 10)));
        if (vol <= 0) { this._stopBgm?.(); return; }
        if (!this._bgmAudio) {
          if (typeof window !== 'undefined' && window.__df_bgmPreAudio instanceof Audio) {
            this._bgmAudio = window.__df_bgmPreAudio; window.__df_bgmPreAudio = null;
          } else {
            const a = new Audio('assets/WISH,FISHER.wav'); a.loop = true; this._bgmAudio = a;
          }
        }
        try { this._bgmAudio.loop = true; } catch (_) { }
        try { this._bgmAudio.volume = vol; } catch (_) { }
        const p = this._bgmAudio.play();
        if (p && typeof p.then === 'function') p.catch(() => { try { this._setupBgmUnlock?.(); } catch (_) { } });
      } catch (_) { }
    };
    this._stopBgm = () => { try { if (this._bgmAudio) { try { this._bgmAudio.pause(); } catch (_) { } if (typeof window !== 'undefined' && window.__df_bgmPreAudio === this._bgmAudio) { try { window.__df_bgmPreAudio = null; } catch (_) { } } this._bgmAudio = null; } } catch (_) { } };
    this._setupBgmUnlock = () => {
      try {
        if (this._bgmUnlocking) return; this._bgmUnlocking = true;
        const h = () => { try { this._removeBgmUnlock?.(); this._startBgm?.(); } catch (_) { } };
        document.addEventListener('pointerdown', h, { once: true });
        document.addEventListener('keydown', h, { once: true });
        this._removeBgmUnlock = () => { try { document.removeEventListener('pointerdown', h); document.removeEventListener('keydown', h); } catch (_) { } this._bgmUnlocking = false; };
      } catch (_) { }
    };
    // クラーケン用SFX
    this._playKrakenSfx = () => { try { const s = this.state?.settings || {}; const vol = Math.max(0, Math.min(1, Number((s.sfxVolume ?? 5) / 10))); if (vol <= 0) return; const a = new Audio('assets/rakurai.wav'); try { a.volume = vol; } catch (_) { } const p = a.play(); if (p && typeof p.then === 'function') p.catch(() => { }); } catch (_) { } };
    this._startBubbleSfx = () => { try { const s = this.state?.settings || {}; const vol = Math.max(0, Math.min(1, Number((s.sfxVolume ?? 5) / 10))); if (vol <= 0) { try { if (this._bubbleAudio) { this._bubbleAudio.pause(); this._bubbleAudio = null; } } catch (_) { } return; } if (this._bubbleAudio) { try { this._bubbleAudio.pause(); } catch (_) { } } const a = new Audio('assets/bubble.mp3'); a.loop = true; try { a.volume = vol; } catch (_) { } this._bubbleAudio = a; const p = a.play(); if (p && typeof p.then === 'function') p.catch(() => { }); } catch (_) { } };
    this._stopBubbleSfx = () => { try { if (this._bubbleAudio) { this._bubbleAudio.pause(); this._bubbleAudio = null; } } catch (_) { } };
    this._playCastSfx = () => { try { const s = this.state?.settings || {}; const vol = Math.max(0, Math.min(1, Number((s.sfxVolume ?? 5) / 10))); if (vol <= 0) return; const a = new Audio('assets/byu.mp3'); try { a.volume = vol; } catch (_) { } const p = a.play(); if (p && typeof p.then === 'function') p.catch(() => { }); } catch (_) { } };
    this._playCatchSfx = (def) => { try { if (def && def.id === 'kura-ken') return; const s = this.state?.settings || {}; const vol = Math.max(0, Math.min(1, Number((s.sfxVolume ?? 5) / 10))); if (vol <= 0) return; const a = new Audio('assets/turiage.mp3'); try { a.volume = vol; } catch (_) { } const p = a.play(); if (p && typeof p.then === 'function') p.catch(() => { }); } catch (_) { } };

    // Check if bait should trigger special dialogue instead of fishing
    this._isBaitUnknown = () => {
      try {
        if (!this._availableBaits || this._currentBaitIndex == null) return false;
        const bait = this._availableBaits[this._currentBaitIndex];
        // Special Boss Fishes
        if (bait && (bait.id === 'kura-ken' || bait.id === 'megarodon' || bait.id === 'fujisan' || bait.id === 'igyounokami')) return true;
        return !!bait?.locked;
      } catch (_) { return false; }
    };

    this._startBaitUnknownDialogue = async () => {
      try {
        if (this._dialogueRunning) return;
        this._dialogueRunning = true;
        await this._ensureDialogues?.();

        let lines = ['おや、そんなエサは存在しないぜ', '釣り上げた人だけの特権だ'];
        let baitId = '';
        try {
          if (this._availableBaits && this._currentBaitIndex != null) {
            baitId = this._availableBaits[this._currentBaitIndex]?.id || '';
          }
        } catch (_) { }

        if (baitId === 'kura-ken' || (this._currentBaitRank === this._krakenSlotRank)) {
          lines = ['おや、そんなエサは存在しないぜ', 'イカした夢でも見てたんじゃないか'];
        } else if (baitId === 'megarodon') {
          lines = ['どうした？そんなエサは存在しないぜ', 'なにせ昔の夢からサメたんだからな'];
        } else if (baitId === 'fujisan') {
          lines = ['ほう、富士山が釣れたのか', 'それが現実だったら俺の負けだ。降サン'];
        } else if (baitId === 'igyounokami') {
          lines = ['なんだ？ずいぶんうなされていたみたいだな', '神様なんてそんなもんさ'];
        } else {
          // locked bait fallback
          let evName = 'bait_unknown_tap';
          const ev = (this._dialoguesData?.events && this._dialoguesData.events[evName])
            || this._dialoguesData?.events?.bait_unknown_tap
            || null;
          if (Array.isArray(ev?.lines)) lines = ev.lines;
        }

        const sfx = 'assets/katakata.wav';
        const charIv = 90;
        const pause = 300;

        this._ensureDialogueOverlay?.();
        for (let idx = 0; idx < lines.length; idx++) {
          const line = String(lines[idx] || '');
          const typeP = this._typeLine?.(line, charIv) || Promise.resolve();
          const sfxP = this._playSfxOnce?.(sfx) || Promise.resolve();
          await Promise.all([typeP, sfxP]);
          if (idx < lines.length - 1 && pause) await new Promise(r => setTimeout(r, pause));
        }
        try { this._layer?.querySelectorAll?.('.dialogue-overlay')?.forEach(el => el.remove()); } catch (_) { }

        // Auto-Revert Bait if it was a boss
        if (['kura-ken', 'megarodon', 'fujisan', 'igyounokami'].includes(baitId)) {
          try {
            console.log('[DEBUG] Auto-reverting special bait. ID:', baitId);
            // FORCE RESET: Ensure sequence flag is off so _setBaitByIndex guard doesn't block us
            this._seqStarted = false;
            this._setBaitByIndex?.(0);
          } catch (_) { }
        }

      } catch (_) { }
      finally {
        this._dialogueRunning = false;
      }
    };

    this._startBossNarration = async (bossId) => {
      try {
        if (this._dialogueRunning) return;
        this._dialogueRunning = true;
        let lines = [];
        if (bossId === 'kura-ken') {
          lines = [
            '幾億の船を沈めし彼のものの名は',
            '”クラーケン”',
            'その瞳に悪意なく、ただ、これが自然なのだ'
          ];
        } else if (bossId === 'megarodon') {
          lines = [
            '強大で巨大なその古代の王よ',
            '”メガロドン”',
            'その歯は今もなお生きつづけている'
          ];
        } else if (bossId === 'fujisan') {
          lines = [
            'いろはにほへとちりぬるを',
            'わかよたれそつねならむ',
            'うゐのおくやまけふこえて',
            'あさきゆめみしゑひもせず'
          ];
        } else if (bossId === 'igyounokami') {
          lines = [
            'ふんぐるい　むぐるうなふ',
            '■■■■■',
            'るるいえ　うが＝なぐる　ふたぐん'
          ];
        }

        if (!lines.length) return;

        const sfx = 'assets/katakata.wav';
        const charIv = 90;
        const pause = 300;
        this._ensureDialogueOverlay?.();
        for (let idx = 0; idx < lines.length; idx++) {
          const line = String(lines[idx] || '');
          const typeP = this._typeLine?.(line, charIv) || Promise.resolve();
          const sfxP = this._playSfxOnce?.(sfx) || Promise.resolve();
          await Promise.all([typeP, sfxP]);
          if (idx < lines.length - 1 && pause) await new Promise(r => setTimeout(r, pause));
        }
        try { this._layer?.querySelectorAll?.('.dialogue-overlay')?.forEach(el => el.remove()); } catch (_) { }
      } catch (_) { }
      finally {
        this._dialogueRunning = false;
      }
    };

    // 魚PNGの“裏”に同サイズで徐々に描画（左上から埋める）
    this._showFishBackdropReveal = (def, opts = {}) => {
      if (!this._layer || !this._safe || !def) return;
      const ov = this._layer.querySelector?.('.caught-fish-overlay');
      const frontImg = ov?.querySelector?.('.caught-fish-img');
      if (!ov || !frontImg) return;
      // 既存キャンバス除去
      try { ov.querySelectorAll('.get-backdrop-canvas')?.forEach(el => el.remove()); } catch (_) { }
      // 魚オーバーレイの先頭に挿入（背面）
      const cvs = document.createElement('canvas');
      cvs.className = 'get-backdrop-canvas';
      try { ov.insertBefore(cvs, ov.firstChild); } catch (_) { ov.appendChild(cvs); }

      const durationMs = Math.max(200, opts.durationMs || 1000);
      const fit = () => {
        const r = this._safe.getBoundingClientRect();
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        cvs.width = Math.max(1, Math.floor(r.width * dpr));
        cvs.height = Math.max(1, Math.floor(r.height * dpr));
        cvs.style.width = r.width + 'px';
        cvs.style.height = r.height + 'px';
        return { r, dpr };
      };
      let { r, dpr } = fit();
      const ctx = cvs.getContext('2d', { alpha: true }); if (!ctx) return;
      ctx.imageSmoothingEnabled = true;

      const waitBounds = () => new Promise((resolve) => {
        const poll = () => {
          if (!cvs.isConnected) { resolve(null); return; }
          const ir = frontImg?.getBoundingClientRect();
          if (ir && ir.width > 2 && ir.height > 2) { resolve(ir); return; }
          requestAnimationFrame(poll);
        };
        poll();
      });

      const img = new Image();
      const frontSrc = (frontImg?.currentSrc || frontImg?.src || '');
      const fallbackSrc = def?.id ? `assets/fishes/${def.id}.png` : 'assets/fish.png';
      img.src = frontSrc || fallbackSrc;
      img.onerror = () => { try { img.src = 'assets/fish.png'; } catch (_) { } };

      (async () => {
        const ir = await waitBounds(); if (!ir) return;
        await new Promise((res) => { if (img.complete && img.naturalWidth) res(); else img.onload = () => res(); });
        const sr = this._safe.getBoundingClientRect();
        let dx = Math.floor((ir.left - sr.left) * dpr);
        let dy = Math.floor((ir.top - sr.top) * dpr);
        let dw = Math.floor(ir.width * dpr);
        let dh = Math.floor(ir.height * dpr);

        const tilesX = Math.max(6, Math.round(ir.width / 26));
        const tilesY = Math.max(6, Math.round(ir.height / 26));
        const sw = img.naturalWidth, sh = img.naturalHeight;
        const twSrc = sw / tilesX, thSrc = sh / tilesY;
        const twDst = dw / tilesX, thDst = dh / tilesY;

        let last = 0;
        const total = tilesX * tilesY;
        const start = performance.now();

        const loop = (t) => {
          if (!cvs.isConnected) return;
          // リサイズ追随
          const rNow = this._safe.getBoundingClientRect();
          if (Math.abs(rNow.width - r.width) > 1 || Math.abs(rNow.height - r.height) > 1) {
            ({ r, dpr } = fit());
            dx = Math.floor((ir.left - rNow.left) * dpr);
            dy = Math.floor((ir.top - rNow.top) * dpr);
            dw = Math.floor(ir.width * dpr);
            dh = Math.floor(ir.height * dpr);
          }
          const p = Math.min(1, (t - start) / Math.max(1, durationMs));
          const n = Math.floor(total * p);
          for (let i = last; i < n; i++) {
            const ry = Math.floor(i / tilesX);
            const rx = i % tilesX;
            const sx = Math.floor(rx * twSrc);
            const sy = Math.floor(ry * thSrc);
            const dxp = Math.floor(dx + rx * twDst);
            const dyp = Math.floor(dy + ry * thDst);
            ctx.drawImage(img, sx, sy, Math.ceil(twSrc), Math.ceil(thSrc), dxp, dyp, Math.ceil(twDst), Math.ceil(thDst));
          }
          last = n;
          if (p < 1) requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      })();
    };

    // 黒い画面が左→右に高速で走るワイプ演出
    this._runWipeAndReturn = () => {
      console.log('[DEBUG] _runWipeAndReturn called', new Error().stack);
      if (!this._layer) return;
      const layer = this._layer;
      const dur = 420;
      const w = document.createElement('div');
      w.className = 'wipe-overlay';
      try { Object.assign(w.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '99999', overflow: 'hidden', background: 'transparent' }); } catch (_) { }
      const strip = document.createElement('div');
      try { Object.assign(strip.style, { position: 'absolute', left: '-20%', top: '0', width: '20%', height: '100%', background: '#000' }); } catch (_) { }
      w.appendChild(strip);
      layer.appendChild(w);
      const clipTargetsSel = '.get-overlay,.caught-fish-overlay,.get-badge-overlay,.get-backdrop-overlay,.get-backdrop-canvas,.get-pattern-canvas,.get-badge-img,.get-ripple-canvas';
      let wipeClipRaf = null;
      const start = performance.now();
      const step = (t) => {
        const lr = layer.getBoundingClientRect?.();
        const p = Math.min(1, (t - start) / Math.max(1, dur));
        try { strip.style.left = ((-0.2 + 1.4 * p) * 100) + '%'; } catch (_) { }
        try {
          if (lr) {
            const sr = strip.getBoundingClientRect();
            const boundaryX = (sr.left - lr.left) + sr.width;
            const els = layer.querySelectorAll?.(clipTargetsSel) || [];
            els.forEach(el => {
              try {
                const er = el.getBoundingClientRect();
                let leftCrop = boundaryX - Math.max(0, (er.left - lr.left));
                leftCrop = Math.max(0, Math.min(Math.floor(leftCrop), Math.floor(er.width)));
                el.style.clipPath = `inset(0 0 0 ${leftCrop}px)`;
              } catch (_) { }
            });
          }
        } catch (_) { }
        if (p < 1 && layer.isConnected) { wipeClipRaf = requestAnimationFrame(step); } else { onEnd(); }
      };
      const onEnd = () => {
        try { if (wipeClipRaf) cancelAnimationFrame(wipeClipRaf); } catch (_) { }
        try { w.remove(); } catch (_) { };
        try { layer.querySelectorAll?.(clipTargetsSel)?.forEach(el => el.remove()); } catch (_) { }
        try {
          const v = this._videoEl;
          if (v) {
            const cur = (v.currentSrc || v.src || '');
            const intro = 'assets/turigamennsyoki.mp4';
            if (!cur.endsWith(intro)) { v.src = intro; try { v.load(); } catch (_) { } }
            v.loop = true;
            try { v.defaultMuted = true; } catch (_) { }
            try { v.muted = true; } catch (_) { }
            try { v.volume = 0; } catch (_) { }
            v.style.display = 'block';
            v.style.visibility = 'visible';
            try { v.play?.(); } catch (_) { }
          }
        } catch (_) { }
        try {
          this._stopScrollBg?.();
          if (this._scrollBg) this._scrollBg.style.display = 'none';
          if (this._scrollMidLayer) this._scrollMidLayer.style.display = 'none';
          if (this._scrollFarLayer) this._scrollFarLayer.style.display = 'none';
          if (this._scrollMidLayerMega) this._scrollMidLayerMega.style.display = 'none';
          if (this._scrollFarLayerMega) this._scrollFarLayerMega.style.display = 'none';
          if (this._scrollLayerFuji) this._scrollLayerFuji.style.display = 'none';
          if (this._scrollCthulhuLayer) this._scrollCthulhuLayer.style.display = 'none';
          if (this._gameBlackBg) this._gameBlackBg.style.display = 'none';
          if (this._blackBelow) this._blackBelow.style.display = 'block';
        } catch (_) { }
        try { this._stopChromaKeyPlayback?.(); } catch (_) { }
        try { this._specialChromaKey = null; } catch (_) { }
        try { this._specialGetVideoSrc = null; this._specialGetVideoHoldMs = 0; this._specialGetWaitForEnd = false; } catch (_) { }
        this._handlingGet = false; // 演出ループ終了・入力再開許可
        try {
          const hud = this.root.querySelector('#gameHud'); if (hud) hud.style.display = 'none';
          const group = this.root.querySelector('#topsetGroup');
          if (group) {
            group.style.display = '';
            const items = group.querySelectorAll('.topset-item');
            items.forEach(el => { el.classList.remove('exit'); void el.offsetWidth; el.classList.add('enter'); });
          }
          this._fitTopset?.();
          this._showTapGuide?.();
          this._startBgm?.();
          try {
            if (this._bossNarrationPendingId) {
              const bgId = this._bossNarrationPendingId;
              this._bossNarrationPendingId = null;
              this._startBossNarration?.(bgId);
            } else if (this._krakenNarrationPending) { // Legacy fallback
              this._krakenNarrationPending = false;
              this._startBossNarration?.('kura-ken');
            }
          } catch (_) { }
          this._buildFishIndex?.();
          try {
            // データ未ロード時はリセットしない
            if (!this._fishData || !this._fishData.length || !this._availableBaits || this._availableBaits.length <= 1) {
              console.warn('[DEBUG] _runWipeAndReturn: Data not ready (baits len<=1), skipping bait reset');
            } else {
              // 魚を釣った直後（_pendingBaitIdがある場合）は、その魚に切り替える
              if (this._pendingBaitId) {
                const targetId = this._pendingBaitId;
                const idx = this._availableBaits?.findIndex(b => b.id === targetId);
                if (idx >= 0) {
                  this._setBaitByIndex?.(idx);
                } else {
                  console.warn(`[DEBUG] _runWipeAndReturn: pending targetId=${targetId} not found. Skipping.`);
                }
              } else {
                // 魚を釣っていない（コンティニュー直後や単なる演出復帰）場合
                // 念のため、セーブデータ上の餌を再適用して整合性を保つ
                const savedId = this.state?.bait?.id;
                if (savedId && savedId !== 'ebi') {
                  const idx = this._availableBaits?.findIndex(b => b.id === savedId);
                  if (idx >= 0) {
                    if (this._currentBaitIndex !== idx) {
                      console.log(`[DEBUG] _runWipeAndReturn: restoring saved bait ${savedId} (was index ${this._currentBaitIndex})`);
                      this._setBaitByIndex?.(idx);
                    }
                  }
                }
              }
              // 共通: 餌箱とナビ表示を最新状態に更新
              this._refreshEsabakoForCurrent?.();
              this._positionBaitNavArrows?.();
            }
          } catch (_) { }
          try { this._pendingBaitId = null; this._pendingBaitRank = null; } catch (_) { }

        } catch (_) { }
        try { this._globalFishCollisionsDisabled = false; } catch (_) { }
      };
      wipeClipRaf = requestAnimationFrame(step);
    };

    this._intersects = (a, b) => {
      if (!a || !b) return false;
      return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    };

    // --- Rope collision helpers ---
    this._pointInRect = (x, y, r) => (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height);
    this._segmentsIntersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
      const eps = 1e-9;
      const cross = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      const onSeg = (ax, ay, bx, by, cx, cy) => {
        return Math.min(ax, bx) - eps <= cx && cx <= Math.max(ax, bx) + eps && Math.min(ay, by) - eps <= cy && cy <= Math.max(ay, by) + eps && Math.abs(cross(ax, ay, bx, by, cx, cy)) <= eps;
      };
      const d1 = cross(x1, y1, x2, y2, x3, y3);
      const d2 = cross(x1, y1, x2, y2, x4, y4);
      const d3 = cross(x3, y3, x4, y4, x1, y1);
      const d4 = cross(x3, y3, x4, y4, x2, y2);
      if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
      if (Math.abs(d1) <= eps && onSeg(x1, y1, x2, y2, x3, y3)) return true;
      if (Math.abs(d2) <= eps && onSeg(x1, y1, x2, y2, x4, y4)) return true;
      if (Math.abs(d3) <= eps && onSeg(x3, y3, x4, y4, x1, y1)) return true;
      if (Math.abs(d4) <= eps && onSeg(x3, y3, x4, y4, x2, y2)) return true;
      return false;
    };
    this._lineIntersectsRect = (x1, y1, x2, y2, rect) => {
      if (this._pointInRect(x1, y1, rect) || this._pointInRect(x2, y2, rect)) return true;
      const rx = rect.x, ry = rect.y, rw = rect.width, rh = rect.height;
      // 4辺
      if (this._segmentsIntersect(x1, y1, x2, y2, rx, ry, rx + rw, ry)) return true; // 上
      if (this._segmentsIntersect(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh)) return true; // 右
      if (this._segmentsIntersect(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh)) return true; // 下
      if (this._segmentsIntersect(x1, y1, x2, y2, rx, ry, rx, ry + rh)) return true; // 左
      return false;
    };
    // 魚矩形（セーフ座標）にロープが触れているか（半径rで太らせ判定）
    this._ropeHitsRect = (rectLocal, radius = 8) => {
      try {
        if (!this._ropePts || !Array.isArray(this._ropePts) || this._ropePts.length < 2) return false;
        // 厚み分だけ矩形を拡張
        const er = { x: rectLocal.x - radius, y: rectLocal.y - radius, width: rectLocal.width + radius * 2, height: rectLocal.height + radius * 2 };
        const pts = this._ropePts;
        for (let i = 0; i < pts.length - 1; i++) {
          const p1 = pts[i], p2 = pts[i + 1];
          if (this._lineIntersectsRect(p1.x, p1.y, p2.x, p2.y, er)) return true;
        }
      } catch (_) { }
      return false;
    };

    // --- Rope physics (Verlet) ---
    this._initRope = () => {
      if (!this._ropeCanvas || !this._safe) return;
      const r = this._safe.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      this._ropeCanvas.width = Math.max(1, Math.floor(r.width * dpr));
      this._ropeCanvas.height = Math.max(1, Math.floor(r.height * dpr));
      this._ropeCanvas.style.width = r.width + 'px';
      this._ropeCanvas.style.height = r.height + 'px';
      // rope points
      const N = 28; // セグメント数
      const segL = Math.max(8, r.height / (N + 2));
      this._ropeN = N;
      this._ropeSegL = segL;
      this._ropePts = new Array(N + 1).fill(0).map((_, i) => {
        const ax = (this._ropeAnchorX == null) ? (r.width / 2) : this._ropeAnchorX;
        const ay = (this._ropeAnchorY ?? -30); // 画面外の上（update側と一致）
        const y = ay + i * segL;
        return { x: ax, y, px: ax, py: y };
      });
      this._ropeLastT = performance.now();
      this._waterPhase = 0;
    };

    this._updateRope = (dt) => {
      if (!this._ropeEnabled) return;
      if (!this._ropePts || !this._safe) return;
      const r = this._safe.getBoundingClientRect();
      const N = this._ropeN || 0; if (!N) return;
      const pts = this._ropePts;
      const segL = this._ropeSegL || 16;
      const g = 900; // px/s^2 重力
      const damp = this._ropeDamp || 0.998; // 少し硬く（可変）
      const w = this._water || {};
      this._waterPhase = (this._waterPhase || 0) + ((w.currentPhaseSpeed ?? 0.7) * dt);
      const baseBuoy = Math.max(0, Math.min(0.98, (w.buoyancy ?? 0.9)));
      // 端点: アンカーと餌中心
      const ax = (this._ropeAnchorX == null) ? (r.width / 2) : this._ropeAnchorX;
      const ay = (this._ropeAnchorY ?? -30); // 画面外の上
      const baitRect = (this._bait?.getHitRect?.() || this._bait?.getBounds?.());
      let bx = pts[N].x, by = pts[N].y;
      if (baitRect) {
        const lc = this._rectToLocal(baitRect, r);
        bx = lc.x + lc.width / 2; by = lc.y + lc.height / 2;
      }
      // Verlet積分（内点のみ）
      for (let i = 1; i < N; i++) {
        const p = pts[i];
        const vx = (p.x - p.px) * damp;
        const vy = (p.y - p.py) * damp;
        p.px = p.x; p.py = p.y;
        p.x += vx;
        // 海流: 横方向にゆったり流す（下の節ほど強め）
        const sfrac = i / N;
        const flow = (w.currentForce ?? 160) * Math.sin(this._waterPhase + sfrac * 2 * Math.PI * (w.currentFreq ?? 0.18)) * sfrac;
        p.x += flow * dt * dt;
        // 節ごとの局所浮力（下の節ほど少し強く）
        const buoyLocal = Math.max(0, Math.min(0.98, baseBuoy + 0.06 * sfrac));
        const gEffLocal = g * (1 - buoyLocal);
        // 縦方向のうねり（上下動の加速度）。下の節ほど少し強めに影響
        const swell = (w.swellForce ?? 0) * Math.sin((this._waterPhase * (w.swellFreq ?? 0.4)) + sfrac * 2 * Math.PI);
        p.y += vy + gEffLocal * dt * dt - swell * dt * dt * (0.7 + 0.6 * sfrac);
      }
      // 拘束反復
      const iters = this._ropeIters || 10; // 少し硬く（可変）
      for (let k = 0; k < iters; k++) {
        // 再度端点を固定
        pts[0].x = ax; pts[0].y = ay;
        pts[N].x = bx; pts[N].y = by;
        for (let i = 0; i < N; i++) {
          const p1 = pts[i]; const p2 = pts[i + 1];
          let dx = p2.x - p1.x; let dy = p2.y - p1.y;
          let dist = Math.hypot(dx, dy) || 1e-6;
          const diff = (dist - segL) / dist;
          // 端の固定処理
          if (i === 0) {
            // p1固定→p2のみ補正
            p2.x -= dx * diff;
            p2.y -= dy * diff;
          } else if (i + 1 === N) {
            // p2固定→p1のみ補正
            p1.x += dx * diff;
            p1.y += dy * diff;
          } else {
            const half = 0.5;
            p1.x += dx * diff * half;
            p1.y += dy * diff * half;
            p2.x -= dx * diff * half;
            p2.y -= dy * diff * half;
          }
        }
      }
      // 最終固定
      pts[0].x = ax; pts[0].y = ay;
      pts[N].x = bx; pts[N].y = by;
      // ロープ-魚の衝突判定と逃走トリガー
      try {
        if (this._gameActive && !this._globalFishCollisionsDisabled && Array.isArray(this._fishes) && this._fishes.length > 0) {
          const rad = Math.max(2, this._krakenRopeHitRadius || 8);
          const safeRect = r;
          // 各魚についてロープセグメントと照合
          for (let fi = 0; fi < this._fishes.length; fi++) {
            const f = this._fishes[fi];
            if (!f) continue;
            try {
              if (typeof f.isFleeing === 'function' && f.isFleeing()) continue;
              const fr = (f.getHitRect?.() || f.getBounds?.());
              if (!fr) continue;
              const rr = this._rectToLocal?.(fr, safeRect) || { x: fr.left - safeRect.left, y: fr.top - safeRect.top, width: fr.width, height: fr.height };
              let hit = false;
              // 各セグメントを一定間隔でサンプリングして矩形近接をチェック
              for (let i = 0; i < pts.length - 1 && !hit; i++) {
                const p1 = pts[i], p2 = pts[i + 1];
                const dx = p2.x - p1.x, dy = p2.y - p1.y;
                const len = Math.hypot(dx, dy) || 1e-4;
                const steps = Math.max(1, Math.ceil(len / 12));
                for (let s = 0; s <= steps; s++) {
                  const t = s / steps;
                  const x = p1.x + dx * t; const y = p1.y + dy * t;
                  if (x >= (rr.x - rad) && x <= (rr.x + rr.width + rad) && y >= (rr.y - rad) && y <= (rr.y + rr.height + rad)) {
                    hit = true; break;
                  }
                }
              }
              // Chunk 1: Restore Fleeing
              if (hit) {
                // Restore Fleeing (User confirmed this is desired behavior)
                try { f.startFleeAndFadeOut?.(450, 1.1); } catch (_) { }

                // Boss Trigger Counting (One-time per fish)
                if (!f._touchedRopeHash) {
                  f._touchedRopeHash = true;
                  const d = this._depthMeters || 0;
                  let type = null;
                  if (d >= 200 && d < 1000) type = 'kraken';
                  else if (d >= 1000 && d < 2000) type = 'mega';
                  else if (d >= 2000 && d < 3000) type = 'fuji';
                  else if (d >= 3000 && d < 4000) type = 'cthulhu';

                  if (type) {
                    // One-time catch check
                    const bossIdMap = { kraken: 'kura-ken', mega: 'megarodon', fuji: 'fujisan', cthulhu: 'igyounokami' };
                    const bossId = bossIdMap[type];
                    if (bossId && this._isCaught?.(bossId)) {
                      // Already caught: do not increment count, do not trigger
                    } else {
                      this._bossTouchCounts = this._bossTouchCounts || { kraken: 0, mega: 0, fuji: 0, cthulhu: 0 };
                      if (!this._bossTouchCounts[type]) this._bossTouchCounts[type] = 0;
                      this._bossTouchCounts[type]++;
                      // Trigger Check
                      let needed = 30;
                      if (type === 'kraken') needed = 70;
                      else if (type === 'mega') needed = 100;
                      else if (type === 'fuji') needed = 120;
                      else if (type === 'cthulhu') needed = 100;
                      if (!this._bossTriggered && this._bossTouchCounts[type] >= needed) {
                        this._bossTriggered = true;
                        this._triggerBossEvent?.(type);
                      }
                    }
                  }

                  // Kraken Debug Trigger (Touch based)
                  // Use a separate counter so it works regardless of depth
                  if (this._krakenReqCount != null) {
                    this._krakenTouchCount = (this._krakenTouchCount || 0) + 1;
                    if (!this._krakenTriggered || this._krakenInfinite) {
                      if (this._krakenTouchCount >= this._krakenReqCount) {
                        this._krakenTouchCount = 0; // Reset for infinite mode
                        this._krakenTriggered = true;
                        this._triggerBossEvent?.('kraken');
                      }
                    }
                  }
                }

                try { if (f._cutRopeOnTouch) this._cutRope?.(); } catch (_) { }
                // Legacy Kraken Trigger (Removed/Merged above)
              }
            } catch (_) { }
          }
        }
      } catch (_) { }
    };

    // 深度追従ブースト（次のゲーム開始時に、目標深度へ数秒〜数十秒で到達させる）
    this._depthChase = { active: false, target: 0, margin: 20 };
    this._depthChaseMul = 1;
    this._pendingDepthChaseTarget = null;
    this._startDepthChase = (targetMeters) => {
      try {
        this._depthChase = { active: true, target: Math.max(0, Number(targetMeters || 0)), margin: 20 };
        this._depthChaseMul = 1;
        this._startSpeedStreaks?.();
      } catch (_) { }
    };
    this._stopDepthChase = () => {
      try {
        this._depthChase.active = false;
        this._depthChaseMul = 1;
        this._stopSpeedStreaks?.();
      } catch (_) { }
    };

    // ロープ起点Xを即時変更
    this._setRopeAnchorX = (x) => { try { this._ropeAnchorX = Math.max(0, Math.floor(x || 0)); } catch (_) { } };
    this._resetRopeAnchorXToCenter = () => {
      try {
        if (!this._safe) { this._ropeAnchorX = null; return; }
        const r = this._safe.getBoundingClientRect();
        this._ropeAnchorX = Math.floor(r.width / 2);
      } catch (_) { this._ropeAnchorX = null; }
    };

    // 糸を切る処理
    this._cutRope = () => {
      try {
        // ロープのみ非表示にする（釣り状態は維持）
        this._ropeEnabled = false;
        if (this._ropeCanvas) {
          this._ropeCanvas.style.display = 'none';
        }

        // 3秒後にロープ復帰
        setTimeout(() => {
          try {
            if (!this._destroyed && this._gameActive) {
              this._ropeEnabled = true;
              if (this._ropeCanvas) {
                this._ropeCanvas.style.display = 'block';
              }
            }
          } catch (_) { }
        }, 3000);
      } catch (_) { }
    };

    this._drawRope = () => {
      if (!this._ropeEnabled) return;
      const cvs = this._ropeCanvas; if (!cvs || !this._ropePts || !this._safe) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const r = this._safe.getBoundingClientRect();
      if (cvs.width !== Math.floor(r.width * dpr)) cvs.width = Math.max(1, Math.floor(r.width * dpr));
      if (cvs.height !== Math.floor(r.height * dpr)) cvs.height = Math.max(1, Math.floor(r.height * dpr));
      cvs.style.width = r.width + 'px';
      cvs.style.height = r.height + 'px';
      const ctx = cvs.getContext('2d'); if (!ctx) return;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      // 描画
      const pts = this._ropePts; if (!pts || pts.length < 2) { ctx.restore(); return; }
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(230,235,240,0.95)';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.restore();
    };

    this._drawHitDebug = () => {
      const cvs = this._hitboxCanvas; if (!cvs || !this._safe) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const r = this._safe.getBoundingClientRect();
      if (cvs.width !== Math.floor(r.width * dpr)) cvs.width = Math.max(1, Math.floor(r.width * dpr));
      if (cvs.height !== Math.floor(r.height * dpr)) cvs.height = Math.max(1, Math.floor(r.height * dpr));
      cvs.style.width = r.width + 'px';
      cvs.style.height = r.height + 'px';
      const ctx = cvs.getContext('2d'); if (!ctx) return;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      // Bait
      const bait = (this._bait?.getHitRect?.() || this._bait?.getBounds?.());
      if (bait) {
        const rr = this._rectToLocal(bait, r);
        ctx.strokeStyle = 'rgba(255,80,80,0.9)'; ctx.lineWidth = 2;
        ctx.strokeRect(rr.x, rr.y, rr.width, rr.height);
      }
      // Fishes
      for (const f of this._fishes) {
        const fr = (f.getHitRect?.() || f.getBounds?.());
        if (!fr) continue;
        const rr = this._rectToLocal(fr, r);
        ctx.strokeStyle = 'rgba(80,255,120,0.9)'; ctx.lineWidth = 2;
        ctx.strokeRect(rr.x, rr.y, rr.width, rr.height);
      }
      ctx.restore();
    };

    this._rectToLocal = (rect, base) => {
      // DOMRect(画面座標)→セーフエリア内座標
      const x = rect.left - base.left;
      const y = rect.top - base.top;
      const w = rect.width;
      const h = rect.height;
      return { x, y, width: w, height: h };
    };

    // 右上出現: 餌箱+エビ
    this._spawnEsabako = () => {
      if (!this._safe) return;
      if (this._esabakoGroup) { // 既にあれば再起動
        this._esabakoGroup.classList.remove('enter');
        void this._esabakoGroup.offsetWidth; // reflow
        this._esabakoGroup.classList.add('enter');
        return;
      }
      const g = document.createElement('div');
      g.className = 'esabako-group';
      g.innerHTML = `
        <picture>
          <source srcset="assets/esabako.webp" type="image/webp" />
          <img class="esabako-img" src="assets/esabako.png" alt="esabako"/>
        </picture>
        <img class="ebi-img" src="assets/taiwoturuebi.png" alt="ebi"/>
      `;
      this._safe.appendChild(g);
      this._esabakoGroup = g;
      // ebi を webp優先+フォールバックに
      try {
        const ebiImg = g.querySelector('.ebi-img');
        if (ebiImg) {
          ebiImg.decoding = 'async';
          const pngSrc = 'assets/taiwoturuebi.png';
          const webpSrc = 'assets/taiwoturuebi.webp';
          ebiImg.onerror = () => { if (ebiImg.src.endsWith('.webp')) { ebiImg.onerror = null; ebiImg.src = pngSrc; } };
          ebiImg.src = webpSrc;
        }
      } catch (_) { }
      // アニメ開始
      requestAnimationFrame(() => { g.classList.add('enter'); });
    };
  }



  unmount() {
    // フルスクリーン枠の解除
    document.body.classList.remove('frame-full');

    // リスナー類の解除
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this._ro) { try { this._ro.disconnect(); } catch (e) { } this._ro = null; }
    if (this._topsetRO) { try { this._topsetRO.disconnect(); } catch (_) { } this._topsetRO = null; }
    const video = this.root?.querySelector('#introVideo');
    if (video && this.onVideoError) video.removeEventListener('error', this.onVideoError);
    if (video && this._onVideoMeta) video.removeEventListener('loadedmetadata', this._onVideoMeta);
    if (this._onTap && this._layer) this._layer.removeEventListener('pointerdown', this._onTap);
    if (this._onPointerMove && this._safe) {
      this._safe.removeEventListener('pointermove', this._onPointerMove);
      this._safe.removeEventListener('pointerdown', this._onPointerMove);
    }
    if (this._onKeyDown) window.removeEventListener('keydown', this._onKeyDown);
    if (this._animRaf) cancelAnimationFrame(this._animRaf);
    try { if (this._bgmDelayedTimer) clearTimeout(this._bgmDelayedTimer); } catch (_) { }
    this._bgmDelayedTimer = null;
    if (this._baitFollowRaf) cancelAnimationFrame(this._baitFollowRaf);
    this._baitFollowRaf = null;
    this._stopBubbles?.();
    this._stopScrollBg?.();
    if (this._fade) this._fade.remove();
    if (this._bait && this._bait.unmount) this._bait.unmount();
    if (this._ropeCanvas) { try { this._ropeCanvas.remove(); } catch (_) { } this._ropeCanvas = null; }
    try { if (this._scrollMidLayer) this._scrollMidLayer.remove(); } catch (_) { }
    try { if (this._scrollFarLayer) this._scrollFarLayer.remove(); } catch (_) { }
    if (this._hitboxCanvas) { try { this._hitboxCanvas.remove(); } catch (_) { } this._hitboxCanvas = null; }
    try { if (this._dialogueTypeTimer) clearTimeout(this._dialogueTypeTimer); } catch (_) { }
    this._dialogueTypeTimer = null;
    try { if (this._dialogueAudio) { this._dialogueAudio.pause(); } } catch (_) { }
    this._dialogueAudio = null;
    // Boss SFX / BGM cleanup
    try { if (this._bossSfx) { this._bossSfx.pause(); this._bossSfx = null; } } catch (_) { }
    try { this._layer?.querySelectorAll?.('.dialogue-overlay')?.forEach(el => el.remove()); } catch (_) { }
    if (this._scrollBg) this._scrollBg.remove();
    if (this._gameBlackBg) this._gameBlackBg.remove();
    if (this._esabakoGroup) { this._esabakoGroup.remove(); this._esabakoGroup = null; }
    if (this._tapGuideEl) { try { this._tapGuideEl.remove(); } catch (_) { } this._tapGuideEl = null; }
    if (this._speedBoostTimer) { try { clearTimeout(this._speedBoostTimer); } catch (_) { } this._speedBoostTimer = null; }
    try { this._stopSpeedStreaks?.(); } catch (_) { }
    // bait-nav cleanup
    try {
      if (this._baitNavLeft && this._onBaitPrev) this._baitNavLeft.removeEventListener('click', this._onBaitPrev);
      if (this._baitNavRight && this._onBaitNext) this._baitNavRight.removeEventListener('click', this._onBaitNext);
      if (this._baitNavLeft && this._onBaitNavStop) {
        this._baitNavLeft.removeEventListener('pointerdown', this._onBaitNavStop);
        this._baitNavLeft.removeEventListener('pointerup', this._onBaitNavStop);
      }
      if (this._baitNavRight && this._onBaitNavStop) {
        this._baitNavRight.removeEventListener('pointerdown', this._onBaitNavStop);
        this._baitNavRight.removeEventListener('pointerup', this._onBaitNavStop);
      }
      if (this._baitNav && this._onBaitNavStop) {
        this._baitNav.removeEventListener('pointerdown', this._onBaitNavStop);
        this._baitNav.removeEventListener('pointerup', this._onBaitNavStop);
      }
      if (this._baitNav) { try { this._baitNav.remove(); } catch (_) { } }
    } catch (_) { }
    const backBtn = this.root?.querySelector('#btnBack');
    if (backBtn) backBtn.removeEventListener('click', this.onBack);
    this.root?.remove();
    this.root = null;
  }
}




