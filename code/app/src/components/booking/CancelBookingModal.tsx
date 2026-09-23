import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CustomerBookingItem } from '@/services/booking.service';

interface Props {
  visible: boolean;
  booking: CustomerBookingItem | null;
  isCancelling: boolean;
  onConfirmCancel: (bookingId: number, reason: string) => void;
  onClose: () => void;
}

const CANCEL_REASONS = [
  'Thay đổi lịch trình bận đột xuất',
  'Đã tìm được thợ khác phù hợp hơn',
  'Thời gian hẹn không còn phù hợp',
  'Đặt nhầm gói dịch vụ / nhầm địa chỉ',
  'Lý do khác...',
];

export const CancelBookingModal: React.FC<Props> = ({
  visible,
  booking,
  isCancelling,
  onConfirmCancel,
  onClose,
}) => {
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  if (!booking) return null;

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const finalReason =
      selectedReason === 'Lý do khác...'
        ? customReason.trim() || 'Khách hàng hủy với lý do riêng'
        : selectedReason;
    onConfirmCancel(booking.id, finalReason);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <View style={styles.iconCircle}>
              <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
            </View>

            <Text style={styles.title}>Hủy Lịch Hẹn?</Text>
            <Text style={styles.subtitle}>
              Bạn có chắc chắn muốn hủy đơn hẹn{' '}
              <Text style={styles.codeText}>{booking.bookingCode || `#BK-${booking.id}`}</Text>?
              Tiền cọc sẽ được xử lý theo chính sách hoàn cọc của nền tảng.
            </Text>

            {/* CHỌN LÝ DO HỦY */}
            <View style={styles.reasonsContainer}>
              {CANCEL_REASONS.map((reason) => {
                const isSelected = reason === selectedReason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedReason(reason);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {selectedReason === 'Lý do khác...' && (
                <TextInput
                  style={styles.customInput}
                  placeholder="Nhập lý do cụ thể của bạn..."
                  placeholderTextColor="#94A3B8"
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                />
              )}
            </View>

            {/* CỤM NÚT HÀNH ĐỘNG */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={onClose}
                disabled={isCancelling}
                activeOpacity={0.7}
              >
                <Text style={styles.backBtnText}>Giữ Lịch Hẹn</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, isCancelling && styles.confirmBtnDisabled]}
                onPress={handleConfirm}
                disabled={isCancelling}
                activeOpacity={0.88}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Xác Nhận Hủy</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  codeText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  reasonsContainer: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  reasonRowSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#EF4444',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  reasonText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  reasonTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
  customInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 50,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  backBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
