import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface SwipeableBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  showHandleBar?: boolean;
  headerRight?: React.ReactNode;
}

export const SwipeableBottomSheet: React.FC<SwipeableBottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  showCloseButton = true,
  showHandleBar = true,
  headerRight,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const isDismissing = useRef(false);

  useEffect(() => {
    if (visible) {
      isDismissing.current = false;
      translateY.setValue(350);
      Animated.spring(translateY, {
        toValue: 0,
        bounciness: 4,
        speed: 14,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    if (isDismissing.current) return;
    isDismissing.current = true;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {
      // Ignore haptics error on web or unsupported devices
    }

    Animated.timing(translateY, {
      toValue: 700,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Chỉ kích hoạt khi kéo trượt xuống (dy > 6) và chuyển động dọc chiếm ưu thế
        return gestureState.dy > 6 && Math.abs(gestureState.dx) < gestureState.dy;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0 && !isDismissing.current) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isDismissing.current) return;

        if (gestureState.dy > 70 || gestureState.vy > 0.5) {
          handleDismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View style={styles.overlay}>
          {/* Backdrop tối mờ: Bấm ra ngoài để đóng tức thì */}
          <Pressable
            style={styles.backdrop}
            onPress={handleDismiss}
            accessibilityLabel="Đóng modal"
          />

          {/* Nội dung Sheet: Cho phép kéo trượt xuống để đóng mượt mà */}
          <Animated.View
            style={[
              styles.sheetCard,
              {
                transform: [{ translateY }],
              },
            ]}
          >
            {/* Vùng kéo (Drag Handle) */}
            <View {...panResponder.panHandlers} style={styles.dragArea}>
              {showHandleBar && <View style={styles.handleBar} />}

              {(Boolean(title) || showCloseButton || Boolean(headerRight)) && (
                <View style={styles.headerRow}>
                  <View style={styles.titleColumn}>
                    {Boolean(title) && <Text style={styles.sheetTitle}>{title}</Text>}
                    {Boolean(subtitle) && <Text style={styles.sheetSubtitle}>{subtitle}</Text>}
                  </View>

                  <View style={styles.headerActions}>
                    {headerRight}
                    {showCloseButton && (
                      <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={handleDismiss}
                        activeOpacity={0.7}
                        accessibilityLabel="Đóng"
                      >
                        <Ionicons name="close" size={20} color="#64748B" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Nội dung con */}
            <View style={styles.body}>{children}</View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#F1F5F9',
  },
  dragArea: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 6,
    width: '100%',
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleColumn: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 24,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 17,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
});
