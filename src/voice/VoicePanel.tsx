import { useEffect, useState } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageCircle,
  Square,
  Play,
} from "lucide-react";
import type { VoiceController, VoiceUI } from "./VoiceController";
export function VoicePanel({
  controller,
  ui,
  eligible,
  onPlay,
  onClose,
}: {
  controller: VoiceController;
  ui: VoiceUI;
  eligible: boolean;
  onPlay?: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    void controller.status();
  }, [controller]);
  const active = ["active", "connecting", "closing"].includes(ui.state);
  const update = (value: Partial<VoiceUI["options"]>) =>
    controller.setOptions({ ...ui.options, ...value });
  return (
    <section className="voice-panel">
      <div className="voice-intro">
        <MessageCircle size={30} />
        <div>
          <strong>同じ絵を見て、いっしょに。</strong>
          <p>CPUと交互・時間なしの会話モード</p>
        </div>
      </div>
      <p className="voice-disclosure">
        開始すると音声・字幕・表示中の絵の説明をOpenAIへ送信します。API料金はホストPCのキーに発生します。会話はゲームの保存には入りません。
      </p>
      {ui.code && (
        <p role="status" className="voice-notice">
          {ui.code}
        </p>
      )}
      {ui.status?.busy && (
        <p className="voice-notice" role="status">
          別の端末で会話中です。終了してから接続してください。
        </p>
      )}
      {ui.status && !ui.status.available && (
        <p className="voice-notice">
          ホストにAPIキーが設定されていません。標準ゲームはそのまま遊べます。
        </p>
      )}
      {ui.status?.hostSettings && (
        <HostSettingsPanel controller={controller} ui={ui} active={active} />
      )}
      {!ui.status && (
        <button className="secondary" onClick={() => void controller.status()}>
          接続状態を更新
        </button>
      )}
      {!eligible && !onPlay && (
        <p>
          会話は「CPUと交互・時間なし」で使えます。タイトルで対戦方式を選んでください。
        </p>
      )}
      {ui.status && !ui.status.paired && !ui.status.hostSettings && (
        <p className="voice-notice">
          ホストPCで「端末用QRを表示」を選び、そのQRか接続リンクから開いてください。コード入力は不要です。
          <button onClick={() => void controller.status()}>
            接続状態を更新
          </button>
        </p>
      )}
      {onPlay && (
        <p className="voice-disclosure">
          「会話を始めて遊ぶ」で時間なしの盤面と音声をまとめて開始します。ブラウザにマイクを許可してください。
        </p>
      )}
      <div className="voice-controls">
        <button
          aria-pressed={ui.options.mic}
          onClick={() => update({ mic: !ui.options.mic })}
        >
          {ui.options.mic ? <Mic /> : <MicOff />}
          {ui.state === "active" ? "マイク" : "開始時のマイク"}{" "}
          {ui.options.mic ? "オン" : "停止"}
        </button>
        <button
          aria-pressed={ui.options.output}
          onClick={() => update({ output: !ui.options.output })}
        >
          {ui.options.output ? <Volume2 /> : <VolumeX />}相手の声{" "}
          {ui.options.output ? "オン" : "停止"}
        </button>
        <label>
          字幕
          <input
            type="checkbox"
            checked={ui.options.captions}
            onChange={(e) => update({ captions: e.target.checked })}
          />
        </label>
        <label>
          表情（Decisions）
          <input
            type="checkbox"
            checked={ui.options.decisions}
            onChange={(e) => update({ decisions: e.target.checked })}
          />
        </label>
        <label>
          話す頻度
          <select
            value={ui.options.chatter}
            onChange={(e) =>
              update({
                chatter: e.target.value as VoiceUI["options"]["chatter"],
              })
            }
          >
            <option value="quiet">静か</option>
            <option value="normal">ほどほど</option>
            <option value="chatty">よく話す</option>
          </select>
        </label>
      </div>
      <p className="voice-disclosure">
        マイク・相手の声を停止しても接続は続き、利用料金が発生します。終了するには「会話を終了」を押してください。ゲームの消音を選ぶと相手の声も停止します。
      </p>
      <div className="voice-session-row">
        <span role="status">
          {ui.state === "active"
            ? ui.options.mic
              ? "聞いています"
              : "マイク停止中"
            : ui.state === "connecting"
              ? ui.step === "microphone"
                ? "マイクの許可を待っています…"
                : ui.step === "board"
                  ? "盤面を準備しています…"
                  : ui.step === "api"
                    ? "音声APIに接続しています…"
                    : "接続を準備しています…"
              : ui.state === "closing"
                ? "終了・利用量を確認中…"
                : onPlay
                  ? "未接続・マイク未使用"
                  : ui.status?.available && ui.status.paired
                    ? "会話を開始できます（未接続）"
                    : "接続準備が必要です"}
        </span>
        <span>
          接続 {ui.elapsed}秒 / 上限 {ui.status?.maxSeconds ?? 900}秒
        </span>
      </div>
      {ui.state === "active" && <VoiceInputStatus ui={ui} />}
      {ui.usage && (
        <div className="voice-usage" aria-label="会話の利用量">
          <span>
            音声{" "}
            {ui.usage.seconds === null ? "未確定" : ui.usage.seconds + "秒"}
            {ui.usage.finalized ? "（確定）" : "（接続中または未確定）"}
          </span>
          <span>
            Responses {ui.usage.backend.calls}回 /{" "}
            {ui.usage.backend.input + ui.usage.backend.output} tokens
          </span>
          <span>
            Decisions {ui.usage.decisions.calls}回 /{" "}
            {ui.usage.decisions.input + ui.usage.decisions.output} tokens
          </span>
          <span>
            利用量未確定の要求{" "}
            {(ui.usage.backend.uncertain ?? 0) +
              (ui.usage.decisions.uncertain ?? 0)}
            件
          </span>
          <span>
            推定 US$ {ui.usage.estimatedUSD.toFixed(4)}（単価設定{" "}
            {ui.usage.priceDate}）
          </span>
          <small>
            {ui.usage.liveModel} / {ui.usage.backendModel} /{" "}
            {ui.usage.decisionsModel}
          </small>
        </div>
      )}
      {ui.options.captions && (ui.caption || ui.userCaption) && (
        <div className="voice-history">
          <p>あなた：{ui.userCaption}</p>
          <p>相手：{ui.caption}</p>
        </div>
      )}
      <div className="voice-actions">
        {active ? (
          <button
            className="secondary"
            disabled={ui.state === "closing"}
            onClick={() => void controller.stop()}
          >
            <Square size={17} />
            会話を終了
          </button>
        ) : onPlay ? (
          <button
            className="primary"
            disabled={
              !ui.status?.paired || !ui.status.available || ui.status.busy
            }
            onClick={() => {
              void controller.start(true);
              onPlay();
            }}
          >
            <Play size={17} />
            会話を始めて遊ぶ
          </button>
        ) : (
          <button
            className="primary"
            disabled={
              !eligible ||
              !ui.status?.paired ||
              !ui.status.available ||
              ui.status.busy
            }
            onClick={() => void controller.start()}
          >
            <Play size={17} />
            会話を開始
          </button>
        )}
        <button className="text-button" onClick={onClose}>
          ゲームに戻る
        </button>
      </div>
      <p className="voice-disclosure">
        LAN端末では、ホストのQRコードのURLと信頼済みHTTPSを使用します。起動・証明書の手順は同梱の音声ガイドをご覧ください。
      </p>
    </section>
  );
}
function VoiceInputStatus({ ui }: { ui: VoiceUI }) {
  return (
    <div className="voice-input-status">
      <meter
        aria-label="マイク入力レベル"
        min="0"
        max="1"
        value={ui.options.mic ? ui.inputLevel : 0}
      />
      <span>
        {!ui.options.mic
          ? "マイク停止中"
          : ui.inputActive
            ? "声を検出しています"
            : "接続済み · 話しかけてください"}
      </span>
    </div>
  );
}
function HostSettingsPanel({
  controller,
  ui,
  active,
}: {
  controller: VoiceController;
  ui: VoiceUI;
  active: boolean;
}) {
  const [key, setKey] = useState(""),
    [remember, setRemember] = useState(true),
    [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState<{
    url: string;
    qr: string;
    expires: number;
  }>();
  return (
    <div className="voice-host-settings">
      <details open={!ui.status?.available || undefined}>
        <summary>
          ホスト設定 ·{" "}
          {ui.status?.available ? "APIキー設定済み" : "APIキーを設定"}
        </summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const value = key;
            setKey("");
            setSaving(true);
            try {
              await controller.saveKey(value, remember);
            } finally {
              setSaving(false);
            }
          }}
        >
          <label htmlFor="host-api-key">OpenAI APIキー</label>
          <input
            id="host-api-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-…"
            minLength={19}
            maxLength={512}
            required
            disabled={active || saving}
          />
          <label className="voice-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={active || saving}
            />
            このPCに保存する
          </label>
          <p className="voice-disclosure">
            入力はこのPCのサーバーにだけ送信します。キーの読み出しやLAN端末での設定はできません。既存の.envも使えます。
          </p>
          <button
            className="secondary"
            type="submit"
            disabled={active || saving || !key.trim()}
          >
            {saving ? "設定中…" : "キーを設定"}
          </button>
        </form>
      </details>
      {ui.status?.lan && (
        <div>
          <button
            className="secondary"
            onClick={async () => setInvite(await controller.createInvite())}
          >
            端末用QRを表示
          </button>
          {invite && (
            <div className="voice-invite">
              <img
                src={invite.qr}
                width="180"
                height="180"
                alt="LAN端末用の一回限りの接続QR"
              />
              <p>スマホで読み取るだけ。5分間・1回だけ有効です。</p>
              <button
                onClick={() => void navigator.clipboard.writeText(invite.url)}
              >
                接続リンクをコピー
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export function VoiceCaption({
  ui,
  onOpen,
}: {
  ui: VoiceUI;
  onOpen: () => void;
}) {
  if (!["active", "connecting", "closing"].includes(ui.state)) return null;
  return (
    <div className="voice-caption-bar">
      <button
        className={ui.playing ? "voice-speaking" : ""}
        aria-label="会話の操作を開く"
        onClick={onOpen}
      >
        {ui.options.mic ? <Mic size={14} /> : <MicOff size={14} />}
        <span>{ui.elapsed}s</span>
      </button>
      {ui.options.captions && (
        <span className="voice-caption" aria-live="off">
          {ui.state !== "active"
            ? "音声を接続しています…"
            : ui.inputActive
              ? "声を検出しています…"
              : ui.caption || ui.userCaption || "接続済み · 話しかけてください"}
        </span>
      )}
    </div>
  );
}
