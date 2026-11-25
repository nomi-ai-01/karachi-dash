/**
 * Web Audio synthesis. Music timer is tracked and cleared.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicOn = true;
  private sfxOn = true;
  private unlocked = false;
  private musicPlaying = false;
  private musicTimer: ReturnType<typeof setTimeout> | null = null;

  async unlock() {
    if (this.unlocked) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.55;
      this.sfxGain.connect(this.master);
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.unlocked = true;
    } catch { /* unavailable */ }
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (this.musicGain) this.musicGain.gain.value = on ? 0.22 : 0;
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    if (this.sfxGain) this.sfxGain.gain.value = on ? 0.55 : 0;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.3, slideTo?: number) {
    if (!this.ctx || !this.sfxGain || !this.sfxOn) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, this.ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  playCoin(combo = 1) {
    const base = 660 + Math.min(combo, 8) * 40;
    this.tone(base, 0.08, 'sine', 0.25);
    this.tone(base * 1.5, 0.06, 'sine', 0.15);
  }
  playJump() { this.tone(220, 0.12, 'triangle', 0.3, 440); }
  playSlide() { this.tone(180, 0.15, 'sawtooth', 0.2, 90); }
  playLane() { this.tone(300, 0.05, 'square', 0.12); }
  playPowerup() {
    this.tone(440, 0.08, 'sine', 0.3);
    this.tone(660, 0.1, 'sine', 0.25);
    this.tone(880, 0.15, 'sine', 0.2);
  }
  playNearMiss() { this.tone(150, 0.18, 'sawtooth', 0.25, 80); }
  playUI() { this.tone(520, 0.04, 'sine', 0.15); }
  playHorn() {
    this.tone(380, 0.2, 'square', 0.2);
    this.tone(420, 0.18, 'square', 0.15);
  }

  playCrash() {
    if (!this.ctx || !this.sfxGain || !this.sfxOn) return;
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
  }

  startMusic() {
    if (!this.ctx || !this.musicGain || !this.musicOn || this.musicPlaying) return;
    this.musicPlaying = true;
    const beat = 0.28;
    const schedule = () => {
      if (!this.ctx || !this.musicPlaying || !this.musicGain) return;
      const now = this.ctx.currentTime;
      const kick = this.ctx.createOscillator();
      const kg = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(120, now);
      kick.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      kg.gain.setValueAtTime(0.35, now);
      kg.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      kick.connect(kg);
      kg.connect(this.musicGain);
      kick.start(now);
      kick.stop(now + 0.16);

      const hat = this.ctx.createOscillator();
      const hg = this.ctx.createGain();
      hat.type = 'square';
      hat.frequency.value = 8000;
      hg.gain.setValueAtTime(0.04, now + beat * 0.5);
      hg.gain.exponentialRampToValueAtTime(0.001, now + beat * 0.5 + 0.04);
      hat.connect(hg);
      hg.connect(this.musicGain);
      hat.start(now + beat * 0.5);
      hat.stop(now + beat * 0.5 + 0.05);

      const notes = [262, 294, 330, 349, 392, 440];
      const n = notes[Math.floor(Math.random() * notes.length)];
      const mel = this.ctx.createOscillator();
      const mg = this.ctx.createGain();
      mel.type = 'triangle';
      mel.frequency.value = n;
      mg.gain.setValueAtTime(0.08, now + beat);
      mg.gain.exponentialRampToValueAtTime(0.001, now + beat + 0.2);
      mel.connect(mg);
      mg.connect(this.musicGain);
      mel.start(now + beat);
      mel.stop(now + beat + 0.22);

      this.musicTimer = setTimeout(schedule, beat * 1000 * 2);
    };
    schedule();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new AudioManager();
