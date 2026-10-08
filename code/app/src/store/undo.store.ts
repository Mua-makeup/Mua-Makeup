import { create } from 'zustand';
import * as Haptics from 'expo-haptics';

export interface UndoAction {
  id?: string;
  message: string;
  description?: string;
  onUndo: () => void | Promise<void>;
  onCommit?: () => void | Promise<void>;
  durationMs?: number;
}

interface UndoStoreState {
  activeUndo: UndoAction | null;
  undoTimer: ReturnType<typeof setTimeout> | null;
  restoredMessage: string | null;
  restoredTimer: ReturnType<typeof setTimeout> | null;

  showUndoToast: (action: UndoAction) => void;
  triggerUndo: () => Promise<void>;
  dismissUndo: () => void;
  clearRestoredMessage: () => void;
}

export const useUndoStore = create<UndoStoreState>((set, get) => ({
  activeUndo: null,
  undoTimer: null,
  restoredMessage: null,
  restoredTimer: null,

  showUndoToast: (action: UndoAction) => {
    const { undoTimer, activeUndo } = get();

    // Nếu đang có 1 action trước đó chưa commit, commit ngay action cũ
    if (undoTimer) {
      clearTimeout(undoTimer);
    }
    if (activeUndo?.onCommit) {
      try {
        activeUndo.onCommit();
      } catch (err) {
        console.warn('[UndoStore] Lỗi commit action cũ:', err);
      }
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const duration = action.durationMs ?? 6000;

    // Hẹn giờ tự động commit xóa vĩnh viễn khi người dùng không bấm Hoàn tác
    const timer = setTimeout(async () => {
      const current = get().activeUndo;
      if (current?.onCommit) {
        try {
          await current.onCommit();
        } catch (err) {
          console.warn('[UndoStore] Lỗi commit xóa vĩnh viễn:', err);
        }
      }
      set({ activeUndo: null, undoTimer: null });
    }, duration);

    set({
      activeUndo: {
        ...action,
        id: action.id || String(Date.now()),
        durationMs: duration,
      },
      undoTimer: timer,
      restoredMessage: null,
    });
  },

  triggerUndo: async () => {
    const { activeUndo, undoTimer, restoredTimer } = get();
    if (!activeUndo) return;

    if (undoTimer) {
      clearTimeout(undoTimer);
    }
    if (restoredTimer) {
      clearTimeout(restoredTimer);
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    // Gọi hàm phục hồi dữ liệu từ caller
    try {
      await activeUndo.onUndo();
    } catch (err) {
      console.warn('[UndoStore] Lỗi khi thực hiện hoàn tác:', err);
    }

    // Hiển thị thông báo nhỏ đã khôi phục thành công trong 2.5s
    const successMsg = 'Đã khôi phục thành công!';
    const successTimer = setTimeout(() => {
      set({ restoredMessage: null, restoredTimer: null });
    }, 2500);

    set({
      activeUndo: null,
      undoTimer: null,
      restoredMessage: successMsg,
      restoredTimer: successTimer,
    });
  },

  dismissUndo: () => {
    const { activeUndo, undoTimer } = get();
    if (undoTimer) {
      clearTimeout(undoTimer);
    }
    if (activeUndo?.onCommit) {
      try {
        activeUndo.onCommit();
      } catch (err) {
        console.warn('[UndoStore] Lỗi commit khi dismiss:', err);
      }
    }
    set({ activeUndo: null, undoTimer: null });
  },

  clearRestoredMessage: () => {
    const { restoredTimer } = get();
    if (restoredTimer) clearTimeout(restoredTimer);
    set({ restoredMessage: null, restoredTimer: null });
  },
}));
