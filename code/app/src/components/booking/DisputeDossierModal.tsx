import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { DismissibleModal } from '@/components/common/DismissibleModal';
import { bookingService } from '@/services/booking.service';
import { formatDateTimeVN } from '@/utils/date';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatVnd = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

interface DisputeDossierModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId?: number;
  cancellationReason?: string;
  emergencyReason?: string;
  emergencyProofUrl?: string;
  reportedAt?: string;
  viewAsRole: 'CUSTOMER' | 'MUA';
  bookingCode?: string;
  depositAmount?: number;
  disputeOrigin?: string;
  counterpartyName?: string;
  autoOpenForm?: boolean;
  onCounterDispute?: () => void;
  onDisputeSuccess?: () => void;
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

export const DisputeDossierModal: React.FC<DisputeDossierModalProps> = ({
  visible,
  onClose,
  bookingId,
  cancellationReason,
  emergencyReason,
  emergencyProofUrl,
  reportedAt,
  viewAsRole,
  bookingCode,
  depositAmount = 0,
  disputeOrigin,
  counterpartyName,
  autoOpenForm = false,
  onCounterDispute,
  onDisputeSuccess,
}) => {
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const quickReasons = viewAsRole === 'CUSTOMER' ? CUSTOMER_QUICK_REASONS : MUA_QUICK_REASONS;

  // Inline counter dispute state
  const [isEditingCounterDispute, setIsEditingCounterDispute] = useState(autoOpenForm);
  const [selectedReason, setSelectedReason] = useState(quickReasons[0]);
  const [detailReason, setDetailReason] = useState('');
  const [proofLocalUri, setProofLocalUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && autoOpenForm) {
      setIsEditingCounterDispute(true);
    }
    if (!visible) {
      setIsEditingCounterDispute(false);
      setSelectedReason(quickReasons[0]);
      setDetailReason('');
      setProofLocalUri(null);
    }
  }, [visible, autoOpenForm]);

  // Parse statements and proofs
  const rawReason = (emergencyReason || cancellationReason || '').trim();
  const rawProof = (emergencyProofUrl || '').trim();
  const proofUrls = rawProof ? rawProof.split('|').map((u) => u.trim()).filter(Boolean) : [];

  const hasCustomerTag = rawReason.includes('[Khách hàng]');
  const hasMuaTag = rawReason.includes('[Chuyên viên MUA]');

  const isDual =
    disputeOrigin === 'DUAL' ||
    (hasCustomerTag && hasMuaTag);

  const isMuaOnly =
    !isDual &&
    (disputeOrigin === 'MUA' ||
      (hasMuaTag && !hasCustomerTag) ||
      (!hasCustomerTag &&
        (rawReason.toLowerCase().includes('vắng mặt') ||
          rawReason.toLowerCase().includes('no-show') ||
          rawReason.toLowerCase().includes('không gặp khách'))));

  let customerStatement = '';
  let muaStatement = '';

  if (isDual) {
    const parts = rawReason.split('|');
    parts.forEach((p) => {
      const trimmed = p.trim();
      if (trimmed.includes('[Khách hàng]')) {
        customerStatement = trimmed.replace(/\[Khách hàng\]:?/, '').trim();
      } else if (trimmed.includes('[Chuyên viên MUA]')) {
        muaStatement = trimmed.replace(/\[Chuyên viên MUA\]:?/, '').trim();
      } else if (
        trimmed.toLowerCase().includes('khách hàng') ||
        trimmed.toLowerCase().includes('với khách') ||
        trimmed.toLowerCase().includes('vắng mặt')
      ) {
        muaStatement = trimmed;
      } else {
        if (!muaStatement) muaStatement = trimmed;
        else if (!customerStatement) customerStatement = trimmed;
      }
    });
  } else if (isMuaOnly) {
    muaStatement = rawReason.replace(/\[Chuyên viên MUA\]:?/, '').trim();
  } else {
    customerStatement = rawReason.replace(/\[Khách hàng\]:?/, '').trim();
  }

  // Allocate proofs
  let customerProof: string | undefined;
  let muaProof: string | undefined;

  const proofItems = rawProof ? rawProof.split('|').map((u) => u.trim()).filter(Boolean) : [];
  const hasTaggedProofs = proofItems.some((p) => p.includes('[Khách hàng]') || p.includes('[Chuyên viên MUA]'));

  if (hasTaggedProofs) {
    proofItems.forEach((item) => {
      if (item.includes('[Khách hàng]')) {
        customerProof = item.replace(/\[Khách hàng\]:?/, '').trim();
      } else if (item.includes('[Chuyên viên MUA]')) {
        muaProof = item.replace(/\[Chuyên viên MUA\]:?/, '').trim();
      } else {
        if (!muaProof) muaProof = item;
        else if (!customerProof) customerProof = item;
      }
    });
  } else {
    if (isDual) {
      if (rawReason.startsWith('[Khách hàng]')) {
        customerProof = proofItems[0];
        muaProof = proofItems[1];
      } else {
        muaProof = proofItems[0];
        customerProof = proofItems[1];
      }
    } else if (isMuaOnly) {
      muaProof = proofItems[0]?.replace(/\[.*?\]:?/, '')?.trim();
      customerProof = undefined;
    } else {
      customerProof = proofItems[0]?.replace(/\[.*?\]:?/, '')?.trim();
      muaProof = undefined;
    }
  }

  const isMUA = viewAsRole === 'MUA';
  const counterpartyTitle = isMUA
    ? `Báo Cáo Của Khách Hàng (${counterpartyName || 'Khách Hàng'})`
    : `Báo Cáo Của Chuyên Viên MUA (${counterpartyName || 'Thợ Trang Điểm'})`;

  const counterpartyStatement = isMUA ? customerStatement : muaStatement;
  const counterpartyProof = isMUA ? customerProof : muaProof;

  const myStatement = isMUA ? muaStatement : customerStatement;
  const myProof = isMUA ? muaProof : customerProof;
  const hasMyStatement = Boolean(myStatement);

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

  const handleSubmitDispute = async () => {
    if (!bookingId) {
      Alert.alert('Lỗi', 'Không tìm thấy mã đơn hàng.');
      return;
    }

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

      if (proofLocalUri) {
        try {
          const uploadRes = await bookingService.uploadDisputeProof(bookingId, proofLocalUri);
          uploadedUrl = uploadRes?.completionPhotoUrl || uploadRes?.photoUrl;
        } catch {
          console.warn('[DisputeDossierModal] Proof upload failed, proceeding with statement only');
        }
      }

      await bookingService.transitionBookingState(bookingId, 'DISPUTED', finalReasonText, uploadedUrl);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đã Gửi Báo Cáo Đối Chất',
        'Lời khai và minh chứng của bạn đã được gửi thành công tới Ban Quản Trị. Admin sẽ xem xét đối chiếu hai bên để ra phán quyết công bằng.'
      );
      setIsEditingCounterDispute(false);
      onDisputeSuccess?.();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || err.message || 'Không thể gửi báo cáo đối chất.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DismissibleModal
      visible={visible}
      onClose={onClose}
      avoidKeyboard={false}
      dismissDisabled={Boolean(previewPhotoUrl)}
      contentStyle={styles.modalContent}
      overlays={
        previewPhotoUrl ? (
          <View style={styles.lightboxOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => setPreviewPhotoUrl(null)}
              activeOpacity={1}
            />
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setPreviewPhotoUrl(null)}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={38} color="#FFFFFF" />
            </TouchableOpacity>
            <Image
              source={{ uri: previewPhotoUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          </View>
        ) : null
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerIconWrap}>
          <Ionicons name="scale-outline" size={20} color="#E11D48" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>Hồ Sơ Khiếu Nại Đơn Hàng</Text>
          <Text style={styles.headerSub}>
            Mã ca: #{bookingCode || 'N/A'} • Tiền cọc: {formatVnd(depositAmount)}
          </Text>
        </View>
      </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
          {/* Dispute Origin Banner */}
          {isDual ? (
            <View style={styles.bannerDual}>
              <Ionicons name="git-compare-outline" size={18} color="#7C3AED" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerDualTitle}>Tranh Chấp 2 Chiều Phát Sinh Đồng Thời</Text>
                <Text style={styles.bannerDualSub}>
                  Cả bạn và đối tác đều đã gửi lời khai đối lập nhau. Ban Quản Trị sẽ đối chiếu lời khai và ảnh minh chứng của hai bên để ra phán quyết xử lý tiền cọc.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.bannerSingle}>
              <Ionicons name="alert-circle-outline" size={18} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerSingleTitle}>
                  {isMUA
                    ? (isMuaOnly ? 'Báo Cáo Sự Cố Do Bạn Khởi Tạo' : 'Đơn Hàng Do Khách Hàng Khiếu Nại')
                    : (isMuaOnly ? 'Chuyên Viên Make-up Đã Báo Cáo Sự Cố' : 'Yêu Cầu Khiếu Nại Do Bạn Gửi')}
                </Text>
                <Text style={styles.bannerSingleSub}>
                  Tiền cọc {formatVnd(depositAmount)} đang được khóa an toàn trong Quỹ Escrow. Admin sẽ đối chiếu minh chứng và giải ngân công bằng.
                </Text>
              </View>
            </View>
          )}

          {/* Section 1: Counterparty Dossier (Hồ sơ của đối tác) */}
          <View style={styles.dossierCard}>
            <View style={styles.dossierHeader}>
              <View style={[styles.dossierRoleBadge, { backgroundColor: isMUA ? '#FFF1F2' : '#FEF3C7' }]}>
                <Ionicons
                  name={isMUA ? 'person-outline' : 'sparkles'}
                  size={13}
                  color={isMUA ? '#E11D48' : '#D97706'}
                />
                <Text style={[styles.dossierRoleText, { color: isMUA ? '#E11D48' : '#D97706' }]}>
                  {isMUA ? 'Phía Khách Hàng' : 'Phía Chuyên Viên'}
                </Text>
              </View>
              {reportedAt ? (
                <Text style={styles.dossierTimeText}>{formatDateTimeVN(reportedAt)}</Text>
              ) : null}
            </View>

            <Text style={styles.dossierTitle}>{counterpartyTitle}</Text>

            <View style={styles.statementBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#64748B" style={styles.quoteIcon} />
              <Text style={styles.statementText}>
                "{counterpartyStatement || (isMUA ? 'Khách hàng chưa nộp lời khai riêng' : 'Chuyên viên chưa gửi lời khai')}"
              </Text>
            </View>

            {/* Proof photo of counterparty */}
            <View style={styles.proofSection}>
              <Text style={styles.proofLabel}>Ảnh minh chứng tại hiện trường:</Text>
              {counterpartyProof ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setPreviewPhotoUrl(counterpartyProof)}
                  style={styles.proofThumbnailWrap}
                >
                  <Image source={{ uri: counterpartyProof }} style={styles.proofThumbnail} resizeMode="cover" />
                  <View style={styles.zoomBadge}>
                    <Ionicons name="expand" size={13} color="#FFFFFF" />
                    <Text style={styles.zoomText}>Phóng to</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.noProofBox}>
                  <Ionicons name="image-outline" size={16} color="#94A3B8" />
                  <Text style={styles.noProofText}>Không có ảnh minh chứng đính kèm</Text>
                </View>
              )}
            </View>
          </View>

          {/* Section 2: My Dossier (Hồ sơ của bạn) */}
          <View style={[styles.dossierCard, !hasMyStatement && styles.dossierCardPending]}>
            <View style={styles.dossierHeader}>
              <View style={[styles.dossierRoleBadge, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="shield-outline" size={13} color="#475569" />
                <Text style={[styles.dossierRoleText, { color: '#475569' }]}>Báo Cáo Của Bạn</Text>
              </View>
              {hasMyStatement && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {reportedAt ? (
                    <Text style={styles.dossierTimeText}>{formatDateTimeVN(reportedAt)}</Text>
                  ) : null}
                  <View style={styles.submittedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" />
                    <Text style={styles.submittedBadgeText}>Đã gửi</Text>
                  </View>
                </View>
              )}
            </View>

            {hasMyStatement ? (
              <>
                <View style={styles.statementBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#64748B" style={styles.quoteIcon} />
                  <Text style={styles.statementText}>"{myStatement}"</Text>
                </View>

                {myProof && (
                  <View style={styles.proofSection}>
                    <Text style={styles.proofLabel}>Ảnh minh chứng bạn đã tải lên:</Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPreviewPhotoUrl(myProof)}
                      style={styles.proofThumbnailWrap}
                    >
                      <Image source={{ uri: myProof }} style={styles.proofThumbnail} resizeMode="cover" />
                      <View style={styles.zoomBadge}>
                        <Ionicons name="expand" size={13} color="#FFFFFF" />
                        <Text style={styles.zoomText}>Phóng to</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : isEditingCounterDispute ? (
              /* Inline Form Soạn Thảo Lời Khai Đối Chất Ngay Tại Chỗ */
              <View style={styles.inlineFormBox}>
                <View style={styles.inlineFormHeader}>
                  <Ionicons name="create" size={16} color="#EA580C" />
                  <Text style={styles.inlineFormTitle}>Soạn Thảo Lời Khai Đối Chất</Text>
                </View>
                <Text style={styles.inlineFormSub}>
                  Chọn hoặc nhập lý do thực tế tại thời điểm hẹn để Ban Quản Trị đối soát:
                </Text>

                {/* Chips lý do nhanh */}
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

                {/* Text Input */}
                <TextInput
                  style={styles.textArea}
                  placeholder="Nhập chi tiết tình huống thực tế tại thời điểm hẹn..."
                  placeholderTextColor="#94A3B8"
                  value={detailReason}
                  onChangeText={setDetailReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isSubmitting}
                />

                {/* Image Proof */}
                <Text style={styles.proofPickerLabel}>Ảnh minh chứng (nhật ký cuộc gọi, check-in):</Text>
                {proofLocalUri ? (
                  <View style={styles.proofPreviewWrap}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPreviewPhotoUrl(proofLocalUri)}
                      style={{ width: '100%', height: 160 }}
                    >
                      <Image source={{ uri: proofLocalUri }} style={styles.proofPreviewImage} />
                    </TouchableOpacity>
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
                      <Ionicons name="images-outline" size={16} color="#475569" />
                      <Text style={styles.uploadBtnText}>Thư viện ảnh</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadBtn} onPress={handleTakePhoto} disabled={isSubmitting} activeOpacity={0.8}>
                      <Ionicons name="camera-outline" size={16} color="#475569" />
                      <Text style={styles.uploadBtnText}>Chụp ảnh mới</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Form Action Buttons */}
                <View style={styles.inlineFormBtnRow}>
                  <TouchableOpacity
                    style={styles.inlineCancelBtn}
                    onPress={() => setIsEditingCounterDispute(false)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.inlineCancelBtnText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.inlineSubmitBtn, isSubmitting && { opacity: 0.7 }]}
                    onPress={handleSubmitDispute}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
                        <Text style={styles.inlineSubmitBtnText}>Gửi Báo Cáo Đối Chất</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.notSubmittedBox}>
                <Ionicons name="information-circle-outline" size={20} color="#D97706" />
                <Text style={styles.notSubmittedTitle}>Bạn chưa gửi báo cáo phản hồi sự cố</Text>
                <Text style={styles.notSubmittedSub}>
                  Nếu nhận thấy đối tác báo cáo chưa chính xác, bạn có thể gửi phản hồi kèm ảnh minh chứng để bảo vệ quyền lợi.
                </Text>

                <TouchableOpacity
                  style={styles.counterDisputeBtn}
                  onPress={() => setIsEditingCounterDispute(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.counterDisputeBtnText}>Gửi Báo Cáo Phản Hồi Ngay</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </DismissibleModal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '88%',
    padding: 0,
    overflow: 'hidden',
  },
  headerRow: {
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
    backgroundColor: '#FFE4E6',
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
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  bannerDual: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    padding: 12,
  },
  bannerDualTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D28D9',
  },
  bannerDualSub: {
    fontSize: 11,
    color: '#7C3AED',
    marginTop: 2,
    lineHeight: 16,
  },
  bannerSingle: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
  },
  bannerSingleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  bannerSingleSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  dossierCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
  },
  dossierCardPending: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },
  dossierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dossierRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dossierRoleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dossierTimeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  submittedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  dossierTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  statementBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    paddingLeft: 28,
  },
  quoteIcon: {
    position: 'absolute',
    top: 10,
    left: 8,
  },
  statementText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  proofSection: {
    marginTop: 10,
  },
  proofLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  proofThumbnailWrap: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  proofThumbnail: {
    width: '100%',
    height: '100%',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  noProofBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  noProofText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  notSubmittedBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  notSubmittedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 4,
    textAlign: 'center',
  },
  notSubmittedSub: {
    fontSize: 11,
    color: '#B45309',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 15,
  },
  counterDisputeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E11D48',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  counterDisputeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineFormBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  inlineFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inlineFormTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9A3412',
  },
  inlineFormSub: {
    fontSize: 11,
    color: '#C2410C',
    lineHeight: 16,
    marginBottom: 10,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chipItem: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  chipItemSelected: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  chipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: '#1E293B',
    minHeight: 72,
    marginBottom: 10,
  },
  proofPickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 6,
  },
  proofPreviewWrap: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    height: 120,
    marginBottom: 10,
  },
  proofPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removeProofBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  uploadBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  inlineFormBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  inlineCancelBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  inlineSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#EA580C',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  inlineSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lightboxOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10000,
  },
  lightboxImage: {
    width: '92%',
    height: '78%',
  },
});
