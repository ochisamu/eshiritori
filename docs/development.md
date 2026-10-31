# 開発・検証ガイド

[README](../README.md)に基本の起動方法をまとめています。このページはソース変更・テスト・素材更新のための補足です。

## 環境と基本コマンド

Node.js 22.12以上を使用します。基準版の再現確認環境はWSL Ubuntu、Node.js 22.16.0、npm 10.9.2です。

```sh
npm ci
npm run dev
```

開発サーバーは通常5173番、本番配信用の <code>npm run serve</code> は4173番です。本番配信は先に <code>npm run build</code> を実行します。起動済みの4173サーバーがある場合は二重起動せず使用してください。

| コマンド                 | 用途                                            |
| ------------------------ | ----------------------------------------------- |
| npm run content          | 承認済み辞書・画像情報から実行用データを生成    |
| npm run build            | content生成、TypeScriptの型検査、Vite本番ビルド |
| npm test                 | content生成、Vitestの単体テスト                 |
| npm run test:coverage    | カバレッジ計測とコア分岐カバレッジの確認        |
| npm run test:e2e         | 起動済み本番サーバーに対するPlaywright検証      |
| npm run audit            | コンテンツ・素材の監査                          |
| npm run check-acceptance | 初版の受入証跡・必須ゲートの整合性確認          |

check-acceptanceは初版の証跡向けです。現行変更の合否は対象コードのテストと、その版の検証報告で確認してください。初版の生ログや配布ZIPにはGitに含まれないものがあります。

## ブラウザテスト

現在のPlaywright設定はLinux向けです。Chromiumは <code>/usr/bin/google-chrome</code>、Firefox／任意のWebKitは <code>.cache/playwright</code> を使用します。他のOSでは [playwright.config.ts](../playwright.config.ts) の実行ファイル設定を環境に合わせてください。

```sh
PLAYWRIGHT_BROWSERS_PATH=.cache/playwright npx playwright install firefox
npm run build
npm run serve
```

別のターミナルから実行します。

```sh
TEST_BASE_URL=http://127.0.0.1:4173 npm run test:e2e
```

WebKitも使用する場合はブラウザと必要なOS依存を用意し、<code>TEST_WEBKIT=1</code> を設定します。PWA検証は <code>npx playwright test -c playwright.pwa.config.ts</code> です。必要環境は [設定ファイル](../playwright.pwa.config.ts) と [テスト](../tests/pwa) を確認してください。

WSLからWindows側のサーバーへ接続するなど、localhostが別ホストを指す場合はTEST_BASE_URLに到達可能なURLを指定します。実端末での操作検証は、表示領域を変更した自動テストと分けて扱います。

## コンテンツを変更する

content/が辞書・制作・審査の入力、src/generated/がゲーム向けの生成結果です。通常のGitチェックアウトには承認済みのpublic/assets/があるため、原画の再生成や画像復元ツールの実行は不要です。

- 新しい画像・読みを審査し、採用理由とハッシュを記録する。
- 画像変更時はQAをやり直し、content/image-manifest.jsonの記録を更新する。
- content生成と監査、変更に対応するテストを実行する。
- 辞書変更時はつながりやすさ、同じ札・語の再使用禁止、CPUの表読み優先と探索上限も確認する。

tools/prepare_assets.pyは切り出し・余白・最近傍変換・WebP化のツールです。画像生成そのものは行いません。制作手順・原画寸法・初版の判断は [開発履歴](development-history.md#素材制作と再開) に保存しています。

## 検証記録の読み方

- [現行の連勝・早押しルール](../reports/race-score/verification.md)：単体167件、解決済みUI321件、PWA9件、450試合の検証。
- [Git基準版](../reports/git-baseline/verification.md)：追跡ファイルだけからのビルドと単体テスト、実行ファイルの同一性確認。
- [読みの全件見直し](../reports/reading-review/verification.md)：採用・除外・追加とゲームバランス。
- [仕様判断](../spec/decisions.md)：参考資料、本作の独自ルール、制作上の判断。

報告のbuildHashとcontentVersionを照合してください。過去の結果を別の実行ファイルのテスト結果として読み替えません。履歴資料から参照される画像・生ログにはローカル保管のものもあります。

## 保存・配信・スクリーンショット

セーブとランキングはlocalStorage内に保存し、接続先のオリジンごとに分かれます。開発時に使うURLを変えると別の保存領域になります。スクリーンショットツールは独立したブラウザコンテキストを使用します。

本番ビルドのdist/はGit対象外です。旧バージョンのタブが読み込むファイルを維持するため、ビルド設定は既存のハッシュ付きファイルを残します。配信中のフォルダを一括削除しないでください。

[README画像の再撮影](screenshots/README.md) · [追跡対象・ignore方針](version-control.md)
