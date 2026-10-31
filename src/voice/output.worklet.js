// Bounded PCM player. Samples are consumed continuously and stale queues are discarded.
class VoiceOutput extends AudioWorkletProcessor {
  constructor() {
    super();
    this.enabled = true;
    this.permitted = false;
    this.holding = false;
    this.quiet = 0;
    this.playing = false;
    this.frames = 0;
    this.voiced = 0;
    this.played = 0;
    this.peak = 0;
    this.queue = [];
    this.offset = 0;
    this.queued = 0;
    this.rate = 24000;
    this.port.onmessage = ({ data }) => {
      if (data.type === "enable") {
        this.enabled = data.value;
        if (!data.value) {
          this.queue = [];
          this.queued = 0;
          this.offset = 0;
        }
      }
      if (data.type === "discard") {
        this.queue = [];
        this.queued = 0;
        this.offset = 0;
        this.holding = true;
        this.permitted = false;
        this.quiet = 0;
      }
      if (data.type === "permit") this.permitted = true;
      if (data.type === "audio") {
        this.rate = data.rate;
        if (!this.enabled || !this.permitted) return;
        if (this.queued + data.samples.length > this.rate * 0.9) {
          this.queue = [];
          this.queued = 0;
          this.offset = 0;
        }
        this.queue.push(data.samples);
        this.queued += data.samples.length;
      }
    };
  }
  process(_inputs, outputs) {
    const out = outputs[0],
      mono = out[0];
    let power = 0;
    for (let i = 0; i < mono.length; i++) {
      while (this.queue.length && this.offset >= this.queue[0].length) {
        const old = this.queue.shift();
        this.offset -= old.length;
        this.queued -= old.length;
      }
      let value = 0;
      if (this.queue.length) {
        const chunk = this.queue[0],
          n = Math.floor(this.offset),
          f = this.offset - n;
        value =
          chunk[n] * (1 - f) + chunk[Math.min(n + 1, chunk.length - 1)] * f;
        this.offset += this.rate / sampleRate;
      }
      mono[i] = value;
      power += value * value;
    }
    const rms = Math.sqrt(power / mono.length);
    if (rms < 0.008) this.quiet += mono.length / sampleRate;
    else this.quiet = 0;
    if (this.holding && this.quiet > 0.35) this.holding = false;
    const audible = this.enabled && this.permitted && !this.holding;
    this.frames++;
    if (rms > 0.008) this.voiced++;
    this.peak = Math.max(this.peak, rms);
    if (!audible) mono.fill(0);
    for (let c = 1; c < out.length; c++) out[c].set(mono);
    if (audible && rms > 0.008) this.played++;
    if (this.frames % 375 === 0)
      this.port.postMessage({
        type: "meter",
        voiced: this.voiced,
        played: this.played,
        peak: this.peak,
      });
    const playing =
      audible && (rms > 0.008 || (this.playing && this.quiet < 0.12));
    if (playing !== this.playing) {
      this.playing = playing;
      this.port.postMessage({ type: "playing", value: playing });
    }
    return true;
  }
}
registerProcessor("eshiritori-voice-output", VoiceOutput);
