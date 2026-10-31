# 回帰テスト用の固定データ

`reading-review-before.json` は、2026-10-31の全単語改訂前の公開辞書スナップショットです。全1,024枚の表読み・維持語のID/メタデータ、削除語を含む旧セーブの移行を検証します。

元データ: `reports/reading-review/before/content.json`（従来のローカル検証バックアップ）。テストが任意の検証出力に依存しないよう、入力データとしてここで管理します。画像本体は含みません。新しい辞書の生成時には更新しません。

SHA256: `ab23d57b68b4349dc4cb9644d6618ead16f18986e8abf435fe2e4a906d5f2c99`

`continuation-baseline-fallbacks.json` は長期継続ロジックの変更前比較に使う固定の安全盤面入力です。従来の `reports/continuation/baseline-fallbacks.json` から同一バイトで移設し、`tools/continuation-baseline.ts` が参照します。SHA256: `bcbde3120c1f554c267310820466cf080823050802b46b0c918ecc5ded1b8bbd`。
