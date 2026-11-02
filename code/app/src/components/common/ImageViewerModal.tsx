import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  Modal,
  Platform,
  StatusBar,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface ImageViewerModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Modal xem ảnh phóng to độc lập, mượt mà chuẩn 60fps:
 * 1. animationType="none" triệt tiêu 100% lỗi xung đột "hiệu ứng đuổi theo" / duplicate slide
 * 2. Một nguồn animation duy nhất qua Animated.Value: trượt lên khi mở, trượt xuống khi đóng
 * 3. Kéo tay cầm hoặc vuốt xuống tự nhiên theo ngón tay để đóng
 * 4. Nút [X] to, nhạy, chuẩn Safe Area
 * 5. Nền đen tuyền bao phủ 100% màn hình, không bị lộ hay giật giao diện phía dưới
 */
export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  images,
  initialIndex = 0,
  onClose,
  title,
}) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  // Single Animation Value duy nhất điều khiển toàn bộ chuyển động mở/đóng
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setFailedImageUrl(null);
      isClosingRef.current = false;
      setCurrentIndex(initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0);
      translateY.setValue(SCREEN_HEIGHT);
      overlayOpacity.setValue(0);

      // Trượt mượt từ dưới lên đúng 1 hiệu ứng duy nhất
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, initialIndex, images?.length]);

  const handleDismiss = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    // Trượt xuống đáy màn hình đúng 1 hiệu ứng duy nhất rồi unmount
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      isClosingRef.current = false;
    });
  };

  const handleSpringBack = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        bounciness: 4,
        speed: 16,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // PanResponder cho thanh gạt và vùng kéo
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Chỉ bắt khi vuốt xuống
        return gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
      },
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        return gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
      },
      onPanResponderGrant: () => {
        translateY.stopAnimation();
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
          const ratio = Math.max(0.2, 1 - gesture.dy / (SCREEN_HEIGHT * 0.7));
          overlayOpacity.setValue(ratio);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 60 || gesture.vy > 0.4) {
          handleDismiss();
        } else {
          handleSpringBack();
        }
      },
      onPanResponderTerminate: () => {
        handleSpringBack();
      },
    })
  ).current;

  if (!visible || !images || images.length === 0) {
    return null;
  }

  const currentImageUrl = images[currentIndex] || images[0];
  const hasMultiple = images.length > 1;
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalRoot}>
        {/* Lớp nền đen mờ bao phủ toàn bộ, bấm vào phần trên cùng để đóng */}
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        {/* Khung nội dung ảnh trượt từ đáy lên duy nhất 1 lớp */}
        <Animated.View
          style={[
            styles.modalSheet,
            {
              paddingTop: topInset,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Thanh gạt tay cầm (Drag Handle) bắt cử chỉ kéo xuống */}
          <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.dragHandleBar} />
          </View>

          {/* Thanh Header: Nút đóng [X] và Bộ đếm trang */}
          <View style={styles.headerBar}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleDismiss}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Đóng xem ảnh"
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {hasMultiple ? (
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>
                  Ảnh {currentIndex + 1} / {images.length}
                </Text>
              </View>
            ) : title ? (
              <View style={styles.counterBadge}>
                <Text style={styles.counterText} numberOfLines={1}>
                  {title}
                </Text>
              </View>
            ) : (
              <View style={styles.headerSpacer} />
            )}

            <View style={styles.headerSpacer} />
          </View>

          {/* Vùng hiển thị ảnh phóng to chiếm trọn không gian */}
          <View style={styles.viewerArea}>
            <Image
              key={currentImageUrl}
              source={{ uri: currentImageUrl }}
              style={styles.fullImage}
              contentFit="contain"
              priority="high"
              onError={() => setFailedImageUrl(currentImageUrl)}
            />
            {failedImageUrl === currentImageUrl && (
              <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
                <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>
                  Không tải được ảnh đối chứng. Ảnh có thể chưa được tải lên hoặc đường dẫn không còn hợp lệ.
                </Text>
              </View>
            )}

            {/* Nút lùi ảnh < */}
            {hasMultiple && currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navBtn, styles.navPrev]}
                onPress={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Nút tiến ảnh > */}
            {hasMultiple && currentIndex < images.length - 1 && (
              <TouchableOpacity
                style={[styles.navBtn, styles.navNext]}
                onPress={() => setCurrentIndex((idx) => Math.min(images.length - 1, idx + 1))}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-forward" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Dòng chữ gợi ý thao tác */}
          <View style={[styles.bottomHintBar, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
            <Text style={styles.bottomHintText}>Kéo tay cầm xuống hoặc chạm nút [X] để đóng</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modalSheet: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  dragHandleArea: {
    width: '100%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  dragHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 20,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  counterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    maxWidth: SCREEN_WIDTH * 0.6,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 38,
  },
  viewerArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 8,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  navBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  navPrev: {
    left: 12,
  },
  navNext: {
    right: 12,
  },
  bottomHintBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  bottomHintText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontWeight: '500',
  },
});
