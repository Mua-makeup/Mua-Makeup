/**
 * Utility phát âm thanh chuông thông báo sử dụng Web Audio API thuần
 * Hoạt động 100% offline, không phụ thuộc file media ngoài, độ trễ <1ms
 */

class NotificationSoundEngine {
  constructor() {
    this.audioCtx = null;
    this.initUnlockListener();
  }

  initUnlockListener() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.getAudioContext();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('mousemove', unlock);
    };

    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('mousemove', unlock, { once: true, passive: true });
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

  /**
   * Âm thanh thông báo đơn mới (Ding-Dong êm ái)
   */
  playBookingChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Nốt 1 (1046.5 Hz - C6)
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

      // Nốt 2 (1318.5 Hz - E6)
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
      console.warn('[NotificationSound] Could not play booking chime:', e);
    }
  }

  /**
   * Âm thanh cảnh báo khẩn cấp (Emergency Alert - hồi còi kép 2 nhịp dứt khoát, âm lượng nổi bật)
   */
  playEmergencyAlert() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // Nhịp 1: 880Hz -> 1174Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.7, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.28);

      // Nhịp 2: 880Hz -> 1318Hz (ngay sau nhịp 1)
      const pulse2Start = now + 0.25;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(987.77, pulse2Start);
      osc2.frequency.exponentialRampToValueAtTime(1318.5, pulse2Start + 0.18);

      gain2.gain.setValueAtTime(0, pulse2Start);
      gain2.gain.linearRampToValueAtTime(0.55, pulse2Start + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, pulse2Start + 0.5);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(pulse2Start);
      osc2.stop(pulse2Start + 0.55);

      // Nhịp 3: Hồi ngân cao 1760Hz
      const pulse3Start = now + 0.55;
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1760, pulse3Start);

      gain3.gain.setValueAtTime(0, pulse3Start);
      gain3.gain.linearRampToValueAtTime(0.45, pulse3Start + 0.03);
      gain3.gain.exponentialRampToValueAtTime(0.001, pulse3Start + 0.8);

      osc3.connect(gain3);
      gain3.connect(ctx.destination);

      osc3.start(pulse3Start);
      osc3.stop(pulse3Start + 0.85);
    } catch (e) {
      console.warn('[NotificationSound] Could not play emergency alert:', e);
    }
  }
}

export const notificationSound = new NotificationSoundEngine();
