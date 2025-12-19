import { SceneManager } from './core/SceneManager.js';
import { SaveManager } from './core/SaveManager.js';
// Phaser 3はCDN経由で読み込み
const Phaser = window.Phaser;
import TitleScene from './scenes/TitleScene.js';
import FishingScene from './scenes/FishingScene.js';
import AquariumScene from './scenes/AquariumScene.js';
import ConfigScene from './scenes/ConfigScene.js';

// ゲームの共有状態（シンプルなグローバルステート）
const state = {
  caught: [],
  bait: { id: 'ebi', rank: 0 },
  settings: { bgmVolume: 6, sfxVolume: 10, mouseSensitivity: 6 }
};

// 起動時にセーブデータをロード
try { SaveManager.load(state); } catch (_) { }

const container = document.getElementById('app');

// Phaserゲーム設定
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'app', // HTMLのdiv要素のID
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scene: [] // シーンは後で追加
};

const game = new Phaser.Game(config);
window.game = game; // Temporary debug exposure

const manager = new SceneManager(container, state);
window.manager = manager; // Temporary debug exposure

manager
  .register('title', TitleScene)
  .register('fishing', FishingScene)
  .register('aquarium', AquariumScene)
  .register('config', ConfigScene);

manager.start('title');
