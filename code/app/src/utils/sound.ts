import * as Haptics from 'expo-haptics';

/**
 * Quản lý cảnh báo rung phản hồi (Haptic Feedback) khi có đơn khẩn cấp và kết nối thợ.
 * 100% thuần túy bằng expo-haptics, không sử dụng module âm thanh native để đảm bảo
 * độ ổn định tối đa trên Expo Go, iOS, Android và Web.
 */
class SoundManager {
  private isAlertPlaying: boolean = false;
  private hapticInterval: any = null;

  /**
   * Kích hoạt rung dồn dập báo hiệu khi có cuốc khẩn cấp 45s nổ về:
   * Rung lặp lại định kỳ mỗi 1.2s cho đến khi thợ bấm Nhận hoặc Bỏ qua.
   */
  async playJobAlertSound(): Promise<void> {
    if (this.isAlertPlaying) return;
    this.isAlertPlaying = true;

    try {
      // Rung phát đầu tiên ngay lập tức
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      // Thiết lập nhịp rung định kỳ lặp lại
      if (this.hapticInterval) clearInterval(this.hapticInterval);
      this.hapticInterval = setInterval(() => {
        if (!this.isAlertPlaying) {
          if (this.hapticInterval) clearInterval(this.hapticInterval);
          return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 1200);
    } catch {
      // Bỏ qua nếu chạy trên nền tảng không hỗ trợ rung
    }
  }

  /**
   * Ngắt rung báo cuốc ngay lập tức khi thợ bấm Nhận ca hoặc Bỏ qua
   */
  async stopJobAlertSound(): Promise<void> {
    this.isAlertPlaying = false;
    if (this.hapticInterval) {
      clearInterval(this.hapticInterval);
      this.hapticInterval = null;
    }
  }

  /**
   * Rung báo hiệu chúc mừng khi ghép thợ thành công (phía Khách hàng)
   */
  async playMatchSuccessSound(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
  }

  /**
   * Rung cảnh báo khi hết thời gian tìm kiếm 45s (phía Khách hàng)
   */
  async playTimeoutSound(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // ignore
    }
  }
}

export const soundManager = new SoundManager();
