import { UserSettings } from '../types/typeverse';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playKeystroke(settings: UserSettings, isError = false) {
    if (!settings.soundEnabled || settings.keySoundProfile === 'muted') return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vol = Math.max(0.02, Math.min(1, settings.volume)) * 0.18;

    if (isError) {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.08);
      gain.gain.setValueAtTime(vol * 1.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
      return;
    }

    if (settings.keySoundProfile === 'clicky') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1150, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.032);
    } else if (settings.keySoundProfile === 'linear') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.028);
    } else {
      // tactile default
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.03);
    }

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playGameSfx(
    settings: UserSettings,
    effect: 'laser' | 'explosion' | 'spell' | 'boost' | 'hit' | 'countdown' | 'victory' | 'achievement'
  ) {
    if (!settings.soundEnabled || !settings.gameSfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vol = Math.max(0.02, Math.min(1, settings.volume)) * 0.22;

    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (effect) {
      case 'laser':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(210, now + 0.11);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      case 'explosion':
        osc.type = 'square';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.22);
        gain.gain.setValueAtTime(vol * 1.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now);
        osc.stop(now + 0.24);
        break;
      case 'spell':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.18);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'boost':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.14);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'hit':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.14);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'countdown':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(vol * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'victory':
      case 'achievement': {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const nOsc = ctx.createOscillator();
          const nGain = ctx.createGain();
          nOsc.type = 'triangle';
          nOsc.frequency.setValueAtTime(freq, now + idx * 0.08);
          nGain.gain.setValueAtTime(vol * 0.9, now + idx * 0.08);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);
          nOsc.connect(nGain);
          nGain.connect(ctx.destination);
          nOsc.start(now + idx * 0.08);
          nOsc.stop(now + idx * 0.08 + 0.24);
        });
        break;
      }
    }
  }

  public syncAmbientMusic(settings: UserSettings) {
    if (!settings.soundEnabled || !settings.musicEnabled) {
      if (this.ambientOsc) {
        try {
          this.ambientOsc.stop();
          this.ambientOsc.disconnect();
        } catch {}
        this.ambientOsc = null;
      }
      return;
    }
    const ctx = this.getContext();
    if (!ctx || this.ambientOsc) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(0.005, settings.volume * 0.025), ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    this.ambientOsc = osc;
    this.ambientGain = gain;
  }
}

export const soundEngine = new SoundEngine();
