import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { freelancerBookingService } from '@/services/freelancer-booking.service';

interface Props {
  visible: boolean;
  bookingId: number;
  onClose: () => void;
  onSuccess: (photoUrl: string) => void;
}

export const ProofCameraModal: React.FC<Props> = ({
  visible,
  bookingId,
  onClose,
  onSuccess,
}) => {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCaptureCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền Camera', 'Ứng dụng cần quyền Camera để chụp ảnh nghiệm thu sản phẩm make-up.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.warn('Lỗi mở camera:', err);
      Alert.alert('Lỗi', 'Không thể mở Camera trên thiết bị.');
    }
  };

  const handlePickLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err: any) {
      console.warn('Lỗi chọn ảnh thư viện:', err);
    }
  };

  const handleUploadAndConfirm = async () => {
    if (!photoUri) {
      Alert.alert('Chưa có ảnh', 'Vui lòng chụp ảnh khuôn mặt khách hàng sau khi hoàn thiện make-up.');
      return;
    }

    try {
      setIsUploading(true);
      const res = await freelancerBookingService.uploadCompletionPhoto(bookingId, photoUri);
      if (res && res.photoUrl) {
        onSuccess(res.photoUrl);
        setPhotoUri(null);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi tải ảnh nghiệm thu lên hệ thống.';
      Alert.alert('Tải Ảnh Thất Bại', msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setPhotoUri(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Nghiệm Thu Sản Phẩm Make-up</Text>
              <Text style={styles.subtitle}>
                Chụp ảnh khuôn mặt khách sau khi hoàn thành để xác nhận hoàn tất ca làm
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isUploading}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Body: Preview or Guide Frame */}
          {photoUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: photoUri }} style={styles.previewImage} contentFit="cover" />
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.verifiedText}>Ảnh Đã Chụp</Text>
              </View>
            </View>
          ) : (
            <View style={styles.cameraPlaceholder}>
              <View style={styles.ovalGuide}>
                <Ionicons name="camera-outline" size={44} color="#E11D48" />
                <Text style={styles.guideText}>Căn chỉnh khuôn mặt khách vào khung</Text>
              </View>
              <Text style={styles.helperText}>
                Ảnh nghiệm thu là căn cứ bắt buộc để hệ thống giải ngân tiền cọc và tích lũy KPI cho bạn.
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          {photoUri ? (
            <View style={styles.btnGroup}>
              <TouchableOpacity
                style={[styles.confirmBtn, isUploading && styles.disabledBtn]}
                onPress={handleUploadAndConfirm}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>Xác Nhận Ảnh Này</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.retakeBtn} onPress={handleReset} disabled={isUploading}>
                <Ionicons name="refresh" size={16} color="#64748B" />
                <Text style={styles.retakeBtnText}>Chụp lại ảnh khác</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.btnGroup}>
              <TouchableOpacity style={styles.primaryActionBtn} onPress={handleCaptureCamera}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Mở Camera Chụp Ngay</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryActionBtn} onPress={handlePickLibrary}>
                <Ionicons name="images-outline" size={18} color="#1E293B" />
                <Text style={styles.secondaryActionText}>Chọn từ thư viện ảnh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    alignItems: 'center',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    maxWidth: 290,
    lineHeight: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholder: {
    width: '100%',
    height: 260,
    backgroundColor: '#FFF5F6',
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FECDD3',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 20,
  },
  ovalGuide: {
    width: 140,
    height: 170,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#E11D48',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 8,
  },
  guideText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E11D48',
    textAlign: 'center',
    marginTop: 8,
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 15,
  },
  previewContainer: {
    width: '100%',
    height: 260,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  btnGroup: {
    width: '100%',
    gap: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E11D48',
    height: 50,
    borderRadius: 14,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    height: 50,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
  },
  retakeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
