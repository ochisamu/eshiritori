import inputWorkletUrl from "./input.worklet.js?url";
import outputWorkletUrl from "./output.worklet.js?url";
import {
  defaultVoiceOptions,
  type GameVoiceView,
  type VoiceOperation,
  type VoiceOperationResult,
  type VoiceOptions,
  type VoiceUsage,
  type VoiceStatus,
  type VoiceMood,
} from "./protocol";
export interface VoiceUI {
  state: "off" | "pairing" | "connecting" | "active" | "closing" | "error";
  status?: VoiceStatus;
  step?: "audio" | "board" | "microphone" | "transport" | "api";
  inputLevel: number;
  inputActive: boolean;
  code?: string;
  usage?: VoiceUsage;
  caption: string;
  userCaption: string;
  options: VoiceOptions;
  mood?: VoiceMood;
  playing: boolean;
  epoch?: string;
  elapsed: number;
}
const labels: Record<string, string> = {
  playback_blocked:
    "音声の再生をブラウザで許可してください。接続を終了して開始し直すと再度許可できます。",
  microphone_denied:
    "マイクの許可がありません。ブラウザのマイク設定を確認してください。",
  microphone_missing: "利用できるマイクがありません。",
  microphone_ended:
    "マイクの接続が切れました。接続を確認して会話を開始し直してください。",
  board_timeout:
    "盤面の準備を確認できませんでした。ゲームを開いて会話を開始し直してください。",
  invalid_key: "ホストのAPIキーを確認してください。",
  model_access: "このキーでモデルを利用できません。",
  rate_limit: "APIの利用枠・混雑を確認してください。",
  api_configuration: "音声APIの設定を確認してください。",
  pair_required: "ホストに表示されたコードで接続してください。",
  invalid_pair_code:
    "接続リンクが使用済みか期限切れです。ホストで新しいQRを表示してください。",
  microphone_timeout:
    "マイクの許可待ちが続いています。ブラウザの権限表示を確認してください。表示されない場合はChromeやEdgeで開いてください。",
  settings_busy: "会話を終了してからキーを変更してください。",
  invalid_key_format: "APIキーの形式を確認してください。",
  host_only: "キーの設定はホストPCのlocalhost画面で行ってください。",
  lan_https_required: "端末用リンクにはLANのHTTPS設定が必要です。",
  pair_rate_limit: "コードの試行回数が上限です。少し待ってください。",
  mode_unavailable: "会話はCPUと交互の時間なしで使えます。",
  key_not_configured: "ホストにAPIキーが設定されていません。",
  backend_limit: "会話処理の上限です。画面のヒントは引き続き使えます。",
  backend_failed: "質問の処理に接続できません。画面のヒントを使えます。",
  decisions_unavailable: "表情の判定を休止しました。会話は続けられます。",
  session_ending:
    "接続上限まで30秒です。必要なら会話を終了し、設定の範囲で開始し直してください。",
  session_limit: "設定した接続時間・予算の上限で終了しました。",
  connection_failed: "音声に接続できませんでした。",
  live_error: "音声接続でエラーが発生しました。",
  transport_closed: "音声接続が切れました。",
  budget_limit: "ホストの予算上限に達しました。",
  already_started: "すでに接続しています。",
  voice_slot_required: "別の端末が使っているか、接続の準備が必要です。",
};
export class VoiceController {
  ui: VoiceUI = {
    state: "off",
    caption: "",
    userCaption: "",
    options: { ...defaultVoiceOptions },
    playing: false,
    elapsed: 0,
    inputLevel: 0,
    inputActive: false,
  };
  private listeners = new Set<(ui: VoiceUI) => void>();
  private csrf = "";
  private ws?: WebSocket;
  private pc?: RTCPeerConnection;
  private mic?: MediaStream;
  private audio?: AudioContext;
  private output?: AudioWorkletNode;
  private inputVad?: AudioWorkletNode;
  private heartbeat?: ReturnType<typeof setInterval>;
  private moodTimer?: ReturnType<typeof setTimeout>;
  private connectedAt = 0;
  private view?: GameVoiceView;
  private epoch = "";
  private generation = 0;
  private stopPromise?: Promise<void>;
  private operations = new Map<string, VoiceOperationResult>();
  operation?: (request: VoiceOperation) => VoiceOperationResult;
  subscribe(listener: (ui: VoiceUI) => void) {
    this.listeners.add(listener);
    listener(this.ui);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private change(value: Partial<VoiceUI>) {
    this.ui = { ...this.ui, ...value };
    for (const listener of this.listeners) listener(this.ui);
  }
  private notice(code: string) {
    this.change({ code: labels[code] ?? "接続を確認してください。" });
  }
  private inviteToken?: string;
  async status() {
    try {
      if (location.hash.startsWith("#connect=")) {
        this.inviteToken = location.hash.slice(9);
        history.replaceState(null, "", location.pathname + location.search);
      }
      let status = (await this.api("/voice-api/status", "GET")) as VoiceStatus;
      this.csrf = status.csrf ?? "";
      if (!status.paired && (status.hostSettings || this.inviteToken)) {
        const result = status.hostSettings
          ? await this.api("/voice-api/host-access", "POST", {})
          : await this.api("/voice-api/pair-invite", "POST", {
              token: this.inviteToken,
            });
        this.inviteToken = undefined;
        this.csrf = result.csrf;
        status = (await this.api("/voice-api/status", "GET")) as VoiceStatus;
      }
      this.csrf = status.csrf ?? "";
      this.inviteToken = undefined;
      this.change({
        status,
        ...(this.ui.state === "error" ? {} : { code: undefined }),
      });
      return status;
    } catch (error) {
      this.inviteToken = undefined;
      this.change({ status: undefined });
      if (error instanceof Error && error.message === "invalid_pair_code")
        this.notice(error.message);
      else
        this.change({
          code: "ゲームサーバーを確認できません。「接続状態を更新」で再確認してください。",
        });
      return undefined;
    }
  }
  async saveKey(apiKey: string, remember: boolean) {
    try {
      await this.api("/voice-api/host-settings", "POST", { apiKey, remember });
      await this.status();
      this.change({
        code: remember
          ? "このPCにキーを保存しました。"
          : "今回の起動中だけキーを設定しました。",
      });
      return true;
    } catch (error) {
      this.notice(error instanceof Error ? error.message : "connection_failed");
      return false;
    }
  }
  async createInvite(): Promise<
    { url: string; qr: string; expires: number } | undefined
  > {
    try {
      return await this.api("/voice-api/invite", "POST", {});
    } catch (error) {
      this.notice(error instanceof Error ? error.message : "connection_failed");
      return undefined;
    }
  }
  async pair(code: string) {
    try {
      const result = await this.api("/voice-api/pair", "POST", { code });
      this.csrf = result.csrf;
      await this.status();
    } catch (error) {
      this.notice(error instanceof Error ? error.message : "connection_failed");
    }
  }
  private async api(path: string, method: string, body?: unknown) {
    const response = await fetch(path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(path === "/voice-api/session" ? 30000 : 8000),
      headers: {
        "Content-Type": "application/json",
        "X-Voice-CSRF": this.csrf,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const value = await response.json();
    if (!response.ok) throw Error(value.error ?? "connection_failed");
    return value;
  }
  sync(view: GameVoiceView) {
    const previous = this.view;
    if (
      previous &&
      (previous.boardEpoch !== view.boardEpoch ||
        previous.moveCount !== view.moveCount ||
        (view.phase === "paused" && previous.phase !== "paused") ||
        (view.phase === "roundResult" && previous.phase !== "roundResult"))
    )
      this.output?.port.postMessage({ type: "discard" });
    this.view = view;
    if (this.ws?.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify({ type: "view", view }));
    if (this.ui.state === "active" && !view.eligible) void this.stop();
  }
  setOptions(options: VoiceOptions) {
    this.change({ options });
    this.mic
      ?.getAudioTracks()
      .forEach((track) => (track.enabled = options.mic));
    this.output?.port.postMessage({ type: "enable", value: options.output });
    this.send({ type: "options", options });
    if (!options.decisions) this.change({ mood: undefined });
    if (!options.mic) this.change({ inputLevel: 0, inputActive: false });
  }
  setGameMuted(muted: boolean) {
    if (muted && this.ui.options.output)
      this.setOptions({ ...this.ui.options, output: false });
  }
  private send(message: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify(message));
  }
  private receive(message: Record<string, any>) {
    if (message.type === "slot") {
      this.epoch = message.connectionEpoch;
      this.change({ epoch: this.epoch });
      return;
    }
    if (message.connectionEpoch && message.connectionEpoch !== this.epoch)
      return;
    if (message.type === "ready") {
      this.change({ code: undefined });
    }
    if (message.type === "audio") {
      if (
        message.boardEpoch !== this.view?.boardEpoch ||
        message.revision !== this.view?.revision
      )
        return;
      if (
        typeof message.data !== "string" ||
        message.data.length > 24000 ||
        message.rate !== 24000
      )
        return;
      const bytes = Uint8Array.from(atob(message.data), (c) => c.charCodeAt(0));
      const samples = new Float32Array(bytes.length / 2),
        data = new DataView(bytes.buffer);
      for (let i = 0; i < samples.length; i++)
        samples[i] = data.getInt16(i * 2, true) / 32768;
      this.output?.port.postMessage({ type: "audio", samples, rate: 24000 }, [
        samples.buffer,
      ]);
    }
    if (message.type === "caption") {
      if (message.direction === "assistant")
        this.change({ caption: message.text });
      else this.change({ userCaption: message.text });
    }
    if (message.type === "discard") {
      this.output?.port.postMessage({ type: "discard" });
      this.change({ caption: "", mood: undefined });
    }
    if (message.type === "permit")
      this.output?.port.postMessage({ type: "permit" });
    if (message.type === "usage") this.change({ usage: message.usage });
    if (message.type === "notice") this.notice(message.code);
    if (message.type === "error") {
      this.notice(message.code);
      void this.stop(true);
    }
    if (message.type === "options") this.setOptions(message.options);
    if (message.type === "mood") {
      if (this.moodTimer) clearTimeout(this.moodTimer);
      this.change({ mood: message.mood ?? undefined });
      this.moodTimer = setTimeout(
        () => this.change({ mood: undefined }),
        Math.min(2500, message.duration ?? 2000),
      );
    }
    if (message.type === "operation") {
      const request = message.operation as VoiceOperation;
      if (request.connectionEpoch !== this.epoch) return;
      let result = this.operations.get(request.requestId);
      if (!result) {
        result = this.operation?.(request);
        if (result) {
          this.operations.set(request.requestId, result);
          if (this.operations.size > 128)
            this.operations.delete(this.operations.keys().next().value!);
        }
      }
      if (result) {
        this.send({ type: "operation.result", result });
        this.sync(result.view);
      }
    }
    if (message.type === "closed") {
      this.change({ usage: message.usage });
      void this.cleanup();
      this.change({
        state: "off",
        mood: undefined,
        caption: "",
        userCaption: "",
        playing: false,
      });
    }
  }
  async start(prepareBoard = false) {
    if (!["off", "error"].includes(this.ui.state)) return;
    if (!prepareBoard && !this.view?.eligible) {
      this.notice("mode_unavailable");
      return;
    }
    const generation = ++this.generation;
    this.stopPromise = undefined;
    this.change({
      state: "connecting",
      step: "audio",
      code: undefined,
      usage: undefined,
      elapsed: 0,
      caption: "",
      userCaption: "",
    });
    try {
      // Unlock during the actual button gesture, before permission/network awaits (iOS/PWA).
      this.audio = new AudioContext();
      await Promise.race([
        this.audio.resume(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(Error("playback_blocked")), 5000),
        ),
      ]);
      if (generation !== this.generation) return;
      const status = await this.status();
      if (generation !== this.generation) return;
      if (!status?.available) throw Error("key_not_configured");
      if (!status.paired) throw Error("pair_required");
      if (status.busy) throw Error("voice_slot_required");
      if (!isSecureContext || !navigator.mediaDevices?.getUserMedia)
        throw Error("secure_context");
      if (prepareBoard) {
        this.change({ step: "board" });
        const deadline = Date.now() + 30000;
        while (
          !this.view?.eligible ||
          !this.view.cards.length ||
          ["title", "loading"].includes(this.view.phase)
        ) {
          if (generation !== this.generation) return;
          if (Date.now() > deadline) throw Error("board_timeout");
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
      if (generation !== this.generation) return;
      this.change({ step: "microphone" });
      let abandonedMic = false;
      const micPromise = navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micPromise.then(
        (stream) => {
          if (abandonedMic || generation !== this.generation)
            stream.getTracks().forEach((t) => t.stop());
        },
        () => {},
      );
      let micTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        this.mic = await Promise.race([
          micPromise,
          new Promise<never>((_, reject) => {
            micTimer = setTimeout(
              () => reject(Error("microphone_timeout")),
              20000,
            );
          }),
        ]);
      } catch (error) {
        abandonedMic = true;
        throw error;
      } finally {
        if (micTimer) clearTimeout(micTimer);
      }
      if (generation !== this.generation) {
        this.mic.getTracks().forEach((t) => t.stop());
        return;
      }
      this.mic.getAudioTracks().forEach((track) => {
        track.enabled = this.ui.options.mic;
        track.addEventListener(
          "ended",
          () => {
            if (generation !== this.generation) return;
            this.notice("microphone_ended");
            void this.stop(true);
          },
          { once: true },
        );
      });
      await this.audio.audioWorklet.addModule(outputWorkletUrl);
      this.output = new AudioWorkletNode(this.audio, "eshiritori-voice-output");
      this.output.port.postMessage({
        type: "enable",
        value: this.ui.options.output,
      });
      this.output.port.onmessage = (e) => {
        if (e.data.type === "playing") {
          this.change({ playing: e.data.value });
          this.send({ type: "playback", active: e.data.value });
        }
      };
      this.output.connect(this.audio.destination);
      await this.audio.audioWorklet.addModule(inputWorkletUrl);
      this.inputVad = new AudioWorkletNode(
        this.audio,
        "eshiritori-voice-input",
      );
      this.audio.createMediaStreamSource(this.mic).connect(this.inputVad);
      this.inputVad.connect(this.audio.destination);
      this.inputVad.port.onmessage = (e) => {
        if (e.data.type === "level") {
          // Meter stays in this browser; no waveform or levels go to the host.
          this.change({ inputLevel: this.ui.options.mic ? e.data.value : 0 });
        } else {
          this.change({ inputActive: this.ui.options.mic && e.data.active });
          this.send({
            type: "input.activity",
            active: e.data.active,
            sequence: e.data.sequence,
          });
        }
      };
      this.change({ step: "transport" });
      this.ws = new WebSocket(
        (location.protocol === "https:" ? "wss://" : "ws://") +
          location.host +
          "/voice-api/events",
        ["eshiritori-voice", this.csrf],
      );
      const ws = this.ws;
      ws.addEventListener("message", (e) => {
        try {
          this.receive(JSON.parse(e.data));
        } catch {
          /* invalid envelopes cannot mutate game */
        }
      });
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(Error("connection_failed")),
          8000,
        );
        ws.addEventListener(
          "message",
          (e) => {
            if (JSON.parse(e.data).type === "slot") {
              clearTimeout(timer);
              resolve();
            }
          },
          { once: true },
        );
        ws.addEventListener(
          "error",
          () => {
            clearTimeout(timer);
            reject(Error("connection_failed"));
          },
          { once: true },
        );
      });
      this.send({ type: "view", view: this.view });
      this.send({ type: "options", options: this.ui.options });
      ws.addEventListener("close", () => {
        if (!["off", "closing"].includes(this.ui.state)) {
          this.notice("transport_closed");
          void this.stop(true);
        }
      });
      this.connectedAt = Date.now();
      this.heartbeat = setInterval(() => {
        this.send({ type: "heartbeat" });
        this.change({
          elapsed: Math.floor((Date.now() - this.connectedAt) / 1000),
        });
      }, 1000);
      this.pc = new RTCPeerConnection();
      const pc = this.pc;
      this.mic.getTracks().forEach((track) => pc.addTrack(track, this.mic!));
      // WebRTC carries microphone input; owner-authenticated WSS carries reflected PCM output.
      pc.ontrack = () => {
        /* Never attach an ungated native audio sink. */
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected"].includes(pc.connectionState))
          void this.stop(true);
      };
      const dc = pc.createDataChannel("oai-events");
      dc.onmessage = (e) => {
        try {
          if (JSON.parse(e.data).type === "session.started")
            this.send({ type: "media.ready" });
        } catch {
          /* startup only */
        }
      };
      await pc.setLocalDescription(await pc.createOffer());
      await new Promise<void>((resolve, reject) => {
        if (pc.iceGatheringState === "complete") return resolve();
        const timer = setTimeout(
          () => reject(Error("connection_failed")),
          8000,
        );
        pc.addEventListener("icegatheringstatechange", () => {
          if (pc.iceGatheringState === "complete") {
            clearTimeout(timer);
            resolve();
          }
        });
      });
      this.change({ step: "api" });
      const answer = await this.api("/voice-api/session", "POST", {
        sdp: pc.localDescription?.sdp,
      });
      if (generation !== this.generation) {
        await this.api("/voice-api/session", "DELETE").catch(() => {});
        await this.cleanup();
        return;
      }
      this.epoch = answer.connectionEpoch;
      await pc.setRemoteDescription({ type: "answer", sdp: answer.sdp });
      this.change({ state: "active" });
      pc.addEventListener("connectionstatechange", () => {
        if (pc.connectionState === "connected")
          this.send({ type: "media.ready" });
      });
      if (pc.connectionState === "connected")
        this.send({ type: "media.ready" });
    } catch (error) {
      if (generation === this.generation) {
        if (this.epoch)
          await this.api("/voice-api/session", "DELETE").catch(() => {});
        await this.cleanup();
        this.change({ state: "error" });
        const code =
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "microphone_denied"
            : error instanceof DOMException && error.name === "NotFoundError"
              ? "microphone_missing"
              : error instanceof Error
                ? error.message
                : "connection_failed";
        this.notice(code === "secure_context" ? "connection_failed" : code);
        if (code === "secure_context")
          this.change({
            code: "マイクにはlocalhostまたは信頼済みHTTPSが必要です。",
          });
      }
    }
  }
  async stop(failed = false) {
    if (this.stopPromise) return this.stopPromise;
    this.generation++;
    this.change({ state: "closing" });
    this.output?.port.postMessage({ type: "discard" });
    this.stopPromise = (async () => {
      try {
        if (this.csrf) {
          const result = await this.api("/voice-api/session", "DELETE");
          if (result.usage) this.change({ usage: result.usage });
        }
      } catch {
        /* lease expires on host if notification fails */
      }
      await this.cleanup();
      this.change({
        state: failed ? "error" : "off",
        caption: "",
        userCaption: "",
        mood: undefined,
        playing: false,
      });
    })();
    return this.stopPromise;
  }
  private async cleanup() {
    this.change({ inputLevel: 0, inputActive: false, step: undefined });
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.moodTimer) clearTimeout(this.moodTimer);
    this.ws?.close();
    this.ws = undefined;
    this.pc?.close();
    this.pc = undefined;
    this.mic?.getTracks().forEach((track) => track.stop());
    this.mic = undefined;
    this.operations.clear();
    this.inputVad?.disconnect();
    this.inputVad = undefined;
    this.output?.disconnect();
    this.output = undefined;
    const audio = this.audio;
    this.audio = undefined;
    if (audio && audio.state !== "closed") await audio.close().catch(() => {});
  }
  dispose() {
    void this.stop();
  }
}
