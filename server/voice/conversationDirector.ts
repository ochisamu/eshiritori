import { randomUUID } from "node:crypto";
import type { ServerEvent } from "openai/resources/live/live";
import type {
  Chatter,
  GameVoiceView,
  VoiceOptions,
  VoiceOperationResult,
  VoiceOperation,
  VoiceMood,
} from "../../src/voice/protocol.js";
import { sameStamp } from "../../src/voice/protocol.js";
import type { VoiceConfig } from "./config.js";
import { OpenAILiveAdapter, type LiveLink } from "./openaiLiveAdapter.js";
import { UsageBook } from "./usage.js";
import {
  allowedIntent,
  byteChunks,
  contextDelta,
  eventOpportunity,
} from "./context.js";
import { authorizedTool, backendRequest } from "./backendService.js";
import { decideMood } from "./decisionsService.js";
export type Send = (message: Record<string, unknown>) => void;
export class ConversationDirector {
  readonly epoch = randomUUID();
  readonly usage: UsageBook;
  view?: GameVoiceView;
  link?: LiveLink;
  closing = false;
  options: VoiceOptions;
  startedAt = Date.now();
  lastSeen = Date.now();
  lastGameChange = Date.now();
  private generation = 0;
  private lastTalk = 0;
  private speechUntil = 0;
  private deliveredView?: GameVoiceView;
  private contextQueue = Promise.resolve();
  private acknowledgments = new Map<string, () => void>();
  private pending = new Map<
    string,
    {
      resolve: (r: VoiceOperationResult) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private seenRequests = new Set<string>();
  private seenDelegations = new Set<string>();
  private seenEvents = new Set<string>();
  readonly metrics = {
    delegations: 0,
    backendStarts: 0,
    blockedTools: 0,
    staleResults: 0,
    operations: 0,
    inputTurns: 0,
    contextEchoes: 0,
    proactive: 0,
    searchOpportunities: 0,
    searchAudio: 0,
    outputAudioFrames: 0,
    outputAudioPeak: 0,
  };
  private searchSequence = 0;
  private currentSearchAudio = false;
  private userSpeaking = false;
  private speechSequence = 0;
  private endedSequence = 0;
  private activeDelegation: string | null = null;
  private evaluatedVersion = -1;
  private lastPlayback = 0;
  private blockedOutput = false;
  private awaitingFacts = false;
  private appendIds = new Set<string>();
  private transcriptIds = new Set<string>();
  private input = "";
  private inputVersion = 0;
  private lastInputAt = 0;
  private output = "";
  private userHistory = new Map<number, { role: "user"; content: string }>();
  private pendingDecision?: {
    text: string;
    direction: "user" | "assistant";
    generation: number;
    turn: string;
  };
  private decisionTimer?: ReturnType<typeof setTimeout>;
  private history: { role: "user" | "assistant"; content: string }[] = [];
  private discoveries: string[] = [];
  private revealedHint?: {
    boardEpoch: string;
    moveCount: number;
    text: string;
    explanation: string;
  };
  private backendAbort?: AbortController;
  private decisionsAbort?: AbortController;
  private backendBusy = false;
  private decisionsBusy = false;
  private decisionSequence = 0;
  private decisionsErrors = 0;
  private backendCalls = 0;
  private decisionsCalls = 0;
  private backendWindow: number[] = [];
  private lastDecision = 0;
  private backendTimer?: ReturnType<typeof setTimeout>;
  private outputTimer?: ReturnType<typeof setTimeout>;
  private sessionWarned = false;
  private usageSent = 0;
  private mediaReady = false;
  private finish?: Promise<void>;
  private inputGateTimer?: ReturnType<typeof setTimeout>;
  private inputPermitTimer?: ReturnType<typeof setTimeout>;
  constructor(
    readonly config: VoiceConfig,
    readonly adapter: OpenAILiveAdapter,
    readonly send: Send,
    options: VoiceOptions,
    readonly priorCost: () => number,
  ) {
    this.options = {
      ...options,
      decisions: options.decisions && config.decisions,
    };
    this.usage = new UsageBook(config);
  }
  async connect(sdp: string) {
    const initial = this.view;
    const result = await this.adapter.create(sdp, initial);
    this.deliveredView = initial;
    if (this.closing) throw Error("closing");
    this.link = await this.adapter.attach(
      result.id,
      (e) => this.onEvent(e),
      (code) => {
        if (!this.closing) this.fail(code);
      },
    );
    this.send({ type: "ready", connectionEpoch: this.epoch });
    return result.sdp;
  }
  startConversation() {
    if (this.mediaReady || this.closing) return;
    this.mediaReady = true;
    if (!this.options.mic)
      this.link?.send({ type: "session.input_audio.mute" });
    const view = this.view,
      generation = this.generation;
    if (view)
      this.contextQueue = this.contextQueue
        .catch(() => {})
        .then(async () => {
          const ready = await this.syncContext(undefined, this.view!);
          if (!ready || this.closing || generation !== this.generation) return;
          this.allowSpeech();
          await this.append(
            "commentary",
            "絵しりとりを一緒に遊ぶ相手として短い自然な挨拶を一言。ヒントは出さず、相手が考える時間を残す。",
          );
        });
  }
  private allowSpeech() {
    this.blockedOutput = false;
    this.send({ type: "permit", connectionEpoch: this.epoch });
  }
  inputActivity(active: boolean, sequence: number) {
    if (sequence < this.speechSequence || this.closing) return;
    if (active) {
      if (sequence > this.speechSequence) {
        this.speechSequence = sequence;
        this.endedSequence = 0;
        this.activeDelegation = null;
        this.input = "";
        this.awaitingFacts = false;
        this.inputVersion++;
        this.metrics.inputTurns++;
      }
      this.userSpeaking = true;
      this.backendAbort?.abort();
      this.blockedOutput = true;
      this.send({ type: "discard", connectionEpoch: this.epoch });
      if (this.inputGateTimer) clearTimeout(this.inputGateTimer);
      const generation = this.generation;
      this.inputGateTimer = setTimeout(() => {
        if (
          !this.closing &&
          sequence === this.speechSequence &&
          generation === this.generation &&
          !this.awaitingFacts
        )
          this.allowSpeech();
      }, 150);
    } else if (sequence === this.speechSequence) {
      this.userSpeaking = false;
      this.endedSequence = sequence;
      this.scheduleBackend();
    }
  }
  playback(active: boolean) {
    if (active) this.lastPlayback = Date.now();
  }
  private scheduleBackend() {
    if (this.backendTimer) clearTimeout(this.backendTimer);
    const run = () => {
      if (this.closing) return;
      if (
        this.userSpeaking ||
        this.endedSequence !== this.speechSequence ||
        this.speechSequence === 0
      )
        return;
      if (Date.now() - this.lastInputAt < 1000 || this.backendBusy) {
        this.backendTimer = setTimeout(run, 250);
        return;
      }
      if (this.evaluatedVersion === this.inputVersion) return;
      if (this.input) {
        const old = this.userHistory.get(this.speechSequence);
        if (old) old.content = this.input;
        else {
          const entry = { role: "user" as const, content: this.input };
          this.userHistory.set(this.speechSequence, entry);
          this.history = [...this.history, entry].slice(-12);
        }
        if (this.userHistory.size > 24)
          this.userHistory.delete(this.userHistory.keys().next().value!);
      }
      this.scheduleDecision(this.input, "user");
      const explicit = allowedIntent(this.input, this.view?.hint.level ?? 0);
      this.awaitingFacts =
        explicit?.action === "explain" || explicit?.action === "hint";
      if (this.awaitingFacts) {
        this.blockedOutput = true;
        this.send({ type: "discard", connectionEpoch: this.epoch });
      } else this.allowSpeech();
      if (this.activeDelegation || explicit) {
        this.evaluatedVersion = this.inputVersion;
        void this.delegate(this.activeDelegation);
      }
    };
    this.backendTimer = setTimeout(run, 1050);
  }
  private fail(code: string) {
    this.send({ type: "error", code });
    void this.stop();
  }
  private async append(
    kind: "thinking" | "commentary" | "instructions",
    content: string,
    delegation: string | null = null,
  ) {
    if (this.closing || !this.link || !this.mediaReady) return false;
    const eventId = randomUUID();
    this.appendIds.add(eventId);
    if (this.appendIds.size > 2048)
      this.appendIds.delete(this.appendIds.values().next().value!);
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.acknowledgments.delete(eventId);
        resolve(false);
      }, 4500);
      this.acknowledgments.set(eventId, () => {
        clearTimeout(timer);
        resolve(true);
      });
      this.link!.send({
        type: ("session." + kind + ".append") as "session.thinking.append",
        event_id: eventId,
        delegation_id: delegation,
        content,
      });
    });
  }
  private async syncContext(
    _before: GameVoiceView | undefined,
    next: GameVoiceView,
  ) {
    if (next.revision !== this.view?.revision) return false;
    const generation = this.generation;
    for (const content of byteChunks(contextDelta(this.deliveredView, next))) {
      if (generation !== this.generation || this.closing) return false;
      if (!(await this.append("thinking", content))) return false;
    }
    if (generation !== this.generation || next.revision !== this.view?.revision)
      return false;
    this.deliveredView = next;
    return true;
  }
  update(view: GameVoiceView) {
    this.lastSeen = Date.now();
    if (
      this.view &&
      (view.gameId !== this.view.gameId || view.revision <= this.view.revision)
    )
      return;
    const before = this.view;
    this.view = view;
    if (
      this.revealedHint &&
      (this.revealedHint.boardEpoch !== view.boardEpoch ||
        this.revealedHint.moveCount !== view.moveCount)
    )
      this.revealedHint = undefined;
    if (view.lastMove?.discovery && view.lastMove.id !== before?.lastMove?.id) {
      this.discoveries = [
        ...this.discoveries,
        view.lastMove.display + "：" + view.lastMove.explanation,
      ].slice(-3);
      void this.append(
        "thinking",
        "今回、プレイヤーが実際に見つけた裏読み：" +
          view.lastMove.display +
          "。" +
          view.lastMove.explanation.slice(0, 70),
      );
    }
    this.lastGameChange = Date.now();
    const barrier =
      !before ||
      view.boardEpoch !== before.boardEpoch ||
      view.moveCount !== before.moveCount ||
      view.phase === "paused" ||
      view.phase === "loadingRound" ||
      (before?.phase === "cpuThinking" && view.phase !== "cpuThinking") ||
      (!!view.result && !before?.result) ||
      !view.eligible;
    if (barrier) this.invalidate();
    if (!view.eligible) {
      void this.stop();
      return;
    }
    const generation = this.generation;
    const early = eventOpportunity(before, view);
    if (early?.type === "cpu.search.started")
      void this.searchAside(view, generation);
    this.contextQueue = this.contextQueue
      .catch(() => {})
      .then(async () => {
        if (
          this.generation !== generation ||
          view.revision !== this.view?.revision
        )
          return;
        const ready = await this.syncContext(before, view);
        if (!ready) return;
        if (
          this.generation !== generation ||
          this.closing ||
          !this.link ||
          !this.mediaReady
        )
          return;
        const opportunity = eventOpportunity(before, view);
        if (
          !opportunity ||
          opportunity.type === "cpu.search.started" ||
          (opportunity.type === "player.move.committed" &&
            this.options.chatter !== "chatty") ||
          this.seenEvents.has(opportunity.id) ||
          view.phase === "paused"
        )
          return;
        this.seenEvents.add(opportunity.id);
        if (this.seenEvents.size > 256)
          this.seenEvents.delete(this.seenEvents.values().next().value!);
        const quiet = this.options.chatter === "quiet";
        if (quiet && !view.result) return;
        const gap = this.options.chatter === "chatty" ? 1800 : 4500;
        if (
          (Date.now() - this.lastTalk < gap && !view.result) ||
          Date.now() - this.lastInputAt < 1600 ||
          this.backendBusy ||
          this.userSpeaking
        )
          return;
        this.metrics.proactive++;
        this.lastTalk = Date.now();
        this.speechUntil = Date.now() + 5500;
        this.allowSpeech();
        const intent =
          opportunity.type === "board.completed"
            ? "結果に短く反応。実際の発見に関連するときだけ触れる。"
            : opportunity.type === "board.ready"
              ? "見えている絵の顔ぶれに一言。ヒントを出さない。"
              : "直前に確定した読み・発見に短く自然な反応。毎回ほめない。";
        await this.append("commentary", intent);
      });
  }
  private async searchAside(view: GameVoiceView, generation: number) {
    this.searchSequence++;
    if (
      !this.mediaReady ||
      !this.link ||
      this.options.chatter === "quiet" ||
      this.userSpeaking ||
      this.backendBusy ||
      Date.now() - this.lastInputAt < 1600
    )
      return;
    if (this.options.chatter === "normal" && this.searchSequence % 2 === 0)
      return;
    if (Date.now() - this.lastTalk < 2200) return;
    const accepted = await this.append(
      "thinking",
      "現在はCPUが「" +
        view.head +
        "」から探し始めた。答えは未確定。札の名前や答えを先に言わない。",
    );
    if (
      !accepted ||
      this.closing ||
      generation !== this.generation ||
      this.view?.phase !== "cpuThinking" ||
      this.view.moveCount !== view.moveCount
    )
      return;
    this.lastTalk = Date.now();
    this.metrics.proactive++;
    this.metrics.searchOpportunities++;
    this.currentSearchAudio = true;
    this.allowSpeech();
    await this.append(
      "commentary",
      "「" +
        view.head +
        "」から探す、1秒ほどの短い独り言をひとこと。答えや具体的な札はまだ言わない。毎回同じ言い方をしない。",
    );
  }
  private invalidate() {
    this.generation++;
    this.currentSearchAudio = false;
    this.speechUntil = 0;
    this.output = "";
    this.blockedOutput = true;
    this.lastPlayback = 0;
    this.backendAbort?.abort();
    this.decisionsAbort?.abort();
    this.pendingDecision = undefined;
    if (this.decisionTimer) clearTimeout(this.decisionTimer);
    this.decisionSequence++;
    this.send({ type: "discard", connectionEpoch: this.epoch });
    if (this.link)
      void this.append(
        "instructions",
        "手番や盤面が変わりました。古い探索・反応の発話を中断して静かにし、最新の確定状態だけを使う。中断した発話は相手に聞こえた前提にしない。",
      );
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.resolve({
        requestId: id,
        connectionEpoch: this.epoch,
        status: "stale",
        view: this.view!,
      });
    }
    this.pending.clear();
  }
  setOptions(value: VoiceOptions) {
    this.options = {
      ...value,
      decisions: value.decisions && this.config.decisions,
    };
    if (!this.options.decisions) {
      this.decisionsAbort?.abort();
      this.decisionSequence++;
      this.send({ type: "mood", mood: null, connectionEpoch: this.epoch });
    }
    if (this.link)
      this.link.send({
        type: value.mic
          ? "session.input_audio.unmute"
          : "session.input_audio.mute",
      });
    if (this.link)
      void this.append(
        "instructions",
        value.chatter === "quiet"
          ? "発話頻度は静か。自発的な実況は控え、質問と要求には短く応答する。"
          : value.chatter === "chatty"
            ? "発話頻度はよく話す。ただし考える時間と沈黙を残す。"
            : "発話頻度はほどほど。毎回の実況を避け、考える間は静かに。",
      );
  }
  private onEvent(event: ServerEvent) {
    if (event.type === "session.output_audio.delta") {
      this.metrics.outputAudioFrames++;
      const pcm = Buffer.from(event.delta, "base64");
      let chunkPeak = 0;
      for (let offset = 0; offset + 1 < pcm.length; offset += 2)
        chunkPeak = Math.max(chunkPeak, Math.abs(pcm.readInt16LE(offset)));
      this.metrics.outputAudioPeak = Math.max(
        this.metrics.outputAudioPeak,
        chunkPeak,
      );
      if (this.currentSearchAudio && !this.blockedOutput && chunkPeak > 262) {
        this.metrics.searchAudio++;
        this.currentSearchAudio = false;
      }
      if (!this.closing && !this.blockedOutput && this.options.output)
        this.send({
          type: "audio",
          rate: 24000,
          data: event.delta,
          boardEpoch: this.view?.boardEpoch,
          revision: this.view?.revision,
          connectionEpoch: this.epoch,
        });
    }
    if (
      event.type === "session.input_transcript.delta" ||
      event.type === "session.output_transcript.delta"
    ) {
      if (
        event.start_ms === event.end_ms ||
        (event.type === "session.input_transcript.delta" &&
          event.client_event_id &&
          this.appendIds.has(event.client_event_id))
      ) {
        this.metrics.contextEchoes++;
        return;
      }
    }
    if (event.type.endsWith(".appended")) {
      const id = "client_event_id" in event ? event.client_event_id : undefined;
      if (id) this.acknowledgments.get(id)?.();
      if (id) this.acknowledgments.delete(id);
    }
    if (
      event.type === "session.usage.updated" ||
      event.type === "session.closed"
    ) {
      this.usage.voice(event.usage.seconds, event.type === "session.closed");
      this.sendUsage();
    }
    if (event.type === "session.closed") {
      this.closing = true;
      this.send({
        type: "closed",
        usage: this.usage.snapshot(),
        connectionEpoch: this.epoch,
      });
      return;
    }
    if (this.closing) return;
    if (event.type === "session.input_transcript.delta") {
      if (this.transcriptIds.has(event.event_id)) return;
      this.transcriptIds.add(event.event_id);
      if (this.transcriptIds.size > 1000)
        this.transcriptIds.delete(this.transcriptIds.values().next().value!);

      this.input = (this.input + event.delta).slice(-1500);
      // Gate only speculative narration while a game-fact request is being recognized.
      // This is not a hint operation; incomplete and negated speech still consumes nothing.
      if (
        /(ヒント|ひんと|答え|正解|読み|意味|理由)/.test(this.input) &&
        !/(いらない|要らない|言わない|使わない|不要|ヒントって|ヒントとは|ヒントの意味)/.test(
          this.input,
        )
      ) {
        this.awaitingFacts = true;
        this.blockedOutput = true;
        this.output = "";
        this.send({ type: "discard", connectionEpoch: this.epoch });
      }
      this.lastInputAt = Date.now();
      this.inputVersion++;
      this.backendAbort?.abort();
      this.speechUntil = 0;
      this.send({
        type: "caption",
        direction: "user",
        text: this.input,
        connectionEpoch: this.epoch,
      });
      if (this.inputPermitTimer) clearTimeout(this.inputPermitTimer);
      const version = this.inputVersion,
        generation = this.generation;
      this.inputPermitTimer = setTimeout(() => {
        if (
          !this.closing &&
          !this.userSpeaking &&
          this.endedSequence === this.speechSequence &&
          version === this.inputVersion &&
          generation === this.generation &&
          !this.awaitingFacts
        )
          this.allowSpeech();
      }, 850);
      this.scheduleBackend();
    }
    if (event.type === "session.output_transcript.delta") {
      if (this.blockedOutput) return;
      if (this.outputTimer) clearTimeout(this.outputTimer);
      this.output = (this.output + event.delta).slice(-1500);
      this.send({
        type: "caption",
        direction: "assistant",
        text: this.output,
        connectionEpoch: this.epoch,
      });
      this.outputTimer = setTimeout(() => {
        const text = this.output;
        this.output = "";
        if (text && Date.now() - this.lastPlayback < 5000)
          this.history = [
            ...this.history,
            { role: "assistant" as const, content: text },
          ].slice(-12);
        if (text) this.scheduleDecision(text, "assistant");
      }, 1000);
    }
    if (
      event.type === "session.delegation.created" &&
      event.delegation.target === "client"
    ) {
      const id = event.delegation.id;
      if (this.seenDelegations.has(id)) return;
      this.seenDelegations.add(id);
      this.metrics.delegations++;
      this.activeDelegation = id;
      void this.append("thinking", "", id);
      this.scheduleBackend();
    }
  }
  private async delegate(delegation: string | null) {
    const view = this.view,
      text = this.input,
      version = this.inputVersion;
    if (!view || !text || this.closing || this.backendBusy) return;
    this.backendWindow = this.backendWindow.filter(
      (t) => Date.now() - t < 60000,
    );
    if (
      this.backendCalls >= this.config.maxBackend ||
      this.backendWindow.length >= this.config.maxBackendMinute ||
      this.priorCost() + this.usage.estimate() + 0.02 >= this.config.budget
    ) {
      this.send({ type: "notice", code: "backend_limit" });
      return;
    }
    this.metrics.backendStarts++;
    this.backendCalls++;
    this.backendWindow.push(Date.now());
    this.backendBusy = true;
    const usageId = randomUUID();
    this.usage.reserve("backend", usageId);
    const abort = new AbortController();
    this.backendAbort = abort;
    const stamp = { ...view };
    let responseView = view;
    const generation = this.generation;
    const current = () =>
      !this.closing &&
      !abort.signal.aborted &&
      version === this.inputVersion &&
      this.view &&
      sameStamp(stamp, this.view);
    try {
      const response = await backendRequest(
        this.adapter.client,
        this.config.backendModel,
        text,
        this.history,
        view,
        abort.signal,
        this.discoveries,
      );
      this.usage.tokens("backend", usageId, response.usage ?? {});
      if (!current()) {
        this.metrics.staleResults++;
        return;
      }

      let result: string | undefined = response.output_text;
      const call = response.output.find(
        (item) => item.type === "function_call",
      );
      if (call?.type === "function_call") {
        const request = authorizedTool(call, text, view);
        if (!request) {
          this.metrics.blockedTools++;
        }
        if (!request)
          result =
            "要求は実行していません。意図が明確でなければ短く確認してください。";
        else if (request.action === "view")
          result = JSON.stringify({
            head: view.head,
            phase: view.phase,
            selected: view.selectedCardId,
          });
        else if (request.action === "explain")
          result =
            this.revealedHint && !/(着手|選んだ|取った|CPU|相手)/i.test(text)
              ? this.revealedHint.text +
                " 承認済みの理由：" +
                this.revealedHint.explanation
              : view.lastMove
                ? "直前に確定した読みは「" +
                  view.lastMove.display +
                  "」。理由：" +
                  view.lastMove.explanation
                : "まだ確定した読みはありません。";
        else if (request.action === "stop") {
          await this.stop();
          return;
        } else if (request.action === "chatter") {
          this.options.chatter = request.frequency as Chatter;
          this.send({ type: "options", options: this.options });
          this.setOptions(this.options);
          result = "発話頻度を変更しました。";
        } else {
          const requestId = this.epoch + ":utterance:" + this.speechSequence;
          if (this.seenRequests.has(requestId)) return;
          this.seenRequests.add(requestId);
          const operation: VoiceOperation = {
            requestId,
            connectionEpoch: this.epoch,
            expected: view,
            action: request.action,
            mode: request.mode,
          };
          const applied = await new Promise<VoiceOperationResult>((resolve) => {
            const timer = setTimeout(() => {
              this.pending.delete(requestId);
              resolve({
                requestId,
                connectionEpoch: this.epoch,
                status: "unavailable",
                view: this.view!,
              });
            }, 3500);
            this.metrics.operations++;
            this.pending.set(requestId, { resolve, timer });
            this.send({ type: "operation", operation });
          });
          if (
            applied.status !== "ok" ||
            this.closing ||
            version !== this.inputVersion ||
            applied.view.boardEpoch !== view.boardEpoch
          )
            return;
          // Engine acknowledgement is the only source of hint contents. Do not ask a model to invent it.
          result = applied.hint
            ? applied.hint.text
            : request.action === "pause"
              ? "ゲームを一時停止しました。"
              : "ゲームを再開しました。";
          if (applied.hint?.level === 3 && applied.hint.explanation)
            this.revealedHint = {
              boardEpoch: applied.view.boardEpoch,
              moveCount: applied.view.moveCount,
              text: applied.hint.text,
              explanation: applied.hint.explanation,
            };
          this.view = applied.view;
          responseView = applied.view;
          if (request.action !== "hint") {
            this.generation++;
            this.blockedOutput = true;
            this.send({ type: "discard", connectionEpoch: this.epoch });
            await this.append(
              "instructions",
              "ゲーム状態が変わりました。直前の実況を中断し、確定した操作結果だけを短く伝える。",
            );
          }
          await this.syncContext(view, applied.view);
        }
      }
      if (this.closing || abort.signal.aborted || version !== this.inputVersion)
        return;
      if (generation !== this.generation && !call) return;
      if (!this.view || !sameStamp(responseView, this.view)) return;
      if (
        call?.type === "function_call" &&
        ["game_request_hint", "game_explain_last_move"].includes(call.name)
      ) {
        this.blockedOutput = true;
        this.send({ type: "discard", connectionEpoch: this.epoch });
        await this.append(
          "instructions",
          "この要求はエンジンが処理済み。次に渡す確定結果と承認済み理由だけを案内する。辞書的な別の意味、類義語、独自の解釈は足さない。不明なら分からないと伝える。追加要求の可否を再判断して拒否せず、新しい手掛かりを足さない。明示要求で第3段階まで公開したときは、その答えを案内してよい。",
        );
      }
      this.awaitingFacts = false;
      this.allowSpeech();
      for (const chunk of byteChunks(
        result || "要求の内容を短く確認してください。",
      ))
        await this.append("commentary", chunk, delegation);
    } catch {
      if (!abort.signal.aborted)
        this.send({ type: "notice", code: "backend_failed" });
    } finally {
      this.backendBusy = false;
      this.sendUsage();
    }
  }
  operationResult(result: VoiceOperationResult) {
    if (result.connectionEpoch !== this.epoch) return;
    const pending = this.pending.get(result.requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(result.requestId);
    pending.resolve(result);
  }
  private scheduleDecision(text: string, direction: "user" | "assistant") {
    if (
      !this.view ||
      !this.options.decisions ||
      this.decisionsErrors >= 2 ||
      this.decisionsCalls >= this.config.maxDecisions
    )
      return;
    if (this.decisionsBusy || Date.now() - this.lastDecision < 1000) {
      this.pendingDecision = {
        text,
        direction,
        generation: this.generation,
        turn: this.view.turnId,
      };
      this.decisionSequence++;
      if (!this.decisionsBusy) this.schedulePendingDecision();
      return;
    }
    if (this.priorCost() + this.usage.estimate() + 0.02 >= this.config.budget)
      return;
    this.lastDecision = Date.now();
    this.decisionsBusy = true;
    this.decisionsCalls++;
    const sequence = ++this.decisionSequence,
      generation = this.generation,
      turn = this.view.turnId;
    const usageId = this.epoch + ":decision:" + sequence;
    this.usage.reserve("decisions", usageId);
    const abort = new AbortController();
    this.decisionsAbort = abort;
    void decideMood(
      this.adapter.client,
      this.config.decisionsModel,
      text,
      direction,
      this.view.phase,
      abort.signal,
    )
      .then((result) => {
        this.usage.tokens("decisions", usageId, result.usage);
        if (
          result.mood &&
          this.options.decisions &&
          sequence === this.decisionSequence &&
          generation === this.generation &&
          turn === this.view?.turnId &&
          !this.closing
        )
          this.send({
            type: "mood",
            mood: result.mood as VoiceMood,
            duration: 2000,
            connectionEpoch: this.epoch,
          });
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          this.decisionsErrors++;
          this.send({ type: "mood", mood: null, connectionEpoch: this.epoch });
          this.send({ type: "notice", code: "decisions_unavailable" });
        }
      })
      .finally(() => {
        this.decisionsBusy = false;
        this.sendUsage();
        this.schedulePendingDecision();
      });
  }
  private schedulePendingDecision() {
    if (this.decisionTimer) clearTimeout(this.decisionTimer);
    const pending = this.pendingDecision;
    if (!pending || this.closing || !this.options.decisions) return;
    this.decisionTimer = setTimeout(
      () => {
        this.pendingDecision = undefined;
        if (
          pending.generation === this.generation &&
          pending.turn === this.view?.turnId
        )
          this.scheduleDecision(pending.text, pending.direction);
      },
      Math.max(10, 1000 - (Date.now() - this.lastDecision)),
    );
  }
  tick() {
    if (this.closing) return;
    if (
      !this.sessionWarned &&
      Date.now() - this.startedAt > (this.config.maxSeconds - 30) * 1000
    ) {
      this.sessionWarned = true;
      this.send({ type: "notice", code: "session_ending" });
    }
    if (
      Date.now() - this.startedAt > this.config.maxSeconds * 1000 ||
      this.priorCost() + this.usage.estimate() + 0.01 >= this.config.budget
    ) {
      this.send({ type: "notice", code: "session_limit" });
      void this.stop();
    }
    if (
      this.view &&
      ["paused", "roundResult", "title", "finishedSession"].includes(
        this.view.phase,
      ) &&
      Date.now() -
        Math.max(this.lastGameChange, this.lastInputAt, this.lastPlayback) >
        this.config.idleSeconds * 1000
    )
      void this.stop();
    if (Date.now() - this.lastSeen > 15000) void this.stop();
    if (this.speechUntil && Date.now() > this.speechUntil) {
      this.speechUntil = 0; /* No queue of stale search opportunities. */
    }
    if (Date.now() - this.usageSent > 1000) this.sendUsage();
  }
  private sendUsage() {
    this.usageSent = Date.now();
    this.send({
      type: "usage",
      usage: this.usage.snapshot(),
      connectionEpoch: this.epoch,
    });
  }
  async stop(): Promise<void> {
    if (this.finish) return this.finish;
    this.finish = this.finishStop();
    return this.finish;
  }
  private async finishStop() {
    this.closing = true;
    this.invalidate();
    if (this.backendTimer) clearTimeout(this.backendTimer);
    if (this.outputTimer) clearTimeout(this.outputTimer);
    if (this.inputPermitTimer) clearTimeout(this.inputPermitTimer);
    if (this.inputGateTimer) clearTimeout(this.inputGateTimer);
    const final = await this.link?.close();
    this.usage.finalized = final === true && this.usage.finalized;
    for (const resolve of this.acknowledgments.values()) resolve();
    this.acknowledgments.clear();
    this.history = [];
    this.userHistory.clear();
    this.discoveries = [];
    this.revealedHint = undefined;
    this.input = "";
    this.output = "";
    this.send({
      type: "closed",
      usage: this.usage.snapshot(),
      connectionEpoch: this.epoch,
    });
  }
}
