import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LockKeyhole,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import type { Asset } from "../game/types";
import {
  collectionIndex,
  filterCollection,
  type CollectionFilter,
} from "./collection";
const PAGE_SIZE = 48;
export function Collection({
  assets,
  known,
  showAnswers,
  onShowAnswers,
}: {
  assets: readonly Asset[];
  known: ReadonlySet<string>;
  showAnswers: boolean;
  onShowAnswers: (value: boolean) => void;
}) {
  const [filter, setFilter] = useState<CollectionFilter>("all"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null),
    albumRef = useRef<HTMLDivElement>(null),
    lastScroll = useRef(0);
  const entries = useMemo(
    () => collectionIndex(assets, known),
    [assets, known],
  );
  const found = entries.filter((e) => e.found > 0).length,
    complete = entries.filter((e) => e.complete).length,
    near = entries.filter((e) => e.found > 0 && e.total - e.found === 1).length;
  const totalReadings = entries.reduce((n, e) => n + e.total, 0),
    foundReadings = entries.reduce((n, e) => n + e.found, 0);
  const filtered = useMemo(
    () => filterCollection(entries, filter, query, known, showAnswers),
    [entries, filter, query, known, showAnswers],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    current = Math.min(page, pageCount - 1),
    detail = entries.find((e) => e.asset.id === selected);
  function changePage(next: number) {
    setPage(Math.max(0, Math.min(pageCount - 1, next)));
    scrollRef.current?.scrollTo({ top: 0 });
  }
  function back() {
    const id = selected;
    setSelected(null);
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = lastScroll.current;
      albumRef.current
        ?.querySelector<HTMLButtonElement>(`button[data-asset-id="${id}"]`)
        ?.focus({ preventScroll: true });
    });
  }
  useEffect(() => {
    if (!selected) return;
    backRef.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      back();
    };
    document.addEventListener("keydown", escape, true);
    return () => document.removeEventListener("keydown", escape, true);
  }, [selected]);
  const tabs: [CollectionFilter, string, number][] = [
    ["all", "すべて", entries.length],
    ["missing", "未発見", entries.length - found],
    ["found", "発見済み", found],
    ["near", "あと1つ", near],
    ["complete", "コンプ", complete],
  ];
  return (
    <div className="collection-album" ref={albumRef}>
      {!detail && (
        <>
          <div
            className="collection-summary"
            aria-label="コレクションの進み具合"
          >
            <div>
              <BookOpen size={19} />
              <span>
                <b>
                  {found.toLocaleString()}
                  <small> / {entries.length.toLocaleString()}</small>
                </b>
                <small>発見した絵</small>
              </span>
            </div>
            <div className="collection-gold">
              <Star size={19} />
              <span>
                <b>{complete.toLocaleString()}</b>
                <small>コンプリート</small>
              </span>
            </div>
            <div className="collection-reading-total">
              <Sparkles size={18} />
              <span>
                <b>
                  {foundReadings.toLocaleString()}
                  <small> / {totalReadings.toLocaleString()}</small>
                </b>
                <small>読みの発見</small>
              </span>
            </div>
            <div
              className="collection-meter"
              role="progressbar"
              aria-label="絵の発見率"
              aria-valuemin={0}
              aria-valuemax={entries.length}
              aria-valuenow={found}
            >
              <i
                style={{
                  width: `${(100 * found) / Math.max(1, entries.length)}%`,
                }}
              />
            </div>
          </div>
          <div
            className="collection-filters"
            role="group"
            aria-label="図鑑の絞り込み"
          >
            {tabs.map(([id, label, count]) => (
              <button
                key={id}
                aria-pressed={filter === id}
                onClick={() => {
                  setFilter(id);
                  setPage(0);
                  scrollRef.current?.scrollTo({ top: 0 });
                }}
              >
                {label}
                <b>{count}</b>
              </button>
            ))}
          </div>
          <div className="collection-tools">
            <label className="collection-search">
              <Search size={16} />
              <input
                aria-label="図鑑を検索"
                placeholder="発見した言葉・番号"
                maxLength={40}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                  scrollRef.current?.scrollTo({ top: 0 });
                }}
              />
              {query && (
                <button
                  aria-label="検索を消す"
                  onClick={() => {
                    setQuery("");
                    setPage(0);
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <span>{filtered.length}枚</span>
          </div>
        </>
      )}
      {detail ? (
        <>
          <div className="collection-detail-nav">
            <button ref={backRef} onClick={back}>
              <ArrowLeft size={18} />
              一覧に戻る
            </button>
            <span>No.{String(detail.index + 1).padStart(4, "0")}</span>
            <span className={`collection-detail-status ${detail.status}`}>
              {detail.complete ? (
                <>
                  <Star size={15} />
                  コンプリート
                </>
              ) : detail.found ? (
                <>
                  <Check size={15} />
                  発見済み
                </>
              ) : (
                <>
                  <LockKeyhole size={15} />
                  未発見
                </>
              )}
            </span>
          </div>
          <div className="collection-detail-scroll" key={detail.asset.id}>
            <div
              className={`collection-detail-art ${detail.status} ${showAnswers ? "reference-art" : ""}`}
            >
              <img
                src={detail.asset.detail}
                alt={
                  detail.found || showAnswers
                    ? detail.asset.description
                    : "未発見の絵"
                }
              />
              {!detail.found && !showAnswers && <b aria-hidden="true">？</b>}
              {detail.complete && (
                <span className="detail-complete-star" aria-hidden="true">
                  ✦
                </span>
              )}
            </div>
            <p className="collection-detail-count">
              読みの発見{" "}
              <b>
                {detail.found} / {detail.total}
              </b>
            </p>
            <div className="collection-readings">
              {detail.asset.readings
                .filter((r) => r.reviewStatus === "approved")
                .map((r) => {
                  const found = known.has(r.id);
                  return (
                    <div
                      key={r.id}
                      className={found ? "reading-found" : "reading-missing"}
                    >
                      {found || showAnswers ? (
                        <>
                          <span
                            className={`reading-state ${!found ? "reference-reading" : ""}`}
                          >
                            {found ? (
                              <Check size={17} />
                            ) : (
                              <BookOpen size={17} />
                            )}
                          </span>
                          <div>
                            <b>{r.display}</b>
                            <small>{r.explanation}</small>
                          </div>
                          {!found && (
                            <span className="reference-label">参照</span>
                          )}
                        </>
                      ) : (
                        <>
                          <LockKeyhole size={17} />
                          <span
                            className="undiscovered"
                            aria-label={`未発見・${[...r.kana].length}文字`}
                          >
                            {"？".repeat([...r.kana].length)}
                          </span>
                          <small>{[...r.kana].length}文字</small>
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      ) : (
        <>
          <div
            className="collection-page"
            ref={scrollRef}
            tabIndex={0}
            aria-label="絵のコレクション一覧"
          >
            <div className="collection-grid catalog-grid">
              {filtered
                .slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
                .map((e) => (
                  <button
                    key={e.asset.id}
                    className={`collection-tile collection-${e.status} ${e.complete ? "catalog-complete" : ""} ${showAnswers ? "reference-art" : ""}`}
                    data-status={e.status}
                    data-asset-id={e.asset.id}
                    aria-label={`No.${String(e.index + 1).padStart(4, "0")} ${e.status === "missing" ? "未発見" : e.complete ? "コンプリート" : "発見済み"} 読み${e.found}/${e.total}`}
                    onClick={() => {
                      lastScroll.current = scrollRef.current?.scrollTop ?? 0;
                      setSelected(e.asset.id);
                    }}
                  >
                    <span className="collection-number">
                      {String(e.index + 1).padStart(4, "0")}
                    </span>
                    {e.complete && (
                      <span
                        className="catalog-medal"
                        role="img"
                        aria-label="この絵の読みを全部発見"
                      >
                        <Star size={12} fill="currentColor" />
                      </span>
                    )}
                    <span className="collection-picture">
                      <img
                        src={
                          e.asset.preview ?? e.asset.thumbnail ?? e.asset.image
                        }
                        alt=""
                        loading="lazy"
                      />
                      {!e.found && !showAnswers && <b aria-hidden="true">？</b>}
                    </span>
                    <span className="collection-tile-footer">
                      <span className="collection-tile-meter">
                        <i
                          style={{
                            width: `${(e.found / Math.max(1, e.total)) * 100}%`,
                          }}
                        />
                      </span>
                      <small>
                        {e.found}/{e.total}
                      </small>
                    </span>
                  </button>
                ))}
            </div>
            {!filtered.length && (
              <div className="collection-empty">
                <BookOpen size={32} />
                <p>
                  {query
                    ? "見つかりませんでした"
                    : filter === "complete"
                      ? "全ての読みを見つけて、金色の札を集めよう"
                      : filter === "missing"
                        ? "全ての絵を発見しました！"
                        : "ゲームで言葉を見つけよう"}
                </p>
                {query && <small>未発見の言葉は検索に出ません</small>}
              </div>
            )}
          </div>
          <nav className="collection-pagination" aria-label="図鑑のページ">
            <button
              aria-label="最初のページ"
              disabled={current === 0}
              onClick={() => changePage(0)}
            >
              <ChevronsLeft size={18} />
            </button>
            <button
              aria-label="前のページ"
              disabled={current === 0}
              onClick={() => changePage(current - 1)}
            >
              <ChevronLeft size={19} />
            </button>
            <span aria-live="polite">
              <b>{current + 1}</b> / {pageCount}
            </span>
            <button
              aria-label="次のページ"
              disabled={current + 1 >= pageCount}
              onClick={() => changePage(current + 1)}
            >
              <ChevronRight size={19} />
            </button>
            <button
              aria-label="最後のページ"
              disabled={current + 1 >= pageCount}
              onClick={() => changePage(pageCount - 1)}
            >
              <ChevronsRight size={18} />
            </button>
          </nav>
        </>
      )}
      <label className="collection-reference">
        <input
          type="checkbox"
          checked={showAnswers}
          onChange={(e) => onShowAnswers(e.target.checked)}
        />
        <span>
          答えも表示<small>参照記録がつきます</small>
        </span>
      </label>
    </div>
  );
}
