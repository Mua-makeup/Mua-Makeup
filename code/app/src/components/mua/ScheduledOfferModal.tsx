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
  useWindowDimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useWorkstationStore } from '@/store/workstation.store';
import { useAuthStore } from '@/store/auth.store';
import { BrandColors } from '@/constants/theme';
import { formatDateVN } from '@/utils/date';
import { ScheduledOfferItem } from '@/services/freelancer-booking.service';

export const ScheduledOfferModal: React.FC = () => {
  const {
    isScheduledModalVisible,
    activeScheduledOffer,
    isScheduledModalUrgent,
    dismissScheduledOffer,
    confirmActiveScheduledOffer,
    rejectActiveScheduledOffer,
  } = useWorkstationStore();
  const { userInfo } = useAuthStore();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isSmallScreen = windowHeight < 720;
  const modalWidth = Math.min(windowWidth - 28, 430);
  const modalMaxHeight = Math.min(windowHeight * 0.92, 740);

  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // GUARD: Chỉ hiển thị modal với tài khoản MUA / Agency Staff
  const isMuaOrStaff =
    userInfo?.roles?.some((r) => r === 'ROLE_FREELANCE_MUA' || r === 'ROLE_AGENCY_STAFF') ||
    Boolean(userInfo?.muaId);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  // Tính toán thời gian thực theo epoch ms tuyệt đối (Không bao giờ lệch khi thoát app)
  const getRemainingSeconds = (offer: ScheduledOfferItem | null): number => {
    if (!offer) return 0;
    if (offer.confirmDeadline) {
      const deadlineMs = new Date(offer.confirmDeadline).getTime();
      if (!isNaN(deadlineMs)) {
        return Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
      }
    }
    return offer.confirmTimeoutSeconds || 0;
  };

  // Tính toán thời gian đếm ngược và lắng nghe AppState khi resume app
  useEffect(() => {
    if (!isScheduledModalVisible || !activeScheduledOffer) {
      setSecondsLeft(0);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.92);
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    const syncTime = () => {
      const rem = getRemainingSeconds(activeScheduledOffer);
      setSecondsLeft(rem);
      if (rem <= 0) {
        dismissScheduledOffer();
      }
    };

    // Đồng bộ lập tức
    syncTime();

    // Cập nhật mỗi giây dựa trên Date.now() thực tế
    const timer = setInterval(syncTime, 1000);

    // Lắng nghe khi App chuyển từ Background -> Active Foreground (thoát app rồi vào lại)
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        syncTime();
      }
    });

    return () => {
      clearInterval(timer);
      appStateSub.remove();
    };
  }, [isScheduledModalVisible, activeScheduledOffer]);

  if (!isMuaOrStaff || !isScheduledModalVisible || !activeScheduledOffer) {
    return null;
  }

  const formatVnd = (amount?: number) => {
    if (!amount) return '0 ₫';
    return amount.toLocaleString('vi-VN') + ' ₫';
  };

  const formatTimer = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 1. Tiếp nhận ca hẹn
  const handleConfirm = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const confirmedBookingId = await confirmActiveScheduledOffer();
      if (confirmedBookingId) {
        Alert.alert(
          'Tiếp Nhận Thành Công',
          `Bạn đã nhận đơn hẹn #${activeScheduledOffer.bookingCode || confirmedBookingId}. Hãy chuẩn bị đồ nghề chu đáo!`,
          [
            {
              text: 'Xem Chi Tiết Ca',
              onPress: () => router.push(`/job-execution/${confirmedBookingId}` as any),
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert(
        'Lỗi Tiếp Nhận',
        err?.response?.data?.message || err?.message || 'Không thể tiếp nhận đơn hẹn này.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Từ chối ca hẹn
  const handleReject = () => {
    if (isSubmitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Từ Chối Đơn Hẹn',
      'Bạn có chắc chắn muốn từ chối ca hẹn trang điểm này? Khoản tiền cọc bảo chứng sẽ được hoàn lại cho khách hàng.',
      [
        { text: 'Suy Nghĩ Lại', style: 'cancel' },
        {
          text: 'Từ Chối',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await rejectActiveScheduledOffer('Thợ bận lịch đột xuất không thể nhận');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể từ chối ca.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // 3. Để sau (Tạm đóng modal, đơn vẫn lưu trên banner trang chủ để thợ duyệt sau)
  const handleLater = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dismissScheduledOffer();
  };

  // 4. Xem chi tiết (Chuyển sang màn hình ca làm việc để xem tường tận)
  const handleViewDetail = () => {
    Haptics.selectionAsync();
    const bId = activeScheduledOffer.bookingId;
    dismissScheduledOffer();
    router.push(`/job-execution/${bId}` as any);
  };

  const totalSec =
    activeScheduledOffer?.createdAt && activeScheduledOffer?.confirmDeadline
      ? Math.max(60, Math.floor((new Date(activeScheduledOffer.confirmDeadline).getTime() - Number(activeScheduledOffer.createdAt)) / 1000))
      : 900;
  const isUrgent = isScheduledModalUrgent || (secondsLeft > 0 && secondsLeft / totalSec <= 0.3);

  return (
    <DismissibleModal visible={isScheduledModalVisible} onClose={handleLater} dismissDisabled={isSubmitting} overlayStyle={styles.overlay} contentStyle={[styles.modalContainer, { width: modalWidth, maxHeight: modalMaxHeight }]}>
        {/* Header Thông Báo Sang Trọng */}
        <View style={[styles.header, isSmallScreen && styles.headerSmall]}>
          <View style={styles.headerTopRow}>
            <View style={styles.badgeRow}>
              <View style={styles.newBadge}>
                <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                <Text style={styles.newBadgeText}>LỊCH HẸN TRANG ĐIỂM MỚI</Text>
              </View>
              <View style={styles.escrowBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#059669" />
                <Text style={styles.escrowBadgeText}>ĐÃ CỌC ESCROW 30%</Text>
              </View>
              {isUrgent ? (
                <View style={styles.urgentBadge}>
                  <Ionicons name="warning" size={11} color="#FFFFFF" />
                  <Text style={styles.urgentBadgeText}>CÒN DƯỚI 30% THỜI GIAN</Text>
                </View>
              ) : null}
            </View>

            {/* Nút X Đóng Nhanh (Để Sau) */}








          </View>

          <Text style={[styles.headerTitle, isSmallScreen && { fontSize: 17 }]}>
            Yêu Cầu Đặt Lịch Hẹn Trước
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Khách hàng đã thanh toán cọc bảo chứng an toàn vào Quỹ Escrow.
          </Text>

          {/* Hộp Đếm Ngược Phản Hồi */}
          <View style={[styles.timerBox, isUrgent && styles.timerBoxUrgent, isSmallScreen && { paddingVertical: 7 }]}>
            <View style={styles.timerLeft}>
              <Ionicons
                name="hourglass-outline"
                size={15}
                color={isUrgent ? '#EF4444' : '#F59E0B'}
              />
              <Text style={[styles.timerLabel, isUrgent && { color: '#FCA5A5' }]}>
                {isUrgent ? 'Sắp hết hạn nhận ca (dưới 30%):' : 'Thời gian phản hồi còn lại:'}
              </Text>
            </View>
            <Text style={[styles.timerValue, isUrgent && styles.timerValueUrgent]}>
              {formatTimer(secondsLeft)}
            </Text>
          </View>
        </View>

        {/* Thân cuộn mượt mà thích ứng đa kích thước màn hình */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.bodyContent, isSmallScreen && { paddingVertical: 10 }]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          bounces={false}
        >
          {/* Thông Tin Khách Hàng */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Thông Tin Khách Hàng</Text>
            <View style={styles.customerRow}>
              <UserAvatar
                uri={activeScheduledOffer.customerAvatar}
                name={activeScheduledOffer.customerName}
                size={48}
              />
              <View style={styles.customerInfoCol}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {activeScheduledOffer.customerName || 'Khách hàng VIP'}
                </Text>
                {activeScheduledOffer.customerPhone ? (
                  <Text style={styles.customerPhone}>
                    SĐT: {activeScheduledOffer.customerPhone}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Chi Tiết Lịch Hẹn & Dịch Vụ */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Chi Tiết Lịch Hẹn</Text>

            <View style={styles.infoRow}>
              <Ionicons name="sparkles" size={15} color={BrandColors.primary} />
              <Text style={styles.infoLabel}>Gói dịch vụ:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {activeScheduledOffer.packageName || 'Make-up chuyên nghiệp'}
              </Text>
            </View>

            {activeScheduledOffer.styleName ? (
              <View style={styles.infoRow}>
                <Ionicons name="color-wand-outline" size={15} color="#7C3AED" />
                <Text style={styles.infoLabel}>Phong cách:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {activeScheduledOffer.styleName}
                </Text>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={15} color={BrandColors.primary} />
              <Text style={styles.infoLabel}>Giờ hẹn:</Text>
              <Text style={[styles.infoValue, { fontWeight: '700', color: BrandColors.primary }]}>
                {activeScheduledOffer.startTime || '--:--'} - {formatDateVN(activeScheduledOffer.bookingDate)}
              </Text>
            </View>

            <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
              <Ionicons name="location-outline" size={15} color={BrandColors.primary} style={{ marginTop: 2 }} />
              <Text style={styles.infoLabel}>Địa chỉ:</Text>
              <Text style={[styles.infoValue, { flex: 1, color: '#334155' }]} numberOfLines={2}>
                {activeScheduledOffer.destinationAddress || 'Tại địa chỉ khách hàng'}
              </Text>
            </View>
          </View>

          {/* Thẻ Thu Nhập Dự Kiến */}
          <View style={styles.earningsCard}>
            <View style={styles.earningsHeaderRow}>
              <Text style={styles.earningsLabel}>Thu nhập thợ thực nhận:</Text>
              <Text style={styles.earningsAmount}>
                {formatVnd(activeScheduledOffer.earningsAmount || Math.round(activeScheduledOffer.totalAmount * 0.85))}
              </Text>
            </View>
            <View style={styles.dividerThin} />
            <View style={styles.escrowRow}>
              <Text style={styles.escrowTextLeft}>Tiền cọc khách đã đóng Escrow (30%):</Text>
              <Text style={styles.escrowTextRight}>
                {formatVnd(activeScheduledOffer.depositAmount || Math.round(activeScheduledOffer.totalAmount * 0.3))}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Cụm Nút Hành Động Chuẩn Luxury Beauty */}
        <View style={[styles.footer, isSmallScreen && styles.footerSmall]}>
          {/* 1. Nút Hero Chính: Tiếp Nhận Ca Hẹn */}
          <TouchableOpacity
            style={styles.confirmHeroBtn}
            onPress={handleConfirm}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.confirmHeroContent}>
                <View style={styles.confirmIconCircle}>
                  <Ionicons name="checkmark-sharp" size={15} color="#E11D48" />
                </View>
                <Text style={styles.confirmHeroText}>Tiếp Nhận Ca Hẹn</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 2. Hàng 2 Nút Phụ Cân Đối: Để Sau & Từ Chối */}
          <View style={styles.secondaryActionRow}>
            <TouchableOpacity
              style={styles.laterBtn}
              onPress={handleLater}
              disabled={isSubmitting}
              activeOpacity={0.75}
            >
              <Ionicons name="time-outline" size={16} color="#475569" />
              <Text style={styles.laterBtnText}>Để Sau</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={handleReject}
              disabled={isSubmitting}
              activeOpacity={0.75}
            >
              <Ionicons name="close-circle-outline" size={16} color="#E11D48" />
              <Text style={styles.rejectBtnText}>Từ Chối</Text>
            </TouchableOpacity>
          </View>

          {/* 3. Link Xem Chi Tiết Ca Hẹn Tinh Tế */}
          <TouchableOpacity
            style={styles.viewDetailLink}
            onPress={handleViewDetail}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={14} color="#BE123C" />
            <Text style={styles.viewDetailLinkText}>Xem chi tiết lịch hẹn & dịch vụ</Text>
            <Ionicons name="chevron-forward" size={13} color="#BE123C" />
          </TouchableOpacity>
        </View>
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
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#FFE4E6',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 24,
    flexDirection: 'column',
  },
  header: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerSmall: {
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E11D48',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  escrowBadgeText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  urgentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 15,
    marginBottom: 10,
  },
  timerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timerBoxUrgent: {
    backgroundColor: '#2A0E12',
    borderColor: '#E11D48',
  },
  timerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  timerValue: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timerValueUrgent: {
    color: '#FB7185',
  },
  body: {
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 14,
  },
  bodyContent: {
    paddingVertical: 12,
    gap: 10,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FFE4E6',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E11D48',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  customerInfoCol: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  customerPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12.5,
    color: '#64748B',
    width: 80,
  },
  infoValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
  },
  earningsCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  earningsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#166534',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
  },
  dividerThin: {
    height: 1,
    backgroundColor: '#BBF7D0',
    marginVertical: 6,
  },
  escrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  escrowTextLeft: {
    fontSize: 11,
    color: '#166534',
  },
  escrowTextRight: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#15803D',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#FFE4E6',
    gap: 9,
  },
  footerSmall: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 7,
  },
  confirmHeroBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmHeroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  confirmIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmHeroText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 9,
  },
  laterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  laterBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#475569',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
  },
  rejectBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#E11D48',
  },
  viewDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 3,
    marginTop: 1,
  },
  viewDetailLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#BE123C',
    textDecorationLine: 'underline',
  },
});
