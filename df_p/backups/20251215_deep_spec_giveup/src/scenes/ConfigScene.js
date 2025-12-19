import { SaveManager } from '../core/SaveManager.js';
export default class ConfigScene {
  mount(container, manager, state) {
    this.container = container;
    this.manager = manager;
    this.state = state;

    this.root = document.createElement('div');
    this.root.className = 'scene scene--config';
    this.root.innerHTML = `
      <div class="cfg-layer frame-skin-default">
        <div class="safe-viewport">
          <div class="topbar">
            <div class="left">
              <button class="btn" id="btnBack">タイトルへ</button>
            </div>
          </div>

          <div class="config-content">
            <h2>コンフィグ</h2>
            <div class="cfg-group">
              <label for="rangeBgm">BGM音量 <span id="valBgm">-</span>/10</label>
              <input type="range" min="0" max="10" step="1" id="rangeBgm"/>
            </div>
            <div class="cfg-group">
              <label for="rangeSfx">効果音音量 <span id="valSfx">-</span>/10</label>
              <input type="range" min="0" max="10" step="1" id="rangeSfx"/>
            </div>
            <div class="cfg-group">
              <label for="rangeSense">マウス感度 <span id="valSense">-</span>/10</label>
              <input type="range" min="0" max="10" step="1" id="rangeSense"/>
            </div>
            <p class="small">音量0は音が鳴りません</p>
          </div>
        </div>

        <div class="frame-svg" aria-hidden="true"></div>
      </div>
    `;

    container.replaceChildren(this.root);
    // アクアリウム以外共通: フルスクリーン枠適用
    document.body.classList.add('frame-full');

    this.onBack = () => this.manager.goTo('title');
    this.root.querySelector('#btnBack').addEventListener('click', this.onBack);

    // フレーム: SVGマスクで中央をくり抜く（16:9）
    const layer = this.root.querySelector('.cfg-layer');
    const svgHost = this.root.querySelector('.frame-svg');
    svgHost.style.visibility = 'hidden';
    svgHost.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <mask id="df-cfg-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect x="0" y="0" width="100%" height="100%" fill="white"/>
            <rect id="df-cfg-hole" x="0" y="0" width="0" height="0" fill="black"/>
          </mask>
        </defs>
        <image x="0" y="0" width="100%" height="100%" href="assets/frame1.png" preserveAspectRatio="xMidYMid slice" mask="url(#df-cfg-mask)"/>
      </svg>
    `;

    const safe = this.root.querySelector('.safe-viewport');
    const hole = svgHost.querySelector('#df-cfg-hole');
    const maskEl = svgHost.querySelector('#df-cfg-mask');
    const R = 16/9;
    const updateMaskHole = () => {
      if (!layer || !safe || !hole) return;
      const lr = layer.getBoundingClientRect();
      const Lw = lr.width, Lh = lr.height;
      let w = Math.min(Lw, Lh * R);
      let h = Math.min(Lh, Lw / R);
      if (w / h > R) w = h * R; else h = w / R;
      const x = (Lw - w) / 2;
      const y = (Lh - h) / 2;
      hole.setAttribute('x', String(x));
      hole.setAttribute('y', String(y));
      hole.setAttribute('width', String(w));
      hole.setAttribute('height', String(h));
      if (maskEl) {
        maskEl.setAttribute('x', '0');
        maskEl.setAttribute('y', '0');
        maskEl.setAttribute('width', String(Lw));
        maskEl.setAttribute('height', String(Lh));
      }
      Object.assign(safe.style, {
        position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`
      });
    };
    this._onResize = () => updateMaskHole();
    window.addEventListener('resize', this._onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => updateMaskHole());
      this._ro.observe(layer);
      this._ro.observe(safe);
    }
    const afterLayout = () => { updateMaskHole(); svgHost.style.visibility = 'visible'; };
    requestAnimationFrame(() => requestAnimationFrame(afterLayout));

    const s = this.state.settings || { bgmVolume: 6, sfxVolume: 10, mouseSensitivity: 6 };
    const bgm = this.root.querySelector('#rangeBgm');
    const sfx = this.root.querySelector('#rangeSfx');
    const sen = this.root.querySelector('#rangeSense');
    const vBgm = this.root.querySelector('#valBgm');
    const vSfx = this.root.querySelector('#valSfx');
    const vSen = this.root.querySelector('#valSense');
    const clamp = (v)=> Math.max(0, Math.min(10, Math.floor(Number(v||0))));
    const apply = () => {
      vBgm.textContent = String(clamp(bgm.value));
      vSfx.textContent = String(clamp(sfx.value));
      vSen.textContent = String(clamp(sen.value));
      this.state.settings = this.state.settings || {};
      this.state.settings.bgmVolume = clamp(bgm.value);
      this.state.settings.sfxVolume = clamp(sfx.value);
      this.state.settings.mouseSensitivity = clamp(sen.value);
      try { SaveManager.save(this.state); } catch(_) {}
    };
    bgm.value = String(clamp(s.bgmVolume));
    sfx.value = String(clamp(s.sfxVolume));
    sen.value = String(clamp(s.mouseSensitivity));
    apply();
    bgm.addEventListener('input', apply);
    sfx.addEventListener('input', apply);
    sen.addEventListener('input', apply);
  }

  unmount() {
    // フルスクリーン枠の解除
    document.body.classList.remove('frame-full');
    // リスナー解除
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this._ro) { try { this._ro.disconnect(); } catch(e) {} this._ro = null; }
    const back = this.root?.querySelector('#btnBack');
    if (back) back.removeEventListener('click', this.onBack);
    this.root?.remove();
    this.root = null;
  }
}
