import { useLayoutEffect, useRef, useState } from "react";
import { MousePointer2 } from "lucide-react";
import { raceCursorProgress } from "../game/cpuPresentation";

// One direct approach from the CPU to its answer; never sweeps unrelated cards.
export function RaceCursor({
  target,
  remaining,
}: {
  target: string;
  remaining: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [route, setRoute] = useState<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  }>();
  useLayoutEffect(() => {
    const panel = ref.current?.closest(".board-panel");
    const card = panel?.querySelector<HTMLElement>(
      `[data-asset-id="${target}"]`,
    );
    const cpu = panel?.querySelector<HTMLElement>(".cpu-companion");
    if (!panel || !card || !cpu) return;
    const measure = () => {
      const p = panel.getBoundingClientRect(),
        a = cpu.getBoundingClientRect(),
        b = card.getBoundingClientRect();
      setRoute({
        x: a.left + a.width / 2 - p.left,
        y: a.bottom - p.top,
        tx: b.left + b.width / 2 - p.left,
        ty: b.top + b.height / 2 - p.top,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    observer.observe(card);
    return () => observer.disconnect();
  }, [target]);
  const progress = raceCursorProgress(remaining),
    t = 1 - (1 - progress) ** 3;
  return (
    <span
      ref={ref}
      className="race-cursor"
      aria-hidden="true"
      data-target={target}
      style={{
        visibility: route ? "visible" : "hidden",
        transform: route
          ? `translate3d(${route.x + (route.tx - route.x) * t}px, ${route.y + (route.ty - route.y) * t}px, 0)`
          : undefined,
      }}
    >
      <MousePointer2 size={26} fill="currentColor" />
      <b>CPU</b>
    </span>
  );
}
