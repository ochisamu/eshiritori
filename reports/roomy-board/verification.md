# 2026-10-31 広い盤面・相手キャラ・PWA

配信ビルド: 6048df59a79246896531b8c167d69a8328728d767db259e649b41ca937ed7352

- Removed the in-game global header, persistent explanation row and word history display; tools now live in the pause menu
- Hints open on demand, close on outside tap or Escape, and reopen at the same stage without another charge
- Answer presentation lasts 1600ms normally, 2200ms for alternatives/new discoveries and 2500ms for completion; tapping still skips it
- Three original SVG rival appearances retain all ten moods and are deterministic by session seed/round
- Added PWA manifest, 192/512/180px icons, secure-context service worker, home-screen guidance and supported fullscreen toggle

390×844の実操作ではパネル領域が540pxから668pxへ約24%増えた。新しい領域は上端118px/下端786px/幅372px。ヒントを開いても高さ668px、ページ位置0を維持。常設の説明は外し、正解時の説明と図鑑・見返しは保持する。誤答理由だけ2.2秒の一時表示。縦4×6/横6×4、7画面サイズと回転で24札の44px以上の押下領域を確認。

回答表示は通常1.6秒、裏読み/新発見2.2秒、完成2.5秒。タップで短縮可能。通常表示中に持ち時間を減らさないこと、裏読みが1.95秒後も読めること、完成が2.1秒後も見えることを実操作で確認。CPUの探索時間・判断方針・盤面生成・辞書・保存版は変更していない。

対戦中の図鑑・設定・音・遊び方・全画面・アプリ案内は一時停止メニューへ集約。めばえ/こはく/ももは同じ10表情を持ち、session seed+roundで決まる。3対戦の見た目が異なり、再開時に相手が変わらないことを確認。

単体122件・型検査、3エンジン各58件のゲームUI（174件）と各3件のPWA（9件）、合計183種類の最終UIケースが合格。同じ実行ビルドの全量結果と関連ケース再検証を照合している。

PWAのマニフェスト・全アイコンのデコード、Service Worker制御、以前に表示したタイトル画像を含むオフライン再起動、画像128件上限、対応するFullscreen APIの開始/終了をlocalhostで確認。新しい絵を必要とする対戦はオンライン前提。Workerは対戦中にskipWaitingで強制更新しない。

PWAのスマホインストールには信頼されたHTTPS配信が必要。現在のLAN用HTTPは通常ブラウザ用。HTTPS公開・端末へのOSインストール・証明書の追加は実行していない。iPhone/iPadのステータスバー非表示を保証せず、実機確認は別途必要。設定案内にプラットフォームごとの導線を用意した。

![広い盤面の実操作](manual-board.png)

![必要時だけのヒント](manual-hint.png)

LAN http://192.168.0.111:4173/ は現在のJS、manifest、SW、3アイコンがHTTP200。常駐51472を再起動せずdistを反映した。

以前の性能計測と初版ZIPは元の版の記録を維持。詳細な制約と実行JSONはverification.json。
