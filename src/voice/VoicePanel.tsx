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
  const [code, setCode] = useState("");
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
      {!eligible && (
        <p>
          時間あり・ひとり・早押しでは会話を利用できません。
          {onPlay && <button onClick={onPlay}>交互・時間なしを選ぶ</button>}
        </p>
      )}
      {ui.status && !ui.status.paired && (
        <form
          className="voice-pair"
          onSubmit={(e) => {
            e.preventDefault();
            void controller.pair(code);
            setCode("");
          }}
        >
          <label htmlFor="voice-pair-code">
            ホストのターミナルに表示された接続コード
          </label>
          <div>
            <input
              id="voice-pair-code"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6桁"
              required
            />
            <button type="submit" className="secondary">
              ペアリング
            </button>
          </div>
        </form>
      )}
      <div className="voice-controls">
        <button
          aria-pressed={ui.options.mic}
          onClick={() => update({ mic: !ui.options.mic })}
        >
          {ui.options.mic ? <Mic /> : <MicOff />}マイク{" "}
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
              ? "接続しています…"
              : ui.state === "closing"
                ? "終了・利用量を確認中…"
                : "未接続"}
        </span>
        <span>
          接続 {ui.elapsed}秒 / 上限 {ui.status?.maxSeconds ?? 900}秒
        </span>
      </div>
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
          {ui.caption || ui.userCaption || "いっしょに、さがそう"}
        </span>
      )}
    </div>
  );
}
