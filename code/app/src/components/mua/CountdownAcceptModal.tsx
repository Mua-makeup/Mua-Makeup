import { DismissibleModal } from '@/components/common/DismissibleModal';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useWorkstationStore } from '@/store/workstation.store';
import { useAuthStore } from '@/store/auth.store';
import { soundManager } from '@/utils/sound';

export const CountdownAcceptModal: React.FC = () => {
  const { isAcceptModalVisible, activeOffer, dismissOffer, acceptActiveOffer, isScheduledModalVisible } = useWorkstationStore();
  const { userInfo } = useAuthStore();
  const [secondsLeft, setSecondsLeft] = useState<number>(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // GUARD: Chỉ cho phép hiển thị modal này với tài khoản Thợ MUA / Agency Staff
  // Tuyệt đối không để modal nhận ca hiện ra với tài khoản Khách Hàng
  const isMuaOrStaff =
    userInfo?.roles?.some((r) => r === 'ROLE_FREELANCE_MUA' || r === 'ROLE_AGENCY_STAFF') ||
    Boolean(userInfo?.muaId);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (!isAcceptModalVisible || !activeOffer) {
      setSecondsLeft(20);
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

    const serverTimestamp = activeOffer.timestamp ? Number(activeOffer.timestamp) : Date.now();
    const elapsedSec = Math.max(0, Math.floor((Date.now() - serverTimestamp) / 1000));
    const totalSec = activeOffer.countdownSeconds || 20;
    const initialSec = Math.max(1, totalSec - elapsedSec);
    const endTime = Date.now() + initialSec * 1000;
    setSecondsLeft(initialSec);
    console.log(`[CountdownModal] Bắt đầu đếm ngược đơn ${activeOffer.bookingCode || activeOffer.bookingId}: initialSec = ${initialSec}s (đã trôi qua ${elapsedSec}s từ lúc server phát đơn)`);

    // Pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
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
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        console.warn(`[CountdownModal] HẾT GIỜ (remaining <= 0)! Tự động ẩn modal cho đơn ${activeOffer.bookingId}`);
        dismissOffer(false);
      } else if (remaining % 2 === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      pulseLoop.stop();
      soundManager.stopJobAlertSound();
    };
  }, [isAcceptModalVisible, activeOffer]);

  if (!isAcceptModalVisible || !activeOffer || !isMuaOrStaff || isScheduledModalVisible || (activeOffer as any).bookingType === 'SCHEDULED' || String(activeOffer.bookingCode || '').startsWith('BK-SCHED')) {
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

  const candidateIdx = activeOffer.candidateIndex || 1;
  const totalCandidates = activeOffer.totalCandidates || 1;
  const stylesList = activeOffer.styleNames && activeOffer.styleNames.length > 0
    ? activeOffer.styleNames
    : [];
  const packageItems = activeOffer.packageItems && activeOffer.packageItems.length > 0
    ? activeOffer.packageItems
    : [];

  const emergencyFee = activeOffer.emergencySurchargeFee || 150000;
  const platformFee = activeOffer.platformFee || 0;

  return (
    <DismissibleModal visible={isAcceptModalVisible} onClose={() => { void dismissOffer(false); }} dismissDisabled={isSubmitting} overlayStyle={styles.overlay} contentStyle={styles.contentCard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* KHỐI 1: HEADER KHẨN CẤP & THỨ TỰ ƯU TIÊN WATERFALL */}
          <View style={styles.header}>
            <View style={styles.flashBadge}>
              <Ionicons name="timer-outline" size={14} color="#E11D48" />
              <Text style={styles.flashText}>CA KHẨN CẤP (30-45P CÓ MẶT)</Text>
            </View>
            <Text style={styles.codeText}>{activeOffer.bookingCode}</Text>
          </View>
          <View style={styles.queuePill}>
            <Ionicons name="ribbon-outline" size={12} color="#059669" />
            <Text style={styles.queueText}>
              Ưu tiên #{candidateIdx} của bạn • {candidateIdx}/{totalCandidates} thợ gần nhất quanh vị trí khách
            </Text>
          </View>

          {/* KHỐI 2: ĐĨA QUAY ĐẾM NGƯỢC SVG 20S */}
          <View style={styles.countdownContainer}>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
              <View style={[styles.countdownCircle, secondsLeft <= 5 && styles.countdownCircleDanger]}>
                <Text style={[styles.countdownNumber, secondsLeft <= 5 && styles.countdownNumberDanger]}>
                  {secondsLeft}
                </Text>
                <Text style={styles.countdownUnit}>giây</Text>
              </View>
            </Animated.View>

            <View style={styles.progressBarWrapper}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { width: progressWidth },
                  secondsLeft <= 5 && { backgroundColor: '#EF4444' },
                ]}
              />
            </View>
          </View>

          {/* KHỐI 3: THẺ MINH BẠCH TÀI CHÍNH & THU NHẬP THỰC NHẬN */}
          <View style={styles.earningsCard}>
            <Text style={styles.earningsLabel}>Thu Nhập Thực Nhận Về Ví:</Text>
            <Text style={styles.earningsValue}>{formatVnd(activeOffer.earningsAmount)}</Text>
            <View style={styles.breakdownDetails}>
              <Text style={styles.breakdownLine}>
                • Tổng bill khách: {formatVnd(activeOffer.totalAmount)}
              </Text>
              <Text style={styles.breakdownLine}>
                • Phụ phí gấp 30p: +{formatVnd(emergencyFee)} (Thợ nhận 100%)
              </Text>
              <Text style={styles.breakdownLine}>
                • Phí nền tảng (20%): -{formatVnd(platformFee)}
              </Text>
            </View>
            <View style={styles.escrowBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#059669" />
              <Text style={styles.escrowText}>
                Đã ký quỹ Escrow 30% • Đảm bảo thanh toán an toàn
              </Text>
            </View>
          </View>

          {/* KHỐI 4: THÔNG TIN GÓI DỊCH VỤ, STYLE & BƯỚC KÈM THEO */}
          <View style={styles.serviceSection}>
            <View style={styles.serviceHeaderRow}>
              <Text style={styles.serviceTitle} numberOfLines={1}>
                {activeOffer.serviceName || 'Gói Dịch Vụ Make-up'}
              </Text>
            </View>
            <Text style={styles.serviceSub}>
              Thời lượng dự kiến: ~{activeOffer.estimatedDurationMinutes || 60} phút
            </Text>

            {/* Badges phong cách yêu cầu */}
            <View style={styles.tagsRow}>
              {stylesList.map((st, idx) => (
                <View key={idx} style={styles.styleBadge}>
                  <Text style={styles.styleBadgeText}>{st}</Text>
                </View>
              ))}
            </View>

            {/* Checklist bước kèm theo */}
            <View style={styles.packageItemsList}>
              {packageItems.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Ionicons name="checkmark-circle" size={13} color="#059669" />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* KHỐI 5: ĐỊA ĐIỂM, CỰ LY & THỜI GIAN CẦN CÓ MẶT */}
          <View style={styles.locationSection}>
            <View style={styles.routingRow}>
              <Ionicons name="navigate-circle" size={16} color="#2563EB" />
              <Text style={styles.routingText}>
                Cách bạn {activeOffer.distanceKm ? activeOffer.distanceKm.toFixed(1) : '1.5'} km • ~
                {activeOffer.estimatedTravelMinutes || 10} phút đi xe máy
              </Text>
            </View>
            <View style={styles.deadlineRow}>
              <Ionicons name="time" size={14} color="#D97706" />
              <Text style={styles.deadlineText}>
                Hạn chót có mặt:{' '}
                <Text style={{ fontWeight: '800' }}>
                  {activeOffer.targetArrivalTime || 'Trước 10:15'}
                </Text>{' '}
                (Còn {activeOffer.minutesUntilDeadline || 38} phút)
              </Text>
            </View>
            <Text style={styles.addressText} numberOfLines={2}>
              {activeOffer.customerAddress}
            </Text>

            {/* Ghi chú riêng của khách hàng */}
            {activeOffer.customerNote && (
              <View style={styles.noteBox}>
                <Ionicons name="information-circle-outline" size={14} color="#B45309" />
                <Text style={styles.noteText} numberOfLines={2}>
                  Ghi chú: {activeOffer.customerNote}
                </Text>
              </View>
            )}
          </View>

          {/* KHỐI 6: THÔNG TIN KHÁCH HÀNG */}
          <View style={styles.customerRow}>
            <Ionicons name="person-circle" size={20} color="#64748B" />
            <Text style={styles.customerName}>{activeOffer.customerName}</Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {activeOffer.customerRating || '5.0'}</Text>
            </View>
          </View>

          {/* KHỐI 7: CỤM NÚT HÀNH ĐỘNG QUYẾT ĐỊNH */}
          <View style={styles.btnGroup}>
            <TouchableOpacity
              style={[styles.acceptBtn, isSubmitting && styles.acceptBtnDisabled]}
              onPress={handleAccept}
              disabled={isSubmitting}
              activeOpacity={0.88}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.acceptBtnText}>
                    CHẤP NHẬN NHẬN CA (+{formatVnd(activeOffer.earningsAmount)})
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.skipBtnText}>Bỏ Qua Ca Này (Nhường Thợ Kế Tiếp)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </DismissibleModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 999999,
    elevation: 999999,
  },
  contentCard: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  flashText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E11D48',
    letterSpacing: 0.3,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  queuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  queueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  countdownContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  pulseCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E11D48',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownCircleDanger: {
    backgroundColor: '#EF4444',
  },
  countdownNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  countdownNumberDanger: {
    color: '#FEF08A',
  },
  countdownUnit: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: -2,
  },
  progressBarWrapper: {
    width: '100%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E11D48',
  },
  earningsCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    marginBottom: 10,
  },
  earningsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#059669',
    marginVertical: 2,
  },
  breakdownDetails: {
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    paddingTop: 4,
    gap: 1,
  },
  breakdownLine: {
    fontSize: 10,
    color: '#374151',
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  escrowText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  serviceSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  serviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  serviceSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    marginLeft: 22,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
    marginLeft: 22,
  },
  styleBadge: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  styleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#BE123C',
  },
  packageItemsList: {
    marginTop: 6,
    marginLeft: 22,
    gap: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  itemText: {
    fontSize: 11,
    color: '#334155',
  },
  locationSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  routingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  routingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  deadlineText: {
    fontSize: 11,
    color: '#B45309',
  },
  addressText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 4,
    lineHeight: 16,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  noteText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  customerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  ratingBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  btnGroup: {
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptBtnDisabled: {
    opacity: 0.6,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  skipBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
});
