import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useWorkstationStore } from '@/store/workstation.store';
import { soundManager } from '@/utils/sound';

export const CountdownAcceptModal: React.FC = () => {
  const { isAcceptModalVisible, activeOffer, dismissOffer, acceptActiveOffer } = useWorkstationStore();
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (!isAcceptModalVisible || !activeOffer) {
      setSecondsLeft(30);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

    const initialSec = activeOffer.countdownSeconds || 30;
    setSecondsLeft(initialSec);

    // Pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Progress bar animation
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: initialSec * 1000,
      useNativeDriver: false,
    }).start();

    // Countdown interval & haptic
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          dismissOffer(true);
          return 0;
        }
        // Haptic feedback every 2 seconds
        if (prev % 2 === 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      pulseLoop.stop();
      soundManager.stopJobAlertSound();
    };
  }, [isAcceptModalVisible, activeOffer]);

  if (!isAcceptModalVisible || !activeOffer) {
    return null;
  }

  const handleAccept = async () => {
    try {
      setIsSubmitting(true);
      const bookingId = await acceptActiveOffer();
      if (bookingId) {
        router.push({
          pathname: '/job-execution/[id]',
          params: { id: bookingId },
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Ca làm này đã được thợ khác nhận trước!';
      Alert.alert('Nhận Ca Không Thành Công', msg, [{ text: 'Đóng', onPress: () => dismissOffer(false) }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    await dismissOffer(true);
  };

  const formatVnd = (amount: number) => {
    return (amount || 0).toLocaleString('vi-VN') + ' đ';
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents="auto">
      <Animated.View style={[styles.contentCard, { transform: [{ scale: scaleAnim }] }]}>
          {/* Header Title */}
          <View style={styles.header}>
            <View style={styles.flashBadge}>
              <Ionicons name="flash" size={14} color="#E11D48" />
              <Text style={styles.flashText}>ĐƠN KHẨN CẤP ĐẾN GẦN BẠN</Text>
            </View>
            <Text style={styles.codeText}>{activeOffer.bookingCode}</Text>
          </View>

          {/* Countdown Clock Display */}
          <View style={styles.countdownContainer}>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.countdownCircle}>
                <Text style={styles.countdownNumber}>{secondsLeft}</Text>
                <Text style={styles.countdownUnit}>giây</Text>
              </View>
            </Animated.View>

            <View style={styles.progressBarWrapper}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>
          </View>

          {/* Net Earnings Highlight Card */}
          <View style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>Thu Nhập Thực Nhận (Đã trừ phí):</Text>
            <Text style={styles.earningsValue}>{formatVnd(activeOffer.earningsAmount)}</Text>
            <Text style={styles.totalAmountSubtext}>
              Tổng hóa đơn: {formatVnd(activeOffer.totalAmount)}
            </Text>
          </View>

          {/* Booking Details */}
          <View style={styles.detailsBlock}>
            <View style={styles.detailRow}>
              <Ionicons name="sparkles" size={16} color="#E11D48" />
              <Text style={styles.detailTitle} numberOfLines={1}>
                {activeOffer.serviceName || 'Trang điểm cấp tốc 30-60 phút'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color="#2563EB" />
              <Text style={styles.detailText} numberOfLines={2}>
                {activeOffer.customerAddress}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="navigate-outline" size={14} color="#059669" />
                <Text style={styles.metaText}>
                  {activeOffer.distanceKm ? `Cách bạn ${activeOffer.distanceKm.toFixed(1)} km` : 'Trong bán kính 5km'}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={14} color="#475569" />
                <Text style={styles.metaText}>{activeOffer.customerName}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnGroup}>
            <TouchableOpacity
              style={[styles.acceptBtn, isSubmitting && styles.acceptBtnDisabled]}
              onPress={handleAccept}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.acceptBtnText}>CHẤP NHẬN NHẬN CA</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              disabled={isSubmitting}
            >
              <Text style={styles.skipBtnText}>Bỏ Qua Ca Này</Text>
            </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999999,
    elevation: 999999,
  },
  contentCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 4,
  },
  flashText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E11D48',
    letterSpacing: 0.5,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  countdownContainer: {
    alignItems: 'center',
    marginVertical: 12,
    width: '100%',
  },
  pulseCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  countdownNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 36,
  },
  countdownUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FECDD3',
  },
  progressBarWrapper: {
    width: '80%',
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E11D48',
    borderRadius: 3,
  },
  earningsCard: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  earningsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#15803D',
    marginVertical: 2,
  },
  totalAmountSubtext: {
    fontSize: 11,
    color: '#64748B',
  },
  detailsBlock: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  detailText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  btnGroup: {
    width: '100%',
    gap: 8,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E11D48',
    height: 52,
    borderRadius: 14,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnDisabled: {
    opacity: 0.7,
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
