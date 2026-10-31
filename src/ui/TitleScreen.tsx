import { useMemo } from "react";
import {
  BookOpen,
  Trophy,
  Settings2,
  Play,
  Clock3,
  Layers3,
  HelpCircle,
  Home,
  Check,
  MessageCircle,
} from "lucide-react";
import type { Asset, Settings } from "../game/types";
import { shuffle, rng } from "../game/rng";
import { refillMode, timedMode } from "../game/refill";
import { CpuCompanion } from "./CpuCompanion";
export function TitleScreen({
  assets,
  draft,
  onChange,
  onStart,
  onMenu,
  found,
  bestScore,
}: {
  assets: readonly Asset[];
  draft: Settings;
  onChange: (s: Settings) => void;
  onStart: () => void;
  onMenu: (
    name: "catalog" | "ranking" | "settings" | "rules" | "install" | "voice",
  ) => void;
  found: number;
  bestScore: number;
}) {
  const pictures = useMemo(
    () => shuffle(assets, rng("title-garden-1024")).slice(0, 8),
    [assets],
  );
  const refill = refillMode(draft.mode),
    timed = timedMode(draft.mode);
  const setOptions = (nextRefill: boolean, nextTimed: boolean) =>
    onChange({
      ...draft,
      mode: nextRefill
        ? nextTimed
          ? "refill"
          : "refillPractice"
        : nextTimed
          ? "standard"
          : "practice",
    });
  return (
    <section className="arcade-title" aria-label="ゲームメニュー">
      <div className="arcade-hero">
        <span className="arcade-kicker">えしりとり</span>
        <h1>
          絵をみて、
          <br />
          ことばを<span>つなぐ。</span>
        </h1>
        <div className="title-garden" aria-hidden="true">
          {pictures.map((a, i) => (
            <img
              key={a.id}
              src={a.thumbnail ?? a.image}
              alt=""
              style={{ "--tile": i } as React.CSSProperties}
            />
          ))}
        </div>
        <div className="title-rivals" aria-hidden="true">
          <CpuCompanion mood="happy" variant="sprout" />
          <CpuCompanion mood="idea" variant="cat" />
          <CpuCompanion mood="watching" variant="bunny" />
        </div>
        <div className="arcade-records">
          <span>
            <BookOpen size={15} />
            <b>{found}</b> 発見
          </span>
          <span>
            <Trophy size={15} />
            <b>{bestScore.toLocaleString()}</b> BEST
          </span>
        </div>
      </div>
      <div className="arcade-controls">
        <div className="opponent-picker" role="group" aria-label="対戦スタイル">
          {(
            [
              {
                id: "turns",
                symbol: "VS",
                label: "CPUと交互",
                sub: "じっくり対戦",
              },
              {
                id: "solo",
                symbol: "1P",
                label: "ひとりで挑戦",
                sub: "自分のペースで",
              },
              {
                id: "race",
                symbol: "!!",
                label: "早押し対決",
                sub: "CPUより先に！",
              },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              aria-pressed={(draft.opponent ?? "turns") === o.id}
              onClick={() => onChange({ ...draft, opponent: o.id })}
            >
              <b>{o.symbol}</b>
              <strong>{o.label}</strong>
              <small>{o.sub}</small>
            </button>
          ))}
        </div>
        <div className="arcade-options">
          <div className="option-row">
            <span>
              <Layers3 size={17} />札
            </span>
            <div role="group" aria-label="パネル補充">
              <button
                aria-pressed={!refill}
                onClick={() => setOptions(false, timed)}
              >
                24枚
              </button>
              <button
                aria-pressed={refill}
                onClick={() => setOptions(true, timed)}
              >
                補充あり
              </button>
            </div>
          </div>
          <div className="option-row">
            <span>
              <Clock3 size={17} />
              時間
            </span>
            <div role="group" aria-label="制限時間">
              <button
                aria-pressed={timed}
                onClick={() => setOptions(refill, true)}
              >
                あり
              </button>
              <button
                aria-pressed={!timed}
                onClick={() => setOptions(refill, false)}
              >
                なし
              </button>
            </div>
          </div>
          <div className="difficulty-picker" role="group" aria-label="難易度">
            {(["easy", "normal", "hard"] as const).map((d, i) => (
              <button
                key={d}
                aria-pressed={draft.difficulty === d}
                className={draft.difficulty === d ? "selected" : ""}
                onClick={() =>
                  onChange({
                    ...draft,
                    difficulty: d,
                    seconds: [60, 45, 30][i],
                  })
                }
              >
                {["やさしい", "ふつう", "むずかしい"][i]}
                {draft.difficulty === d && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
        <button
          className="primary start-button"
          onClick={onStart}
          disabled={assets.length < 24}
        >
          <Play size={21} fill="currentColor" />
          さっそく、あそぶ
        </button>
        <nav className="arcade-menu with-voice" aria-label="メインメニュー">
          <button onClick={() => onMenu("voice")}>
            <MessageCircle size={21} />
            <span>会話する</span>
          </button>
          <button onClick={() => onMenu("catalog")}>
            <BookOpen size={21} />
            <span>発見ずかん</span>
          </button>
          <button onClick={() => onMenu("ranking")}>
            <Trophy size={21} />
            <span>ランキング</span>
          </button>
          <button onClick={() => onMenu("rules")}>
            <HelpCircle size={21} />
            <span>あそびかた</span>
          </button>
          <button onClick={() => onMenu("settings")} aria-label="設定">
            <Settings2 size={21} />
            <span>設定</span>
          </button>
          <button onClick={() => onMenu("install")}>
            <Home size={21} />
            <span>アプリにする</span>
          </button>
        </nav>
      </div>
    </section>
  );
}
