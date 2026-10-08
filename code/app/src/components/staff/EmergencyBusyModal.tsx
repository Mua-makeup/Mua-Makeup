import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { agencyStaffService } from '@/services/agency-staff.service';

interface Props {
  visible: boolean;
  bookingId: number;
  bookingCode: string;
  customerName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const EmergencyBusyModal: React.FC<Props> = ({
  visible,
  bookingId,
  bookingCode,
  customerName,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền mở Camera để chụp ảnh minh chứng.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể khởi động camera.');
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập lý do sự cố bất khả kháng.');
      return;
    }

    try {
      setIsSubmitting(true);
      await agencyStaffService.reportEmergencyBusy(bookingId, {
        emergencyReason: reason.trim(),
        proofDocumentUrl: proofUri || undefined,
      });

      Alert.alert('Đã gửi báo cáo', 'Studio đã nhận được báo cáo bận khẩn cấp và sẽ xử lý điều phối lại thợ.');
      setReason('');
      setProofUri(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi gửi báo cáo.';
      Alert.alert('Gửi thất bại', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Báo Bận Khẩn Cấp</Text>
              <Text style={styles.subtitle}>
                Đơn #{bookingCode} {customerName ? `• ${customerName}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-outline" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hướng dẫn & Lưu ý */}
            <Text style={styles.noticeText}>
              Báo cáo này được gửi trực tiếp đến quản lý Studio để xét duyệt đổi thợ hoặc phân công solo. Vui lòng nêu rõ lý do chính đáng kèm minh chứng (nếu có).
            </Text>

            {/* Ô nhập lý do */}
            <Text style={styles.label}>Lý do bất khả kháng *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ví dụ: Bị tai nạn giao thông trên đường, ốm sốt đột xuất..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={reason}
              onChangeText={setReason}
            />

            {/* Minh chứng ảnh */}
            <Text style={styles.label}>Ảnh minh chứng (tùy chọn)</Text>
            {proofUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: proofUri }} style={styles.previewImage} resizeMode="cover" />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setProofUri(null)}>
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <Text style={styles.removeImageText}>Xóa ảnh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.attachRow}>
                <TouchableOpacity style={styles.attachBtn} onPress={handleTakePhoto}>
                  <Ionicons name="camera-outline" size={16} color="#334155" />
                  <Text style={styles.attachBtnText}>Chụp ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}>
                  <Ionicons name="images-outline" size={16} color="#334155" />
                  <Text style={styles.attachBtnText}>Chọn từ máy</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Nút hành động */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={styles.btnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubmit]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnSubmitText}>Xác nhận gửi</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  noticeText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 6,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 88,
    marginBottom: 14,
  },
  attachRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  attachBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  attachBtnText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  removeImageText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  btnSubmit: {
    backgroundColor: '#0F172A',
  },
  btnSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
