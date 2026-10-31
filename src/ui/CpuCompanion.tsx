export type CpuMood =
  | "watching"
  | "looking"
  | "thinking"
  | "idea"
  | "surprised"
  | "happy"
  | "nervous"
  | "stumped"
  | "sad"
  | "resting";
const faces: Record<
  CpuMood,
  { eyes: string; mouth: string; symbol: string; label: string }
> = {
  watching: {
    eyes: "M7 10h2v3H7z M16 10h2v3h-2z",
    mouth: "M10 16h5v1h-5z",
    symbol: "",
    label: "見守っている",
  },
  looking: {
    eyes: "M6 10h2v3H6z M15 10h2v3h-2z",
    mouth: "M11 16h3v1h-3z",
    symbol: "…",
    label: "札を探している",
  },
  thinking: {
    eyes: "M7 10h2v3H7z M16 10h2v3h-2z M6 8h4v1H6z",
    mouth: "M11 16h3v2h-3z",
    symbol: "？",
    label: "どちらにするか迷っている",
  },
  idea: {
    eyes: "M7 9h2v3H7z M16 9h2v3h-2z",
    mouth: "M10 14h5v1h-1v2h-3v-2h-1z",
    symbol: "！",
    label: "ひらめいた",
  },
  surprised: {
    eyes: "M6 9h4v4H6z M15 9h4v4h-4z",
    mouth: "M11 15h3v3h-3z",
    symbol: "！",
    label: "裏読みにびっくり",
  },
  happy: {
    eyes: "M6 11h1v-1h3v1H8v1H6z M15 11h1v-1h3v1h-2v1h-2z",
    mouth: "M9 15h2v1h3v-1h2v2h-7z",
    symbol: "✦",
    label: "うれしそう",
  },
  nervous: {
    eyes: "M7 10h2v3H7z M16 10h2v3h-2z",
    mouth: "M10 16h2v-1h3v1h-1v1h-4z",
    symbol: "·",
    label: "少し焦っている",
  },
  stumped: {
    eyes: "M6 10h4v1H6z M15 10h4v1h-4z",
    mouth: "M10 17h1v-1h3v1h1v1h-5z",
    symbol: "？",
    label: "札が見つからず困っている",
  },
  sad: {
    eyes: "M6 11h3v-1h1v2H6z M15 10h1v1h3v1h-4z",
    mouth: "M10 17h1v-1h3v1h1v1h-5z",
    symbol: "…",
    label: "しょんぼり",
  },
  resting: {
    eyes: "M6 12h4v1H6z M15 12h4v1h-4z",
    mouth: "M11 16h3v1h-3z",
    symbol: "Ⅱ",
    label: "ひとやすみ",
  },
};
export type CpuVariant = "sprout" | "cat" | "bunny";
export const CPU_VARIANTS: {
  id: CpuVariant;
  name: string;
  color: string;
  shade: string;
}[] = [
  { id: "sprout", name: "めばえ", color: "#d8e8d9", shade: "#9ebdac" },
  { id: "cat", name: "こはく", color: "#ffe1a1", shade: "#dfb86e" },
  { id: "bunny", name: "もも", color: "#f9d4e1", shade: "#dba5ba" },
];
export function opponentFor(seed: string, round = 0) {
  let hash = 2166136261;
  for (const c of seed) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return CPU_VARIANTS[((hash >>> 0) + round) % CPU_VARIANTS.length];
}
export function CpuCompanion({
  mood,
  variant = "sprout",
}: {
  mood: CpuMood;
  variant?: CpuVariant;
}) {
  const palette = CPU_VARIANTS.find((v) => v.id === variant)!;
  const face = faces[mood];
  return (
    <span
      className={`cpu-companion mood-${mood}`}
      data-mood={mood}
      data-variant={variant}
      role="img"
      aria-label={`CPU：${face.label}`}
    >
      <svg viewBox="0 0 26 27" shapeRendering="crispEdges" aria-hidden="true">
        <ellipse cx="13" cy="25" rx="9" ry="1" fill="#233e4933" />
        <g className="cpu-sprite">
          {variant === "sprout" ? (
            <>
              <path d="M12 1h2v4h-2z" fill="#446f57" />
              <path d="M6 1h5v1h2v2H9V3H6z" fill="#78b88c" />
              <path d="M14 0h5v2h-2v2h-3z" fill="#b5cf76" />
            </>
          ) : variant === "cat" ? (
            <>
              <path d="M4 1h3v2h3v4H4z M16 3h3V1h3v6h-6z" fill="#37586b" />
              <path d="M5 3h2v3H5z M19 3h2v3h-2z" fill="#f3ad91" />
            </>
          ) : (
            <>
              <path d="M6 0h4v8H5V2h1z M16 0h4v2h1v6h-5z" fill="#37586b" />
              <path d="M7 1h2v5H7z M17 1h2v5h-2z" fill="#f2b2c9" />
            </>
          )}
          <path
            d="M5 4h16v2h2v3h1v10h-2v3h-3v2h-4v-1h-4v1H7v-2H4v-3H2V9h1V6h2z"
            fill="#37586b"
          />
          <path d="M6 6h14v2h2v11h-3v2H7v-2H4V8h2z" fill={palette.color} />
          <path d="M6 6h14v2H6z M4 8h2v10H4z" fill="#f4f4d9" />
          <path d="M20 9h2v10h-3v2H7v-2h12v-2h1z" fill={palette.shade} />
          <path d="M4 14h3v2H4z M19 14h3v2h-3z" fill="#e9a78d" />
          {variant === "cat" && (
            <path
              d="M3 16h3v1H3z M20 16h3v1h-3z M11 6h3v2h-3z"
              fill="#b68043"
            />
          )}
          <g fill="#355365">
            <path d={face.eyes} />
            <path d={face.mouth} />
          </g>
          {mood === "nervous" && (
            <path d="M22 5h1v2h1v3h-3V7h1z" fill="#71b9d2" />
          )}
        </g>
      </svg>
      <span className="cpu-emote" aria-hidden="true">
        {face.symbol}
      </span>
      <span className="cpu-name" aria-hidden="true">
        CPU
      </span>
    </span>
  );
}
