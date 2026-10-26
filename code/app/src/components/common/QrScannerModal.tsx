import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, scanFromURLAsync } from 'expo-camera';
import { BrandColors } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(SCREEN_WIDTH * 0.72, 260);

export interface QrScannerViewProps {
  onClose: () => void;
  onScanSuccess: (code: string) => void;
  onOpenManualInput?: () => void;
}

export const QrScannerView: React.FC<QrScannerViewProps> = ({
  onClose,
  onScanSuccess,
  onOpenManualInput,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [hasScanned, setHasScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);

  // Key duy nhất thay đổi mỗi lần mở scanner để ép iOS giải phóng & tái khởi tạo AVCaptureSession mới
  const [cameraKey] = useState(() => `cam-${Date.now()}`);

  // Hiệu ứng tia quét laser di chuyển lên xuống
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setHasScanned(false);
    setTorch(false);
    setIsProcessing(false);
    setIsCameraReady(false);
    setMountError(null);

    // Kích hoạt hiệu ứng laser lặp vô tận
    laserAnim.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: SCAN_BOX_SIZE - 6,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => {
      animation.stop();
    };
  }, [laserAnim]);

  // Lắng nghe sự kiện quét từ Apple DataScannerViewController (iOS 16+ System Scanner)
  useEffect(() => {
    let subscription: any;
    try {
      if (CameraView.isModernBarcodeScannerAvailable) {
        subscription = CameraView.onModernBarcodeScanned((result) => {
          if (result && result.data) {
            CameraView.dismissScanner().catch(() => {});
            handleBarcodeScanned({ data: result.data });
          }
        });
      }
    } catch (e) {
      console.warn('[CameraView] Error setting up modern barcode listener:', e);
    }

    return () => {
      subscription?.remove?.();
      if (CameraView.isModernBarcodeScannerAvailable) {
        CameraView.dismissScanner().catch(() => {});
      }
    };
  }, []);

  // Trích xuất mã code nếu quét trúng URL tuyển dụng
  const extractCode = (data: string): string => {
    if (!data) return '';
    const trimmed = data.trim();
    if (trimmed.includes('code=')) {
      try {
        const match = trimmed.match(/[?&]code=([^&]+)/);
        if (match && match[1]) {
          return decodeURIComponent(match[1]).trim();
        }
      } catch {
        // Fallback
      }
    }
    return trimmed;
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (hasScanned || isProcessing) return;

    setHasScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const cleanCode = extractCode(data);
    onClose();
    setTimeout(() => {
      onScanSuccess(cleanCode);
    }, 150);
  };

  // 1. CHỌN ẢNH QR TỪ THƯ VIỆN & TỰ ĐỘNG QUÉT BẰNG scanFromURLAsync
  const handlePickFromLibrary = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const imageUri = res.assets[0].uri;
        setIsProcessing(true);

        try {
          const results = await scanFromURLAsync(imageUri, ['qr']);
          setIsProcessing(false);

          if (results && results.length > 0 && results[0]?.data) {
            handleBarcodeScanned({ data: results[0].data });
          } else {
            Alert.alert(
              'Không Tìm Thấy Mã QR',
              'Ảnh bạn chọn không chứa mã QR hoặc mã QR quá mờ. Vui lòng chọn ảnh khác hoặc hướng camera vào mã để quét trực tiếp.',
              [
                { text: 'Chọn Lại', onPress: handlePickFromLibrary },
                {
                  text: 'Nhập Bằng Tay',
                  onPress: () => {
                    onClose();
                    onOpenManualInput?.();
                  },
                },
                { text: 'Đóng', style: 'cancel' },
              ]
            );
          }
        } catch {
          setIsProcessing(false);
          Alert.alert('Lỗi Nhận Diện', 'Không thể đọc mã QR từ ảnh này. Vui lòng thử ảnh khác hoặc nhập mã mời.');
        }
      }
    } catch {
      setIsProcessing(false);
      Alert.alert('Lỗi', 'Không thể truy cập thư viện ảnh của thiết bị.');
    }
  };

  // 2. MỞ TRÌNH QUÉT HỆ THỐNG APPLE / GOOGLE (DataScannerViewController)
  const handleLaunchSystemScanner = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (CameraView.isModernBarcodeScannerAvailable) {
        await CameraView.launchScanner({ barcodeTypes: ['qr'] });
      } else {
        await handleCaptureWithSystemCamera();
      }
    } catch (e) {
      console.warn('[CameraView] launchScanner failed, falling back to camera capture:', e);
      await handleCaptureWithSystemCamera();
    }
  };

  // 3. CHỤP ẢNH BẰNG CAMERA HỆ THỐNG (DỰ PHÒNG HOÀN TOÀN TRÁNH MỌI LỖI NATIVE PREVIEW)
  const handleCaptureWithSystemCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền Camera', 'Vui lòng cấp quyền mở Camera để chụp ảnh mã QR.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setIsProcessing(true);

        try {
          const results = await scanFromURLAsync(imageUri, ['qr']);
          setIsProcessing(false);

          if (results && results.length > 0 && results[0]?.data) {
            handleBarcodeScanned({ data: results[0].data });
          } else {
            Alert.alert(
              'Không Tìm Thấy Mã QR',
              'Ảnh chụp không nhận diện được mã QR. Vui lòng căn chỉnh lại gần mã hơn và chụp rõ nét.',
              [
                { text: 'Chụp Lại', onPress: handleCaptureWithSystemCamera },
                { text: 'Hủy', style: 'cancel' },
              ]
            );
          }
        } catch {
          setIsProcessing(false);
          Alert.alert('Lỗi', 'Không thể đọc mã QR từ ảnh chụp.');
        }
      }
    } catch {
      setIsProcessing(false);
      Alert.alert('Lỗi', 'Không thể khởi động camera chụp ảnh.');
    }
  };

  return (
    <View style={styles.fullscreenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* TRƯỜNG HỢP 1: ĐANG CHỜ QUYỀN CAMERA HOẶC CHƯA CẤP QUYỀN */}
      {!permission ? (
        <View style={styles.permissionCenterBox}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.permissionText}>Đang khởi tạo máy ảnh...</Text>
        </View>
      ) : !permission.granted ? (
        <SafeAreaView style={styles.permissionCenterBox}>
          <View style={styles.permissionIconCircle}>
            <Ionicons name="camera-outline" size={48} color={BrandColors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Yêu Cầu Quyền Camera</Text>
          <Text style={styles.permissionSubtitle}>
            Ứng dụng cần quyền mở Camera để quét mã QR tuyển dụng của Studio.
          </Text>

          <TouchableOpacity style={styles.grantPermissionBtn} onPress={requestPermission} activeOpacity={0.8}>
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.grantPermissionBtnText}>Cấp Quyền Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelPermissionBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelPermissionBtnText}>Quay Lại</Text>
          </TouchableOpacity>
        </SafeAreaView>
      ) : (
        /* TRƯỜNG HỢP 2: ĐÃ CÓ QUYỀN - RENDER CAMERA VIEW */
        <View style={styles.cameraWrapper}>
          {/* LỚP 1: NATIVE CAMERAVIEW VỚI KÍCH THƯỚC TUYỆT ĐỐI RÕ RÀNG */}
          <CameraView
            key={cameraKey}
            style={styles.nativeCamera}
            facing={facing}
            enableTorch={torch}
            mode="picture"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onCameraReady={() => {
              setIsCameraReady(true);
            }}
            onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
            onMountError={(err) => {
              console.warn('[CameraView] Mount Error:', err);
              setMountError(err.message || 'Lỗi luồng camera native');
            }}
          />

          {/* NẾU CAMERA NATIVE GẶP LỖI HIỂN THỊ */}
          {mountError && (
            <View style={styles.mountErrorOverlay}>
              <Ionicons name="alert-circle-outline" size={40} color="#FB7185" />
              <Text style={styles.mountErrorText}>Không thể tải luồng video trực tiếp ({mountError}).</Text>
              <TouchableOpacity
                style={styles.fallbackCaptureBtn}
                onPress={handleCaptureWithSystemCamera}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" />
                <Text style={styles.fallbackCaptureBtnText}>Chụp Ảnh Mã QR Để Quét</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* LỚP 2: LỚP PHỦ KÍNH NGẮM VÀ CÁC NÚT ĐIỀU KHIỂN (CÂN ĐỐI FLEX) */}
          <View style={styles.overlayContainer} pointerEvents="box-none">
            {/* VÙNG MỜ 1: PHẦN TRÊN KÍNH NGẮM */}
            <View style={styles.overlayTop}>
              <SafeAreaView edges={['top']} style={styles.topToolbarSafe}>
                <View style={styles.topToolbar}>
                  {/* Nút Đóng */}
                  <TouchableOpacity style={styles.toolbarCircleBtn} onPress={onClose} activeOpacity={0.75}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Tiêu đề */}
                  <Text style={styles.toolbarTitle}>Quét Mã QR Tuyển Dụng</Text>

                  {/* Nhóm nút Flash & Đổi Camera */}
                  <View style={styles.toolbarRightGroup}>
                    {/* Nút Flash */}
                    <TouchableOpacity
                      style={[styles.toolbarCircleBtn, torch && styles.toolbarCircleBtnActive]}
                      onPress={() => setTorch((prev) => !prev)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={torch ? 'flash' : 'flash-off-outline'}
                        size={20}
                        color={torch ? '#E11D48' : '#FFFFFF'}
                      />
                    </TouchableOpacity>

                    {/* Nút Đổi Camera */}
                    <TouchableOpacity
                      style={styles.toolbarCircleBtn}
                      onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </SafeAreaView>
              {/* Spacer để đẩy khung ngắm xuống vị trí chuẩn */}
              <View style={{ flex: 1 }} />
            </View>

            {/* VÙNG MỜ 2: HÀNG GIỮA CHỨA KHUNG VUÔNG KÍNH NGẮM */}
            <View style={[styles.overlayCenterRow, { height: SCAN_BOX_SIZE }]} pointerEvents="box-none">
              <View style={styles.overlaySide} />

              {/* KHUNG VUÔNG KÍNH NGẮM CHÍNH */}
              <View style={[styles.scanBox, { width: SCAN_BOX_SIZE, height: SCAN_BOX_SIZE }]}>
                {/* Viền trắng mờ toàn bộ khung vuông */}
                <View style={styles.scanBoxOutline} />

                {/* 4 Góc Khung Vuông Nổi Bật (Màu hồng sen sang trọng) */}
                <View style={[styles.cornerBracket, styles.cornerTL]} />
                <View style={[styles.cornerBracket, styles.cornerTR]} />
                <View style={[styles.cornerBracket, styles.cornerBL]} />
                <View style={[styles.cornerBracket, styles.cornerBR]} />

                {/* Tia Quét Laser Màu Đỏ Hồng Di Chuyển */}
                <Animated.View
                  style={[
                    styles.laserLine,
                    {
                      transform: [{ translateY: laserAnim }],
                    },
                  ]}
                />
              </View>

              <View style={styles.overlaySide} />
            </View>

            {/* VÙNG MỜ 3: PHẦN DƯỚI KÍNH NGẮM */}
            <View style={styles.overlayBottom} pointerEvents="box-none">
              {/* Huy hiệu hướng dẫn */}
              <View style={styles.hintBadge}>
                <Ionicons name="scan-outline" size={16} color="#FB7185" />
                <Text style={styles.hintText}>Căn mã QR của Studio vào giữa khung vuông</Text>
              </View>

              {/* CÁC NÚT HÀNH ĐỘNG BÊN DƯỚI */}
              <View style={styles.bottomActionsRow}>
                {/* NÚT 1: CHỌN ẢNH TỪ THƯ VIỆN */}
                <TouchableOpacity
                  style={styles.primaryPickerBtn}
                  onPress={handlePickFromLibrary}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="images" size={18} color="#FFFFFF" />
                      <Text style={styles.primaryPickerBtnText}>Chọn Ảnh Từ Máy</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* NÚT 2: NHẬP MÃ MỜI */}
                {onOpenManualInput && (
                  <TouchableOpacity
                    style={styles.manualInputBtn}
                    onPress={() => {
                      onClose();
                      onOpenManualInput();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="keypad-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.manualInputBtnText}>Nhập Mã</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* NÚT PHỤ: MỞ QUÉT HỆ THỐNG / CHỤP ẢNH */}
              <TouchableOpacity
                style={styles.takePhotoFallbackLink}
                onPress={handleLaunchSystemScanner}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={15} color="#E2E8F0" />
                <Text style={styles.takePhotoFallbackText}>Hoặc mở máy quét hệ thống / Chụp ảnh</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// Component tương thích ngược nếu gọi dạng QrScannerModal
export const QrScannerModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
  onOpenManualInput?: () => void;
}> = ({ visible, onClose, onScanSuccess, onOpenManualInput }) => {
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill}>
      <QrScannerView
        onClose={onClose}
        onScanSuccess={onScanSuccess}
        onOpenManualInput={onOpenManualInput}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  nativeCamera: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  permissionCenterBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#0F172A',
  },
  permissionIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  permissionText: {
    marginTop: 14,
    fontSize: 14,
    color: '#94A3B8',
  },
  grantPermissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  grantPermissionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelPermissionBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelPermissionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },

  /* OVERLAY SIBLING CONTAINER */
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 20,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  topToolbarSafe: {
    width: '100%',
    paddingTop: Platform.OS === 'android' ? 12 : 0,
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  toolbarCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarCircleBtnActive: {
    backgroundColor: '#E11D48',
  },
  toolbarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  toolbarRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  /* PHẦN GIỮA: KÍNH NGẮM VUÔNG */
  overlayCenterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlaySide: {
    flex: 1,
    height: SCAN_BOX_SIZE,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },

  /* KHUNG VUÔNG KÍNH NGẮM (SCAN BOX) */
  scanBox: {
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  scanBoxOutline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
  },
  cornerBracket: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#FB7185',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },

  /* TIA QUÉT LASER CHUYỂN ĐỘNG */
  laserLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: '#FB7185',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
    borderRadius: 2,
  },

  /* PHẦN DƯỚI OVERLAY */
  overlayBottom: {
    flex: 1.25,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    marginBottom: 20,
    minHeight: 38,
  },
  hintText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  /* THANH NÚT BẤM BÊN DƯỚI */
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  primaryPickerBtn: {
    flex: 1.2,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryPickerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  manualInputBtn: {
    flex: 0.8,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  manualInputBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  takePhotoFallbackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  takePhotoFallbackText: {
    fontSize: 13,
    color: '#E2E8F0',
    textDecorationLine: 'underline',
  },

  /* LỖI NATIVE MOUNT */
  mountErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 15,
  },
  mountErrorText: {
    marginTop: 12,
    marginBottom: 20,
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
  },
  fallbackCaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  fallbackCaptureBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
