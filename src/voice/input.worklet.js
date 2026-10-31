// Application-local VAD. Audio stays on the negotiated WebRTC track.
class VoiceInput extends AudioWorkletProcessor {
  constructor() {
    super();
    this.active = false;
    this.quiet = 0;
    this.voiced = 0;
    this.sequence = 0;
  }
  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    for (const channel of outputs[0]) channel.fill(0);
    if (!input) return true;
    let power = 0;
    for (const sample of input) power += sample * sample;
    const voiced = Math.sqrt(power / input.length) > 0.012,
      dt = input.length / sampleRate;
    if (voiced) {
      this.voiced += dt;
      this.quiet = 0;
      if (!this.active && this.voiced > 0.08) {
        this.active = true;
        this.port.postMessage({ active: true, sequence: ++this.sequence });
      }
    } else {
      this.voiced = 0;
      this.quiet += dt;
      if (this.active && this.quiet > 0.9) {
        this.active = false;
        this.port.postMessage({ active: false, sequence: this.sequence });
      }
    }
    return true;
  }
}
registerProcessor("eshiritori-voice-input", VoiceInput);
