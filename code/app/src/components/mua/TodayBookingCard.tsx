import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FreelancerBookingItem } from '@/services/freelancer-booking.service';
import { BookingStatusType } from '@/services/booking.service';

interface Props {
  booking: FreelancerBookingItem;
}

export const TodayBookingCard: React.FC<Props> = ({ booking }) => {
  const getStatusBadge = (status: BookingStatusType) => {
    switch (status) {
      case 'ACCEPTED':
        return { label: 'Đã Nhận Đơn', bg: '#EFF6FF', text: '#2563EB', icon: 'checkmark-circle' };
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
    router.push({
      pathname: '/job-execution/[id]',
      params: { id: booking.id },
    });
  };

  const formatVnd = (amount: number) => {
    return (amount || 0).toLocaleString('vi-VN') + ' đ';
  };

  return (
    <View style={styles.card}>
      {/* Header: Mã đơn + Thời gian + Status badge */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.bookingCode}>{booking.bookingCode}</Text>
          <View style={styles.timeTag}>
            <Ionicons name="time-outline" size={13} color="#64748B" />
            <Text style={styles.timeText}>
              {booking.startTime?.slice(0, 5) || 'Trong ngày'}
            </Text>
          </View>
        </View>

        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Ionicons name={badge.icon as any} size={12} color={badge.text} />
          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Package & Customer info */}
      <View style={styles.mainInfo}>
        <Text style={styles.packageName} numberOfLines={2}>
          {booking.packageName}
        </Text>

        <View style={styles.customerRow}>
          <View style={styles.customerBlock}>
            <Ionicons name="person-outline" size={14} color="#64748B" />
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

      {/* Financials & Actions */}
      <View style={styles.footerRow}>
        <View style={styles.earningsBox}>
          <Text style={styles.earningsLabel}>Thu nhập thợ (80%):</Text>
          <Text style={styles.earningsValue}>{formatVnd(booking.earningsAmount)}</Text>
        </View>

        <View style={styles.actionsGroup}>
          <TouchableOpacity style={styles.mapBtn} onPress={handleOpenMaps}>
            <Ionicons name="navigate-outline" size={15} color="#1E293B" />
            <Text style={styles.mapBtnText}>Dẫn đường</Text>
          </TouchableOpacity>

          {booking.status !== 'COMPLETED' && booking.status !== 'PAID_OUT' && booking.status !== 'CANCELLED' ? (
            <TouchableOpacity style={styles.executeBtn} onPress={handleEnterJob}>
              <Ionicons name="flash" size={14} color="#FFFFFF" />
              <Text style={styles.executeBtnText}>Vào ca</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.viewDetailBtn} onPress={handleEnterJob}>
              <Text style={styles.viewDetailText}>Chi tiết</Text>
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingCode: {
    fontSize: 13,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
});
