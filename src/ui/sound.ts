let context: AudioContext | undefined;
export function sound(
  type:
    | "success"
    | "discovery"
    | "new-discovery"
    | "complete"
    | "select"
    | "error"
    | "lose"
    | "win"
    | "tap",
  muted: boolean,
): void {
  if (muted) return;
  try {
    context ??= new AudioContext();
    void context.resume();
    const now = context.currentTime;
    const notes =
      type === "new-discovery"
        ? [659.25, 987.77, 1318.51, 1567.98, 1975.53]
        : type === "complete"
          ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
          : type === "select"
            ? [880, 1174.66]
            : type === "lose"
              ? [261.63, 233.08, 196, 130.81]
              : type === "win"
                ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
                : type === "discovery"
                  ? [587.33, 739.99, 880, 1174.66]
                  : type === "success"
                    ? [783.99, 1046.5, 1318.51]
                    : type === "error"
                      ? [185, 123.47]
                      : [1046.5];
    notes.forEach((frequency, i) => {
      const o = context!.createOscillator();
      const g = context!.createGain();
      const at = now + i * (type === "error" ? 0.1 : 0.065);
      const duration = type === "tap" ? 0.07 : type === "error" ? 0.17 : 0.16;
      o.type = type === "error" ? "triangle" : i % 2 ? "sine" : "triangle";
      o.frequency.setValueAtTime(frequency, at);
      o.frequency.exponentialRampToValueAtTime(
        frequency * (type === "error" ? 0.55 : type === "tap" ? 1.4 : 1.005),
        at + duration,
      );
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(
        type === "error" ? 0.085 : 0.055,
        at + 0.008,
      );
      g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      o.connect(g);
      g.connect(context!.destination);
      o.start(at);
      o.stop(at + duration + 0.01);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    });
  } catch {
    /* Browsers without audio continue silently. */
  }
}
