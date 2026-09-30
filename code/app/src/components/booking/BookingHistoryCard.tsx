import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { CustomerBookingItem, BookingStatusType } from '@/services/booking.service';

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
  const getStatusBadge = (status: BookingStatusType) => {
    switch (status) {
      case 'REQUESTED':
        return { label: 'Chờ Xác Nhận', color: '#D97706', bg: '#FEF3C7' };
      case 'AGENCY_ASSIGNED':
      case 'ACCEPTED':
        return { label: 'Đã Nhận Đơn', color: '#2563EB', bg: '#DBEAFE' };
      case 'ON_THE_WAY':
        return { label: 'Thợ Đang Tới', color: '#7C3AED', bg: '#EDE9FE' };
      case 'ARRIVED':
        return { label: 'Thợ Đã Đến', color: '#C026D3', bg: '#FAE8FF' };
      case 'IN_PROGRESS':
        return { label: 'Đang Trang Điểm', color: BrandColors.primary, bg: '#FFF1F2' };
      case 'COMPLETED':
      case 'PAID_OUT':
        return { label: 'Hoàn Thành', color: '#059669', bg: '#D1FAE5' };
      case 'CANCELLED':
        return { label: 'Đã Hủy', color: '#DC2626', bg: '#FEE2E2' };
      case 'DISPUTED':
        return { label: 'Đang Khiếu Nại', color: '#EA580C', bg: '#FFEDD5' };
      default:
        return { label: status, color: '#64748B', bg: '#F1F5F9' };
    }
  };

  const badge = getStatusBadge(booking.status);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const formatBookingTime = (isoTime: string) => {
    try {
      const d = new Date(isoTime);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${mins} - ${day}/${month}/${year}`;
    } catch {
      return isoTime;
    }
  };

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
      {/* HEADER: MÃ ĐƠN & STATUS */}
      <View style={styles.headerRow}>
        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>Mã đơn:</Text>
          <Text style={styles.codeText}>{booking.bookingCode || `#BK-${booking.id}`}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* THÔNG TIN DỊCH VỤ & THỢ */}
      <View style={styles.bodyRow}>
        <Image
          source={{
            uri:
              booking.packageCoverUrl ||
              booking.muaAvatarUrl ||
              'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=400',
          }}
          style={styles.thumbImage}
          contentFit="cover"
        />
        <View style={styles.bodyContent}>
          <Text style={styles.packageName} numberOfLines={1}>
            {booking.packageName}
          </Text>

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
        </View>
      </View>

      {/* PHẦN TÀI CHÍNH */}
      <View style={styles.financeRow}>
        <View style={styles.depositBox}>
          <Text style={styles.depositLabel}>Đã cọc Escrow:</Text>
          <Text style={styles.depositAmount}>{formatPrice(booking.depositAmount || 0)}</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Tổng tiền:</Text>
          <Text style={styles.totalAmount}>{formatPrice(booking.totalAmount)}</Text>
        </View>
      </View>

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

        {booking.status === 'ON_THE_WAY' && (
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
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  codeLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
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
  trackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
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
});
