export default class AquariumScene {
  mount(container, manager, state) {
    this.container = container;
    this.manager = manager;
    this.state = state;

    this.root = document.createElement('div');
    this.root.className = 'scene scene--aquarium';

    const top = document.createElement('div');
    top.className = 'topbar';
    top.innerHTML = `
      <div class="left">
        <button class="btn" id="btnBack">タイトルへ</button>
      </div>
      <div class="right">
        <button class="btn" id="btnFishing">釣りをする</button>
      </div>
    `;
    this.root.appendChild(top);

    const title = document.createElement('h2');
    title.textContent = 'アクアリウム';
    this.root.appendChild(title);

    const info = document.createElement('p');
    info.className = 'small';
    info.textContent = '釣った魚が一覧表示されます（セーブデータから読み込み）。';
    this.root.appendChild(info);

    const grid = document.createElement('div');
    grid.className = 'list';
    const caughtList = Array.isArray(this.state.caught) ? this.state.caught : [];
    if (caughtList.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'small';
      empty.textContent = 'まだ魚は登録されていません。釣りをしてGETしましょう。';
      this.root.appendChild(empty);
    } else {
      for (const f of caughtList) {
        const card = document.createElement('div');
        card.className = 'item';
        const name = f?.name_ja || f?.id || 'fish';
        const id = f?.id || 'unknown';
        const img = document.createElement('img');
        img.alt = name;
        const isRankId = /^rank\d+$/i.test(id);
        img.src = isRankId ? 'assets/fish.png' : `assets/fishes/${id}.png`;
        img.onerror = () => { try { img.src = 'assets/fish.png'; } catch(_) {} };
        const label = document.createElement('div');
        label.style.fontWeight = '600';
        label.textContent = name;
        const rank = document.createElement('div');
        rank.className = 'small';
        rank.textContent = `RANK ${Number(f?.rank || 0)}`;
        card.appendChild(img);
        card.appendChild(label);
        card.appendChild(rank);
        grid.appendChild(card);
      }
      this.root.appendChild(grid);
    }

    const foot = document.createElement('div');
    foot.className = 'small';
    foot.style.marginTop = '12px';
    foot.textContent = `現在の収集数: ${caughtList.length}`;
    this.root.appendChild(foot);

    container.replaceChildren(this.root);

    this.onBack = () => this.manager.goTo('title');
    this.onFish = () => this.manager.goTo('fishing');

    this.root.querySelector('#btnBack').addEventListener('click', this.onBack);
    this.root.querySelector('#btnFishing').addEventListener('click', this.onFish);
  }

  unmount() {
    if (!this.root) return;
    const back = this.root.querySelector('#btnBack');
    const fish = this.root.querySelector('#btnFishing');
    if (back) back.removeEventListener('click', this.onBack);
    if (fish) fish.removeEventListener('click', this.onFish);
    this.root.remove();
    this.root = null;
  }
}
