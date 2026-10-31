import { useRef, useState } from "react";
import type { Asset } from "../game/types";
import { Send, Keyboard, Delete, CornerDownLeft } from "lucide-react";
export function CardDetail({
  asset,
  discovered,
  canAnswer,
  head,
  onSubmit,
}: {
  asset: Asset;
  discovered: string[];
  canAnswer: boolean;
  head: string;
  onSubmit: (input?: string, readingId?: string) => void;
}) {
  const [input, setInput] = useState("");
  const [pad, setPad] = useState(false);
  const composing = useRef(false);
  const field = useRef<HTMLInputElement>(null);
  const readings = asset.readings.filter((r) => discovered.includes(r.id));
  return (
    <div className="detail-content">
      <div className="detail-art">
        <img src={asset.detail} alt={asset.description} />
      </div>
      <p className="visual-description">{asset.description}</p>
      {canAnswer && (
        <>
          <p className="detail-head">
            「<strong>{head}</strong>」から始まる言葉で答えよう
          </p>
          <h3>自分の読みで答える</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!composing.current && input.trim()) onSubmit(input);
            }}
          >
            <div className="input-row">
              <input
                ref={field}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ひらがな・カタカナ"
                maxLength={64}
                aria-label="かなで回答"
                autoComplete="off"
                onCompositionStart={() => (composing.current = true)}
                onCompositionEnd={() => (composing.current = false)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    (e.nativeEvent.isComposing ||
                      composing.current ||
                      e.keyCode === 229)
                  )
                    e.preventDefault();
                }}
              />
              <button
                className="primary small"
                disabled={!input.trim()}
                type="submit"
              >
                <Send size={17} />
                回答
              </button>
            </div>
          </form>
          <button className="text-button" onClick={() => setPad(!pad)}>
            <Keyboard size={18} />
            かなパッド{pad ? "を閉じる" : "を開く"}
          </button>
          {pad && (
            <div className="kana-pad">
              {[
                ..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよわをらりるれろんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽぁぃぅぇぉゃゅょっー",
              ].map((k) => (
                <button key={k} onClick={() => setInput((v) => v + k)}>
                  {k}
                </button>
              ))}
              <button
                aria-label="一文字削除"
                onClick={() => setInput((v) => v.slice(0, -1))}
              >
                <Delete size={18} />
              </button>
              <button aria-label="入力を消去" onClick={() => setInput("")}>
                <CornerDownLeft size={18} />
              </button>
            </div>
          )}
        </>
      )}
      <h3>
        発見済みの読み <span className="subtle">{readings.length}</span>
      </h3>
      {readings.length ? (
        <div className="known-readings">
          {readings.map((r) => (
            <button
              key={r.id}
              disabled={!canAnswer}
              onClick={() => onSubmit(undefined, r.id)}
            >
              <span>{r.display}</span>
              <small>
                {canAnswer
                  ? "この読みで回答"
                  : r.kind === "basic"
                    ? "基本の読み"
                    : "別の見方"}
              </small>
              <span aria-hidden>↗</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="subtle">
          まだ発見していません。絵から言葉を探してみよう。
        </p>
      )}
    </div>
  );
}
