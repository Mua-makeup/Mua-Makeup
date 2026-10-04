import { DismissibleSurface } from '@/components/common/DismissibleModal';
import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePopupStore, PopupButton, PopupType } from '@/store/popup.store';

interface GlobalPopupCoreProps {
  isModal: boolean;
}

const GlobalPopupCore: React.FC<GlobalPopupCoreProps> = ({ isModal }) => {
  const { isOpen, options, hide } = usePopupStore();

  const [secondsLeft, setSecondsLeft] = useState<number>(5);
  const timerRef = useRef<any>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const duration = options?.autoCloseSeconds !== undefined ? options.autoCloseSeconds : 5;

  useEffect(() => {
    if (!isOpen || !options) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      return;
    }

    // Rung phản hồi nhẹ khi mở popup
    try {
      if (options.type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (options.type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (options.type === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}

    // Hiệu ứng mở popup sang trọng
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    // Khởi tạo đếm ngược tự động đóng sau 5s
    setSecondsLeft(duration);
    progressAnim.setValue(1);

    if (duration > 0) {
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: duration * 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      const startMs = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startMs) / 1000);
        const rem = Math.max(0, duration - elapsed);
        setSecondsLeft(rem);

        if (rem <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleAutoClose();
        }
      }, 500);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, options]);

  if (!isOpen || !options) {
    return null;
  }

  const { title, message, type = 'info', buttons = [], cancelable = true } = options;

  const handleAutoClose = () => {
    hide();
    setTimeout(() => {
      if (options?.onAutoClose) {
        options.onAutoClose();
        return;
      }
      const btns = options?.buttons || [];
      if (btns.length > 0) {
        const cancelBtn = btns.find((b) => b.style === 'cancel');
        if (options?.type === 'confirm' && cancelBtn) {
          cancelBtn.onPress?.();
          return;
        }
        // Kích hoạt phím hành động chính (hoặc phím đầu tiên)
        const primaryBtn = btns.find((b) => b.style !== 'cancel') || btns[0];
        primaryBtn.onPress?.();
      }
    }, 60);
  };

  const handleBackdropPress = () => {
    if (cancelable) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      hide();
    }
  };

  const handleButtonPress = (btn: PopupButton) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      Haptics.selectionAsync();
    } catch {}
    hide();
    if (btn.onPress) {
      setTimeout(() => {
        btn.onPress?.();
      }, 60);
    }
  };

  const getIconConfig = (popupType: PopupType) => {
    switch (popupType) {
      case 'success':
        return {
          name: 'checkmark-circle' as const,
          color: '#10B981',
          bgColor: '#ECFDF5',
          borderColor: '#A7F3D0',
          badgeColor: '#ECFDF5',
        };
      case 'error':
        return {
          name: 'alert-circle' as const,
          color: '#EF4444',
          bgColor: '#FEF2F2',
          borderColor: '#FECACA',
          badgeColor: '#FEF2F2',
        };
      case 'warning':
        return {
          name: 'warning' as const,
          color: '#F59E0B',
          bgColor: '#FFFBEB',
          borderColor: '#FDE68A',
          badgeColor: '#FFFBEB',
        };
      case 'confirm':
        return {
          name: 'help-circle' as const,
          color: '#E11D48',
          bgColor: '#FDF2F4',
          borderColor: '#FECDD3',
          badgeColor: '#FDF2F4',
        };
      case 'info':
      default:
        return {
          name: 'information-circle' as const,
          color: '#3B82F6',
          bgColor: '#EFF6FF',
          borderColor: '#BFDBFE',
          badgeColor: '#EFF6FF',
        };
    }
  };

  const iconConfig = getIconConfig(type);

  const content = (
    <DismissibleSurface visible={isOpen} onClose={handleBackdropPress} dismissDisabled={!cancelable}
      onDismissStart={() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
      }}
      overlayStyle={styles.overlay} contentStyle={styles.cardContainer}>
        {/* Thanh Tiến Trình Tự Động Đóng (Progress Bar) */}
        {duration > 0 && (
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: iconConfig.color,
                },
              ]}
            />
          </View>
        )}

        {/* Icon Badge */}
        <View
          style={[
            styles.iconBadge,
            { backgroundColor: iconConfig.bgColor, borderColor: iconConfig.borderColor },
          ]}
        >
          <Ionicons name={iconConfig.name} size={34} color={iconConfig.color} />
        </View>

        {/* Title */}
        {Boolean(title) && <Text style={styles.title}>{title}</Text>}

        {/* Message */}
        {Boolean(message) && <Text style={styles.message}>{message}</Text>}

        {/* Huy hiệu đếm ngược 5 giây */}
        {duration > 0 && (
          <View style={[styles.timerBadge, { backgroundColor: iconConfig.badgeColor }]}>
            <Ionicons name="timer-outline" size={13} color={iconConfig.color} />
            <Text style={styles.timerBadgeText}>
              Tự động đóng sau <Text style={[styles.timerSecText, { color: iconConfig.color }]}>{secondsLeft}s</Text>
            </Text>
          </View>
        )}

        {/* Danh sách nút bấm hành động */}
        {(() => {
          const hasLongText = buttons.some((b) => (b.text || '').length > 12);
          const isColumn = buttons.length > 2 || hasLongText;
          const displayButtons =
            isColumn && buttons.length === 2 && buttons[0].style === 'cancel'
              ? [buttons[1], buttons[0]]
              : buttons;

          return (
            <View
              style={[
                styles.buttonsContainer,
                isColumn ? styles.buttonsColumn : styles.buttonsRow,
              ]}
            >
              {displayButtons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                // Nếu có 2 nút và nút này là nút thứ 2 (không phải cancel), xếp thành style secondary nhẹ nhàng
                const isSecondary = !isCancel && !isDestructive && displayButtons.length >= 2 && index === 1;

                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.85}
                    style={[
                      styles.button,
                      isColumn ? styles.buttonFull : styles.buttonHalf,
                      isCancel
                        ? styles.cancelButton
                        : isDestructive
                        ? styles.destructiveButton
                        : isSecondary
                        ? styles.secondaryButton
                        : styles.primaryButton,
                    ]}
                    onPress={() => handleButtonPress(btn)}
                  >
                    <Text
                      style={[
                        styles.buttonTextBase,
                        isCancel
                          ? styles.cancelButtonText
                          : isSecondary
                          ? styles.secondaryButtonText
                          : styles.primaryButtonText,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })()}
      </DismissibleSurface>
  );

  if (isModal) {
    return (
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {
          handleBackdropPress();
        }}
      >
        {content}
      </Modal>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 999999 }]} pointerEvents={isOpen ? 'auto' : 'none'}>
      {content}
    </View>
  );
};

export const GlobalPopupOverlay: React.FC = () => {
  const { registerOverlay, unregisterOverlay } = usePopupStore();

  useEffect(() => {
    registerOverlay();
    return () => {
      unregisterOverlay();
    };
  }, []);

  return <GlobalPopupCore isModal={false} />;
};

export const GlobalPopupModal: React.FC = () => {
  const { embeddedOverlayCount } = usePopupStore();

  if (embeddedOverlayCount > 0) {
    return null;
  }

  return <GlobalPopupCore isModal={true} />;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999999,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#F1F5F9',
  },
  progressBar: {
    height: '100%',
  },
  iconBadge: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 18,
  },
  timerBadgeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  timerSecText: {
    fontWeight: '800',
  },
  buttonsContainer: {
    width: '100%',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonsColumn: {
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    minHeight: 46,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonFull: {
    width: '100%',
  },
  buttonHalf: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#E11D48',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  destructiveButton: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  buttonTextBase: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#1E293B',
  },
  cancelButtonText: {
    color: '#475569',
  },
});
