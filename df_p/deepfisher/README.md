# Deep Fisher (ひな型 v0.1.0)

ゲームオーバーにならないシューティング×釣りゲームのHTML5最小構成。タイトル/釣り/アクアリウムの3シーンと遷移のみ実装。

## 収録内容
- **タイトル画面**: スタート→釣り、アクアリウム→アクアリウムへの遷移
- **釣り画面**: Canvasで深海背景・釣り糸・簡易の魚アニメーション。タイトル・アクアリウムに戻るボタン
- **アクアリウム画面**: プレースホルダー一覧。タイトル・釣りに戻るボタン
- **シーン管理**: `SceneManager` による簡易的なシーン切り替え

## ディレクトリ
```
index.html
styles/
  style.css
src/
  main.js
  core/
    SceneManager.js
  scenes/
    TitleScene.js
    FishingScene.js
    AquariumScene.js
```

## ローカル実行
ES Modulesを使っているため、`file://`直開きでは動作しない場合があります。簡易サーバーで配信してください。
- VS Code拡張「Live Server」を使う
- もしくは任意のHTTPサーバーで `deepfisher/` をルートとして配信

例（Pythonがある場合）:
```
python -m http.server 5173
# ブラウザで http://localhost:5173/ を開く
```

## itch.io 公開手順（静的HTML）
1. プロジェクト直下（`index.html`が直下にある状態）をZIP化
   - 例: `deepfisher.zip`（ルート直下に `index.html` / `styles/` / `src/`）
2. itch.ioのプロジェクト編集で「This file will be played in the browser」を選択
3. ZIPをアップロード
4. Embedオプション（推奨）
   - **Fullscreen**: 有効
   - **Mobile-friendly**: 有効
   - **Automatically start on page load**: 任意
   - サイズはデフォルトでOK（レスポンシブ対応）

## 実装メモ
- `FishingScene` は `CanvasRenderingContext2D.roundRect` 非対応環境向けにフォールバック（`rect`）を実装
- キャンバスはコンテナ幅に合わせて16:9で自動リサイズ
- 共有状態 `state` は将来の魚コレクション管理向けのプレースホルダー

## 今後の拡張候補
- 入力: マウス/タッチ操作（キャスト、リール）
- シューティング要素: 無害な弾/網で魚を誘導・収集（ゲームオーバーなし）
- 収集: 魚図鑑/サイズ記録、レア度、ローカル保存（`localStorage`）
- 演出: 泡/光の表現、BGM/SE、UIアニメーション
- 画面: 設定、ヘルプ、言語切替

## ライセンス
現時点では未設定。公開方針に合わせて設定してください。
