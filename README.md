# AR Motif Camera

写真をアップロードしてメインのモチーフを切り抜き、ARのように現実世界に重ねて撮影できるWebアプリです。

## 機能
- **モチーフ抽出**: アップロードした写真から自動で背景を削除します（`@imgly/background-removal` 使用）。
- **ARカメラ**: 切り抜いたモチーフをカメラ映像に重ねて表示します。
- **インタラクション**: モチーフをドラッグで移動、ピンチで拡大縮小できます。
- **撮影**: 合成された画像を撮影し、ダウンロードできます。

## 実行方法

1. 依存関係のインストール:
   ```bash
   npm install
   ```

2. 開発サーバーの起動:
   ```bash
   npm run dev
   ```

3. ブラウザでアクセス:
   表示されたURL（通常は `http://localhost:5173`）を開いてください。
   ※ カメラ機能を使用するため、HTTPSまたはlocalhost環境が必要です。スマホで試す場合は、PCと同じWi-Fiに接続し、`npm run dev -- --host` を実行してIPアドレスでアクセスしてください（ただし、HTTPSでないとカメラが動かない場合があります）。

## 技術スタック
- Vite
- Vanilla JavaScript
- @imgly/background-removal (Client-side AI)
