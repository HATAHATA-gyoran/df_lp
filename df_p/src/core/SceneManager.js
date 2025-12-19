export class SceneManager {
  constructor(container, state = {}) {
    this.container = container;
    this.state = state;
    this.scenes = new Map();
    this.current = null;
  }

  register(name, SceneClass) {
    this.scenes.set(name, SceneClass);
    return this;
  }

  start(name, data) {
    this.goTo(name, data);
  }

  goTo(name, data) {
    const SceneClass = this.scenes.get(name);
    if (!SceneClass) throw new Error(`Scene not registered: ${name}`);

    if (this.current && typeof this.current.unmount === 'function') {
      try { this.current.unmount(); } catch (e) { console.warn('unmount error', e); }
    }

    const scene = new SceneClass();
    this.current = scene;
    scene.mount(this.container, this, this.state, data);
  }
}
