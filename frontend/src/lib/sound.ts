// Web Audio API Synthesizer Sound Engine for UNO
class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private volume: number = 0.5;

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem('uno_sound_muted') === 'true';
      const storedVol = localStorage.getItem('uno_sound_volume');
      if (storedVol !== null) {
        this.volume = parseFloat(storedVol);
      }
    }
  }

  private initCtx() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('uno_sound_muted', String(this.muted));
    }
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('uno_sound_muted', String(this.muted));
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('uno_sound_volume', String(this.volume));
    }
  }

  // Play a synthesized tone
  private playTone(freq: number, type: OscillatorType, duration: number, startDelay: number = 0, gainMult: number = 1) {
    if (this.muted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime + startDelay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      const maxGain = this.volume * gainMult * 0.3;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(maxGain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch {
      // AudioContext play prevented or error
    }
  }

  // ─── Sound Effects ──────────────────────────────────────────

  // Card play snap sound
  public playCard() {
    if (this.muted) return;
    this.playTone(350, 'triangle', 0.08, 0, 0.8);
    this.playTone(600, 'sine', 0.05, 0.02, 0.5);
  }

  // Card draw swoosh/slide sound
  public playDraw() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.1);
      gain.gain.setValueAtTime(this.volume * 0.2, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  // Your turn alert sound (pleasant double chime)
  public playTurnAlert() {
    if (this.muted) return;
    this.playTone(523.25, 'sine', 0.15, 0, 0.6); // C5
    this.playTone(659.25, 'sine', 0.25, 0.1, 0.7); // E5
  }

  // Action card sound (Skip, Reverse, +2, +4)
  public playAction() {
    if (this.muted) return;
    this.playTone(440, 'sawtooth', 0.1, 0, 0.4);
    this.playTone(880, 'sine', 0.2, 0.08, 0.6);
  }

  // UNO call loud trumpet/fanfare
  public playUnoCall() {
    if (this.muted) return;
    this.playTone(587.33, 'triangle', 0.15, 0, 0.9);   // D5
    this.playTone(880.00, 'triangle', 0.35, 0.12, 1.0);  // A5
  }

  // Round over sound
  public playRoundOver() {
    if (this.muted) return;
    this.playTone(400, 'sine', 0.2, 0, 0.6);
    this.playTone(600, 'sine', 0.3, 0.15, 0.6);
  }

  // Game Victory Fanfare 🏆
  public playVictory() {
    if (this.muted) return;
    const notes = [
      { f: 523.25, d: 0.15, delay: 0 },    // C5
      { f: 659.25, d: 0.15, delay: 0.15 }, // E5
      { f: 783.99, d: 0.15, delay: 0.30 }, // G5
      { f: 1046.50, d: 0.6, delay: 0.45 }, // C6
    ];
    notes.forEach(n => this.playTone(n.f, 'triangle', n.d, n.delay, 1.0));
  }

  // Game Defeat Sound 💔
  public playDefeat() {
    if (this.muted) return;
    const notes = [
      { f: 400, d: 0.2, delay: 0 },
      { f: 370, d: 0.2, delay: 0.2 },
      { f: 345, d: 0.2, delay: 0.4 },
      { f: 300, d: 0.5, delay: 0.6 },
    ];
    notes.forEach(n => this.playTone(n.f, 'sawtooth', n.d, n.delay, 0.5));
  }
}

export const soundManager = new SoundManager();
