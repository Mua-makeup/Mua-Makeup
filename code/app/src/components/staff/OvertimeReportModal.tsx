import React, { useState, useEffect } from 'react';
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
import {
  agencyStaffService,
  OvertimeReasonType,
  OvertimeRuleItem,
} from '@/services/agency-staff.service';

interface Props {
  visible: boolean;
  bookingId: number;
  bookingCode: string;
  actualMinutes?: number;
  estimatedMinutes?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const OvertimeReportModal: React.FC<Props> = ({
  visible,
  bookingId,
  bookingCode,
  actualMinutes = 0,
  estimatedMinutes = 60,
  onClose,
  onSuccess,
}) => {
  const calculatedOvertime = Math.max(1, actualMinutes - estimatedMinutes);
  const [overtimeMinutes, setOvertimeMinutes] = useState(calculatedOvertime.toString());
  const [reasonType, setReasonType] = useState<OvertimeReasonType>('OTHER_CUSTOM_REASON');
  const [selectedRuleId, setSelectedRuleId] = useState<number | undefined>(undefined);
  const [explanationText, setExplanationText] = useState('');
  const [proofImageUri, setProofImageUri] = useState<string | null>(null);
  const [rules, setRules] = useState<OvertimeRuleItem[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setOvertimeMinutes(Math.max(1, actualMinutes - estimatedMinutes).toString());
      loadRules();
    }
  }, [visible, actualMinutes, estimatedMinutes]);

  const loadRules = async () => {
    try {
      setIsLoadingRules(true);
      const data = await agencyStaffService.getAgencyOvertimeRules();
      const activeRules = data.filter((r) => r.isActive);
      setRules(activeRules);
      if (activeRules.length > 0) {
        setSelectedRuleId(activeRules[0].id);
      }
    } catch {
      // Bỏ qua lỗi nếu studio chưa cài đặt rules
    } finally {
      setIsLoadingRules(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền camera để chụp ảnh đối chứng.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể khởi động camera.');
    }
  };

  const handleSubmit = async () => {
    const mins = parseInt(overtimeMinutes, 10);
    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Lỗi nhập liệu', 'Số phút làm quá giờ phải lớn hơn 0.');
      return;
    }

    if (!explanationText.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập giải trình chi tiết lý do ca làm bị kéo dài.');
      return;
    }

    try {
      setIsSubmitting(true);
      await agencyStaffService.submitOvertimeReport({
        bookingId,
        overtimeMinutes: mins,
        reasonType,
        ruleId: reasonType === 'PRESET_RULE' ? selectedRuleId : undefined,
        explanationText: explanationText.trim(),
        proofImageUrl: proofImageUri || undefined,
      });

      Alert.alert('Thành công', 'Đã nộp báo cáo giải trình làm thêm giờ tới Studio Admin.');
      setExplanationText('');
      setProofImageUri(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi nộp giải trình.';
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
              <Text style={styles.title}>Giải Trình Làm Quá Giờ</Text>
              <Text style={styles.subtitle}>Đơn #{bookingCode}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-outline" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Tóm tắt thời lượng */}
            <View style={styles.durationBanner}>
              <View style={styles.durationItem}>
                <Text style={styles.durationLabel}>Dự kiến</Text>
                <Text style={styles.durationValue}>{estimatedMinutes} phút</Text>
              </View>
              <View style={styles.durationItem}>
                <Text style={styles.durationLabel}>Thực tế</Text>
                <Text style={styles.durationValue}>{actualMinutes > 0 ? `${actualMinutes} phút` : '--'}</Text>
              </View>
              <View style={styles.durationItem}>
                <Text style={styles.durationLabel}>Quá giờ</Text>
                <Text style={[styles.durationValue, styles.durationOver]}>+{overtimeMinutes} phút</Text>
              </View>
            </View>

            {/* Chọn số phút quá giờ */}
            <Text style={styles.label}>Số phút vượt thời lượng dự kiến *</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={overtimeMinutes}
              onChangeText={setOvertimeMinutes}
              placeholder="Ví dụ: 30"
              placeholderTextColor="#94A3B8"
            />

            {/* Phân loại lý do */}
            <Text style={styles.label}>Loại giải trình *</Text>
            <View style={styles.reasonTabRow}>
              {rules.length > 0 ? (
                <TouchableOpacity
                  style={[styles.reasonTab, reasonType === 'PRESET_RULE' && styles.reasonTabActive]}
                  onPress={() => setReasonType('PRESET_RULE')}
                >
                  <Text
                    style={[
                      styles.reasonTabText,
                      reasonType === 'PRESET_RULE' && styles.reasonTabTextActive,
                    ]}
                  >
                    Theo Quy Chế Studio
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.reasonTab,
                  reasonType === 'OTHER_CUSTOM_REASON' && styles.reasonTabActive,
                ]}
                onPress={() => setReasonType('OTHER_CUSTOM_REASON')}
              >
                <Text
                  style={[
                    styles.reasonTabText,
                    reasonType === 'OTHER_CUSTOM_REASON' && styles.reasonTabTextActive,
                  ]}
                >
                  Lý Do Phát Sinh Khác
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nếu chọn theo quy chế Studio */}
            {reasonType === 'PRESET_RULE' && rules.length > 0 ? (
              <View style={styles.ruleList}>
                {rules.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.ruleItem, selectedRuleId === r.id && styles.ruleItemActive]}
                    onPress={() => setSelectedRuleId(r.id)}
                  >
                    <Text
                      style={[styles.ruleName, selectedRuleId === r.id && styles.ruleNameActive]}
                    >
                      {r.ruleName}
                    </Text>
                    <Text style={styles.ruleMeta}>
                      (Từ {r.minOvertimeMinutes} phút {r.maxOvertimeMinutes ? `đến ${r.maxOvertimeMinutes} phút` : ''})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Ô nhập giải trình */}
            <Text style={styles.label}>Chi tiết giải trình *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Nêu rõ tình huống: Khách yêu cầu đổi kiểu tóc, phát sinh đính đá, đón khách muộn..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={explanationText}
              onChangeText={setExplanationText}
            />

            {/* Ảnh đối chứng */}
            <Text style={styles.label}>Ảnh đối chứng (tùy chọn)</Text>
            {proofImageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: proofImageUri }} style={styles.previewImage} resizeMode="cover" />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setProofImageUri(null)}>
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <Text style={styles.removeImageText}>Xóa ảnh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.attachBtn} onPress={handleTakePhoto}>
                <Ionicons name="camera-outline" size={16} color="#334155" />
                <Text style={styles.attachBtnText}>Chụp ảnh tình huống phát sinh</Text>
              </TouchableOpacity>
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
                  <Text style={styles.btnSubmitText}>Gửi giải trình</Text>
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
  durationBanner: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
  },
  durationItem: {
    flex: 1,
    alignItems: 'center',
  },
  durationLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  durationValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  durationOver: {
    color: '#DC2626',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  reasonTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  reasonTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  reasonTabActive: {
    borderColor: '#0F172A',
    backgroundColor: '#0F172A',
  },
  reasonTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  reasonTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ruleList: {
    gap: 6,
    marginBottom: 14,
  },
  ruleItem: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  ruleItemActive: {
    borderColor: '#0F172A',
    backgroundColor: '#F1F5F9',
  },
  ruleName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  ruleNameActive: {
    color: '#0F172A',
    fontWeight: '600',
  },
  ruleMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    marginBottom: 14,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
  },
  attachBtnText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 130,
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
