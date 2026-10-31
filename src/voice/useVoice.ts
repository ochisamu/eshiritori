import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Asset, GameState, Board } from "../game/types";
import { reducer, type Action } from "../game/state";
import { hintActions, hintPresentation } from "../game/hintPresentation";
import { VoiceController } from "./VoiceController";
import { projectGameView } from "./projectGameView";
import {
  sameStamp,
  type GameVoiceView,
  type VoiceOperation,
  type VoiceOperationResult,
} from "./protocol";
function voiceId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const data = new Uint32Array(4);
  if (globalThis.crypto?.getRandomValues)
    globalThis.crypto.getRandomValues(data);
  else
    for (let i = 0; i < data.length; i++)
      data[i] = Math.floor(Math.random() * 0x100000000);
  return Array.from(data, (n) => n.toString(16).padStart(8, "0")).join("");
}
export function useVoice(
  s: GameState,
  assets: readonly Asset[],
  apply: (action: Action) => void,
  getState: () => GameState,
  showHint: () => void,
  variant: string,
  selected?: string,
  stage?: "scan" | "compare" | "locked",
) {
  const controller = useMemo(() => new VoiceController(), []);
  const [ui, setUI] = useState(controller.ui);
  const identity = useRef({
    gameId: voiceId(),
    boardEpoch: voiceId(),
    board: null as Board | null,
    revision: 0,
    signature: "",
    view: undefined as GameVoiceView | undefined,
  });
  const inputs = useRef({ variant, selected, stage });
  inputs.current = { variant, selected, stage };
  const refresh = useCallback(
    (state: GameState) => {
      const id = identity.current;
      if (id.board !== state.board) {
        id.board = state.board;
        id.boardEpoch = voiceId();
      }
      const stamp = {
        gameId: id.gameId,
        boardEpoch: id.boardEpoch,
        revision: 0,
        turnId: id.boardEpoch + ":" + state.moves.length + ":" + state.actor,
      };
      const next = projectGameView(
        state,
        assets,
        stamp,
        inputs.current.variant,
        inputs.current.selected,
        inputs.current.stage,
      );
      const signature = JSON.stringify({
        ...next,
        opponent: { variant: next.opponent.variant },
      });
      if (signature !== id.signature) {
        id.signature = signature;
        next.revision = ++id.revision;
        id.view = next;
      }
      return id.view!;
    },
    [assets],
  );
  controller.operation = (request: VoiceOperation): VoiceOperationResult => {
    const current = getState(),
      view = refresh(current);
    if (!sameStamp(request.expected, view))
      return {
        requestId: request.requestId,
        connectionEpoch: request.connectionEpoch,
        status: "stale",
        view,
      };
    if (request.action === "hint") {
      if (current.phase !== "playerTurn")
        return {
          requestId: request.requestId,
          connectionEpoch: request.connectionEpoch,
          status: "unavailable",
          view,
        };
      const actions = hintActions(current, request.mode ?? "open");
      let predicted = current;
      for (const action of actions) {
        predicted = reducer(predicted, action, assets);
        apply(action);
      }
      showHint();
      const next = refresh(predicted);
      return {
        requestId: request.requestId,
        connectionEpoch: request.connectionEpoch,
        status: "ok",
        view: next,
        hint: hintPresentation(predicted, assets),
      };
    }
    const action: Action = {
      type: request.action === "pause" ? "PAUSE" : "RESUME",
    };
    const predicted = reducer(current, action, assets);
    apply(action);
    const next = refresh(predicted);
    return {
      requestId: request.requestId,
      connectionEpoch: request.connectionEpoch,
      status: predicted === current ? "unavailable" : "ok",
      view: next,
    };
  };
  useEffect(() => controller.subscribe(setUI), [controller]);
  useEffect(() => {
    controller.sync(refresh(s));
  }, [controller, refresh, s, variant, selected, stage]);
  useEffect(() => {
    controller.setGameMuted(s.settings.muted);
  }, [controller, s.settings.muted]);
  useEffect(() => {
    const hide = () => {
      void controller.stop();
    };
    window.addEventListener("pagehide", hide);
    return () => {
      window.removeEventListener("pagehide", hide);
      controller.dispose();
    };
  }, [controller]);
  return { controller, ui };
}
