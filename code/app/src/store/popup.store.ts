import { create } from 'zustand';
import { Alert, Platform } from 'react-native';

export interface PopupButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export type PopupType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface PopupOptions {
  title: string;
  message?: string;
  type?: PopupType;
  buttons?: PopupButton[];
  cancelable?: boolean;
  autoCloseSeconds?: number;
  onAutoClose?: () => void;
}

interface PopupState {
  isOpen: boolean;
  options: PopupOptions | null;
  show: (options: PopupOptions) => void;
  hide: () => void;
  embeddedOverlayCount: number;
  registerOverlay: () => void;
  unregisterOverlay: () => void;
}

export const usePopupStore = create<PopupState>((set) => ({
  isOpen: false,
  options: null,
  show: (options) => set({ isOpen: true, options }),
  hide: () => set({ isOpen: false, options: null }),
  embeddedOverlayCount: 0,
  registerOverlay: () => set((state) => ({ embeddedOverlayCount: state.embeddedOverlayCount + 1 })),
  unregisterOverlay: () => set((state) => ({ embeddedOverlayCount: Math.max(0, state.embeddedOverlayCount - 1) })),
}));

/**
 * Hiển thị Popup toàn cục với kiểu nhận diện thông minh và đếm ngược tự đóng 5s
 */
export const showGlobalPopup = (
  title: string,
  message?: string,
  buttons?: Array<{ text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>,
  options?: any
) => {
  const tLower = (title || '').toLowerCase();
  const mLower = (message || '').toLowerCase();

  let type: PopupType = 'info';
  if (tLower.includes('thành công') || tLower.includes('success') || mLower.includes('thành công')) {
    type = 'success';
  } else if (
    tLower.includes('hủy') ||
    tLower.includes('cancel') ||
    tLower.includes('lỗi') ||
    tLower.includes('thất bại') ||
    tLower.includes('error') ||
    tLower.includes('thiếu') ||
    mLower.includes('lỗi') ||
    mLower.includes('thất bại')
  ) {
    type = 'error';
  } else if (
    tLower.includes('cảnh báo') ||
    tLower.includes('quyền') ||
    tLower.includes('warning') ||
    tLower.includes('lưu ý')
  ) {
    type = 'warning';
  } else if (
    buttons &&
    buttons.length > 1 &&
    (tLower.includes('xác nhận') || tLower.includes('bạn có chắc') || buttons.some((b) => b.style === 'cancel'))
  ) {
    type = 'confirm';
  }

  const mappedButtons: PopupButton[] =
    buttons && buttons.length > 0
      ? buttons.map((b) => ({
          text: b.text || 'OK',
          onPress: b.onPress,
          style: b.style,
        }))
      : [{ text: 'Đóng', style: 'default' }];

  const autoCloseSec = typeof options?.autoCloseSeconds === 'number' ? options.autoCloseSeconds : 5;

  usePopupStore.getState().show({
    title,
    message,
    type,
    buttons: mappedButtons,
    cancelable: options?.cancelable ?? true,
    autoCloseSeconds: autoCloseSec,
    onAutoClose: options?.onAutoClose,
  });
};

/**
 * Gắn đè Alert.alert TOÀN BỘ HỆ THỐNG (cả Mobile iOS, Android và Web).
 * Thay thế hoàn toàn Native OS Alert mặc định bằng Pop-up Modal cao cấp chuẩn Luxury Beauty,
 * tự động đếm ngược 5 giây rồi đóng (hoặc người dùng bấm phím hành động tức thì).
 */
let isPolyfilled = false;
export const setupAlertPolyfill = () => {
  if (isPolyfilled) return;
  isPolyfilled = true;

  Alert.alert = (title: string, message?: string, buttons?: any, options?: any) => {
    showGlobalPopup(title, message, buttons, options);
  };
};

