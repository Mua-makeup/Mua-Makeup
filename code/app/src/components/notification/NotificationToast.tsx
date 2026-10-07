import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '@/store/notification.store';
import { useAuthStore } from '@/store/auth.store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const NotificationToast: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeToast, dismissToast, markAsRead } = useNotificationStore();
  const { userInfo } = useAuthStore();

  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isNativeDriver = Platform.OS !== 'web';

    if (activeToast) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Trượt xuống từ đỉnh
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: insets.top + (Platform.OS === 'ios' ? 8 : 12),
          useNativeDriver: isNativeDriver,
          bounciness: 6,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: isNativeDriver,
        }),
      ]).start();

      // Tự động thu lại sau 4.5 giây
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, 4500);
    } else {
      handleDismiss();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [activeToast]);

  const handleDismiss = () => {
    const isNativeDriver = Platform.OS !== 'web';
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 250,
        useNativeDriver: isNativeDriver,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: isNativeDriver,
      }),
    ]).start(() => {
      dismissToast();
    });
  };

  const handlePress = () => {
    if (!activeToast) return;

    // Đánh dấu đã đọc
    if (activeToast.id) {
      markAsRead(activeToast.id);
    }

    const bookingId = activeToast.bookingId || activeToast.metadata?.bookingId;
    handleDismiss();

    if (bookingId) {
      const isMua = userInfo?.roles?.some(
        (r) => r === 'ROLE_FREELANCE_MUA' || r === 'ROLE_AGENCY_STAFF'
      );

      if (isMua) {
        // Thợ MUA chuyển sang màn hình thực hiện công việc
        router.push(`/job-execution/${bookingId}` as any);
      } else {
        // Khách hàng chuyển sang chi tiết đơn hàng hoặc theo dõi trực tiếp
        if (activeToast.type === 'BOOKING_ON_THE_WAY') {
          router.push(`/booking/tracking/${bookingId}` as any);
        } else {
          router.push(`/booking/detail/${bookingId}` as any);
        }
      }
    } else {
      router.push('/notifications');
    }
  };

  if (!activeToast) {
    return null;
  }

  // Phân loại Icon & Màu sắc nhận diện
  const getBadgeConfig = (type: string) => {
    switch (type) {
      case 'BOOKING_ACCEPTED':
        return {
          icon: 'sparkles-outline' as const,
          color: '#E0A75E',
        };
      case 'SCHEDULED_BOOKING_ACCEPTED':
        return {
          icon: 'calendar-outline' as const,
          color: '#A855F7',
        };
      case 'BOOKING_ON_THE_WAY':
        return {
          icon: 'car-outline' as const,
          color: '#38BDF8',
        };
      case 'BOOKING_ARRIVED':
        return {
          icon: 'location-outline' as const,
          color: '#34D399',
        };
      case 'BOOKING_IN_PROGRESS':
        return {
          icon: 'color-palette-outline' as const,
          color: '#F472B6',
        };
      case 'BOOKING_COMPLETED':
      case 'PAID_OUT':
        return {
          icon: 'checkmark-circle-outline' as const,
          color: '#10B981',
        };
      case 'BOOKING_CANCELLED':
      case 'CANCELLED_EXPIRED':
        return {
          icon: 'close-circle-outline' as const,
          color: '#EF4444',
        };
      case 'CERTIFICATE_APPROVED':
        return {
          icon: 'ribbon-outline' as const,
          color: '#10B981',
        };
      case 'CERTIFICATE_REJECTED':
        return {
          icon: 'alert-circle-outline' as const,
          color: '#EF4444',
        };
      case 'STAFF_APPLICATION_APPROVED':
        return {
          icon: 'ribbon-outline' as const,
          color: '#10B981',
        };
      case 'STAFF_APPLICATION_REJECTED':
        return {
          icon: 'close-circle-outline' as const,
          color: '#F97316',
        };
      default:
        return {
          icon: 'notifications-outline' as const,
          color: '#E11D48',
        };
    }
  };

  const badge = getBadgeConfig(activeToast.type);

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={handlePress}
      >
        <View style={styles.iconWrapper}>
          <Ionicons name={badge.icon} size={17} color={badge.color} />
        </View>

        <View style={styles.contentBox}>
          <View style={styles.topRow}>
            <Text style={styles.titleText} numberOfLines={1}>
              {activeToast.title}
            </Text>
            <Text style={styles.timeTag}>Vừa xong</Text>
          </View>
          <Text style={styles.bodyText} numberOfLines={2}>
            {activeToast.content}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    zIndex: 99999,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#1E1B24',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  iconWrapper: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBox: {
    flex: 1,
    marginRight: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 6,
  },
  timeTag: {
    fontSize: 10,
    fontWeight: '500',
    color: '#E0A75E',
  },
  bodyText: {
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 17,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
