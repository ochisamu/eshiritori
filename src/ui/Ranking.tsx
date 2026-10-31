import { useState } from "react";
import { Trophy } from "lucide-react";
import type { Settings, Stats } from "../game/types";
import { scoreKey } from "../game/scoring";
import { refillMode, timedMode } from "../game/refill";
export function Ranking({
  stats,
  settings,
}: {
  stats: Stats;
  settings: Settings;
}) {
  const [draft, setDraft] = useState<Settings>({
      ...settings,
      mode: refillMode(settings.mode) ? "refill" : "standard",
    }),
    [help, setHelp] = useState("clean"),
    [replay, setReplay] = useState(false),
    [legacy, setLegacy] = useState(false);
  const currentKey = scoreKey({
    settings: draft,
    hintUsed: help === "hint" ? 1 : 0,
    answerReferenced: help === "reference",
    replay,
  });
  const key = legacy ? currentKey.replace(/^chain-v1:/, "") : currentKey;
  const rows = (stats.rankings ?? []).filter((r) => r.key === key);
  const options = (refill: boolean, timed: boolean) =>
    setDraft({
      ...draft,
      mode: refill
        ? timed
          ? "refill"
          : "refillPractice"
        : timed
          ? "standard"
          : "practice",
    });
  return (
    <div className="ranking-panel">
      <p className="ranking-note">
        この端末のランキング（時間あり） ·{" "}
        {legacy ? "以前の1対戦ごとの記録" : "負けるまでの合計"}
      </p>
      {(stats.rankings ?? []).some((r) => !r.key.startsWith("chain-v1:")) && (
        <div
          className="rank-switches"
          role="group"
          aria-label="ランキングの集計方法"
        >
          <button aria-pressed={!legacy} onClick={() => setLegacy(false)}>
            連続スコア
          </button>
          <button aria-pressed={legacy} onClick={() => setLegacy(true)}>
            以前の記録
          </button>
        </div>
      )}
      <div className="ranking-filters">
        <div role="group" aria-label="ランキングの対戦スタイル">
          {(["turns", "solo", "race"] as const).map((o, i) => (
            <button
              key={o}
              aria-pressed={(draft.opponent ?? "turns") === o}
              onClick={() => setDraft({ ...draft, opponent: o })}
            >
              {["交互", "ひとり", "早押し"][i]}
            </button>
          ))}
        </div>
        <div role="group" aria-label="ランキングの難易度">
          {(["easy", "normal", "hard"] as const).map((d, i) => (
            <button
              key={d}
              aria-pressed={draft.difficulty === d}
              onClick={() =>
                setDraft({ ...draft, difficulty: d, seconds: [60, 45, 30][i] })
              }
            >
              {["やさしい", "ふつう", "むずかしい"][i]}
            </button>
          ))}
        </div>
        <div className="rank-switches">
          <button
            aria-pressed={refillMode(draft.mode)}
            onClick={() =>
              options(!refillMode(draft.mode), timedMode(draft.mode))
            }
          >
            補充 {refillMode(draft.mode) ? "ON" : "OFF"}
          </button>

          <button aria-pressed={replay} onClick={() => setReplay(!replay)}>
            {replay ? "再挑戦" : "新しい盤面"}
          </button>
        </div>
        <div role="group" aria-label="ランキングのヒント条件">
          {["clean", "hint", "reference"].map((h, i) => (
            <button
              key={h}
              aria-pressed={help === h}
              onClick={() => setHelp(h)}
            >
              {["ヒントなし", "ヒントあり", "答え参照あり"][i]}
            </button>
          ))}
        </div>
      </div>
      {timedMode(draft.mode) && (
        <div
          className="ranking-times"
          role="group"
          aria-label="ランキングの秒数"
        >
          {[...new Set([30, 45, 60, 90, draft.seconds])]
            .sort((a, b) => a - b)
            .map((seconds) => (
              <button
                key={seconds}
                aria-pressed={draft.seconds === seconds}
                onClick={() => setDraft({ ...draft, seconds })}
              >
                {seconds}秒
              </button>
            ))}
        </div>
      )}
      <ol className="ranking-list">
        {rows.length ? (
          rows.map((r, i) => (
            <li key={r.id}>
              <b className="rank-number">
                {i === 0 ? (
                  <Trophy size={20} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </b>
              <div>
                <strong>
                  {r.points.toLocaleString()}
                  <small> pt</small>
                </strong>
                <span>
                  {r.panels}枚 · 裏読み{r.alternatives}回
                </span>
              </div>
              <small>ROUND {r.round + 1}</small>
            </li>
          ))
        ) : (
          <li className="empty-ranking">
            <Trophy size={32} />
            <p>最初の記録をつくろう</p>
          </li>
        )}
      </ol>
      <p className="ranking-note">
        1枚100点 ＋ 裏読み150点
        <br />
        時間なしは練習のため対象外。自分の累積得点を記録します。
        <br />
        {legacy
          ? "以前の1対戦ごとの記録です。"
          : "盤面終了ごとに合計を記録。同じ挑戦は最高の1件になります。"}
      </p>
    </div>
  );
}
