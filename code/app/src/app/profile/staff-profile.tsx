import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BrandColors } from '@/constants/theme';
import { staffProfileService, AgencyStaffProfile, StaffCertificate } from '@/services/staff-profile.service';
import { parseApiError } from '@/utils/error';

export default function StaffWorkProfileScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [staffProfile, setStaffProfile] = useState<AgencyStaffProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State Modal tải lên chứng chỉ
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [certNameInput, setCertNameInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isSubmittingCert, setIsSubmittingCert] = useState(false);

  // State xem ảnh preview lớn
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const refreshStaffProfile = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await staffProfileService.getMyStaffProfile();
      setStaffProfile(data);
    } catch (err: any) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Chưa tìm thấy thông tin Studio liên kết.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    staffProfileService
      .getMyStaffProfile()
      .then((data) => {
        if (isMounted) setStaffProfile(data);
      })
      .catch((err: any) => {
        if (isMounted) {
          const parsed = parseApiError(err);
          setErrorMessage(parsed.message || 'Chưa tìm thấy thông tin Studio liên kết.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập máy ảnh để chụp ảnh bằng cấp.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở máy ảnh.');
    }
  };

  const handleSubmitCertificate = async () => {
    if (!certNameInput.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên chứng chỉ hoặc bằng cấp.');
      return;
    }
    if (!selectedImageUri) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn hoặc chụp ảnh bằng cấp.');
      return;
    }

    setIsSubmittingCert(true);
    try {
      const formData = new FormData();
      const fileName = `cert_${Date.now()}.jpg`;

      if (Platform.OS === 'web') {
        const fetchRes = await fetch(selectedImageUri);
        const blob = await fetchRes.blob();
        formData.append('file', blob, fileName);
      } else {
        formData.append('file', {
          uri: selectedImageUri,
          name: fileName,
          type: 'image/jpeg',
        } as any);
      }

      formData.append('certName', certNameInput.trim());
      if (notesInput.trim()) {
        formData.append('notes', notesInput.trim());
      }

      await staffProfileService.uploadStaffCertificate(formData);
      Alert.alert('Thành công', 'Đã nộp chứng chỉ lên Studio để kiểm duyệt.');
      setIsUploadModalOpen(false);
      setCertNameInput('');
      setNotesInput('');
      setSelectedImageUri(null);
      await refreshStaffProfile();
    } catch (err: any) {
      const parsed = parseApiError(err);
      Alert.alert('Lỗi tải lên', parsed.message || 'Không thể tải lên chứng chỉ.');
    } finally {
      setIsSubmittingCert(false);
    }
  };

  const handleDeleteCertificate = (cert: StaffCertificate) => {
    Alert.alert(
      'Xóa chứng chỉ',
      `Bạn có chắc chắn muốn xóa chứng chỉ "${cert.certName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await staffProfileService.deleteStaffCertificate(cert.certName);
              await refreshStaffProfile();
            } catch (err: any) {
              const parsed = parseApiError(err);
              Alert.alert('Lỗi', parsed.message || 'Không thể xóa chứng chỉ.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={BrandColors.slateHeading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ Sơ Nhân Sự Studio</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải hồ sơ nhân sự Studio...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerBox}>
          <Ionicons name="business-outline" size={40} color={BrandColors.slateMuted} />
          <Text style={styles.errorTitle}>Chưa Liên Kết Studio</Text>
          <Text style={styles.errorSub}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={refreshStaffProfile}
            activeOpacity={0.7}
          >
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : staffProfile ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* THẺ STUDIO LIÊN KẾT */}
          <View style={styles.studioCard}>
            <View style={styles.studioHeaderRow}>
              {staffProfile.agencyLogoUrl ? (
                <Image
                  source={{ uri: staffProfile.agencyLogoUrl }}
                  style={styles.studioLogo}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.studioLogoPlaceholder}>
                  <Ionicons name="business-outline" size={22} color={BrandColors.primary} />
                </View>
              )}
              <View style={styles.studioHeaderInfo}>
                <Text style={styles.studioName}>{staffProfile.agencyName}</Text>
                <Text style={styles.agencyCodeText}>
                  Mã Studio: {staffProfile.agencyCode || `AG-${staffProfile.agencyId}`}
                </Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>
                    {staffProfile.status === 'ACTIVE'
                      ? 'Đang làm việc chính thức'
                      : staffProfile.status === 'PENDING'
                        ? 'Chờ phê duyệt gia nhập'
                        : staffProfile.status}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Thông tin liên hệ cơ sở */}
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={15} color={BrandColors.slateMuted} />
              <Text style={styles.infoText}>
                Hotline Studio: {staffProfile.agencyPhone || 'Chưa cập nhật'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={15} color={BrandColors.slateMuted} />
              <Text style={styles.infoText} numberOfLines={2}>
                Địa chỉ: {staffProfile.agencyAddress || 'Chưa cập nhật'}
              </Text>
            </View>
          </View>

          {/* CHÍNH SÁCH HOA HỒNG & ĐÃI NGỘ */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="wallet-outline" size={16} color={BrandColors.slateHeading} />
              <Text style={styles.cardTitle}>Chính Sách Hoa Hồng Thỏa Thuận</Text>
            </View>
            <View style={styles.commissionBox}>
              <Text style={styles.commissionVal}>
                {staffProfile.agreedCommissionRate !== undefined && staffProfile.agreedCommissionRate !== null
                  ? `${staffProfile.agreedCommissionRate}%`
                  : 'Theo tỷ lệ mặc định Studio'}
              </Text>
              <Text style={styles.commissionDesc}>
                Tỷ lệ chiết khấu thu nhập cá nhân được hưởng trên mỗi ca làm việc hoàn thành tại Studio.
              </Text>
            </View>
          </View>

          {/* CHỨNG CHỈ & BẰNG CẤP NGHỀ NGHIỆP */}
          <View style={styles.card}>
            <View style={styles.cardHeaderWithAction}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="ribbon-outline" size={16} color={BrandColors.slateHeading} />
                <Text style={styles.cardTitle} numberOfLines={1}>Chứng Chỉ Nghề Nghiệp</Text>
              </View>
              <TouchableOpacity
                style={styles.addCertBtn}
                onPress={() => setIsUploadModalOpen(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={14} color={BrandColors.primary} />
                <Text style={styles.addCertBtnText}>Thêm mới</Text>
              </TouchableOpacity>
            </View>


            {(!staffProfile.certificates || staffProfile.certificates.length === 0) ? (
              <View style={styles.emptyCertBox}>
                <Text style={styles.emptyText}>Chưa có chứng chỉ nghề nghiệp nào được ghi nhận.</Text>
                <Text style={styles.emptySubText}>
                  Bạn có thể nộp chứng chỉ để Studio kiểm duyệt và xác nhận tay nghề.
                </Text>
              </View>
            ) : (
              <View style={styles.certList}>
                {staffProfile.certificates.map((cert, index) => {
                  const isPlatform = cert.scope === 'PLATFORM';
                  const isVerified = cert.status === 'VERIFIED';
                  const isRejected = cert.status === 'REJECTED';
                  const isPending = cert.status === 'PENDING';

                  return (
                    <View key={`cert-${index}`} style={styles.certItem}>
                      <TouchableOpacity
                        style={styles.certThumbBox}
                        onPress={() => cert.imageUrl && setPreviewImageUrl(cert.imageUrl)}
                        activeOpacity={0.8}
                      >
                        {cert.imageUrl ? (
                          <Image
                            source={{ uri: cert.imageUrl }}
                            style={styles.certThumb}
                            contentFit="cover"
                          />
                        ) : (
                          <Ionicons name="document-text-outline" size={24} color={BrandColors.slateMuted} />
                        )}
                      </TouchableOpacity>

                      <View style={styles.certMeta}>
                        <View style={styles.certTitleLine}>
                          <Text style={styles.certNameText} numberOfLines={1}>
                            {cert.certName}
                          </Text>
                          {/* Nút xóa nếu chưa duyệt hoặc bị từ chối */}
                          {(isPending || isRejected) && (
                            <TouchableOpacity
                              onPress={() => handleDeleteCertificate(cert)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash-outline" size={16} color="#94A3B8" />
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Phân loại nguồn chứng chỉ (Scope) & Trạng thái */}
                        <View style={styles.certBadgeRow}>
                          <View
                            style={[
                              styles.scopeBadge,
                              isPlatform ? styles.scopePlatformBadge : styles.scopeAgencyBadge,
                            ]}
                          >
                            <Text
                              style={[
                                styles.scopeBadgeText,
                                isPlatform ? styles.scopePlatformText : styles.scopeAgencyText,
                              ]}
                            >
                              {isPlatform ? 'Toàn sàn' : 'Studio'}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.certStatusBadge,
                              isVerified
                                ? styles.statusVerifiedBadge
                                : isRejected
                                  ? styles.statusRejectedBadge
                                  : styles.statusPendingBadge,
                            ]}
                          >
                            <Text
                              style={[
                                styles.certStatusText,
                                isVerified
                                  ? styles.statusVerifiedText
                                  : isRejected
                                    ? styles.statusRejectedText
                                    : styles.statusPendingText,
                              ]}
                            >
                              {isVerified
                                ? 'Đã duyệt'
                                : isRejected
                                  ? 'Từ chối'
                                  : 'Chờ duyệt'}
                            </Text>
                          </View>
                        </View>

                        {cert.notes ? (
                          <Text style={styles.certNotesText} numberOfLines={2}>
                            {cert.notes}
                          </Text>
                        ) : null}

                        {isRejected && cert.rejectionReason ? (
                          <Text style={styles.rejectionReasonText} numberOfLines={2}>
                            Lý do: {cert.rejectionReason}
                          </Text>
                        ) : null}

                        {isVerified && cert.verifierName ? (
                          <Text style={styles.verifierInfoText}>
                            Người duyệt: {cert.verifierName}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* NĂNG LỰC PHONG CÁCH ĐƯỢC PHỤ TRÁCH */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="color-palette-outline" size={16} color={BrandColors.slateHeading} />
              <Text style={styles.cardTitle}>Phong Cách Được Gán Phụ Trách</Text>
            </View>

            {(!staffProfile.assignedStyles || staffProfile.assignedStyles.length === 0) ? (
              <Text style={styles.emptyText}>Chưa có phong cách nào được Studio gán duyệt.</Text>
            ) : (
              <View style={styles.stylesWrap}>
                {staffProfile.assignedStyles.map((s) => (
                  <View key={`style-${s.id}`} style={styles.styleChip}>
                    <Text style={styles.styleChipText}>{s.styleName}</Text>
                    {s.isQualified && (
                      <Ionicons name="checkmark" size={13} color="#15803D" />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {staffProfile.note ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ghi Chú Nội Bộ</Text>
              <Text style={styles.noteText}>{staffProfile.note}</Text>
            </View>
          ) : null}

          <View style={{ height: 30 }} />
        </ScrollView>
      ) : null}

      {/* MODAL TẢI LÊN CHỨNG CHỈ NGHỀ NGHIỆP */}
      <Modal
        visible={isUploadModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => !isSubmittingCert && setIsUploadModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tải Lên Chứng Chỉ Nghề Nghiệp</Text>
              <TouchableOpacity
                onPress={() => !isSubmittingCert && setIsUploadModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={BrandColors.slateMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              <Text style={styles.inputLabel}>Tên chứng chỉ / bằng cấp *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="VD: Chứng chỉ Makeup Cô Dâu Nâng Cao"
                placeholderTextColor={BrandColors.slateMuted}
                value={certNameInput}
                onChangeText={setCertNameInput}
                editable={!isSubmittingCert}
              />

              <Text style={styles.inputLabel}>Ghi chú thêm (tùy chọn)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Nơi cấp bằng, khóa học, ngày hoàn thành..."
                placeholderTextColor={BrandColors.slateMuted}
                value={notesInput}
                onChangeText={setNotesInput}
                multiline
                numberOfLines={3}
                editable={!isSubmittingCert}
              />

              <Text style={styles.inputLabel}>Ảnh chụp chứng chỉ / bằng cấp *</Text>
              {selectedImageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: selectedImageUri }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setSelectedImageUri(null)}
                    disabled={isSubmittingCert}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePickerActions}>
                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={handlePickImage}
                    disabled={isSubmittingCert}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="images-outline" size={18} color={BrandColors.slateHeading} />
                    <Text style={styles.pickerBtnText}>Chọn từ thư viện</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={handleTakePhoto}
                    disabled={isSubmittingCert}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera-outline" size={18} color={BrandColors.slateHeading} />
                    <Text style={styles.pickerBtnText}>Chụp ảnh mới</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.guidelineText}>
                * Chứng chỉ sau khi tải lên sẽ được Studio xem xét và duyệt nội bộ.
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsUploadModalOpen(false)}
                disabled={isSubmittingCert}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, isSubmittingCert && { opacity: 0.7 }]}
                onPress={handleSubmitCertificate}
                disabled={isSubmittingCert}
                activeOpacity={0.7}
              >
                {isSubmittingCert ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Gửi Duyệt</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL XEM PHÓNG TO ẢNH CHỨNG CHỈ */}
      <Modal
        visible={!!previewImageUrl}
        animationType="fade"
        transparent
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.closeImageModalBtn}
            onPress={() => setPreviewImageUrl(null)}
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImageUrl && (
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.fullPreviewImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: BrandColors.slateMuted,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateHeading,
    marginTop: 8,
  },
  errorSub: {
    fontSize: 13,
    color: BrandColors.slateMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: BrandColors.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 14,
  },
  studioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  studioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studioLogo: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  studioLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  studioName: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  agencyCodeText: {
    fontSize: 12,
    color: BrandColors.slateMuted,
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 2,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: BrandColors.slateHeading,
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 6,
  },
  cardHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  addCertBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  addCertBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.primary,
  },

  commissionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  commissionVal: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  commissionDesc: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    lineHeight: 16,
  },
  emptyCertBox: {
    paddingVertical: 8,
    gap: 4,
  },
  emptyText: {
    fontSize: 13,
    color: BrandColors.slateHeading,
    fontWeight: '500',
  },
  emptySubText: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    lineHeight: 16,
  },
  certList: {
    gap: 10,
  },
  certItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  certThumbBox: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  certThumb: {
    width: '100%',
    height: '100%',
  },
  certMeta: {
    flex: 1,
    gap: 4,
  },
  certTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  certNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.slateHeading,
    flex: 1,
    marginRight: 6,
  },
  certBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scopeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  scopePlatformBadge: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  scopeAgencyBadge: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  scopeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  scopePlatformText: {
    color: '#475569',
  },
  scopeAgencyText: {
    color: '#0369A1',
  },
  certStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusVerifiedBadge: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusPendingBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusRejectedBadge: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  certStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusVerifiedText: {
    color: '#15803D',
  },
  statusPendingText: {
    color: '#B45309',
  },
  statusRejectedText: {
    color: '#B91C1C',
  },
  certNotesText: {
    fontSize: 11,
    color: BrandColors.slateMuted,
    lineHeight: 15,
  },
  rejectionReasonText: {
    fontSize: 11,
    color: '#B91C1C',
    lineHeight: 15,
  },
  verifierInfoText: {
    fontSize: 10,
    color: BrandColors.slateMuted,
  },
  stylesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  styleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  noteText: {
    fontSize: 13,
    color: BrandColors.slateHeading,
    lineHeight: 18,
  },
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.slateHeading,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: BrandColors.slateHeading,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  imagePickerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  pickerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  imagePreviewContainer: {
    position: 'relative',
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidelineText: {
    fontSize: 11,
    color: BrandColors.slateMuted,
    lineHeight: 16,
    marginTop: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // IMAGE PREVIEW MODAL
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageModalBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullPreviewImage: {
    width: '90%',
    height: '80%',
  },
});

