# README用スクリーンショット

本番ビルドをPlaywrightで操作して撮影した、加工していないゲーム画面です。

| ファイル                               | 表示領域  | 内容                                         |
| -------------------------------------- | --------- | -------------------------------------------- |
| [title.png](title.png)                 | 1440×900  | 新規状態のタイトルとモード選択               |
| [game-desktop.png](game-desktop.png)   | 1440×900  | CPUの初手後の横6×縦4                         |
| [game-mobile.png](game-mobile.png)     | 390×844   | 同じ対戦状態の横4×縦6                        |
| [race.png](race.png)                   | 1280×900  | 実際に双方が1枚ずつ取得した早押し            |
| [voice-options.png](voice-options.png) | 1280×900  | ホスト設定付きの未接続会話画面（紹介用状態） |
| [collection.png](collection.png)       | 1440×1000 | サンプル発見状態の図鑑                       |

図鑑は状態の違いを紹介するため、最初の24枚にサンプル発見データを設定しています。利用者のプレイ実績ではありません。他の画面も隔離したブラウザ保存領域を使い、利用者のセーブには触れません。

## 再撮影

ビルドしてサーバーを起動した後、プロジェクトルートで実行します。

```sh
npx tsx tools/capture-readme.ts
```

Linuxの /usr/bin/google-chrome が既定です。接続先とChromeのパスは環境変数で変更できます。

```sh
SCREENSHOT_BASE_URL=http://127.0.0.1:4173 SCREENSHOT_CHROME_PATH=/usr/bin/google-chrome npx tsx tools/capture-readme.ts
```

固定seedの盤面をゲーム本体の生成器で作り、実際のUIで回答します。消音・動きを減らすブラウザ設定と固定時計で撮影します。画像の読み込み完了、スクロールの有無、実行時エラーを確認してPNGを保存します。

[capture.json](capture.json)にゲームソースのコミット、配信物のSHA256、画像の寸法・バイト数を記録しています。撮影後のドキュメント用コミットはゲームソースのコミットと異なる場合があります。

会話設定はtools/capture-voice.tsで再撮影できます。APIキーの設定済み状態だけを試験用に差し替え、有料接続や秘密の表示を行わず、会話未接続の画面を撮影します。撮影条件は[voice-options.json](voice-options.json)に記録します。
