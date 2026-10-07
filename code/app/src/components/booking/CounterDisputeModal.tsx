import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { DismissibleModal } from '@/components/common/DismissibleModal';
import { bookingService } from '@/services/booking.service';
import { BrandColors } from '@/constants/theme';

interface CounterDisputeModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: number;
  bookingCode?: string;
  viewAsRole: 'CUSTOMER' | 'MUA';
  onSuccess: () => void;
}

const CUSTOMER_QUICK_REASONS = [
  'Tôi đã có mặt đúng giờ và chờ tại điểm hẹn',
  'Điện thoại tôi hoạt động bình thường, không nhận được cuộc gọi từ thợ',
  'Chuyên viên make-up không đến điểm hẹn',
  'Chuyên viên đến trễ quá thời gian thỏa thuận',
  'Lý do khác...',
];

const MUA_QUICK_REASONS = [
  'Đã có mặt tại địa chỉ nhưng không gặp khách',
  'Gọi điện thoại nhiều lần khách không nhấc máy',
  'Khách báo bận/hủy hẹn đột xuất tại chỗ',
  'Lý do khác...',
];

export const CounterDisputeModal: React.FC<CounterDisputeModalProps> = ({
  visible,
  onClose,
  bookingId,
  bookingCode,
  viewAsRole,
  onSuccess,
}) => {
  const quickReasons = viewAsRole === 'CUSTOMER' ? CUSTOMER_QUICK_REASONS : MUA_QUICK_REASONS;

  const [selectedReason, setSelectedReason] = useState(quickReasons[0]);
  const [detailReason, setDetailReason] = useState('');
  const [proofLocalUri, setProofLocalUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setSelectedReason(quickReasons[0]);
    setDetailReason('');
    setProofLocalUri(null);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền Truy Cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để tải lên minh chứng.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofLocalUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền Truy Cập', 'Vui lòng cấp quyền máy ảnh để chụp ảnh minh chứng.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofLocalUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở máy ảnh.');
    }
  };

  const handleSubmit = async () => {
    const finalReasonText =
      selectedReason === 'Lý do khác...'
        ? detailReason.trim()
        : detailReason.trim()
        ? `${selectedReason}: ${detailReason.trim()}`
        : selectedReason;

    if (!finalReasonText.trim()) {
      Alert.alert('Thiếu Thông Tin', 'Vui lòng chọn hoặc nhập lý do đối chất của bạn.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    try {
      let uploadedUrl: string | undefined = undefined;

      // Nếu có chọn ảnh -> upload trước
      if (proofLocalUri) {
        try {
          const uploadRes = await bookingService.uploadDisputeProof(bookingId, proofLocalUri);
          uploadedUrl = uploadRes?.completionPhotoUrl || uploadRes?.photoUrl;
        } catch {
          console.warn('[CounterDisputeModal] Image upload failed, proceeding with statement only');
        }
      }

      // Gọi API chuyển/bổ sung trạng thái DISPUTED
      await bookingService.transitionBookingState(bookingId, 'DISPUTED', finalReasonText, uploadedUrl);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đã Gửi Báo Cáo Đối Chất',
        'Lời khai và minh chứng của bạn đã được gửi thành công tới Ban Quản Trị. Admin sẽ xem xét đối chiếu hai bên để ra phán quyết công bằng.'
      );
      resetForm();
      onClose();
      onSuccess();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || err.message || 'Không thể gửi báo cáo đối chất.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DismissibleModal
      visible={visible}
      onClose={() => {
        if (!isSubmitting) {
          resetForm();
          onClose();
        }
      }}
      contentStyle={styles.modalBox}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Ionicons name="shield-half-outline" size={22} color="#EA580C" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>Báo Cáo Đối Chất / Khiếu Nại</Text>
          <Text style={styles.headerSub}>Mã ca: #{bookingCode || bookingId}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
        {/* Notice Info Box */}
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={18} color="#9A3412" style={{ marginTop: 1 }} />
          <Text style={styles.noticeText}>
            Đối tác đã gửi báo cáo trước. Hãy gửi lời khai và ảnh minh chứng (nhật ký cuộc gọi, ảnh check-in hiện trường) để Ban Quản Trị bảo vệ quyền lợi của bạn.
          </Text>
        </View>

        {/* Quick Reasons Chips */}
        <Text style={styles.sectionLabel}>Chọn lý do nhanh:</Text>
        <View style={styles.chipsWrap}>
          {quickReasons.map((r, idx) => {
            const isSelected = selectedReason === r;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.chipItem, isSelected && styles.chipItemSelected]}
                onPress={() => setSelectedReason(r)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Detailed Reason Input */}
        <Text style={styles.sectionLabel}>Chi tiết lời khai / phản ánh của bạn:</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Nhập chi tiết tình huống thực tế tại thời điểm hẹn..."
          placeholderTextColor="#94A3B8"
          value={detailReason}
          onChangeText={setDetailReason}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!isSubmitting}
        />

        {/* Evidence Image Section */}
        <Text style={styles.sectionLabel}>Ảnh minh chứng hiện trường / cuộc gọi (nếu có):</Text>
        {proofLocalUri ? (
          <View style={styles.proofPreviewWrap}>
            <Image source={{ uri: proofLocalUri }} style={styles.proofPreviewImage} />
            <TouchableOpacity
              style={styles.removeProofBtn}
              onPress={() => setProofLocalUri(null)}
              disabled={isSubmitting}
            >
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoActionRow}>
            <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage} disabled={isSubmitting} activeOpacity={0.8}>
              <Ionicons name="images-outline" size={18} color="#475569" />
              <Text style={styles.uploadBtnText}>Thư viện ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadBtn} onPress={handleTakePhoto} disabled={isSubmitting} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={18} color="#475569" />
              <Text style={styles.uploadBtnText}>Chụp ảnh mới</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => {
            resetForm();
            onClose();
          }}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelBtnText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Gửi Báo Cáo Đối Chất</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </DismissibleModal>
  );
};

const styles = StyleSheet.create({
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '85%',
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    padding: 16,
  },
  noticeBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#9A3412',
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chipItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipItemSelected: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#1E293B',
    minHeight: 88,
    marginBottom: 16,
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  proofPreviewWrap: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    height: 160,
    marginBottom: 12,
  },
  proofPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeProofBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EA580C',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
