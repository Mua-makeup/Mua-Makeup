import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUndoStore } from '@/store/undo.store';
import { BrandColors } from '@/constants/theme';

interface UndoToastProps {
  bottomOffset?: number;
}

export const UndoToast: React.FC<UndoToastProps> = ({ bottomOffset }) => {
  const insets = useSafeAreaInsets();
  const {
    activeUndo,
    restoredMessage,
    triggerUndo,
    dismissUndo,
    clearRestoredMessage,
  } = useUndoStore();

  const translateY = useRef(new Animated.Value(100)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Hiệu ứng trượt vào / ra cho Active Undo
  useEffect(() => {
    if (activeUndo) {
      // Bắt đầu trượt lên
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
        speed: 14,
      }).start();

      // Progress bar đếm ngược
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: activeUndo.durationMs || 6000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 120,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [activeUndo]);

  const effectiveBottom =
    bottomOffset !== undefined
      ? bottomOffset
      : Math.max(insets.bottom, 16) + 16;

  // Trạng thái thông báo khôi phục thành công
  if (restoredMessage) {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.container, { bottom: effectiveBottom }]}
      >
        <View style={styles.restoredCard}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.restoredText}>{restoredMessage}</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={clearRestoredMessage}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!activeUndo) {
    return null;
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { bottom: effectiveBottom }]}
    >
      <Animated.View
        style={[
          styles.toastCard,
          { transform: [{ translateY }] },
        ]}
      >
        {/* Thanh đếm ngược tiến trình ở mép dưới */}
        <Animated.View
          style={[styles.progressBar, { width: progressWidth }]}
        />

        <View style={styles.contentRow}>
          <View style={styles.iconBox}>
            <Ionicons name="trash-outline" size={18} color="#F43F5E" />
          </View>

          <View style={styles.textBox}>
            <Text style={styles.titleText} numberOfLines={1}>
              {activeUndo.message}
            </Text>
            {Boolean(activeUndo.description) && (
              <Text style={styles.descText} numberOfLines={1}>
                {activeUndo.description}
              </Text>
            )}
          </View>

          {/* NÚT HOÀN TÁC */}
          <TouchableOpacity
            style={styles.undoBtn}
            onPress={triggerUndo}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-undo" size={15} color="#FFFFFF" />
            <Text style={styles.undoBtnText}>Hoàn tác</Text>
          </TouchableOpacity>

          {/* NÚT ĐÓNG */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={dismissUndo}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
  },
  toastCard: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: BrandColors.primary,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: {
    flex: 1,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  descText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  undoBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 2,
  },
  restoredCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  restoredText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
});
