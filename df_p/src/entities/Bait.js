export default class Bait {
  constructor({ parent, initialType } = {}) {
    this.parent = parent;
    this.type = initialType || { id: 'lampbait', name: 'ランプ餌', rank: 0, src: 'assets/lampbait.png' };
    this.el = null;
    this.visible = false;
    this.x = 0;
    this.y = 0;
    this.plusEl = null;
  }

  mount() {
    if (!this.parent) throw new Error('Bait.mount: parent is required');
    if (this.el) return;
    const wrap = document.createElement('div');
    wrap.className = 'bait-sprite';
    wrap.style.display = this.visible ? 'block' : 'none';
    const img = document.createElement('img');
    img.className = 'bait-img';
    img.src = this.type?.src || 'assets/lampbait.png';
    img.alt = this.type?.name || 'bait';
    // 見た目はPLUS.pngのみ表示するためベース画像は非表示
    img.style.display = 'none';
    const plus = document.createElement('img');
    plus.className = 'bait-plus';
    plus.src = 'assets/PLUS.png';
    plus.alt = 'plus';
    wrap.appendChild(img);
    wrap.appendChild(plus);
    this.parent.appendChild(wrap);
    this.el = wrap;
    this.plusEl = plus;
  }

  unmount() {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }

  setType(type) {
    this.type = type || this.type;
    if (this.el && this.type?.src) {
      const img = this.el.querySelector('.bait-img');
      if (img) {
        img.src = this.type.src;
        img.alt = this.type.name || 'bait';
      }
    }
  }

  // 画像を差し替えず、論理情報（rank/id）のみ更新
  setLogicalRank(rank, id) {
    if (!this.type) this.type = {};
    if (typeof rank === 'number') this.type.rank = rank;
    if (id) this.type.id = id;
  }

  getRank() {
    return (this.type && typeof this.type.rank === 'number') ? this.type.rank : 0;
  }

  setVisible(v) {
    this.visible = !!v;
    if (this.el) this.el.style.display = this.visible ? 'block' : 'none';
  }
  show() { this.setVisible(true); }
  hide() { this.setVisible(false); }

  setPosition(x, y) {
    this.x = Math.max(0, Math.floor(x || 0));
    this.y = Math.max(0, Math.floor(y || 0));
    if (this.el) {
      this.el.style.left = `${this.x}px`;
      this.el.style.top = `${this.y}px`;
      // 中心基準はCSSのtransform: translate(-50%, -50%) に依存
    }
  }

  getBounds() {
    if (!this.el) return null;
    return this.el.getBoundingClientRect();
  }

  // 現状は可視領域と同一の当たり矩形（将来必要なら縮小可能）
  getHitRect() {
    const target = this.plusEl || this.el;
    const r = target ? target.getBoundingClientRect() : null;
    if (!r) return null;
    return {
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
      x: r.left,
      y: r.top
    };
  }
}
