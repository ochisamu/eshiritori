export function DiscoveryStamp({
  complete = false,
  compact = false,
  found,
  total,
}: {
  complete?: boolean;
  compact?: boolean;
  found: number;
  total: number;
}) {
  return (
    <span
      className={`discovery-stamp ${complete ? "stamp-complete" : ""} ${compact ? "stamp-compact" : ""}`}
      aria-label={
        complete
          ? `この絵の読みを全部発見。${found}/${total}`
          : `新しい裏読みを発見。${found}/${total}`
      }
    >
      <span className="stamp-medal" aria-hidden="true">
        ✦
      </span>
      <span className="stamp-copy">
        <b>{complete ? "COMPLETE!" : "NEW!"}</b>
        <small>{complete ? "読みコンプリート" : "裏読み発見"}</small>
      </span>
      <span className="stamp-count" aria-hidden="true">
        {found}/{total}
      </span>
    </span>
  );
}
