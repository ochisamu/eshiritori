import type { Asset, Reading } from "../game/types";
export function EvidenceArt({
  asset,
  reading,
}: {
  asset: Asset;
  reading?: Reading;
}) {
  const e = reading?.element;
  return (
    <span className="evidence-art">
      <img src={asset.image} alt={asset.description} />
      {e && (
        <span
          className="evidence-box"
          aria-hidden="true"
          style={{
            left: `${e.x * 100}%`,
            top: `${e.y * 100}%`,
            width: `${e.w * 100}%`,
            height: `${e.h * 100}%`,
          }}
        />
      )}
    </span>
  );
}
