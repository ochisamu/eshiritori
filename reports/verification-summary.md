# 最終検証記録

2026年10月24日（JST）。`check-acceptance` により **AT01〜AT16の必須条件すべて合格**。最終判定は `acceptance-check.json`、詳細は `acceptance-report.json`。

- 実行物SHA256：`b3dfc2720b34d0dcdb3b3528ccf6258e4073378512273171156b12905f2dfb4e`
- 辞書・素材版：`pixel-b9efabddc494`
- 要件原本SHA256：`20dda5540be376e4bc1dd0bac0fc69e8315d6722844fb90e458b9df99f2fa4cd`

| 項目 | 最終結果 | 証跡 |
|---|---|---|
| 素材・辞書 | 1,200候補判断、1,024承認概念、3,801画像別読み。全体の異なる正規化語は2,120語 | `content-audit.json`、manifest、画像別審査台帳 |
| 追加の裏読み | 128枚・256読みを32枚の512px詳細シートで実際にAI審査 | `playful-review/review.json` |
| 単体テスト | 96/96、コア分岐380/414＝91.7874%（基準90%） | `unit-results.json`、`core-coverage.json` |
| 操作・画像復号 | Chromium・Firefox・Linux WebKitで23件ずつ、計69件。各エンジンで全4,096画像を復号 | `e2e-final.json`、`browser-events.jsonl` |
| 性能 | 390×844、CPU4倍減速、4Mbps、150ms遅延。初回2.935〜3.090秒で5/5、次盤面0.114〜0.654秒で20/20合格 | `performance-results.json` |
| 入力 | 入力から反応までのp95は30.2ms | `input-latency-results.json` |
| 長期稼働 | ウォームアップ後500ラウンド。heap増分10.08MiB、画像25、worker1、listener159を維持 | `resource-results.json` |
| 生成 | 各難易度10,000seed、計30,000盤面。失敗0、検証済み代替盤面2（0.0067%） | `stress-results.json`、40shardの証跡 |
| 連戦・再現 | 10seed×1,000対戦、再使用違反0。決定性270実行、CPU比較300対戦 | `stress-results.json`、`determinism-results.json`、`cpu-comparison.json` |
| 実際のUI操作 | 最終実行物でAIが1,931.692秒（32分11.7秒）操作・目視。作業中断と追加の保守的な除外時間を差し引いた値 | `visual-play/review.json`、`segment-11-final.json`、各PNG |
| 配布物 | ZIPのCRC・各ファイルSHA256を検証。ソースを別フォルダへ展開し、審査済み画像復元・依存復元・ビルド後に同じ実行物SHA256を確認 | `package-results.json`、`package-verification.json`、`extracted-source-build.txt` |

次盤面時間は、信頼されたクリックから24枚の復号後の描画フレームまでをブラウザー内で測定した値。別欄に操作ハーネスの待機・検査の時間も残している。CPUの意図的な探索演出の待ち時間とは区別する。

CPU比較は同じ100seedの乱択対戦相手に対する結果で、CPU勝利はやさしい32/100、ふつう59/100、むずかしい81/100。人間の勝率とは説明していない。

実操作では、「ん」の即敗北と再読込、13手の補充対戦、縦画面の10手・11手の対戦、専用の裏読み演出、金色の直前札と紫のCPU探索枠の区別、かなパッドの長音・小文字・削除、同じ札の誤入力後の正しい再入力、図鑑の文字数伏せ字と明示的な答え参照を確認した。設定を開くと開始前のモード・難易度が戻る問題も修正し、消音などの即時設定が開始後も維持されることを再確認した。

旧版・修正前の操作時間は最終版に加算していない。並行検証の高負荷下の単体テスト30秒タイムアウトは `regressions/qa-contention-timeout.txt` に保存し、探索上限やテスト上限を変えず、負荷終了後の最終実行で96件合格を確認した。辞書監査manifestの難易度は、審査済みソース・実行時辞書と同一の分類に統一した。

実機iOS Safari、実機OS仮想キーボード、スピーカー出力の聴感評価は未実施。390×844のiframeは表示領域の代理確認であり、実機検証とは主張しない。レビュー担当はAIで、人間による試遊を主張しない。原画は約300pxのセルを基本とし、512px詳細には最近傍拡大を含む。任意の5,000読み目標への到達は主張しない。

プレイZIPは実行物・起動スクリプト・説明・ライセンスを収録し、ソースZIPには原画・プロンプト・審査・検証記録も収録する。検証用iframe HTMLは実行物一覧に含めない。公開サイトへのアップロード、外部APIの利用、新しい支払い設定は行っていない。

ZIP自身のSHA256を含む `package-results.json` と `package-verification.json`、パッケージングの標準出力は自己参照を避けてZIPの外に置く。配布フォルダの `eshiritori-checksums.txt` と `eshiritori-verification.json` が最終ZIPに対応する照合用ファイル。
