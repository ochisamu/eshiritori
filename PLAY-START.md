# 配布版の起動

Node.js 22.12以上を用意し、このファイルがあるフォルダで実行します。

```sh
npm ci --omit=dev
npm run serve
```

http://localhost:4173 を開きます。標準ゲームにはAPIキーを使いません。

会話を使う場合は、.env.exampleを.envへコピーし、自分のOpenAI APIキーをホストPCで設定します。

```sh
npm start
```

ゲームと会話は同じサーバーです。ホストPCの「会話する」→「ホスト設定」でもキーを設定でき、localhostではコード入力不要です。LAN端末はホスト画面の一回限りQR／リンクから接続します。
CPUと交互・時間なし／時間なし補充に対応します。API料金はホストのキーに発生します。
LANの音声には、信頼されたHTTPS証明書・正確なOrigin設定が必要です。
[LAN・証明書・料金・操作の手順](docs/voice-opponent.md)

この配布物にはキー、証明書、会話、音声、node_modulesを含めていません。受取人自身の設定を使用します。
ソースを変更してビルドする場合は別のsource版を使用してください。終了はターミナルでCtrl+Cです。
