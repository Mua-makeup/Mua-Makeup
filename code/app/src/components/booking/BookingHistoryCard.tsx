import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { CustomerBookingItem, BookingStatusType } from '@/services/booking.service';
import { formatDateTimeVN } from '@/utils/date';
import { router } from 'expo-router';
import { UserAvatar } from '@/components/common/UserAvatar';

interface Props {
  booking: CustomerBookingItem;
  onCancelPress: (booking: CustomerBookingItem) => void;
  onTrackPress?: (booking: CustomerBookingItem) => void;
  onReviewPress?: (booking: CustomerBookingItem) => void;
  onRebookPress?: (booking: CustomerBookingItem) => void;
}

export const BookingHistoryCard: React.FC<Props> = ({
  booking,
  onCancelPress,
  onTrackPress,
  onReviewPress,
  onRebookPress,
}) => {
  const isSlotTakenCancelled =
    booking.status === 'CANCELLED' &&
    ((booking.cancellationReason && (
      booking.cancellationReason.toLowerCase().includes('khách hàng khác') ||
      booking.cancellationReason.toLowerCase().includes('trùng') ||
      booking.cancellationReason.toLowerCase().includes('hoàn tất thanh toán trước')
    )) || booking.isDepositRefunded === true);

  const getStatusBadge = (status: BookingStatusType) => {
    if (isSlotTakenCancelled) {
      return { label: 'Trùng Lịch • Đã Hoàn Cọc', color: '#059669', bg: '#D1FAE5' };
    }
    switch (status) {
      case 'PENDING_DEPOSIT':
        return { label: 'Chờ Đặt Cọc', color: '#D97706', bg: '#FEF3C7' };
      case 'REQUESTED':
        return { label: 'Chờ Xác Nhận', color: '#D97706', bg: '#FEF3C7' };
      case 'AGENCY_ASSIGNED':
      case 'ACCEPTED':
        return { label: 'Đã Nhận Đơn', color: '#2563EB', bg: '#DBEAFE' };
      case 'ON_THE_WAY':
        return { label: 'Thợ Đang Tới', color: '#0284C7', bg: '#E0F2FE' };
      case 'ARRIVED':
        return { label: 'Thợ Đã Đến', color: '#0D9488', bg: '#CCFBF1' };
      case 'IN_PROGRESS':
        return { label: 'Đang Trang Điểm', color: BrandColors.primary, bg: '#FFF1F2' };
      case 'COMPLETED':
      case 'PAID_OUT':
        return { label: 'Hoàn Thành', color: '#059669', bg: '#D1FAE5' };
      case 'CANCELLED':
        return { label: 'Đã Hủy', color: '#DC2626', bg: '#FEE2E2' };
      case 'CANCELLED_EXPIRED':
        return { label: 'Hết Hạn Thanh Toán', color: '#64748B', bg: '#F1F5F9' };
      case 'DISPUTED':
        return { label: 'Đang Khiếu Nại', color: '#EA580C', bg: '#FFEDD5' };
      case 'DISPUTE_REFUNDED':
        return { label: 'Đã Hoàn Cọc', color: '#059669', bg: '#f0fff0ff' };
      case 'DISPUTE_COMPENSATED':
        return { label: 'Bồi Thường Thợ', color: '#B45309', bg: '#FEF3C7' };
      default:
        return { label: status, color: '#64748B', bg: '#F1F5F9' };
    }
  };

  const badge = getStatusBadge(booking.status);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const formatBookingTime = formatDateTimeVN;

  const handleCall = () => {
    Haptics.selectionAsync();
    if (booking.muaPhoneNumber) {
      Linking.openURL(`tel:${booking.muaPhoneNumber}`);
    } else {
      Alert.alert('Liên Hệ', `Số điện thoại của thợ: 0987.654.321`);
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          const isTerminalStatus = [
            'COMPLETED',
            'PAID_OUT',
            'CANCELLED',
            'CANCELLED_EXPIRED',
            'DISPUTED',
            'DISPUTE_REFUNDED',
            'DISPUTE_COMPENSATED',
          ].includes(booking.status);
          if (isTerminalStatus) {
            router.push(`/booking/history-detail/${booking.id}` as any);
          } else {
            router.push(`/booking/detail/${booking.id}` as any);
          }
        }}
      >
        {/* HEADER: MÃ ĐƠN & STATUS */}
        <View style={styles.headerRow}>
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>Mã đơn:</Text>
            <Text style={styles.codeText} numberOfLines={1} ellipsizeMode="tail">
              {booking.bookingCode || `#BK-${booking.id}`}
            </Text>
          </View>
          <View style={styles.headerBadgeGroup}>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusBadgeText, { color: badge.color }]} numberOfLines={1}>
                {badge.label}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </View>
        </View>

        <View style={styles.divider} />

        {/* THÔNG TIN DỊCH VỤ & THỢ */}
        <View style={styles.bodyRow}>
          <UserAvatar
            uri={booking.packageCoverUrl || booking.muaAvatarUrl}
            name={booking.packageName || booking.muaName}
            size={64}
            borderRadius={10}
            style={{ marginRight: 12 }}
          />
          <View style={styles.bodyContent}>
            <Text style={styles.packageName} numberOfLines={1}>
              {booking.packageName}
            </Text>

            {booking.styleName ? (
              <View style={styles.styleBadgeRow}>
                <Ionicons name="sparkles" size={11} color={BrandColors.primary} />
                <Text style={styles.styleBadgeText} numberOfLines={1}>
                  Tone: {booking.styleName}
                </Text>
              </View>
            ) : null}

            <View style={styles.muaRow}>
              <Ionicons name="person-outline" size={13} color="#64748B" />
              <Text style={styles.muaName} numberOfLines={1}>
                Thợ: {booking.muaName || 'Chuyên viên trang điểm'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={13} color="#64748B" />
              <Text style={styles.detailText}>{formatBookingTime(booking.bookingTime)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={13} color="#64748B" />
              <Text style={styles.detailText} numberOfLines={1}>
                {booking.destinationAddress || 'Trang điểm tại nhà'}
              </Text>
            </View>

            {isSlotTakenCancelled ? (
              <View style={styles.slotTakenNoticeBox}>
                <Ionicons name="information-circle-outline" size={13} color="#059669" />
                <Text style={styles.slotTakenNoticeText} numberOfLines={2}>
                  Đơn bị hủy do khách khác đã thanh toán trước • Đã hoàn 100% cọc vào Ví
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* PHẦN TÀI CHÍNH */}
        <View style={styles.financeRow}>
          <View style={styles.depositBox}>
            <Text style={styles.depositLabel}>
              {booking.status === 'CANCELLED_EXPIRED'
                ? 'Chưa đặt cọc:'
                : isSlotTakenCancelled
                ? 'Đã hoàn về ví:'
                : (booking.status === 'DISPUTE_REFUNDED'
                    ? 'Đã hoàn cọc:'
                    : (booking.status === 'DISPUTE_COMPENSATED'
                        ? 'Bồi thường cọc:'
                        : (booking.isDepositPaid ? 'Đã cọc Escrow:' : 'Tiền cọc (30%):')))}
            </Text>
            <Text
              style={[
                styles.depositAmount,
                booking.status === 'CANCELLED_EXPIRED' && { color: '#94A3B8' },
                (booking.status === 'DISPUTE_REFUNDED' || isSlotTakenCancelled) && { color: '#059669' },
                booking.status === 'DISPUTE_COMPENSATED' && { color: '#B45309' },
              ]}
            >
              {booking.status === 'CANCELLED_EXPIRED' ? '0 đ' : formatPrice(booking.depositAmount || 0)}
            </Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Tổng tiền:</Text>
            <Text style={styles.totalAmount}>{formatPrice(booking.totalAmount)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* FOOTER ACTIONS THEO TRẠNG THÁI */}
      <View style={styles.actionsRow}>
        {booking.status === 'REQUESTED' || booking.status === 'ACCEPTED' ? (
          <TouchableOpacity
            style={styles.cancelActionBtn}
            onPress={() => onCancelPress(booking)}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelActionText}>Hủy Ca Hẹn</Text>
          </TouchableOpacity>
        ) : null}

        {((booking.status === 'ACCEPTED' || (booking.status as any) === 'PENDING_DEPOSIT') && !booking.isDepositPaid) && (
          <TouchableOpacity
            style={styles.depositActionBtn}
            onPress={() => router.push(`/booking/deposit/${booking.id}` as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="card-outline" size={14} color="#FFFFFF" />
            <Text style={styles.depositActionText}>Thanh Toán Cọc</Text>
          </TouchableOpacity>
        )}

        {(booking.status === 'ON_THE_WAY' || (booking.status === 'ACCEPTED' && booking.isDepositPaid)) && (
          <TouchableOpacity
            style={styles.trackActionBtn}
            onPress={() => onTrackPress && onTrackPress(booking)}
            activeOpacity={0.7}
          >
            <Ionicons name="map-outline" size={14} color="#FFFFFF" />
            <Text style={styles.trackActionText}>Xem Vị Trí Thợ</Text>
          </TouchableOpacity>
        )}

        {(booking.status === 'ACCEPTED' ||
          booking.status === 'ON_THE_WAY' ||
          booking.status === 'ARRIVED') && (
          <TouchableOpacity
            style={styles.callActionBtn}
            onPress={handleCall}
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={14} color="#334155" />
            <Text style={styles.callActionText}>Gọi Thợ</Text>
          </TouchableOpacity>
        )}

        {booking.status === 'COMPLETED' && (
          <>
            <TouchableOpacity
              style={styles.reviewActionBtn}
              onPress={() => onReviewPress && onReviewPress(booking)}
              activeOpacity={0.7}
            >
              <Ionicons name="star-outline" size={14} color="#D97706" />
              <Text style={styles.reviewActionText}>Đánh Giá ⭐</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rebookActionBtn}
              onPress={() => onRebookPress && onRebookPress(booking)}
              activeOpacity={0.7}
            >
              <Ionicons name="repeat-outline" size={14} color="#FFFFFF" />
              <Text style={styles.rebookActionText}>Đặt Lại Gói</Text>
            </TouchableOpacity>
          </>
        )}

        {isSlotTakenCancelled && (
          <TouchableOpacity
            style={styles.walletActionBtn}
            onPress={() => router.push('/profile/customer-wallet' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="wallet-outline" size={14} color="#059669" />
            <Text style={styles.walletActionText}>Xem Ví Tiền</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  codeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 6,
    minWidth: 0,
  },
  codeLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    flexShrink: 0,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.2,
    flex: 1,
  },
  headerBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    maxWidth: 165,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  bodyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbImage: {
    width: 70,
    height: 75,
    borderRadius: 12,
  },
  bodyContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  packageName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  styleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#FFE4E6',
  },
  styleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  muaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  muaName: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 11,
    color: '#64748B',
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  depositBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  depositLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  depositAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  totalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  cancelActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cancelActionText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  callActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  callActionText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  depositActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#D97706',
  },
  depositActionText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  trackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#0284C7',
  },
  trackActionText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reviewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  reviewActionText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '700',
  },
  rebookActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
  },
  rebookActionText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  detailActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailActionText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  slotTakenNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  slotTakenNoticeText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  walletActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  walletActionText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
});
