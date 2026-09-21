import { create } from 'zustand';
import { Alert } from 'react-native';

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
}

interface PopupState {
  isOpen: boolean;
  options: PopupOptions | null;
  show: (options: PopupOptions) => void;
  hide: () => void;
}

export const usePopupStore = create<PopupState>((set) => ({
  isOpen: false,
  options: null,
  show: (options) => set({ isOpen: true, options }),
  hide: () => set({ isOpen: false, options: null }),
}));

/**
 * Hiển thị Popup toàn cục với kiểu nhận diện thông minh
 */
export const showGlobalPopup = (
  title: string,
  message?: string,
  buttons?: Array<{ text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>,
  _options?: any
) => {
  const tLower = (title || '').toLowerCase();
  const mLower = (message || '').toLowerCase();

  let type: PopupType = 'info';
  if (tLower.includes('thành công') || tLower.includes('success') || mLower.includes('thành công')) {
    type = 'success';
  } else if (
    tLower.includes('lỗi') ||
    tLower.includes('thất bại') ||
    tLower.includes('error') ||
    tLower.includes('thiếu') ||
    mLower.includes('lỗi') ||
    mLower.includes('thất bại')
  ) {
    type = 'error';
  } else if (tLower.includes('cảnh báo') || tLower.includes('quyền') || tLower.includes('warning')) {
    type = 'warning';
  } else if (buttons && buttons.length > 1) {
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

  usePopupStore.getState().show({
    title,
    message,
    type,
    buttons: mappedButtons,
  });
};

/**
 * Gắn đè Alert.alert để toàn bộ mã nguồn gọi Alert.alert() trên cả Web và Mobile
 * đều tự động nảy popup sang trọng chuẩn Luxury Beauty.
 */
let isPolyfilled = false;
export const setupAlertPolyfill = () => {
  if (isPolyfilled) return;
  isPolyfilled = true;

  Alert.alert = (title: string, message?: string, buttons?: any, options?: any) => {
    showGlobalPopup(title, message, buttons, options);
  };
};
