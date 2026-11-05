/** Salinan perilaku app/lib/notification-sound.ts (file kustom vol 0.6, atau beep sine 880 Hz 0,3 dtk). */
let audioCtx: AudioContext | null = null;

export function unlockNotificationAudio(): void {
  try {
    audioCtx ??= new AudioContext();
    void audioCtx.resume().catch(() => undefined);
  } catch {
    // Web Audio opsional; pemutaran file kustom tetap bisa jalan.
  }
}

export interface NotificationSoundOptions {
  enabled?: boolean;
  url?: string | null;
}

export function playNotificationSound(options?: NotificationSoundOptions): void {
  if (options?.enabled === false) return;

  if (options?.url) {
    try {
      const audio = new Audio(options.url);
      audio.volume = 0.6;
      void audio.play().catch(() => undefined);
    } catch {
      // abaikan
    }
    return;
  }

  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  } catch {
    // abaikan
  }
}
