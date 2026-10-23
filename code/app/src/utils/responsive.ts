import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Thiết bị cơ sở tham chiếu chuẩn (iPhone X / 11 Pro / 12 mini: 375 x 812)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Tỉ lệ phần trăm theo chiều ngang màn hình (Width Percentage)
 */
export const wp = (percentage: number): number => {
  return Math.round((percentage * SCREEN_WIDTH) / 100);
};

/**
 * Tỉ lệ phần trăm theo chiều dọc màn hình (Height Percentage)
 */
export const hp = (percentage: number): number => {
  return Math.round((percentage * SCREEN_HEIGHT) / 100);
};

/**
 * Tỉ lệ co giãn ngang tuyến tính
 */
export const scale = (size: number): number => {
  return Math.round((SCREEN_WIDTH / BASE_WIDTH) * size);
};

/**
 * Tỉ lệ co giãn dọc tuyến tính
 */
export const verticalScale = (size: number): number => {
  return Math.round((SCREEN_HEIGHT / BASE_HEIGHT) * size);
};

/**
 * Tỉ lệ co giãn có kiểm soát (Moderate Scaling), lý tưởng cho Typography, Padding, Icon
 * @param size Kích thước cơ sở
 * @param factor Hệ số điều tiết (mặc định 0.5 để không bị phóng/thu quá mức trên màn hình lớn/nhỏ)
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  return Math.round(size + (scale(size) - size) * factor);
};

/**
 * Phân loại kích thước màn hình thiết bị
 */
export const isSmallDevice = SCREEN_WIDTH < 375; // iPhone SE (1st/2nd/3rd gen), Android 320-360px
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414; // iPhone 12/13/14/15/16 tiêu chuẩn
export const isLargeDevice = SCREEN_WIDTH >= 414 && SCREEN_WIDTH < 768; // iPhone Plus / Pro Max, Android màn lớn
export const isTablet = SCREEN_WIDTH >= 768; // iPad, Android Tablet

/**
 * Tính toán chiều cao chính xác của AppBottomNavBar dựa trên Safe Area Insets đáy
 */
export const getBottomNavHeight = (insetsBottom = 0): number => {
  return 62 + (insetsBottom > 0 ? insetsBottom : 10);
};

/**
 * Tính toán khoảng đệm đáy (paddingBottom) an toàn cho các trang có gắn AppBottomNavBar
 * Đảm bảo 100% nội dung cuối trang không bị che lấp trên mọi dòng máy (iPhone Dynamic Island, Android 3 nút / cử chỉ)
 */
export const getBottomNavPadding = (insetsBottom = 0, extraClearance = 16): number => {
  return getBottomNavHeight(insetsBottom) + extraClearance;
};

/**
 * Khoảng cách đáy an toàn cho các Modal BottomSheet hoặc Floating Button Bars
 */
export const getSafeAreaBottom = (insetsBottom = 0, fallback = 16): number => {
  return Math.max(insetsBottom, fallback);
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
