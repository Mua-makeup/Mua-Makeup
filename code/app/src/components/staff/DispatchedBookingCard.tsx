import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FreelancerBookingItem } from '@/services/freelancer-booking.service';
import { agencyStaffService } from '@/services/agency-staff.service';
import { formatBookingSchedule } from '@/utils/date';
import { EmergencyBusyModal } from './EmergencyBusyModal';

interface Props {
  booking: FreelancerBookingItem;
  onRefresh: () => void;
}

export const DispatchedBookingCard: React.FC<Props> = ({ booking, onRefresh }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const isAssignedPending = booking.status === 'AGENCY_ASSIGNED';
  const isInProgressOrActive = ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(booking.status);

  const handleConfirmAssignment = async () => {
    try {
      setIsConfirming(true);
      await agencyStaffService.confirmAssignmentByBooking(booking.id);
      Alert.alert('Thành công', 'Đã xác nhận tiếp nhận ca điều phối của Studio.');
      onRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể xác nhận ca làm.';
      Alert.alert('Lỗi xác nhận', msg);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCallCustomer = () => {
    if (booking.customerPhone) {
      Linking.openURL(`tel:${booking.customerPhone}`);
    } else {
      Alert.alert('Thông báo', 'Khách hàng chưa cập nhật số điện thoại.');
    }
  };

  const handleOpenMaps = () => {
    if (booking.destinationLatitude && booking.destinationLongitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.destinationLatitude},${booking.destinationLongitude}`;
      Linking.openURL(url);
    } else if (booking.destinationAddress) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.destinationAddress)}`;
      Linking.openURL(url);
    }
  };

  const handleEnterJob = () => {
    router.push({
      pathname: '/job-execution/[id]',
      params: { id: booking.id },
    });
  };

  const getStatusLabel = () => {
    switch (booking.status) {
      case 'AGENCY_ASSIGNED':
        return { label: 'Studio Chỉ Định', color: '#B45309', bg: '#FEF3C7' };
      case 'ACCEPTED':
        return { label: 'Đã Tiếp Nhận', color: '#1E40AF', bg: '#DBEAFE' };
      case 'ON_THE_WAY':
        return { label: 'Đang Di Chuyển', color: '#B45309', bg: '#FEF3C7' };
      case 'ARRIVED':
        return { label: 'Đã Đến Nơi', color: '#7E22CE', bg: '#F3E8FF' };
      case 'IN_PROGRESS':
        return { label: 'Đang Thực Hiện', color: '#BE123C', bg: '#FFE4E6' };
      case 'COMPLETED':
      case 'PAID_OUT':
        return { label: 'Hoàn Thành', color: '#047857', bg: '#D1FAE5' };
      default:
        return { label: booking.status, color: '#475569', bg: '#F1F5F9' };
    }
  };

  const statusInfo = getStatusLabel();

  return (
    <View style={styles.card}>
      {/* Top Header: Mã đơn + Trạng thái */}
      <View style={styles.headerRow}>
        <Text style={styles.bookingCode}>#{booking.bookingCode}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
      </View>

      {/* Tên dịch vụ & Khách hàng */}
      <Text style={styles.packageName}>{booking.packageName || 'Dịch Vụ Trang Điểm'}</Text>
      <Text style={styles.customerName}>Khách hàng: {booking.customerName || 'Khách vãng lai'}</Text>

      {/* Lịch hẹn & Địa chỉ */}
      <View style={styles.metaSection}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Thời gian:</Text>
          <Text style={styles.metaValue}>
            {formatBookingSchedule(booking.bookingDate, booking.startTime)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Địa điểm:</Text>
          <Text style={styles.metaValue} numberOfLines={2}>
            {booking.destinationAddress || 'Tại cơ sở Studio'}
          </Text>
        </View>
      </View>

      {/* Thao tác liên hệ phụ (gọi, xem map) - Nét mảnh, không nền icon */}
      <View style={styles.contactBar}>
        {booking.customerPhone ? (
          <TouchableOpacity style={styles.contactBtn} onPress={handleCallCustomer}>
            <Ionicons name="call-outline" size={15} color="#334155" />
            <Text style={styles.contactText}>Gọi khách</Text>
          </TouchableOpacity>
        ) : null}

        {booking.destinationAddress ? (
          <TouchableOpacity style={styles.contactBtn} onPress={handleOpenMaps}>
            <Ionicons name="navigate-outline" size={15} color="#334155" />
            <Text style={styles.contactText}>Xem chỉ đường</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Nút hành động cốt lõi */}
      {isAssignedPending ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnEmergency]}
            onPress={() => setShowEmergencyModal(true)}
            disabled={isConfirming}
          >
            <Text style={styles.btnEmergencyText}>Báo bận khẩn</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnConfirm]}
            onPress={handleConfirmAssignment}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.btnConfirmText}>Tiếp nhận ca</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {isInProgressOrActive ? (
        <TouchableOpacity style={[styles.btn, styles.btnEnterJob]} onPress={handleEnterJob}>
          <Text style={styles.btnEnterJobText}>Vào ca làm việc</Text>
        </TouchableOpacity>
      ) : null}

      {/* Modal Báo bận khẩn cấp */}
      <EmergencyBusyModal
        visible={showEmergencyModal}
        bookingId={booking.id}
        bookingCode={booking.bookingCode}
        customerName={booking.customerName}
        onClose={() => setShowEmergencyModal(false)}
        onSuccess={onRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingCode: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 10,
  },
  metaSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metaLabel: {
    width: 68,
    fontSize: 12,
    color: '#64748B',
  },
  metaValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#1E293B',
  },
  contactBar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contactText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnEmergency: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnEmergencyText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  btnConfirm: {
    flex: 1.4,
    backgroundColor: '#0F172A',
  },
  btnConfirmText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnEnterJob: {
    width: '100%',
    backgroundColor: '#0F172A',
  },
  btnEnterJobText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
