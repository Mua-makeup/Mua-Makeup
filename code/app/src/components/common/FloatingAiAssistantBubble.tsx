import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  PanResponder,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';

const BUBBLE_SIZE = 58;

export function FloatingAiAssistantBubble() {
  const router = useRouter();
  const pathname = usePathname();
  const [showTooltip, setShowTooltip] = useState(true);

  // Vị trí biến thiên thông qua transform [translateX, translateY]
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const isDragging = useRef(false);

  const handlePress = () => {
    router.push('/support-chat' as any);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3;
      },
      onPanResponderGrant: () => {
        isDragging.current = false;
        setShowTooltip(false);
        pan.extractOffset();
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4) {
          isDragging.current = true;
        }
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        // Nếu không di chuyển hoặc di chuyển rất ít (< 6px) thì đó là thao tác chạm mở chat
        if (!isDragging.current || (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6)) {
          handlePress();
        }
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  // Không hiển thị bong bóng chat khi đang ở chính màn hình chat hoặc màn hình đăng nhập/đăng ký
  if (
    !pathname ||
    pathname.includes('support-chat') ||
    pathname.includes('(auth)') ||
    pathname.includes('login') ||
    pathname.includes('register')
  ) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          transform: pan.getTranslateTransform(),
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Tooltip Gợi Ý Nổi Bật (Có Thể Tắt) */}
      {showTooltip && (
        <View style={styles.tooltipBox}>
          <TouchableOpacity
            style={styles.tooltipContent}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={13} color={BrandColors.primary} />
            <Text style={styles.tooltipText}>Hỏi đáp Mua-Makeup 24/7</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeTooltipBtn}
            onPress={() => setShowTooltip(false)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={12} color={BrandColors.slateMuted} />
          </TouchableOpacity>
          <View style={styles.tooltipArrow} />
        </View>
      )}

      {/* Bong Bóng Chat Tròn Luxury (Kéo thả di chuyển mượt mà khắp màn hình) */}
      <View
        style={styles.bubbleButton}
        {...panResponder.panHandlers}
      >
        <View style={styles.innerCircle}>
          <Ionicons name="chatbubble-ellipses" size={26} color="#FFFFFF" />
        </View>

        {/* Badge "AI" nhỏ ở góc bong bóng */}
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 85,
    right: 18,
    zIndex: 9999,
    elevation: 10,
    alignItems: 'flex-end',
  },
  tooltipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BrandColors.softBorder,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    minWidth: 180,
  },
  tooltipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 6,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  closeTooltipBtn: {
    padding: 2,
    marginLeft: 'auto',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    right: 22,
    width: 10,
    height: 10,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BrandColors.softBorder,
    transform: [{ rotate: '45deg' }],
  },
  bubbleButton: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  innerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  aiBadgeText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
