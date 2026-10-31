import { totalScore, scoreHelp, cpuRoundScore } from "./game/scoring";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  HelpCircle,
  Home,
  Lightbulb,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Trophy,
  Volume2,
  VolumeX,
  X,
  MousePointer2,
  Layers3,
  MessageCircle,
} from "lucide-react";
import { activeAssets as assets } from "./game/content";
import { chooseCpu, LEGACY_CPU_VERSION } from "./game/cpu";
import { BOARD_SIZE } from "./game/config";
import { BoardClient } from "./game/boardClient";
import {
  initialState,
  position,
  reducer,
  currentRecord,
  type Action,
} from "./game/state";
import { exportReplay, importReplay } from "./game/replay";
import { legalMoves } from "./game/rules";
import { loadGame, saveGame } from "./storage/save";
import type { Asset, Board, GameState, Settings } from "./game/types";
import { Dialog } from "./ui/Dialog";
import { CardDetail } from "./ui/CardDetail";
import { EvidenceArt } from "./ui/EvidenceArt";
import { sound } from "./ui/sound";
import {
  boardSlots,
  reserveRemaining,
  timedMode,
  refillMode,
} from "./game/refill";
import {
  RACE_APPROACH_MS,
  cpuSearchCard,
  cpuSelectionStage,
} from "./game/cpuPresentation";
import { sessionSeed } from "./game/sessionSeed";
import { hintActions, hintPresentation } from "./game/hintPresentation";
import { useVoice } from "./voice/useVoice";
import { VoicePanel, VoiceCaption } from "./voice/VoicePanel";
import { voiceEligible } from "./voice/projectGameView";
import { CpuCompanion, opponentFor, type CpuMood } from "./ui/CpuCompanion";
import { DiscoveryStamp } from "./ui/DiscoveryStamp";
import { AppInstallInfo, useAppAccess } from "./ui/AppAccess";
import { TitleScreen } from "./ui/TitleScreen";
import { Collection } from "./ui/Collection";
import { RaceCursor } from "./ui/RaceCursor";
import { Ranking } from "./ui/Ranking";
import { answerDisplayDuration } from "./game/answerPresentation";
import { discoveryProgress } from "./game/discovery";

type Modal =
  | "voice"
  | "install"
  | "rules"
  | "settings"
  | "catalog"
  | "ranking"
  | "tutorial"
  | "review"
  | "replay"
  | null;
const difficultyNames = {
  easy: "やさしい",
  normal: "ふつう",
  hard: "むずかしい",
};
const cardSizes = "(max-width: 600px) 88px, (max-width: 900px) 120px, 160px";
function cardSources(a: Asset) {
  return a.thumbnail
    ? `${a.preview ? a.preview + " 96w, " : ""}${a.thumbnail} 128w, ${a.image} 256w`
    : undefined;
}
function preloadCard(a: Asset, lowPriority = false) {
  const image = new Image();
  image.fetchPriority = lowPriority ? "low" : "high";
  image.sizes = cardSizes;
  image.srcset = cardSources(a) ?? "";
  image.src = a.image;
  return image;
}
function readInitial(): GameState {
  try {
    return (
      loadGame(
        localStorage,
        assets.map((a) => a.id),
        assets.flatMap((a) => a.readings.map((r) => r.id)),
      ).state ?? initialState()
    );
  } catch {
    return initialState();
  }
}
function PixelFlower() {
  return (
    <span className="pixel-flower" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <b />
    </span>
  );
}
function ParticleBurst({
  win = false,
  alternative = false,
}: {
  win?: boolean;
  alternative?: boolean;
}) {
  return (
    <div
      className={`particles ${win ? "party" : ""} ${alternative ? "alternative-particles" : ""}`}
      aria-hidden
    >
      {Array.from({ length: win ? 40 : alternative ? 24 : 14 }, (_, i) => (
        <i
          key={i}
          style={
            {
              "--i": i,
              "--x": `${Math.sin(i * 2.4) * 230}px`,
              "--y": `${-70 - Math.cos(i * 1.9) * 140}px`,
              "--r": `${i * 53}deg`,
              "--color": (alternative
                ? ["#a482da", "#f9ca4c", "#e29fce", "#8068bf"]
                : ["#ef735c", "#f9ca4c", "#79cbb7", "#7e8bd8"])[i % 4],
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function App() {
  const [s, dispatch] = useReducer(
    (state: GameState, a: Action) => reducer(state, a, assets),
    undefined,
    readInitial,
  );
  const access = useAppAccess();
  const opponent = opponentFor(s.seed, s.round);
  const [boardImagesReady, setBoardImagesReady] = useState(false);
  const readyRef = useRef(false);
  readyRef.current = boardImagesReady;
  const clockLast = useRef(performance.now());
  const [modal, setModalValue] = useState<Modal>(null);
  const requestedModal = useRef<Modal>(null);
  const prepareVoice = useRef(false);
  const setModal = useCallback((value: Modal) => {
    // A close can arrive before the previous render's pause effect runs.
    requestedModal.current = value;
    setModalValue(value);
  }, []);
  const [replayCode, setReplayCode] = useState("");
  const [replayError, setReplayError] = useState("");
  const [detail, setDetail] = useState<Asset | null>(null);
  const [detailMode, setDetailMode] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const hintButtonRef = useRef<HTMLButtonElement>(null);
  const [showError, setShowError] = useState(false);
  const [draft, setDraft] = useState<Settings>(s.settings);
  // A saved/replayed session's seed must not become the next session's override.
  const [seed, setSeed] = useState("");
  const [shake, setShake] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const observedMove = useRef(s.lastMove?.id);
  const [reward, setReward] = useState<string | null>(null);
  const [cpuReaction, setCpuReaction] = useState<CpuMood | null>(null);
  const [inputLocked, setInputLocked] = useState(false);
  const milestoneRef = useRef(0);
  const [timeAnnouncement, setTimeAnnouncement] = useState("");
  const lockRef = useRef(0);
  const sRef = useRef(s);
  sRef.current = s;
  const resumeAfterModal = useRef(false);
  const generationToken = useRef(0);
  const boardClient = useRef(new BoardClient());
  const prefetchImages = useRef<HTMLImageElement[]>([]);
  const preparedBoard = useRef<{ key: string; board: Board } | null>(null);
  useEffect(() => {
    if (["loadingRound", "title", "finishedSession"].includes(s.phase))
      window.scrollTo({ top: 0, behavior: "instant" });
  }, [s.phase, s.round, s.seed]);
  useEffect(() => () => boardClient.current.stop(), []);
  useEffect(() => {
    if (["title", "finishedSession", "recoverableError"].includes(s.phase))
      boardClient.current.stop();
  }, [s.phase]);
  const knownReadings = useMemo(() => new Set(s.discovered), [s.discovered]);
  const savedAt = useRef(0);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const foundAssets = useMemo(() => {
    const known = new Set(s.discovered);
    return assets.filter((a) => a.readings.some((r) => known.has(r.id))).length;
  }, [s.discovered]);
  const shownIds = boardSlots(
    s.board,
    s.phase === "resolvingMove" ? s.moves.slice(0, -1) : s.moves,
  );
  const shownKey = shownIds.join(",");
  const boardAssets = useMemo(
    () =>
      shownIds.map((id) => assets.find((a) => a.id === id)!).filter(Boolean),
    [shownKey],
  );
  const cpuActive =
    s.phase === "cpuThinking" ||
    (s.settings.opponent === "race" && s.phase === "playerTurn");
  const cpuDecision = useMemo(
    () =>
      s.board &&
      ((s.actor === "cpu" && ["cpuThinking", "paused"].includes(s.phase)) ||
        (s.settings.opponent === "race" && s.phase === "playerTurn"))
        ? s.board.opening && s.moves.length === 0
          ? {
              move:
                legalMoves(assets, position(s)).find(
                  (m) =>
                    m.assetId === s.board!.opening!.assetId &&
                    m.reading.id === s.board!.opening!.readingId,
                ) ?? null,
              states: 0,
              limited: false,
            }
          : chooseCpu(
              assets,
              position(s),
              s.settings.difficulty,
              `${s.board.seed}:cpu:${s.moves.length}`,
              undefined,
              s.board.cpuVersion ?? LEGACY_CPU_VERSION,
            )
        : undefined,
    [
      s.phase,
      s.board,
      s.moves,
      s.settings.difficulty,
      s.actor,
      s.head,
      s.settings.opponent,
    ],
  );
  const cpuStumped = cpuActive && !cpuDecision?.move && s.cpuRemaining < 800;
  const searchingCard =
    cpuActive && !s.settings.reducedMotion
      ? cpuSearchCard(s, cpuDecision?.move?.assetId)
      : undefined;
  const selectionStage = cpuSelectionStage(s);
  const openingSelection =
    cpuActive && !!s.board?.opening && s.moves.length === 0;
  const cpuMood: CpuMood =
    s.phase === "paused"
      ? "resting"
      : s.phase === "roundResult"
        ? s.winner === null
          ? "watching"
          : s.winner === "cpu"
            ? "happy"
            : "sad"
        : cpuActive && selectionStage === "locked" && cpuDecision?.move
          ? "idea"
          : cpuStumped
            ? "stumped"
            : (cpuReaction ??
              (cpuActive
                ? selectionStage === "compare"
                  ? "thinking"
                  : s.cpuRemaining < 1600
                    ? "nervous"
                    : "looking"
                : "watching"));
  const voice = useVoice(
    s,
    assets,
    (action) => {
      sRef.current = reducer(sRef.current, action, assets);
      dispatch(action);
    },
    () => sRef.current,
    () => setShowHint(true),
    opponent.id,
    detail?.id,
    selectionStage,
  );
  const displayedCpuMood =
    cpuMood === "watching" ? (voice.ui.mood ?? cpuMood) : cpuMood;
  const lastAsset = s.lastMove
    ? assets.find((a) => a.id === s.lastMove!.assetId)
    : undefined;
  const lastSlot = s.lastMove
    ? boardSlots(s.board, s.moves.slice(0, -1)).indexOf(s.lastMove.assetId)
    : -1;
  const alternativeReveal = !!s.lastMove && s.lastMove.kind !== "basic";
  const discoveryReward =
    reward === s.lastMove?.id && !!s.lastMove?.discovery && !!lastAsset
      ? discoveryProgress(lastAsset, knownReadings)
      : null;
  const pauseGame = useCallback(() => {
    const elapsed =
      readyRef.current &&
      ["playerTurn", "cpuThinking"].includes(sRef.current.phase)
        ? Math.max(0, performance.now() - clockLast.current)
        : 0;
    clockLast.current = performance.now();
    const action: Action = { type: "PAUSE", elapsed };
    sRef.current = reducer(sRef.current, action, assets);
    dispatch(action);
  }, []);
  const openModal = useCallback(
    (m: Modal) => {
      resumeAfterModal.current = [
        "playerTurn",
        "cpuThinking",
        "resolvingMove",
        "rescuing",
      ].includes(sRef.current.phase);
      pauseGame();
      setModal(m);
    },
    [pauseGame],
  );
  const closeModal = useCallback(() => {
    setModal(null);
    setDetail(null);
    setDetailMode(false);
    if (resumeAfterModal.current) dispatch({ type: "RESUME" });
    resumeAfterModal.current = false;
  }, []);
  useEffect(() => {
    try {
      const r = loadGame(
        localStorage,
        assets.map((a) => a.id),
        assets.flatMap((a) => a.readings.map((r) => r.id)),
      );
      if (r.warning) setWarning(r.warning);
    } catch {
      setWarning("この環境では保存できません。");
    }
  }, []);
  useEffect(() => {
    const save = () => {
      try {
        const w = saveGame(localStorage, sRef.current);
        if (w) setWarning(w);
      } catch {
        setWarning("保存できません。この画面を閉じるまで遊べます。");
      }
    };
    const now = performance.now();
    if (
      (s.phase !== "playerTurn" && s.phase !== "cpuThinking") ||
      now - savedAt.current > 1000
    ) {
      savedAt.current = now;
      save();
    }
    const onHide = () => {
      if (document.hidden) {
        pauseGame();
        save();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", save);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", save);
    };
  }, [s]);
  useEffect(() => {
    if (
      !boardImagesReady ||
      !["playerTurn", "cpuThinking", "rescuing"].includes(s.phase)
    )
      return;
    clockLast.current = performance.now();
    let id = 0;
    const tick = (now: number) => {
      if (now - clockLast.current >= 80) {
        dispatch({ type: "TICK", elapsed: now - clockLast.current });
        clockLast.current = now;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [s.phase, boardImagesReady]);
  useEffect(() => {
    if (!s.board?.reserve) return;
    const images = s.board.reserve
      .slice(s.moves.length, s.moves.length + 3)
      .map((id) =>
        preloadCard(
          assets.find((a) => a.id === id)!,
          true,
        ),
      );
    return () => {
      images.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [s.board, s.moves.length]);
  useEffect(() => {
    if (s.phase !== "loadingRound" || s.board) return;
    const options = {
      seed: s.seed,
      round: s.round,
      difficulty: s.settings.difficulty,
      discovered: s.replayDiscovery ?? s.discovered,
      cpuOpening: !["solo", "race"].includes(s.settings.opponent ?? "turns"),
      recent: s.recentBoards,
    };
    const key = JSON.stringify(options);
    if (preparedBoard.current?.key === key) {
      const board = preparedBoard.current.board;
      preparedBoard.current = null;
      dispatch({ type: "BOARD", board });
      return;
    }
    const token = ++generationToken.current;
    const cancel = boardClient.current.request(options, (data) => {
      if (token !== generationToken.current) return;
      if (data.error) dispatch({ type: "LOAD_ERROR", message: data.error });
      else if (data.board) dispatch({ type: "BOARD", board: data.board });
    });
    return () => {
      cancel();
      generationToken.current++;
    };
  }, [s.phase, s.round, s.seed]);
  useEffect(() => {
    if (
      !s.board ||
      ["title", "finishedSession", "recoverableError", "paused"].includes(
        s.phase,
      )
    )
      return;
    const options = {
      seed: s.seed,
      round: s.round + 1,
      difficulty: s.settings.difficulty,
      discovered: s.replayDiscovery ?? s.discovered,
      cpuOpening: !["solo", "race"].includes(s.settings.opponent ?? "turns"),
      recent: [
        ...s.recentBoards,
        { ...s.board, initialDiscovered: undefined, proof: undefined },
      ].slice(-100),
    };
    const key = JSON.stringify(options);
    const cancel = boardClient.current.request(options, (data) => {
      if (data.board) {
        preparedBoard.current = { key, board: data.board };
        prefetchImages.current = data.board.ids.map((id: string) => {
          return preloadCard(
            assets.find((a) => a.id === id)!,
            true,
          );
        });
      }
    });
    return () => {
      cancel();
      prefetchImages.current = [];
    };
  }, [
    s.board?.seed,
    s.discovered.length,
    ["title", "finishedSession", "recoverableError", "paused"].includes(
      s.phase,
    ),
  ]);
  useEffect(() => {
    if (!s.board) return;
    setBoardImagesReady(false);
    let canceled = false;
    const timer = setTimeout(() => {
      if (!canceled)
        dispatch({
          type: "LOAD_ERROR",
          message:
            "画像の読み込みが完了しませんでした。再読み込みしてください。",
        });
    }, 10000);
    Promise.all(
      shownIds.map(
        (id) =>
          new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.sizes = cardSizes;
            img.srcset = cardSources(assets.find((a) => a.id === id)!) ?? "";
            img.onload = () => {
              img
                .decode()
                .then(() => resolve())
                .catch(reject);
            };
            img.onerror = reject;
            img.src = assets.find((a) => a.id === id)!.image;
          }),
      ),
    )
      .then(() => {
        if (!canceled) {
          clearTimeout(timer);
          setBoardImagesReady(true);
          if (sRef.current.phase === "loadingRound")
            dispatch({ type: "READY" });
        }
      })
      .catch(() => {
        if (!canceled) {
          clearTimeout(timer);
          dispatch({
            type: "LOAD_ERROR",
            message: "画像を読み込めませんでした。保存した成績はそのままです。",
          });
        }
      });
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [shownKey, s.phase === "loadingRound"]);
  useEffect(() => {
    if (!boardImagesReady || !cpuActive || s.cpuRemaining > 0) return;
    const d = cpuDecision;
    if (d?.move) {
      dispatch({
        type: "SUBMIT",
        actor: "cpu",
        assetId: d.move.assetId,
        readingId: d.move.reading.id,
        moveId: `${s.board!.seed}:move:${s.moves.length}`,
      });
    }
  }, [s.phase, s.cpuRemaining, boardImagesReady]);
  useEffect(() => {
    if (s.phase !== "resolvingMove") return;
    const id = setTimeout(
      () => dispatch({ type: "RESOLVED" }),
      answerDisplayDuration(s.lastMove),
    );
    return () => clearTimeout(id);
  }, [s.phase, s.moves.length]);
  useEffect(() => {
    if (!s.lastMove) {
      observedMove.current = undefined;
      setReward(null);
      setCpuReaction(null);
      setReveal(null);
      return;
    }
    if (observedMove.current === s.lastMove.id) return;
    observedMove.current = s.lastMove.id;
    setReward(null);
    setCpuReaction(
      s.lastMove.actor === "player"
        ? s.lastMove.kind !== "basic"
          ? "surprised"
          : "happy"
        : null,
    );
    if (s.lastMove.tail === "ん") {
      setReveal(null);
      return;
    }
    if (s.phase !== "roundResult")
      sound(
        s.lastMove.discovery === "complete"
          ? "complete"
          : s.lastMove.discovery
            ? "new-discovery"
            : s.lastMove.kind !== "basic"
              ? "discovery"
              : "success",
        s.settings.muted,
      );
    if (s.lastMove.discovery) setReward(s.lastMove.id);
    setReveal(s.lastMove.assetId);
    const id = setTimeout(
      () => setReveal(null),
      answerDisplayDuration(s.lastMove) + 100,
    );
    return () => clearTimeout(id);
  }, [s.lastMove?.id]);
  useEffect(() => {
    if (!reward || s.phase === "paused") return;
    const id = setTimeout(
      () => setReward(null),
      answerDisplayDuration(s.lastMove) + 500,
    );
    return () => clearTimeout(id);
  }, [reward, s.phase === "paused"]);
  useEffect(() => {
    if (!cpuReaction || s.phase === "paused") return;
    const id = setTimeout(
      () => setCpuReaction(null),
      answerDisplayDuration(s.lastMove),
    );
    return () => clearTimeout(id);
  }, [cpuReaction, s.lastMove?.id, s.phase === "paused"]);
  const latestMistake = s.mistakes.at(-1);
  useEffect(() => {
    setShowError(!!latestMistake);
    if (!latestMistake) return;
    const timer = setTimeout(() => setShowError(false), 2200);
    return () => clearTimeout(timer);
  }, [latestMistake]);
  useEffect(() => {
    if (!showHint) return;
    const dismiss = (e: PointerEvent) => {
      if (
        e.target instanceof Element &&
        e.target.closest(".hint-popover,.hint-button")
      )
        return;
      setShowHint(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setShowHint(false);
      hintButtonRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape, true);
    };
  }, [showHint]);
  const selectedSound = useRef("");
  useEffect(() => {
    const key = `${s.board?.seed}:${s.moves.length}`;
    if (
      openingSelection &&
      selectionStage === "locked" &&
      selectedSound.current !== key
    ) {
      selectedSound.current = key;
      sound("select", s.settings.muted);
    }
  }, [
    openingSelection,
    selectionStage,
    s.board?.seed,
    s.moves.length,
    s.settings.muted,
  ]);
  useEffect(() => {
    if (s.phase === "roundResult") {
      primaryRef.current?.focus();
      if (s.winner === "player") sound("win", s.settings.muted);
      else if (s.winner === "cpu") sound("lose", s.settings.muted);
      else sound("success", s.settings.muted);
    }
  }, [s.phase]);
  useEffect(() => {
    milestoneRef.current = 0;
    setTimeAnnouncement("");
  }, [s.moves.length, s.round]);
  useEffect(() => {
    if (
      s.phase !== "playerTurn" ||
      !timedMode(s.settings.mode) ||
      !boardImagesReady
    )
      return;
    const milestone = s.remaining <= 5000 ? 5 : s.remaining <= 10000 ? 10 : 0;
    if (milestone && milestoneRef.current !== milestone) {
      milestoneRef.current = milestone;
      setTimeAnnouncement(`残り${milestone}秒です。`);
    }
  }, [s.remaining, s.phase, boardImagesReady, s.settings.mode]);
  useEffect(() => {
    if (
      modal &&
      requestedModal.current === modal &&
      ["playerTurn", "cpuThinking", "resolvingMove", "rescuing"].includes(
        s.phase,
      )
    ) {
      resumeAfterModal.current = true;
      pauseGame();
    }
  }, [modal, s.phase]);
  useEffect(() => {
    if (
      prepareVoice.current &&
      !modal &&
      ["playerTurn", "cpuThinking"].includes(s.phase)
    ) {
      prepareVoice.current = false;
      openModal("voice");
    }
  }, [s.phase, modal, openModal]);
  const submit = (assetId: string, input?: string, readingId?: string) => {
    let current = sRef.current;
    const now = performance.now();
    if (
      !boardImagesReady ||
      current.phase !== "playerTurn" ||
      now < lockRef.current
    )
      return;
    const tick: Action = {
      type: "TICK",
      elapsed: Math.max(0, now - clockLast.current),
    };
    current = reducer(current, tick, assets);
    dispatch(tick);
    clockLast.current = now;
    if (current.phase !== "playerTurn") return;
    lockRef.current = now + 180;
    setInputLocked(true);
    setShowHint(false);
    setTimeout(() => setInputLocked(false), 190);
    const a: Action = {
      type: "SUBMIT",
      actor: "player",
      assetId,
      input,
      readingId,
      moveId: `${current.board!.seed}:move:${current.moves.length}`,
    };
    const next = reducer(current, a, assets);
    if (next === current) return;
    if (next.moves.length === current.moves.length) {
      sound("error", current.settings.muted);
      setCpuReaction("thinking");
      setShake(assetId);
      setTimeout(() => setShake(null), 400);
    }
    dispatch(a);
  };
  const answerDetail = (input?: string, readingId?: string) => {
    const a = detail!;
    closeModal();
    setTimeout(() => submit(a.id, input, readingId), 0);
  };
  const inspectCard = (a: Asset) => {
    resumeAfterModal.current = [
      "playerTurn",
      "cpuThinking",
      "resolvingMove",
    ].includes(sRef.current.phase);
    pauseGame();
    setDetail(a);
  };
  const start = (settings = draft) => {
    sound("tap", s.settings.muted);
    dispatch({
      type: "START",
      seed: sessionSeed(seed),
      preserveRecent: !seed.trim(),
      settings: {
        ...settings,
        muted: s.settings.muted,
        reducedMotion: s.settings.reducedMotion,
        tutorialSeen: s.settings.tutorialSeen,
      },
    });
    if (!s.settings.tutorialSeen) setModal("tutorial");
  };
  const tutorialClose = () => {
    dispatch({
      type: "SETTINGS",
      settings: { ...sRef.current.settings, tutorialSeen: true },
    });
    closeModal();
  };
  const selectedHint = hintPresentation(s, assets);
  const requestScreenHint = (mode: "open" | "next") => {
    for (const action of hintActions(sRef.current, mode)) {
      sRef.current = reducer(sRef.current, action, assets);
      dispatch(action);
    }
  };
  const errorFeedback = s.mistakes.length > 0;
  const phaseIsGame = !["title", "finishedSession"].includes(s.phase);
  const reduced = s.settings.reducedMotion;
  return (
    <div
      className={`app ${phaseIsGame ? "play-screen" : "landing-screen"} ${reduced ? "reduced-motion" : ""}`}
    >
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (phaseIsGame) openModal("rules");
          }}
        >
          <span className="brand-mark">
            <PixelFlower />
          </span>
          <span>
            えしりとり<span className="brand-tag">連戦</span>
          </span>
        </a>
        <nav aria-label="メイン">
          <button onClick={() => openModal("rules")} className="nav-button">
            <HelpCircle size={18} />
            <span>あそびかた</span>
          </button>
          <button onClick={() => openModal("catalog")} className="nav-button">
            <BookOpen size={18} />
            <span>発見ずかん</span>
            <b>{foundAssets}</b>
          </button>
          <button
            className="icon-button"
            onClick={() =>
              dispatch({
                type: "SETTINGS",
                settings: { ...s.settings, muted: !s.settings.muted },
              })
            }
            aria-label={s.settings.muted ? "音を出す" : "消音"}
          >
            {s.settings.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button
            className="icon-button"
            onClick={() => {
              openModal("settings");
            }}
            aria-label="設定"
          >
            <Settings2 size={20} />
          </button>
        </nav>
      </header>
      {warning && (
        <div className="warning" role="status">
          {warning}
          <button onClick={() => setWarning(null)} aria-label="通知を閉じる">
            <X size={16} />
          </button>
        </div>
      )}
      <VoiceCaption ui={voice.ui} onOpen={() => openModal("voice")} />
      <main>
        {!phaseIsGame ? (
          <TitleScreen
            assets={assets}
            draft={draft}
            onChange={setDraft}
            onStart={() => start()}
            onMenu={openModal}
            found={foundAssets}
            bestScore={Math.max(
              0,
              ...(s.stats.rankings ?? [])
                .filter((r) => !r.key.includes(":untimed:"))
                .map((r) => r.points),
            )}
          />
        ) : (
          <div className="game-layout">
            <aside className="game-sidebar">
              <div className="round-meta">
                <span className="eyebrow">
                  ROUND {String(s.round + 1).padStart(2, "0")}
                </span>
                <span className="difficulty-badge">
                  {timedMode(s.settings.mode)
                    ? difficultyNames[s.settings.difficulty]
                    : "練習"}
                </span>
              </div>
              <h1 className="sr-only">絵しりとり対戦</h1>
              <div
                className={`word-relay ${lastAsset ? "has-last" : ""}`}
                aria-hidden="true"
              >
                {lastAsset ? (
                  <img src={lastAsset.thumbnail ?? lastAsset.image} alt="" />
                ) : (
                  <PixelFlower />
                )}
                <ArrowRight size={20} />
              </div>
              <div
                className={`kana-display ${s.phase === "cpuThinking" ? "cpu-kana" : ""}`}
                key={s.head}
              >
                <span className="kana-corner">NEXT</span>
                <strong>{s.head || "?"}</strong>
                <span className="kana-stars">✦</span>
              </div>
              <div
                className={`turn-indicator ${s.actor === "cpu" ? "cpu" : ""}`}
              >
                <span className="turn-dot" />
                {s.phase === "rescuing"
                  ? "次の盤面へ"
                  : s.settings.opponent === "race" && s.phase === "playerTurn"
                    ? "CPUより先に！"
                    : s.settings.opponent === "solo" && s.phase === "playerTurn"
                      ? "ひとりで挑戦"
                      : s.phase === "cpuThinking"
                        ? cpuStumped
                          ? "CPU「…？」"
                          : "CPUがかんがえ中…"
                        : s.phase === "resolvingMove"
                          ? "いいね！ つながった"
                          : s.phase === "roundResult"
                            ? "対戦終了"
                            : "あなたの番です"}
                {s.phase === "cpuThinking" && (
                  <span className="thinking-dots">•••</span>
                )}
              </div>
              <div
                className={`timer-box ${s.remaining < 10000 && timedMode(s.settings.mode) ? "urgent" : ""}`}
              >
                <div>
                  <Clock3 size={18} />
                  <span>残り時間</span>
                  <strong>
                    {timedMode(s.settings.mode)
                      ? Math.ceil(s.remaining / 1000)
                      : "∞"}
                    <small>{timedMode(s.settings.mode) ? "秒" : ""}</small>
                  </strong>
                </div>
                <div className="timer-track">
                  <i
                    style={{
                      width: `${timedMode(s.settings.mode) ? (100 * s.remaining) / (s.settings.seconds * 1000) : 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="sidebar-record">
                <div>
                  <Trophy size={18} />
                  <span>連勝</span>
                  <strong>
                    {currentRecord(s).streak ?? 0}
                    <small> WIN</small>
                  </strong>
                </div>
                <div>
                  <BookOpen size={18} />
                  <span>発見</span>
                  <strong>
                    {s.discovered.length}
                    <small> WORDS</small>
                  </strong>
                </div>
              </div>
              <button
                className="text-button pause-control"
                aria-label="ひとやすみ"
                title="ひとやすみ"
                onClick={pauseGame}
              >
                <Pause size={17} />
                ひとやすみ
              </button>
            </aside>
            <section
              className={`board-panel ${openingSelection ? "opening-selection" : ""}`}
              data-cpu-selection={
                cpuActive
                  ? s.settings.opponent === "race"
                    ? s.cpuRemaining <= RACE_APPROACH_MS
                      ? "approach"
                      : "waiting"
                    : selectionStage
                  : undefined
              }
              aria-label="対戦盤面"
            >
              <header className="board-header">
                <div>
                  <span className="live-dot" />
                  {s.settings.opponent !== "solo" && (
                    <CpuCompanion
                      mood={displayedCpuMood}
                      variant={opponent.id}
                    />
                  )}
                  <span
                    className={`match-score ${s.settings.opponent === "race" ? "race-score" : ""}`}
                    aria-label="スコア"
                  >
                    {s.settings.opponent === "race" ? (
                      <>
                        <span className="race-side">
                          <small>YOU</small>
                          <b>{(s.score?.points ?? 0).toLocaleString()}</b>
                        </span>
                        <i>:</i>
                        <span className="race-side cpu-score">
                          <small>CPU</small>
                          <b>{cpuRoundScore(s).points.toLocaleString()}</b>
                        </span>
                        <span className="race-total">
                          累積 {totalScore(s).points.toLocaleString()} ·{" "}
                          {s.stats.streak}連勝
                        </span>
                      </>
                    ) : (
                      <>
                        <small>SCORE</small>
                        <b>{totalScore(s).points.toLocaleString()}</b>
                        <span>
                          {totalScore(s).panels}枚 · {s.stats.streak}連勝
                        </span>
                      </>
                    )}
                  </span>
                  {s.phase === "resolvingMove" && s.lastMove?.points && (
                    <span
                      key={s.lastMove.id}
                      className="score-float"
                      data-actor={s.lastMove.actor}
                      aria-live="polite"
                    >
                      +{s.lastMove.points.total}
                      <small>
                        {s.lastMove.actor === "cpu"
                          ? "CPU"
                          : s.lastMove.points.alternative
                            ? "うらよみ！"
                            : "NICE!"}
                      </small>
                    </span>
                  )}
                </div>
                <span className="remaining-badge">
                  {s.settings.opponent === "race" && (
                    <span className="race-tally">
                      CPU{" "}
                      {
                        s.moves.filter(
                          (m) => m.actor === "cpu" && m.tail !== "ん",
                        ).length
                      }
                      枚 ·{" "}
                    </span>
                  )}
                  {refillMode(s.settings.mode) ? (
                    <>
                      <Layers3 size={15} aria-hidden />
                      <b>{reserveRemaining(s)}</b>
                      <span className="sr-only">枚の補充札</span>
                    </>
                  ) : (
                    <>
                      のこり <b>{BOARD_SIZE - s.moves.length}</b> / {BOARD_SIZE}
                    </>
                  )}
                </span>
              </header>
              <div className="board-grid">
                {boardAssets.map((a, i) => {
                  const used = s.moves.find((m) => m.assetId === a.id);
                  return (
                    <div
                      className={`card-shell ${used ? "used" : ""} ${shake === a.id ? "shake" : ""} ${reveal === a.id ? `just-revealed ${alternativeReveal ? "alternative-reveal" : ""}` : ""} ${searchingCard === a.id ? "cpu-searching" : ""} ${searchingCard === a.id && selectionStage === "locked" ? "cpu-locked" : ""} ${s.board?.reserve?.includes(a.id) ? "refilled-card" : ""} ${i === lastSlot ? `last-picked ${!used ? "refill-target" : ""} ${s.lastMove?.tail === "ん" ? "terminal-picked" : ""}` : ""}`}
                      data-asset-id={a.id}
                      data-last-selected={i === lastSlot ? "true" : undefined}
                      key={a.id}
                      style={
                        { "--delay": `${i * 12}ms` } as React.CSSProperties
                      }
                    >
                      <button
                        className={`picture-card ${detailMode ? "inspect-card" : ""}`}
                        disabled={
                          !detailMode &&
                          (!!used ||
                            !boardImagesReady ||
                            s.phase !== "playerTurn" ||
                            inputLocked)
                        }
                        onClick={() =>
                          detailMode ? inspectCard(a) : submit(a.id)
                        }
                        onKeyDown={(e) => {
                          if (e.shiftKey && e.key === "Enter") {
                            e.preventDefault();
                            inspectCard(a);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          inspectCard(a);
                        }}
                        aria-label={
                          detailMode
                            ? `札${i + 1}を拡大・読みを入力`
                            : `札${i + 1}。${a.description}`
                        }
                      >
                        <span className="card-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <img
                          src={a.image}
                          srcSet={cardSources(a)}
                          sizes={cardSizes}
                          alt=""
                          draggable={false}
                        />
                        {reveal === a.id && (
                          <span className="card-pop" aria-hidden>
                            <i>✦</i>
                            <i>✧</i>
                            <i>✦</i>
                            <i>✧</i>
                          </span>
                        )}
                        {shake === a.id && (
                          <span className="miss-mark" aria-hidden>
                            ×
                          </span>
                        )}
                        {detailMode && (
                          <span className="inspect-mark" aria-hidden>
                            <Maximize2 size={16} />
                          </span>
                        )}
                        {searchingCard === a.id && (
                          <span
                            className={`cpu-cursor ${cpuStumped ? "cpu-stumped" : ""}`}
                            aria-hidden
                          >
                            <MousePointer2 size={22} fill="currentColor" />
                            <b>
                              {cpuStumped
                                ? "？"
                                : openingSelection
                                  ? selectionStage === "locked"
                                    ? "✓"
                                    : selectionStage === "compare"
                                      ? "？"
                                      : "…"
                                  : "CPU"}
                            </b>
                          </span>
                        )}
                        {used && (
                          <span className="used-word">
                            <Check size={13} />
                            {used.word}
                          </span>
                        )}
                        {i === lastSlot && (
                          <span className="last-pick-badge" aria-hidden>
                            {s.lastMove?.tail === "ん"
                              ? "ん"
                              : used
                                ? s.lastMove?.actor === "player"
                                  ? "YOU"
                                  : "CPU"
                                : "↻"}
                          </span>
                        )}
                        {s.settings.mode === "accessible" && !used && (
                          <span className="accessible-description">
                            {a.description}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
              {showError &&
                errorFeedback &&
                s.phase === "playerTurn" &&
                !showHint && (
                  <div
                    className="feedback-bar feedback-toast error-feedback"
                    role="status"
                    aria-live="polite"
                  >
                    <PixelFlower />
                    <span>{s.message}</span>
                  </div>
                )}
              <footer className="board-actions">
                <button
                  className={`inspect-toggle ${detailMode ? "selected" : ""}`}
                  aria-label="拡大・かな入力"
                  title="絵を拡大・かな入力"
                  aria-pressed={detailMode}
                  onClick={() => setDetailMode((v) => !v)}
                >
                  <Maximize2 size={18} />
                  <span>拡大・入力</span>
                </button>
                <button
                  className="hint-button"
                  ref={hintButtonRef}
                  aria-expanded={showHint}
                  aria-controls="match-hint"
                  disabled={s.phase !== "playerTurn"}
                  onClick={() => {
                    setShowHint((v) => !v);
                    requestScreenHint("open");
                  }}
                >
                  <Lightbulb size={18} />
                  ヒント<span>{s.hintUsed}/3</span>
                </button>
                {showHint && s.hintLevel > 0 && selectedHint && (
                  <section
                    className="hint-popover"
                    id="match-hint"
                    role="region"
                    aria-label="ヒントの内容"
                  >
                    <header>
                      <strong>
                        <Lightbulb size={16} /> ヒント {s.hintUsed}/3
                      </strong>
                      <button
                        className="icon-button"
                        aria-label="ヒントを閉じる"
                        onClick={() => {
                          setShowHint(false);
                          hintButtonRef.current?.focus({ preventScroll: true });
                        }}
                      >
                        <X size={18} />
                      </button>
                    </header>
                    <p className="hint-message" role="status">
                      {selectedHint.text}
                    </p>
                    {s.hintUsed < 3 && (
                      <button
                        className="hint-next"
                        onClick={() => requestScreenHint("next")}
                      >
                        {s.hintUsed === 2 ? "答えを見る" : "もう少しヒント"}
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </section>
                )}
              </footer>
              {cpuActive &&
                s.settings.opponent === "race" &&
                !s.settings.reducedMotion &&
                s.cpuRemaining <= RACE_APPROACH_MS &&
                cpuDecision?.move && (
                  <RaceCursor
                    target={cpuDecision.move.assetId}
                    remaining={s.cpuRemaining}
                  />
                )}
              {s.phase === "loadingRound" && (
                <div className="board-overlay">
                  <div className="loader-pixels">
                    <i />
                    <i />
                    <i />
                  </div>
                  <h2>ことばの庭を、準備中。</h2>
                  <p>つながる道を確認しています</p>
                </div>
              )}
              {s.phase === "resolvingMove" && (
                <button
                  className="resolve-skip"
                  aria-label="正解演出を短縮"
                  onClick={() => dispatch({ type: "RESOLVED" })}
                >
                  <span
                    className={`success-pop ${alternativeReveal ? "alternative-success" : ""}`}
                  >
                    {discoveryReward ? (
                      <DiscoveryStamp {...discoveryReward} />
                    ) : (
                      <span className="success-label">
                        {s.lastMove?.kind === "basic" ? "NICE!" : "うらよみ！"}
                      </span>
                    )}
                    <strong>{s.lastMove?.word}</strong>
                    {s.lastMove?.points && (
                      <span className="answer-points">
                        +{s.lastMove.points.total}
                        <small>
                          1枚 {s.lastMove.points.base}
                          {s.lastMove.points.alternative
                            ? ` ＋ 裏読み ${s.lastMove.points.alternative}`
                            : ""}
                          {s.lastMove.points.speed
                            ? ` ＋ スピード ${s.lastMove.points.speed}`
                            : ""}
                        </small>
                      </span>
                    )}
                    {s.lastMove &&
                      (() => {
                        const a = assets.find(
                          (a) => a.id === s.lastMove!.assetId,
                        )!;
                        const r = a.readings.find(
                          (r) => r.id === s.lastMove!.readingId,
                        )!;
                        return r?.element ? (
                          <EvidenceArt asset={a} reading={r} />
                        ) : null;
                      })()}
                    <small>{s.lastMove?.explanation}</small>
                    <ParticleBurst alternative={alternativeReveal} />
                  </span>
                </button>
              )}
              {s.phase === "paused" && !modal && !detail && (
                <div className="board-overlay pause-overlay">
                  <span className="big-symbol">Ⅱ</span>
                  <h2>ちょっと、ひとやすみ。</h2>
                  <p>時間は止まっています。</p>
                  <button
                    className="primary"
                    onClick={() => dispatch({ type: "RESUME" })}
                  >
                    <Play size={18} />
                    つづきから遊ぶ
                  </button>
                  <nav className="match-menu-actions" aria-label="対戦メニュー">
                    <button onClick={() => openModal("ranking")}>
                      <Trophy size={20} />
                      ランキング
                    </button>
                    <button onClick={() => openModal("rules")}>
                      <HelpCircle size={20} />
                      あそびかた
                    </button>
                    <button onClick={() => openModal("catalog")}>
                      <BookOpen size={20} />
                      発見ずかん
                    </button>
                    <button
                      onClick={() => openModal("settings")}
                      aria-label="設定"
                    >
                      <Settings2 size={20} />
                      設定
                    </button>
                    <button
                      onClick={() =>
                        dispatch({
                          type: "SETTINGS",
                          settings: { ...s.settings, muted: !s.settings.muted },
                        })
                      }
                      aria-label={s.settings.muted ? "音を出す" : "消音"}
                    >
                      {s.settings.muted ? (
                        <VolumeX size={20} />
                      ) : (
                        <Volume2 size={20} />
                      )}
                      音
                    </button>
                    {access.fullscreenAvailable && (
                      <button onClick={() => void access.toggleFullscreen()}>
                        <Maximize2 size={20} />
                        {access.fullscreen ? "全画面を終了" : "全画面で遊ぶ"}
                      </button>
                    )}
                    <button onClick={() => openModal("voice")}>
                      <MessageCircle size={20} />
                      会話する
                    </button>
                    <button onClick={() => openModal("install")}>
                      <Home size={20} />
                      アプリとして使う
                    </button>
                  </nav>
                  {access.notice && <p role="status">{access.notice}</p>}
                  <button
                    className="text-button"
                    onClick={() => dispatch({ type: "FINISH" })}
                  >
                    <Home size={17} />
                    連戦を終了する
                  </button>
                </div>
              )}
              {s.phase === "recoverableError" && (
                <div className="board-overlay">
                  <HelpCircle size={40} />
                  <h2>盤面を準備できませんでした</h2>
                  <p>{s.error}</p>
                  <button
                    className="primary"
                    onClick={() => {
                      dispatch({ type: "RETRY_LOAD" });
                    }}
                  >
                    別の盤面で再試行
                  </button>
                  <button
                    className="text-button"
                    onClick={() => dispatch({ type: "TITLE" })}
                  >
                    タイトルに戻る
                  </button>
                </div>
              )}
              {s.phase === "roundResult" && (
                <div className="board-overlay result-overlay">
                  <div className="result-heading">
                    <span
                      className={`result-icon ${s.winner === "cpu" ? "lose" : "win"}`}
                    >
                      {s.winner === "player" ? (
                        <Trophy size={42} />
                      ) : (
                        <PixelFlower />
                      )}
                    </span>
                    <span className="eyebrow">
                      {s.settings.opponent === "race"
                        ? s.winner === "player"
                          ? "YOU WIN!"
                          : s.winner === "cpu"
                            ? "CPU WINS!"
                            : "DRAW"
                        : s.winner === null
                          ? "NEXT BOARD!"
                          : s.winner === "player"
                            ? "BOARD CLEAR!"
                            : "NICE TRY!"}
                    </span>
                    <h2>
                      {s.settings.opponent === "race"
                        ? s.winner === "player"
                          ? "あなたの勝ち！"
                          : s.winner === "cpu"
                            ? "CPUの勝ち"
                            : "ひきわけ！"
                        : s.winner === null
                          ? "つぎの盤面へ！"
                          : s.winner === "player"
                            ? "ひらめき、つながった！"
                            : "つぎは、きっと見つかる。"}
                    </h2>
                    <p>{s.reason}</p>
                    {s.settings.opponent === "race" && (
                      <div className="race-result" aria-label="この盤面の得点">
                        <span>
                          YOU<b>{s.score?.points ?? 0}</b>
                        </span>
                        <i>:</i>
                        <span>
                          CPU<b>{cpuRoundScore(s).points}</b>
                        </span>
                      </div>
                    )}
                    {s.winner !== "cpu" && (
                      <p className="subtle">スコアはそのまま、つづけよう</p>
                    )}
                  </div>
                  {timedMode(s.settings.mode) && (
                    <button
                      className="text-button"
                      onClick={() => openModal("ranking")}
                    >
                      <Trophy size={17} />
                      ランキングを見る
                    </button>
                  )}
                  <div className="result-stats">
                    <span>
                      <b>{totalScore(s).points}</b>累積スコア
                    </span>
                    <span>
                      <b>{totalScore(s).panels}</b>とった札
                    </span>
                    <span>
                      <b>{currentRecord(s).streak ?? 0}</b>連勝
                    </span>
                  </div>
                  <p className="record-category">
                    {s.replay
                      ? "再挑戦"
                      : timedMode(s.settings.mode)
                        ? refillMode(s.settings.mode)
                          ? "補充"
                          : "標準"
                        : s.settings.mode === "refillPractice"
                          ? "補充・練習"
                          : s.settings.mode === "practice"
                            ? "練習"
                            : "説明重視の練習"}
                    ・{difficultyNames[s.settings.difficulty]}・
                    {timedMode(s.settings.mode)
                      ? `${s.settings.seconds}秒`
                      : "時間無制限"}
                    ・
                    {scoreHelp(s) === "reference"
                      ? "答え参照あり"
                      : scoreHelp(s) === "hint"
                        ? "ヒントあり"
                        : "ヒントなし"}
                    {timedMode(s.settings.mode)
                      ? "の記録"
                      : "・ランキング対象外"}
                  </p>
                  <button
                    className="primary"
                    ref={primaryRef}
                    onClick={() => dispatch({ type: "NEXT" })}
                  >
                    つぎの対戦へ
                    <ArrowRight size={20} />
                  </button>
                  <div className="result-links">
                    <button
                      className="text-button"
                      onClick={() => openModal("review")}
                    >
                      <BookOpen size={16} />
                      読みを見返す
                    </button>
                    <button
                      className="text-button"
                      onClick={() => dispatch({ type: "REPLAY" })}
                    >
                      <RotateCcw size={16} />
                      同じseedで再挑戦
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        setReplayCode(exportReplay(s));
                        setReplayError("");
                        openModal("replay");
                      }}
                    >
                      再挑戦コード
                    </button>
                    <button
                      className="text-button"
                      onClick={() => dispatch({ type: "FINISH" })}
                    >
                      終了
                    </button>
                  </div>
                  {s.winner === "player" && <ParticleBurst win />}
                </div>
              )}
            </section>
            <section className="history-strip">
              <span>ことばの足あと</span>
              <div>
                {s.moves.length ? (
                  s.moves.slice(-10).map((m, i) => (
                    <span
                      className={m.actor === "cpu" ? "cpu-word" : ""}
                      key={m.id}
                    >
                      {i > 0 && <i>→</i>}
                      <b>{m.word}</b>
                      <small>{m.actor === "cpu" ? "CPU" : "YOU"}</small>
                    </span>
                  ))
                ) : (
                  <p>最初のひとことから、冒険がはじまる。</p>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
      <footer className="page-footer">
        <span>
          <span className="mini-flower">✦</span> ひらめきの庭 · えしりとり連戦
        </span>
        <span className="build-state">
          イラスト {assets.length.toLocaleString()} 枚 ·{" "}
          {assets.reduce((n, a) => n + a.readings.length, 0)} 読み
        </span>
        <span>NO LOGIN. JUST PLAY.</span>
      </footer>
      {modal === "rules" && (
        <Dialog title="あそびかた" onClose={closeModal}>
          <div className="rules-list">
            <article>
              <b>01</b>
              <div>
                <h3>いまの文字から、絵をタップ。</h3>
                <p>読みがつながる札を選ぼう。文字入力はしなくても遊べます。</p>
              </div>
            </article>
            <article>
              <b>02</b>
              <div>
                <h3>別の見方が、新しい道に。</h3>
                <p>
                  名前だけでなく、パーツや動作でもつながります。正解した後で、読みと理由がわかります。
                </p>
              </div>
            </article>
            <article>
              <b>03</b>
              <div>
                <h3>CPUと交互に、何度でも。</h3>
                <p>
                  札と言葉は1対戦につき1回。「ん」で終わる読みと時間切れで負けです。つながる札がなくなったら盤面クリア。早押しはその盤面のYOU・CPUの得点が高い方の勝ちで、同点は引き分けです。累積スコアは別に集計し、負けるまで続きます。時間なしは練習でランキング対象外です。札を取り切ったらクリア。ひとりモードはCPUの番がなく、早押しはCPUより先に取った側の札になります。1枚100点、裏読みはさらに150点。時間ありは速さに応じて最大100点を加算します。時間ありでは、まちがいは−5秒。時間なしの補充も選べます。補充モードでは、使った場所に新しい札が現れます（やさしい12・ふつう24・むずかしい48枚を追加）。
                </p>
              </div>
            </article>
          </div>
          <p className="dialog-note">
            盤面下の拡大ボタンを押してから絵を選ぶと、かな入力や発見済みの読みで回答できます。キーボードはTabで移動、Enter
            / Spaceで決定、Shift+Enterで拡大。タブを離れると自動ポーズします。
          </p>
          <button className="primary full" onClick={closeModal}>
            わかった！
            <Check size={18} />
          </button>
        </Dialog>
      )}
      {modal === "tutorial" && (
        <Dialog title="ひらめきの庭へ、ようこそ。" onClose={tutorialClose}>
          <div className="tutorial-preview">
            <span>絵をタップ</span>
            <ArrowRight />
            <span>読みを発見</span>
            <ArrowRight />
            <span>
              {draft.opponent === "solo"
                ? "つぎの言葉"
                : draft.opponent === "race"
                  ? "早い者勝ち"
                  : "CPUの番"}
            </span>
          </div>
          <p className="dialog-note">
            「かさ」は「あまがさ」とも読める。ひとつの絵に、ちがう入り口があります。迷ったらヒントをどうぞ。
          </p>
          <button className="primary full" onClick={tutorialClose}>
            さあ、はじめよう
            <ArrowRight size={20} />
          </button>
        </Dialog>
      )}
      {modal === "install" && (
        <Dialog title="アプリとして使う" onClose={closeModal}>
          <AppInstallInfo access={access} />
        </Dialog>
      )}
      {modal === "voice" && (
        <Dialog title="会話できる対戦相手" onClose={closeModal}>
          <VoicePanel
            controller={voice.controller}
            ui={voice.ui}
            eligible={voiceEligible(s)}
            onClose={closeModal}
            onPlay={
              !phaseIsGame
                ? () => {
                    const settings = {
                      ...draft,
                      opponent: "turns" as const,
                      mode: (["refill", "refillPractice"].includes(draft.mode)
                        ? "refillPractice"
                        : "practice") as typeof draft.mode,
                    };
                    setDraft(settings);
                    closeModal();
                    prepareVoice.current = true;
                    start(settings);
                  }
                : undefined
            }
          />
        </Dialog>
      )}
      {modal === "settings" && (
        <Dialog title="あそぶ設定" onClose={closeModal}>
          <div className="settings-list">
            <label>
              音を鳴らす
              <input
                type="checkbox"
                checked={!s.settings.muted}
                onChange={(e) =>
                  dispatch({
                    type: "SETTINGS",
                    settings: { ...s.settings, muted: !e.target.checked },
                  })
                }
              />
            </label>
            <label>
              動きを減らす
              <input
                type="checkbox"
                checked={s.settings.reducedMotion}
                onChange={(e) =>
                  dispatch({
                    type: "SETTINGS",
                    settings: {
                      ...s.settings,
                      reducedMotion: e.target.checked,
                    },
                  })
                }
              />
            </label>
            <label>
              次の連戦の制限時間
              <select
                value={draft.seconds}
                onChange={(e) =>
                  setDraft({ ...draft, seconds: Number(e.target.value) })
                }
              >
                <option value={30}>30秒</option>
                <option value={45}>45秒</option>
                <option value={60}>60秒</option>
                <option value={90}>90秒</option>
              </select>
            </label>
            <label>
              次の連戦のseed（空欄で毎回ランダム）
              <input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                maxLength={80}
                aria-label="連戦seed"
                placeholder="毎回ランダム"
              />
            </label>
          </div>
          <p className="dialog-note">
            seedは指定したときだけ固定されます。時間とseedは、新しい連戦を始めたときに適用されます。時間なしのモードには制限時間と秒数ペナルティがありません。
          </p>
          <button
            className="secondary full"
            onClick={() => {
              setReplayCode(s.board ? exportReplay(s) : "");
              setReplayError("");
              setModal("replay");
            }}
          >
            再挑戦コードを開く
          </button>
          <button className="primary full" onClick={closeModal}>
            とじる
            <Check size={18} />
          </button>
        </Dialog>
      )}
      {modal === "replay" && (
        <Dialog title="再挑戦コード" onClose={closeModal}>
          <p className="dialog-note">
            この対戦の最初から、同じ札・開始音・先後・発見済みの読みで再挑戦できます。成績は再挑戦として別に記録します。絵や辞書の版が違うコードは開けません。
          </p>
          <label className="replay-code-label">
            コード
            <textarea
              aria-label="再挑戦コード"
              value={replayCode}
              maxLength={500000}
              spellCheck={false}
              onChange={(e) => {
                setReplayCode(e.target.value);
                setReplayError("");
              }}
            />
          </label>
          {replayError && (
            <p role="alert" className="save-warning">
              {replayError}
            </p>
          )}
          <div className="replay-buttons">
            <button
              className="secondary"
              disabled={!replayCode}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(replayCode);
                  setReplayError("コピーしました。");
                } catch {
                  setReplayError("コード欄を選択してコピーできます。");
                }
              }}
            >
              コードをコピー
            </button>
            <button
              className="primary"
              disabled={!replayCode.trim()}
              onClick={() => {
                try {
                  const session = importReplay(replayCode, assets);
                  resumeAfterModal.current = false;
                  setDetail(null);
                  setModal(null);
                  setBoardImagesReady(false);
                  setDraft(session.settings);
                  dispatch({ type: "IMPORT_REPLAY", session });
                } catch (e) {
                  setReplayError(
                    e instanceof Error
                      ? e.message
                      : "コードを確認してください。",
                  );
                }
              }}
            >
              このコードで再挑戦
            </button>
          </div>
        </Dialog>
      )}
      {modal === "ranking" && (
        <Dialog title="ランキング" onClose={closeModal}>
          <Ranking
            stats={s.stats}
            settings={phaseIsGame ? s.settings : draft}
          />
        </Dialog>
      )}
      {modal === "catalog" && (
        <Dialog title="ひらめき発見ずかん" wide onClose={closeModal}>
          <Collection
            assets={assets}
            known={knownReadings}
            showAnswers={showAnswers}
            onShowAnswers={(value) => {
              setShowAnswers(value);
              if (value) dispatch({ type: "REFERENCE" });
            }}
          />
        </Dialog>
      )}
      {detail && (
        <Dialog title="絵をじっくり見てみよう" onClose={closeModal}>
          <CardDetail
            asset={detail}
            head={s.head}
            discovered={position(s).discovered}
            canAnswer={
              s.actor === "player" &&
              !s.moves.some((m) => m.assetId === detail.id) &&
              (s.phase === "playerTurn" ||
                (s.phase === "paused" && s.resumePhase === "playerTurn"))
            }
            onSubmit={answerDetail}
          />
        </Dialog>
      )}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {s.phase === "playerTurn"
          ? `あなたの番。「${s.head}」から始まる言葉。`
          : s.phase === "cpuThinking"
            ? `CPUの番。「${s.head}」から始まる言葉。`
            : ""}
      </div>
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {timeAnnouncement}
      </div>
      {modal === "review" && (
        <Dialog title="この対戦のことば" onClose={closeModal} wide>
          <p className="visual-description">
            {s.moves.length}手のひらめき。絵を押すと拡大できます。
          </p>
          <ol className="round-review">
            {s.moves.map((m) => {
              const a = assets.find((a) => a.id === m.assetId)!;
              const fresh = !s.board?.initialDiscovered?.includes(m.readingId);
              return (
                <li key={m.id}>
                  <button
                    className="review-picture"
                    aria-label={`${m.word}の絵を拡大`}
                    onClick={() => {
                      setModal(null);
                      setDetail(a);
                    }}
                  >
                    <EvidenceArt
                      asset={a}
                      reading={a.readings.find((r) => r.id === m.readingId)!}
                    />
                  </button>
                  <div>
                    <span className="eyebrow">
                      {m.actor === "player" ? "あなた" : "CPU"}
                      {fresh ? " · NEW" : ""}
                    </span>
                    <strong>{m.word}</strong>
                    <p>{m.explanation}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          {!s.moves.length && (
            <p className="empty-state">
              今回はまだ言葉をつないでいません。つぎの対戦で探してみよう。
            </p>
          )}
          <button className="secondary" onClick={() => setModal("catalog")}>
            <BookOpen size={18} />
            発見ずかんも開く
          </button>
        </Dialog>
      )}
    </div>
  );
}
