import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '@/components/common/UserAvatar';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FreelancerBookingItem, freelancerBookingService } from '@/services/freelancer-booking.service';
import { BookingStatusType } from '@/services/booking.service';
import { formatBookingSchedule } from '@/utils/date';
import { useWorkstationStore } from '@/store/workstation.store';

interface Props {
  booking: FreelancerBookingItem;
}

export const TodayBookingCard: React.FC<Props> = ({ booking }) => {
  const { pendingScheduledOffers, triggerScheduledOffer, fetchWorkstationData } = useWorkstationStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStatusBadge = (status: BookingStatusType) => {
    switch (status) {
      case 'REQUESTED':
        return { label: 'Chờ Tiếp Nhận', bg: '#FFF1F2', text: '#E11D48', icon: 'hourglass-outline' };
      case 'ACCEPTED':
        return { label: 'Đã Tiếp Nhận', bg: '#EFF6FF', text: '#2563EB', icon: 'checkmark-circle' };
      case 'ON_THE_WAY':
        return { label: 'Đang Di Chuyển', bg: '#FEF3C7', text: '#B45309', icon: 'navigate' };
      case 'ARRIVED':
        return { label: 'Đã Đến Nơi', bg: '#F3E8FF', text: '#7E22CE', icon: 'location' };
      case 'IN_PROGRESS':
        return { label: 'Đang Trang Điểm', bg: '#FFF1F2', text: '#E11D48', icon: 'sparkles' };
      case 'COMPLETED':
      case 'PAID_OUT':
        return { label: 'Đã Hoàn Thành', bg: '#ECFDF5', text: '#059669', icon: 'ribbon' };
      case 'CANCELLED':
        return { label: 'Đã Hủy', bg: '#F1F5F9', text: '#64748B', icon: 'close-circle' };
      default:
        return { label: status, bg: '#F8FAFC', text: '#64748B', icon: 'help-circle' };
    }
  };

  const badge = getStatusBadge(booking.status);

  const handleCallCustomer = () => {
    if (booking.customerPhone) {
      Linking.openURL(`tel:${booking.customerPhone}`);
    } else {
      Alert.alert('Không Có SĐT', 'Khách hàng chưa cập nhật số điện thoại.');
    }
  };

  const handleOpenMaps = () => {
    if (booking.destinationLatitude && booking.destinationLongitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.destinationLatitude},${booking.destinationLongitude}`;
      Linking.openURL(url);
    } else if (booking.destinationAddress) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.destinationAddress)}`;
      Linking.openURL(url);
    } else {
      Alert.alert('Không có địa chỉ', 'Đơn hàng này không có thông tin tọa độ.');
    }
  };

  const handleEnterJob = () => {
    const isTerminalStatus = ['COMPLETED', 'PAID_OUT', 'CANCELLED', 'CANCELLED_EXPIRED', 'DISPUTED'].includes(booking.status);
    if (isTerminalStatus) {
      router.push({
        pathname: '/booking/history-detail/[id]',
        params: { id: booking.id },
      } as any);
    } else {
      router.push({
        pathname: '/job-execution/[id]',
        params: { id: booking.id },
      });
    }
  };

  // Tiếp nhận ca hẹn đang chờ (REQUESTED)
  const handleAcceptRequested = async () => {
    if (isSubmitting) return;
    const matchingOffer = pendingScheduledOffers?.find((o) => o.bookingId === booking.id);
    if (matchingOffer) {
      triggerScheduledOffer(matchingOffer);
      return;
    }

    Alert.alert(
      'Tiếp Nhận Ca Hẹn',
      `Bạn có muốn tiếp nhận ca hẹn #${booking.bookingCode} của khách ${booking.customerName}?`,
      [
        { text: 'Để Sau', style: 'cancel' },
        {
          text: 'Tiếp Nhận',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await freelancerBookingService.confirmScheduledBooking(booking.id);
              await fetchWorkstationData();
              Alert.alert('Thành Công', `Đã tiếp nhận ca hẹn #${booking.bookingCode}.`);
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || err.message);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Từ chối ca hẹn đang chờ (REQUESTED)
  const handleRejectRequested = () => {
    if (isSubmitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Từ Chối Ca Hẹn',
      `Bạn có chắc muốn từ chối ca hẹn #${booking.bookingCode}? Tiền cọc sẽ hoàn lại 100% cho khách hàng.`,
      [
        { text: 'Suy Nghĩ Lại', style: 'cancel' },
        {
          text: 'Từ Chối',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await freelancerBookingService.rejectScheduledBooking(booking.id, 'Thợ bận lịch không thể nhận');
              await fetchWorkstationData();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || err.message);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const formatVnd = (amount: number) => {
    return (amount || 0).toLocaleString('vi-VN') + ' đ';
  };

  const isRequested = booking.status === 'REQUESTED';

  return (
    <View style={[styles.card, isRequested && styles.cardRequested]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleEnterJob}
      >
        {/* Header: Mã đơn + Thời gian + Status badge */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.bookingCode}>{booking.bookingCode}</Text>
            <View style={styles.timeTag}>
              <Ionicons name="time-outline" size={13} color="#64748B" />
              <Text style={styles.timeText}>
                {formatBookingSchedule(booking.bookingDate, booking.startTime)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Ionicons name={badge.icon as any} size={12} color={badge.text} />
              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </View>
        </View>

        {/* Package & Customer info */}
        <View style={styles.mainInfo}>
          <Text style={styles.packageName} numberOfLines={2}>
            {booking.packageName}
          </Text>

          <View style={styles.customerRow}>
            <View style={styles.customerBlock}>
              <UserAvatar uri={booking.customerAvatar} name={booking.customerName} size={22} style={{ marginRight: 6 }} />
              <Text style={styles.customerName}>{booking.customerName}</Text>
            </View>

            {booking.customerPhone ? (
              <TouchableOpacity style={styles.callBtn} onPress={handleCallCustomer}>
                <Ionicons name="call" size={13} color="#059669" />
                <Text style={styles.callText}>Gọi khách</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Destination Address */}
          <View style={styles.addressRow}>
            <Ionicons name="location-sharp" size={15} color="#E11D48" style={styles.addressIcon} />
            <Text style={styles.addressText} numberOfLines={2}>
              {booking.destinationAddress || 'Trang điểm tại studio / địa điểm thỏa thuận'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Financials & Actions */}
      <View style={styles.footerRow}>
        <View style={styles.earningsBox}>
          <Text style={styles.earningsLabel}>Thu nhập thợ (80%):</Text>
          <Text style={styles.earningsValue}>{formatVnd(booking.earningsAmount)}</Text>
        </View>

        <View style={styles.actionsGroup}>
          {isRequested ? (
            /* Đơn chưa tiếp nhận: CHỈ hiện nút Từ Chối và Tiếp Nhận Ca (KHÔNG hiện Vào ca hay Dẫn đường) */
            <>
              <TouchableOpacity
                style={styles.rejectCardBtn}
                onPress={handleRejectRequested}
                disabled={isSubmitting}
                activeOpacity={0.75}
              >
                <Ionicons name="close-circle-outline" size={14} color="#E11D48" />
                <Text style={styles.rejectCardBtnText}>Từ chối</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptCardBtn}
                onPress={handleAcceptRequested}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                <Text style={styles.acceptCardBtnText}>Tiếp nhận ca</Text>
              </TouchableOpacity>
            </>
          ) : booking.status === 'ACCEPTED' ? (
            /* Đơn đã tiếp nhận nhưng chưa tới giờ di chuyển */
            <>
              <TouchableOpacity style={styles.mapBtn} onPress={handleOpenMaps}>
                <Ionicons name="navigate-outline" size={15} color="#1E293B" />
                <Text style={styles.mapBtnText}>Dẫn đường</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.viewDetailBtn} onPress={handleEnterJob}>
                <Text style={styles.viewDetailText}>Chi tiết ca</Text>
              </TouchableOpacity>
            </>
          ) : booking.status === 'ON_THE_WAY' || booking.status === 'ARRIVED' || booking.status === 'IN_PROGRESS' ? (
            /* Đang trong hành trình di chuyển hoặc đang trang điểm */
            <>
              <TouchableOpacity style={styles.mapBtn} onPress={handleOpenMaps}>
                <Ionicons name="navigate-outline" size={15} color="#1E293B" />
                <Text style={styles.mapBtnText}>Dẫn đường</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.executeBtn} onPress={handleEnterJob}>
                <Ionicons name="flash" size={14} color="#FFFFFF" />
                <Text style={styles.executeBtnText}>Tiến trình</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.viewDetailBtn} onPress={handleEnterJob}>
              <Text style={styles.viewDetailText}>
                {booking.status === 'COMPLETED' || booking.status === 'PAID_OUT' ? 'Hóa đơn & Chi tiết' : 'Chi tiết'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  bookingCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  badge: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mainInfo: {
    paddingVertical: 12,
  },
  packageName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  callText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  addressIcon: {
    marginTop: 2,
  },
  addressText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    lineHeight: 17,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  earningsBox: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  earningsValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E11D48',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  mapBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  executeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E11D48',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  executeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewDetailBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  cardRequested: {
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    backgroundColor: '#FFFDFD',
  },
  rejectCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 7.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  rejectCardBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
  },
  acceptCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E11D48',
    paddingHorizontal: 12,
    paddingVertical: 7.5,
    borderRadius: 10,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptCardBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
