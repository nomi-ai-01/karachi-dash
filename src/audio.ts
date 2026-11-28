const BHAIRAV = [261.63, 277.18, 329.63, 349.23, 392.0, 415.3, 493.88, 523.25];
const MELODY = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 6, 7, 6, 4, 2];

class AudioManager {
  private ctx?: AudioContext;
  private master?: GainNode;
  private musicRun = 0;
  muted = false;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol: number, cutoff: number) {
    if (!this.ctx || !this.master) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  coin() {
    this.tone(988, 0.08, 'square', 0.1);
    this.tone(1319, 0.16, 'square', 0.1, undefined, 0.07);
  }
  jump() {
    this.tone(320, 0.22, 'sine', 0.25, 700);
  }
  slide() {
    this.noise(0.3, 0.18, 1400);
  }
  swish() {
    this.noise(0.12, 0.08, 2500);
  }
  /** two-tone train horn (a moving train is coming) */
  horn() {
    this.tone(311, 0.45, 'sawtooth', 0.09);
    this.tone(392, 0.45, 'sawtooth', 0.09);
  }
  crash() {
    this.noise(0.55, 0.5, 500);
    this.tone(130, 0.5, 'sawtooth', 0.3, 40);
  }

  startMusic() {
    if (!this.ctx) return;
    const run = ++this.musicRun;
    const step = 0.2;
    let next = this.ctx.currentTime + 0.1;
    let i = 0;
    const tick = () => {
      if (!this.ctx || run !== this.musicRun) return;
      while (next < this.ctx.currentTime + 0.5) {
        const delay = Math.max(0, next - this.ctx.currentTime);
        const note = BHAIRAV[MELODY[i % MELODY.length]];
        this.tone(note, 0.18, 'triangle', 0.07, undefined, delay);
        if (i % 4 === 0) this.tone(65.41, 0.75, 'sine', 0.12, undefined, delay);
        next += step;
        i++;
      }
      window.setTimeout(tick, 150);
    };
    tick();
  }

  stopMusic() {
    this.musicRun++;
  }
}

export const audio = new AudioManager();
