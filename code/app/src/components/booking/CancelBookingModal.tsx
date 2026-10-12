import { DismissibleModal } from '@/components/common/DismissibleModal';
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { CustomerBookingItem, bookingService } from '@/services/booking.service';

export interface CancelModalBookingData {
  id?: number;
  bookingId?: number;
  bookingCode?: string;
  bookingTime?: string;
  bookingDate?: string;
  startTime?: string;
  status: string;
  depositAmount?: number;
  totalAmount?: number;
}

interface Props {
  visible: boolean;
  booking: CancelModalBookingData | CustomerBookingItem | null;
  isCancelling: boolean;
  onConfirmCancel: (
    bookingId: number,
    reason: string,
    isWithin2Hours: boolean,
    isPastStartTime?: boolean,
    emergencyProofUrl?: string
  ) => void;
  onClose: () => void;
}

const CANCEL_REASONS = [
  'Thay đổi lịch trình bận đột xuất',
  'Đã tìm được thợ khác phù hợp hơn',
  'Thời gian hẹn không còn phù hợp',
  'Đặt nhầm gói dịch vụ / nhầm địa chỉ',
  'Lý do khác...',
];

const DISPUTE_REASONS_CUSTOMER = [
  'Chuyên viên make-up không đến điểm hẹn',
  'Không thể liên lạc được với chuyên viên qua điện thoại',
  'Chuyên viên đến trễ quá thời gian thỏa thuận',
  'Sự cố cá nhân đột xuất bất khả kháng',
  'Lý do khác...',
];

const formatCurrency = (val?: number | null) => {
  if (!val || val <= 0) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
};

export const CancelBookingModal: React.FC<Props> = ({
  visible,
  booking,
  isCancelling,
  onConfirmCancel,
  onClose,
}) => {
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [disputeProofUrl, setDisputeProofUrl] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  useEffect(() => {
    if (!visible) {
      setDisputeProofUrl('');
      setCustomReason('');
    }
  }, [visible]);

  // Tính toán thời gian còn lại tới giờ hẹn
  const timeInfo = useMemo(() => {
    const anyBooking = booking as any;
    const rawTime =
      anyBooking?.bookingTime ||
      (anyBooking?.bookingDate && anyBooking?.startTime
        ? `${anyBooking.bookingDate}T${anyBooking.startTime}`
        : undefined);

    if (!rawTime) {
      return { diffMinutes: 9999, diffHours: 9999, isWithin2Hours: false, isPastStartTime: false, label: '' };
    }
    const appointmentDate = new Date(rawTime.includes('T') ? rawTime : rawTime.replace(' ', 'T'));
    if (isNaN(appointmentDate.getTime())) {
      return { diffMinutes: 9999, diffHours: 9999, isWithin2Hours: false, isPastStartTime: false, label: '' };
    }
    const now = new Date();
    const diffMs = appointmentDate.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = diffMinutes / 60;
    const isPastStartTime = diffMinutes <= 0;
    const isWithin2Hours = diffMinutes <= 120 && diffMinutes > 0;

    let label = '';
    if (diffMinutes <= 0) {
      label = 'Đã đến/quá giờ hẹn';
    } else if (diffMinutes < 60) {
      label = `Còn ${diffMinutes} phút`;
    } else {
      const h = Math.floor(diffMinutes / 60);
      const m = diffMinutes % 60;
      label = `Còn ${h} tiếng ${m > 0 ? `${m} phút` : ''}`;
    }

    return { diffMinutes, diffHours, isWithin2Hours, isPastStartTime, label };
  }, [booking?.bookingTime, (booking as any)?.bookingDate, (booking as any)?.startTime]);

  if (!booking) return null;

  // Xác định 4 trường hợp nghiệp vụ
  const isMuaAccepted = booking.status === 'ACCEPTED';
  const isPastStartTime = isMuaAccepted && timeInfo.isPastStartTime;
  const isWithin2H = isMuaAccepted && !isPastStartTime && timeInfo.isWithin2Hours;
  const isOutside2H = isMuaAccepted && !isPastStartTime && !timeInfo.isWithin2Hours;
  const isUnaccepted = !isMuaAccepted; // REQUESTED, PENDING_DEPOSIT...

  const activeReasons = isPastStartTime ? DISPUTE_REASONS_CUSTOMER : CANCEL_REASONS;

  const handleCaptureProof = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền Camera', 'Vui lòng cấp quyền Camera để chụp ảnh hiện trường/bằng chứng.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadProof(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở máy ảnh trên thiết bị.');
    }
  };

  const handlePickProof = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadProof(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.');
    }
  };

  const uploadProof = async (uri: string) => {
    if (!booking) return;
    try {
      setIsUploadingProof(true);
      setDisputeProofUrl(uri);
      const targetId = booking.id || (booking as any).bookingId || 0;
      const res = await bookingService.uploadDisputeProof(targetId, uri);
      const url = res?.completionPhotoUrl || res?.photoUrl || res?.thumbnailUrl;
      if (url) {
        setDisputeProofUrl(url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      setDisputeProofUrl('');
      Alert.alert('Lỗi Tải Ảnh', e?.response?.data?.message || 'Không thể tải ảnh minh chứng.');
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleConfirm = () => {
    if (isPastStartTime && !disputeProofUrl.trim()) {
      Alert.alert(
        'Minh Chứng Bắt Buộc',
        'Vui lòng chụp ảnh hoặc đính kèm ảnh minh chứng (chụp màn hình cuộc gọi hoặc ảnh tại điểm hẹn) để Ban Quản Trị đối soát và duyệt hoàn 100% tiền cọc cho bạn.'
      );
      return;
    }
    Haptics.notificationAsync(
      isPastStartTime || isWithin2H
        ? Haptics.NotificationFeedbackType.Error
        : Haptics.NotificationFeedbackType.Warning
    );
    const finalReason =
      selectedReason === 'Lý do khác...'
        ? customReason.trim() || (isPastStartTime ? 'Khách hàng khiếu nại với lý do riêng' : 'Khách hàng hủy với lý do riêng')
        : selectedReason;
    const actualBookingId = booking.id || (booking as any).bookingId || 0;
    onConfirmCancel(actualBookingId, finalReason, isWithin2H, isPastStartTime, disputeProofUrl.trim() || undefined);
  };

  const actualBookingId = booking.id || (booking as any).bookingId || 0;
  const bookingCodeDisplay = booking.bookingCode || `#BK-${actualBookingId}`;

  return (
    <DismissibleModal
      visible={visible}
      onClose={onClose}
      dismissDisabled={isCancelling || isUploadingProof}
      overlayStyle={styles.overlay}
      contentStyle={styles.modalBox}
    >
      <ScrollView
        style={styles.modalScroll}
        contentContainerStyle={styles.modalScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. ICON VÀ TIÊU ĐỀ THEO TRƯỜNG HỢP - GỌN GÀNG, TỐI ƯU DIỆN TÍCH */}
        {isUnaccepted && (
          <View style={styles.compactHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Hủy Lịch Hẹn</Text>
              <View style={styles.headerSubRow}>
                <View style={[styles.badgePill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <Text style={[styles.badgePillText, { color: '#059669' }]}>✓ Chưa tiếp nhận</Text>
                </View>
                <Text style={styles.codeText}>{bookingCodeDisplay}</Text>
              </View>
            </View>
          </View>
        )}

        {isOutside2H && (
          <View style={styles.compactHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="time-outline" size={24} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Hủy Lịch Hẹn Đã Nhận</Text>
              <View style={styles.headerSubRow}>
                <View style={[styles.badgePill, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Text style={[styles.badgePillText, { color: '#2563EB' }]}>✓ Trước 2 tiếng ({timeInfo.label})</Text>
                </View>
                <Text style={styles.codeText}>{bookingCodeDisplay}</Text>
              </View>
            </View>
          </View>
        )}

        {isWithin2H && (
          <View style={styles.compactHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="warning-outline" size={24} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: '#DC2626' }]}>Cảnh Báo Hủy Sát Giờ Hẹn</Text>
              <View style={styles.headerSubRow}>
                <View style={[styles.badgePill, { backgroundColor: '#FEF2F2', borderColor: '#FECDD3' }]}>
                  <Text style={[styles.badgePillText, { color: '#DC2626' }]}>⚠️ Sát giờ ({timeInfo.label})</Text>
                </View>
                <Text style={styles.codeText}>{bookingCodeDisplay}</Text>
              </View>
            </View>
          </View>
        )}

        {isPastStartTime && (
          <View style={styles.compactHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="alert-circle-outline" size={24} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: '#D97706' }]}>Báo Cáo Sự Cố & Khiếu Nại</Text>
              <View style={styles.headerSubRow}>
                <View style={[styles.badgePill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                  <Text style={[styles.badgePillText, { color: '#B45309' }]}>⚠️ {timeInfo.label}</Text>
                </View>
                <Text style={styles.codeText}>{bookingCodeDisplay}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 2. KHỐI CHÍNH SÁCH TIỀN CỌC MINH BẠCH - TINH GỌN */}
        {isUnaccepted && (
          <View style={[styles.policyBox, styles.policyBoxGreen]}>
            <View style={styles.policyHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="cash-outline" size={15} color="#059669" />
                <Text style={[styles.policyHeaderTitle, { color: '#059669' }]}>Hoàn 100% Tiền Cọc</Text>
              </View>
              <Text style={[styles.policyAmountValue, { color: '#059669' }]}>
                +{formatCurrency(booking.depositAmount)}
              </Text>
            </View>
            <Text style={styles.policyDesc}>
              Chuyên viên make-up chưa tiếp nhận ca hẹn. Bạn được hủy miễn phí hoàn toàn về Ví.
            </Text>
          </View>
        )}

        {isOutside2H && (
          <View style={[styles.policyBox, styles.policyBoxBlue]}>
            <View style={styles.policyHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="checkmark-circle-outline" size={15} color="#2563EB" />
                <Text style={[styles.policyHeaderTitle, { color: '#2563EB' }]}>Hoàn 100% Tiền Cọc Về Ví</Text>
              </View>
              <Text style={[styles.policyAmountValue, { color: '#2563EB' }]}>
                +{formatCurrency(booking.depositAmount)}
              </Text>
            </View>
            <Text style={styles.policyDesc}>
              Thời gian đến lịch hẹn còn hơn 2 tiếng ({timeInfo.label}), bạn được hoàn toàn bộ tiền cọc về Ví.
            </Text>
          </View>
        )}

        {isWithin2H && (
          <View style={[styles.policyBox, styles.policyBoxRed]}>
            <View style={styles.policyHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="alert-circle" size={15} color="#DC2626" />
                <Text style={[styles.policyHeaderTitle, { color: '#DC2626' }]}>Mất Cọc Bồi Thường Cho Thợ</Text>
              </View>
              <Text style={[styles.policyAmountValue, { color: '#DC2626' }]}>
                {formatCurrency(booking.depositAmount)}
              </Text>
            </View>
            <Text style={[styles.policyDesc, { color: '#991B1B' }]}>
              Hủy trong vòng 2 tiếng ({timeInfo.label}), thợ đã chuẩn bị di chuyển nên cọc dùng bồi thường cho thợ.
            </Text>
          </View>
        )}

        {isPastStartTime && (
          <View style={[styles.policyBox, styles.policyBoxAmber]}>
            <View style={styles.policyHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="shield-checkmark" size={15} color="#B45309" />
                <Text style={[styles.policyHeaderTitle, { color: '#B45309' }]}>Khiếu Nại Hoàn Cọc Lên Admin</Text>
              </View>
              <Text style={[styles.policyAmountValue, { color: '#059669' }]}>
                +{formatCurrency(booking.depositAmount)}
              </Text>
            </View>
            <Text style={[styles.policyDesc, { color: '#92400E' }]}>
              Lịch hẹn đã đến giờ. Admin sẽ xác minh sự việc và hoàn 100% tiền cọc về Ví của bạn sau khi duyệt.
            </Text>
          </View>
        )}

        {/* 3. PHẦN TẢI LÊN ẢNH MINH CHỨNG - BẮT BUỘC KHI KHIẾU NẠI (isPastStartTime) */}
        {isPastStartTime && (
          <View style={[styles.proofBox, !disputeProofUrl && styles.proofBoxWarning]}>
            <View style={styles.proofHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="camera" size={15} color="#D97706" />
                <Text style={styles.proofTitle}>ẢNH MINH CHỨNG SỰ CỐ</Text>
              </View>
              <Text style={styles.proofRequired}>* BẮT BUỘC</Text>
            </View>
            <Text style={styles.proofSub}>
              Chụp ảnh tại điểm hẹn hoặc chụp màn hình cuộc gọi nhỡ với chuyên viên.
            </Text>

            {isUploadingProof ? (
              <View style={styles.proofLoadingRow}>
                <ActivityIndicator size="small" color="#D97706" />
                <Text style={styles.proofLoadingText}>Đang tải ảnh minh chứng...</Text>
              </View>
            ) : disputeProofUrl ? (
              <View style={styles.proofPreviewRow}>
                <Image source={{ uri: disputeProofUrl }} style={styles.proofThumb} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.proofSuccessPill}>
                    <Ionicons name="checkmark-circle" size={13} color="#166534" />
                    <Text style={styles.proofSuccessText}>Đã có ảnh minh chứng</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={styles.proofMiniBtn} onPress={handleCaptureProof}>
                      <Ionicons name="camera-reverse" size={13} color="#B45309" />
                      <Text style={styles.proofMiniBtnText}>Chụp lại</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.proofMiniBtn} onPress={handlePickProof}>
                      <Ionicons name="images-outline" size={13} color="#475569" />
                      <Text style={[styles.proofMiniBtnText, { color: '#475569' }]}>Chọn lại</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setDisputeProofUrl('')}
                  style={styles.proofTrashBtn}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.proofActionRow}>
                <TouchableOpacity style={styles.proofActionBtnPrimary} onPress={handleCaptureProof}>
                  <Ionicons name="camera" size={16} color="#B45309" />
                  <Text style={styles.proofActionBtnPrimaryText}>Chụp Ảnh Minh Chứng</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.proofActionBtnSecondary} onPress={handlePickProof}>
                  <Ionicons name="images" size={16} color="#475569" />
                  <Text style={styles.proofActionBtnSecondaryText}>Thư Viện Ảnh</Text>
                </TouchableOpacity>
              </View>
            )}

            {!disputeProofUrl && !isUploadingProof && (
              <Text style={styles.proofAlertText}>
                ⚠️ Bắt buộc đính kèm ảnh để kích hoạt nút gửi khiếu nại
              </Text>
            )}
          </View>
        )}

        {/* 4. CHỌN LÝ DO HỦY / KHIẾU NẠI */}
        <Text style={styles.reasonSectionTitle}>
          {isPastStartTime ? 'Chọn lý do khiếu nại:' : 'Chọn lý do hủy:'}
        </Text>
        <View style={styles.reasonsContainer}>
          {activeReasons.map((reason) => {
            const isSelected = reason === selectedReason;
            return (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonRow,
                  isSelected && (isPastStartTime ? styles.reasonRowSelectedAmber : (isWithin2H ? styles.reasonRowSelectedRed : styles.reasonRowSelected)),
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedReason(reason);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radio,
                    isSelected && { borderColor: isPastStartTime ? '#D97706' : (isWithin2H ? '#DC2626' : '#E11D48') },
                  ]}
                >
                  {isSelected && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: isPastStartTime ? '#D97706' : (isWithin2H ? '#DC2626' : '#E11D48') },
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.reasonText,
                    isSelected && styles.reasonTextSelected,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            );
          })}

          {selectedReason === 'Lý do khác...' && (
            <TextInput
              style={styles.customInput}
              placeholder={isPastStartTime ? "Nhập chi tiết sự cố / khiếu nại của bạn..." : "Nhập lý do cụ thể của bạn..."}
              placeholderTextColor="#94A3B8"
              value={customReason}
              onChangeText={setCustomReason}
              multiline
            />
          )}
        </View>
      </ScrollView>

      {/* 5. CỤM NÚT HÀNH ĐỘNG - GỌN GÀNG, CỐ ĐỊNH Ở ĐÁY */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onClose}
          disabled={isCancelling || isUploadingProof}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>
            {isPastStartTime ? 'Đóng / Quay Lại' : 'Giữ Lịch Hẹn'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.confirmBtn,
            isPastStartTime ? styles.confirmBtnAmber : (isWithin2H ? styles.confirmBtnDanger : styles.confirmBtnPrimary),
            (isCancelling || isUploadingProof || (isPastStartTime && !disputeProofUrl)) && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirm}
          disabled={isCancelling || isUploadingProof || (isPastStartTime && !disputeProofUrl)}
          activeOpacity={0.88}
        >
          {isCancelling ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmBtnText}>
              {isPastStartTime
                ? (disputeProofUrl ? 'Gửi Khiếu Nại Hoàn Cọc' : 'Bắt Buộc Đính Kèm Ảnh')
                : (isWithin2H ? 'Chấp Nhận Mất Cọc & Hủy' : 'Xác Nhận Hủy')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </DismissibleModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  modalScroll: {
    width: '100%',
  },
  modalScrollContent: {
    paddingBottom: 8,
  },

  // HEADER TINH GỌN
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  // THẺ CHÍNH SÁCH
  policyBox: {
    width: '100%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    marginBottom: 10,
  },
  policyBoxGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  policyBoxBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  policyBoxRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
  },
  policyBoxAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  policyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  policyHeaderTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  policyDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15.5,
  },
  policyAmountValue: {
    fontSize: 13.5,
    fontWeight: '800',
  },

  // KHU VỰC MINH CHỨNG
  proofBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 10,
  },
  proofBoxWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
  },
  proofHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  proofTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#B45309',
  },
  proofRequired: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  proofSub: {
    fontSize: 11,
    color: '#92400E',
    marginBottom: 8,
    lineHeight: 15,
  },
  proofLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  proofLoadingText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B45309',
  },
  proofPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  proofThumb: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  proofSuccessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  proofSuccessText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#166534',
  },
  proofMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  proofMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  proofTrashBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  proofActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  proofActionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingVertical: 7.5,
    borderRadius: 8,
  },
  proofActionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  proofActionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 7.5,
    borderRadius: 8,
  },
  proofActionBtnSecondaryText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  proofAlertText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 6,
  },

  // LÝ DO HỦY
  reasonSectionTitle: {
    alignSelf: 'flex-start',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  reasonsContainer: {
    width: '100%',
    gap: 6,
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7.5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  reasonRowSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  reasonRowSelectedRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  reasonRowSelectedAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  reasonText: {
    fontSize: 11.5,
    color: '#475569',
    flex: 1,
  },
  reasonTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
  customInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    fontSize: 11.5,
    color: '#0F172A',
    minHeight: 44,
  },

  // NÚT HÀNH ĐỘNG
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  backBtn: {
    flex: 1,
    paddingVertical: 10.5,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1.4,
    paddingVertical: 10.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnPrimary: {
    backgroundColor: '#EF4444',
  },
  confirmBtnDanger: {
    backgroundColor: '#DC2626',
  },
  confirmBtnAmber: {
    backgroundColor: '#D97706',
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
