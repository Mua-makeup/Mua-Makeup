/**
 * Utility phát âm thanh chuông thông báo sang trọng sử dụng Web Audio API thuần
 * Hoạt động 100% offline, không phụ thuộc file media ngoài, độ trễ <1ms
 */

class NotificationSoundEngine {
  constructor() {
    this.audioCtx = null;
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  playBookingChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // --- Nốt thứ nhất (Ding: 1046.5 Hz) ---
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.3, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.85);

      // --- Nốt thứ hai (Dong: 1318.5 Hz - cao và ngân hơn) ---
      const note2Start = now + 0.12;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.5, note2Start);

      gain2.gain.setValueAtTime(0, note2Start);
      gain2.gain.linearRampToValueAtTime(0.35, note2Start + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, note2Start + 1.2);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(note2Start);
      osc2.stop(note2Start + 1.25);
    } catch (e) {
      console.warn('[NotificationSound] Could not play audio:', e);
    }
  }
}

export const notificationSound = new NotificationSoundEngine();
