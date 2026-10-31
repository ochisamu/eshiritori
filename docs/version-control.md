# Gitで管理するもの

このリポジトリは、現在の1,024枚のゲームを再現・改修できるソースの基準版です。Node.js 22.12以上を使用します。

## チェックアウトから起動

```sh
npm ci
npm run build
npm test
npm run serve
```

`npm run build` / `npm test` は最初に `npm run content` を実行します。配信用画像は `public/assets` に含まれるため、Gitチェックアウトでは画像生成や `restore-source-assets.mjs` の実行は不要です。

`node tools/serve.mjs` は `dist` をポート4173で配信します。開発中は `npm run dev`。既存の4173サーバーが起動中なら二重起動せず使用します。

## 追跡対象

- `src`、`tests`、`tools`、構成ファイル、ロックファイル、仕様・ライセンス。
- `public/assets` の承認済み4,096画像ファイルとPWAアイコン。
- `content/originals` の制作原画・プロンプト、辞書、採用/不採用の審査記録、画像ハッシュと安全盤面の入力データ。
- `src/generated/reading-migrations.json`。既存セーブの読みID移行履歴なので、他の自動生成ファイルと分けて追跡する。
- `tests/fixtures` の旧辞書。改訂前後の互換性を確認する固定入力。
- 検証の要約と、現行 `reports/race-score` の主要な集計・ブラウザ結果。過去の全スクリーンショットや途中出力は含めない。

## ローカルに残してignore

| パス                                                                                       | 理由                                                                                                   |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `.cache/`                                                                                  | テスト用ブラウザ・Linux依存・一時検証環境などの再取得可能なキャッシュ                                  |
| `node_modules/`                                                                            | `package-lock.json` と `npm ci` から復元する依存パッケージ                                             |
| `dist/`                                                                                    | ソースと承認済み素材から再ビルドできる配信物。起動中のゲームと旧バージョンのタブに必要なので削除しない |
| `artifacts/`                                                                               | 過去の配布ZIP。現行ソースの正本ではなく、元のリリースとしてローカルに保管                              |
| `content/derived-assets/`                                                                  | `public/assets/` と重複する制作時の画像コピー                                                          |
| `content/assets.manifest.json`、`src/generated/content.json`、`src/generated/version.json` | `npm run content` の生成物                                                                             |
| `reports/` の途中出力・画像・before/coverage                                               | 再生成可能な検証出力・作業バックアップ。必要な固定入力はtestsへ移設済み                                |
| `output/`                                                                                  | 本体の実行やビルドに使わない検討用出力                                                                 |
| 初期の画風試作3枚                                                                          | 公開素材に使っていない原画試作                                                                         |

ignoreは削除ではありません。原画・承認済み画像・辞書を再生成したり、利用者のセーブデータを消したりしません。ブラウザのセーブはそもそもGit管理の対象外です。

過去の検証文書には、ローカルだけに残した生ログや画像への参照があります。要約に記録された当時の検証結果と、クリーンな環境で再実行する検証は区別します。現行のビルド/テスト再現確認は `reports/git-baseline/verification.md`。

## 運用

変更後はビルドと変更箇所に応じたテストを実行し、`git status` / `git diff` で追跡対象を確認してコミットします。画像を追加・変更する場合は審査と `content/image-manifest.json` のハッシュ照合を通します。

リモートは [ochisamu/eshiritori](https://github.com/ochisamu/eshiritori)、ブランチはmainです。変更を確認してコミットし、git push origin mainで保存します。README用画像と撮影条件・再撮影ツールもGitで管理します。大容量素材を含みますが、単一ファイルは10MiB未満で、Git LFSを必須にはしていません。
