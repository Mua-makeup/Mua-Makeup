import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { muaProfileService, MuaPublicProfile, MuaCertificate } from '@/services/mua-profile.service';
import { parseApiError } from '@/utils/error';

const QUICK_RADIUS_OPTIONS = [5, 10, 15, 20, 25, 30, 50];

export default function MuaWorkProfileScreen() {
  const { userInfo } = useAuthStore();
  const muaId = userInfo?.muaId || 4;

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<MuaPublicProfile | null>(null);

  // Form fields nghề nghiệp
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState('1');
  const [maxRadius, setMaxRadius] = useState('15');
  const [baseAddressText, setBaseAddressText] = useState('');
  const [certificates, setCertificates] = useState<MuaCertificate[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Modal Upload Chứng chỉ
  const [isCertModalVisible, setIsCertModalVisible] = useState(false);
  const [certName, setCertName] = useState('');
  const [certImageUri, setCertImageUri] = useState<string | null>(null);
  const [isUploadingCert, setIsUploadingCert] = useState(false);

  useEffect(() => {
    loadMuaProfile();
  }, []);

  const loadMuaProfile = async () => {
    setIsLoading(true);
    try {
      const data = await muaProfileService.getMyProfile();
      setProfile(data);
      if (data.bio) setBio(data.bio);
      if (data.experienceYears !== undefined && data.experienceYears !== null) {
        setExperienceYears(String(data.experienceYears));
      }
      if (data.maxServiceRadiusKm !== undefined && data.maxServiceRadiusKm !== null) {
        setMaxRadius(String(data.maxServiceRadiusKm));
      }
      if (data.baseAddressText) {
        setBaseAddressText(data.baseAddressText);
      }
      if (data.certificates) {
        setCertificates(data.certificates);
      }
      if (data.portfolioImages) {
        setPortfolioImages(data.portfolioImages);
      }
    } catch (err: any) {
      const parsed = parseApiError(err);
      console.warn('Lỗi tải hồ sơ MUA:', parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMuaProfile = async () => {
    setFieldErrors({});

    const expNum = parseInt(experienceYears, 10);
    const radNum = parseFloat(maxRadius);

    const errors: Record<string, string> = {};
    if (isNaN(expNum) || expNum < 0) {
      errors.experienceYears = 'Số năm kinh nghiệm không được âm.';
    }
    if (isNaN(radNum) || radNum < 1 || radNum > 50) {
      errors.maxRadius = 'Bán kính nhận ca phải từ 1.0 đến 50.0 km.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await muaProfileService.updateMyProfile({
        bio: bio.trim(),
        experienceYears: expNum,
        maxServiceRadiusKm: radNum,
        baseAddressText: baseAddressText ? baseAddressText.trim() : undefined,
      });

      Alert.alert('Thành công', 'Hồ sơ nghề nghiệp Thợ MUA đã được lưu thành công!');
    } catch (err: any) {
      const parsed = parseApiError(err);
      if (parsed.fieldErrors) {
        setFieldErrors(parsed.fieldErrors);
      } else {
        Alert.alert('Lỗi cập nhật', parsed.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickAndUploadPortfolioImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để tải ảnh tác phẩm.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingPortfolio(true);
        try {
          const formData = new FormData();
          for (const asset of result.assets) {
            if (Platform.OS === 'web') {
              const fetchRes = await fetch(asset.uri);
              const blob = await fetchRes.blob();
              formData.append('files', blob, 'portfolio.jpg');
            } else {
              formData.append('files', {
                uri: asset.uri,
                name: 'portfolio.jpg',
                type: 'image/jpeg',
              } as any);
            }
          }
          const updatedImages = await muaProfileService.uploadPortfolioImages(formData);
          setPortfolioImages(updatedImages);
          Alert.alert('Thành công', `Đã tải lên ${result.assets.length} ảnh tác phẩm vào bộ sưu tập!`);
        } catch (uploadErr) {
          const parsed = parseApiError(uploadErr);
          Alert.alert('Lỗi tải ảnh', parsed.message || 'Không thể upload ảnh tác phẩm.');
        } finally {
          setIsUploadingPortfolio(false);
        }
      }
    } catch (err) {
      console.error('Lỗi chọn ảnh portfolio:', err);
    }
  };

  const handleDeletePortfolioImage = (imageUrl: string) => {
    Alert.alert('Xóa Ảnh Tác Phẩm', 'Bạn có chắc chắn muốn xóa ảnh này khỏi bộ sưu tập?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await muaProfileService.deletePortfolioImage(imageUrl);
            setPortfolioImages(updated);
          } catch (delErr) {
            const parsed = parseApiError(delErr);
            Alert.alert('Lỗi xóa ảnh', parsed.message);
          }
        },
      },
    ]);
  };

  const handlePickCertImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập ảnh để tải chứng chỉ.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setCertImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error('Lỗi chọn ảnh chứng chỉ:', e);
    }
  };

  const handleUploadCertificate = async () => {
    if (!certName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên chứng chỉ hoặc bằng cấp.');
      return;
    }
    if (!certImageUri) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn ảnh chụp chứng chỉ.');
      return;
    }

    setIsUploadingCert(true);
    try {
      const formData = new FormData();
      formData.append('cert_name', certName.trim());
      if (Platform.OS === 'web') {
        const fetchRes = await fetch(certImageUri);
        const blob = await fetchRes.blob();
        formData.append('file', blob, 'cert.jpg');
      } else {
        formData.append('file', {
          uri: certImageUri,
          name: 'cert.jpg',
          type: 'image/jpeg',
        } as any);
      }

      const newCert = await muaProfileService.uploadCertificate(formData);
      setCertificates((prev) => [...prev, newCert]);
      setIsCertModalVisible(false);
      setCertName('');
      setCertImageUri(null);
      Alert.alert('Thành công', 'Chứng chỉ mới đã được tải lên và gửi xét duyệt!');
    } catch (err: any) {
      const parsed = parseApiError(err);
      Alert.alert('Lỗi tải chứng chỉ', parsed.message || 'Không thể upload chứng chỉ.');
    } finally {
      setIsUploadingCert(false);
    }
  };

  const handlePreviewPublicProfile = () => {
    router.push({
      pathname: '/mua-detail/[id]',
      params: { id: muaId },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={BrandColors.slateHeading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ Sơ Nghề Nghiệp MUA</Text>
        <TouchableOpacity
          style={styles.previewIconBtn}
          onPress={handlePreviewPublicProfile}
          activeOpacity={0.7}
        >
          <Ionicons name="eye-outline" size={22} color={BrandColors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin chuyên môn...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* BANNER XEM TRANG CÔNG KHAI */}
          <TouchableOpacity
            style={styles.publicPreviewBanner}
            onPress={handlePreviewPublicProfile}
            activeOpacity={0.8}
          >
            <View style={styles.publicPreviewLeft}>
              <View style={styles.globeIconBox}>
                <Ionicons name="globe-outline" size={22} color={BrandColors.primary} />
              </View>
              <View>
                <Text style={styles.publicPreviewTitle}>Xem Trang Cá Nhân Công Khai</Text>
                <Text style={styles.publicPreviewSub}>Xem cách khách hàng nhìn thấy dịch vụ và ảnh của bạn</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={BrandColors.primary} />
          </TouchableOpacity>

          {/* CARD ĐỊNH DANH MUA */}
          <View style={styles.muaStatCard}>
            <View style={styles.muaStatRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Mã định danh</Text>
                <Text style={styles.statValHighlight}>
                  {profile?.muaCode || `MUA-#${muaId}`}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Đánh giá</Text>
                <Text style={styles.statVal}>
                  ⭐ {profile?.ratingAverage ? profile.ratingAverage.toFixed(1) : '5.0'}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Đơn hoàn tất</Text>
                <Text style={styles.statVal}>
                  {profile?.totalCompletedJobs ?? 0}
                </Text>
              </View>
            </View>
          </View>

          {/* CARD CHUYÊN MÔN & TIỂU SỬ */}
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="sparkles" size={18} color={BrandColors.primary} />
              <Text style={styles.formCardTitle}>Chuyên Môn & Giới Thiệu</Text>
            </View>

            {/* Tiểu sử */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Tiểu Sử Nghề Nghiệp (Bio)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="VD: Chuyên gia trang điểm cô dâu tone Thái, tone Hàn Quốc. Mỹ phẩm cao cấp Chanel, Dior, NARS..."
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text style={styles.helperText}>
                Mô tả ngắn gọn gu trang điểm và phong cách của bạn để thu hút khách hàng.
              </Text>
            </View>

            {/* Địa chỉ cơ sở / Điểm xuất phát nhận ca */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Địa Chỉ Cơ Sở / Điểm Nhận Ca</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 120 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP.HCM"
                value={baseAddressText}
                onChangeText={setBaseAddressText}
              />
              <Text style={styles.helperText}>
                Địa chỉ gốc để hệ thống tính khoảng cách km và điều phối ca trang điểm phù hợp nhất.
              </Text>
            </View>

            {/* 2 Cột: Kinh nghiệm & Bán kính */}
            <View style={styles.twoColRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>
                  Kinh Nghiệm (Năm) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, fieldErrors.experienceYears && styles.inputError]}
                  placeholder="VD: 5"
                  value={experienceYears}
                  keyboardType="number-pad"
                  onChangeText={(text) => {
                    setExperienceYears(text);
                    if (fieldErrors.experienceYears) {
                      setFieldErrors((prev) => ({ ...prev, experienceYears: '' }));
                    }
                  }}
                />
                {fieldErrors.experienceYears ? (
                  <Text style={styles.errorText}>{fieldErrors.experienceYears}</Text>
                ) : null}
              </View>

              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.fieldLabel}>
                  Bán Kính Quét Đơn (km) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, fieldErrors.maxRadius && styles.inputError]}
                  placeholder="VD: 15"
                  value={maxRadius}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    setMaxRadius(text);
                    if (fieldErrors.maxRadius) {
                      setFieldErrors((prev) => ({ ...prev, maxRadius: '' }));
                    }
                  }}
                />
                {fieldErrors.maxRadius ? (
                  <Text style={styles.errorText}>{fieldErrors.maxRadius}</Text>
                ) : null}
              </View>
            </View>

            {/* Gợi ý chọn nhanh bán kính */}
            <View style={styles.radiusChipsWrapper}>
              <Text style={styles.radiusChipsTitle}>Gợi ý bán kính hoạt động:</Text>
              <View style={styles.radiusChipsRow}>
                {QUICK_RADIUS_OPTIONS.map((km) => {
                  const isSelected = maxRadius === String(km);
                  return (
                    <TouchableOpacity
                      key={`rad-${km}`}
                      style={[styles.radiusChip, isSelected && styles.radiusChipActive]}
                      onPress={() => setMaxRadius(String(km))}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.radiusChipText,
                          isSelected && styles.radiusChipTextActive,
                        ]}
                      >
                        {km} km
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* CARD CHỨNG CHỈ & BẰNG CẤP */}
          <View style={styles.formCard}>
            <View style={styles.certHeaderRow}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="ribbon-outline" size={18} color={BrandColors.primary} />
                <Text style={styles.formCardTitle}>Chứng Chỉ & Bằng Cấp ({certificates.length})</Text>
              </View>
              <TouchableOpacity
                style={styles.addCertBtn}
                onPress={() => setIsCertModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addCertBtnText}>Thêm</Text>
              </TouchableOpacity>
            </View>

            {certificates.length === 0 ? (
              <View style={styles.emptyCertBox}>
                <Ionicons name="document-text-outline" size={28} color={BrandColors.slateMuted} />
                <Text style={styles.emptyCertText}>Chưa có chứng chỉ nào được tải lên</Text>
                <Text style={styles.emptyCertSub}>Tải lên bằng cấp, chứng nhận để tăng uy tín với khách hàng</Text>
              </View>
            ) : (
              <View style={styles.certList}>
                {certificates.map((c) => (
                  <View key={`cert-${c.id}`} style={styles.certCard}>
                    {c.certificateImageUrl ? (
                      <Image
                        source={{ uri: c.certificateImageUrl }}
                        style={styles.certThumb}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.certThumbPlaceholder}>
                        <Ionicons name="image-outline" size={20} color={BrandColors.slateMuted} />
                      </View>
                    )}
                    <View style={styles.certInfo}>
                      <Text style={styles.certTitle} numberOfLines={1}>{c.certificateName}</Text>
                      <View style={styles.certBadgeRow}>
                        <View style={[styles.certStatusBadge, c.isVerified ? styles.certVerified : styles.certPending]}>
                          <Text style={[styles.certStatusText, c.isVerified ? styles.certVerifiedText : styles.certPendingText]}>
                            {c.isVerified ? '✓ Đã xác thực' : 'Đang duyệt'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* CARD BỘ SƯU TẬP TÁC PHẨM (PORTFOLIO IMAGES) */}
          <View style={styles.formCard}>
            <View style={styles.certHeaderRow}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="images-outline" size={18} color={BrandColors.primary} />
                <Text style={styles.formCardTitle}>Bộ Sưu Tập Tác Phẩm ({portfolioImages.length})</Text>
              </View>
              <TouchableOpacity
                style={styles.addCertBtn}
                onPress={handlePickAndUploadPortfolioImages}
                disabled={isUploadingPortfolio}
                activeOpacity={0.7}
              >
                {isUploadingPortfolio ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.addCertBtnText}>+ Thêm ảnh</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.helperText}>
              Chọn một lúc nhiều ảnh tác phẩm đã hoàn thành để tải lên Cloudinary và lưu vào bộ sưu tập của bạn.
            </Text>

            {portfolioImages.length === 0 ? (
              <View style={styles.emptyCertBox}>
                <Ionicons name="images-outline" size={28} color={BrandColors.slateMuted} />
                <Text style={styles.emptyCertText}>Chưa có ảnh tác phẩm nào</Text>
                <Text style={styles.emptyCertSub}>Tải lên nhiều ảnh chụp thực tế để khách hàng chiêm ngưỡng tay nghề của bạn</Text>
              </View>
            ) : (
              <View style={styles.portfolioGrid}>
                {portfolioImages.map((url, idx) => (
                  <View key={`pf-${idx}-${url}`} style={styles.portfolioGridItem}>
                    <Image source={{ uri: url }} style={styles.portfolioImageThumb} contentFit="cover" />
                    <TouchableOpacity
                      style={styles.deletePortfolioItemBtn}
                      onPress={() => handleDeletePortfolioImage(url)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* FOOTER SAVE BUTTON */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSaveMuaProfile}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Lưu Hồ Sơ Nghề Nghiệp</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL THÊM CHỨNG CHỈ */}
      <Modal
        visible={isCertModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCertModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.certModalCard}>
            <View style={styles.certModalHeader}>
              <Text style={styles.certModalTitle}>Thêm Chứng Chỉ Nghề Nghiệp</Text>
              <TouchableOpacity onPress={() => setIsCertModalVisible(false)}>
                <Ionicons name="close" size={22} color={BrandColors.slateHeading} />
              </TouchableOpacity>
            </View>

            <View style={styles.certModalBody}>
              <Text style={styles.fieldLabel}>Tên Chứng Chỉ / Bằng Cấp <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Chứng chỉ Makeup Cô dâu Chuyên nghiệp"
                value={certName}
                onChangeText={setCertName}
              />

              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Ảnh Chụp Chứng Chỉ <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity
                style={styles.certImageUploadBox}
                onPress={handlePickCertImage}
                activeOpacity={0.7}
              >
                {certImageUri ? (
                  <Image source={{ uri: certImageUri }} style={styles.certUploadedPreview} contentFit="contain" />
                ) : (
                  <View style={styles.certUploadPlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={28} color={BrandColors.primary} />
                    <Text style={styles.certUploadPlaceholderText}>Chạm để chọn ảnh từ thư viện</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitCertBtn, isUploadingCert && styles.saveButtonDisabled]}
                onPress={handleUploadCertificate}
                disabled={isUploadingCert}
                activeOpacity={0.8}
              >
                {isUploadingCert ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitCertBtnText}>Tải Lên Chứng Chỉ</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  previewIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: BrandColors.slateMuted,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 16,
  },
  publicPreviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  publicPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  globeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publicPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  publicPreviewSub: {
    fontSize: 11,
    color: '#9F1239',
    marginTop: 2,
  },
  muaStatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  muaStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: BrandColors.slateMuted,
  },
  statValHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
    marginTop: 3,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.slateHeading,
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  required: {
    color: BrandColors.primary,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: BrandColors.slateHeading,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 84,
    paddingTop: 10,
  },
  inputError: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF1F2',
  },
  errorText: {
    fontSize: 12,
    color: BrandColors.primary,
    marginTop: 2,
  },
  helperText: {
    fontSize: 11,
    color: BrandColors.slateMuted,
    marginTop: 2,
  },
  twoColRow: {
    flexDirection: 'row',
  },
  radiusChipsWrapper: {
    gap: 8,
  },
  radiusChipsTitle: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    fontWeight: '600',
  },
  radiusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  radiusChipActive: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFE4E6',
  },
  radiusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  radiusChipTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  certHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addCertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addCertBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCertBox: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyCertText: {
    fontSize: 13,
    color: BrandColors.slateHeading,
    fontWeight: '600',
  },
  emptyCertSub: {
    fontSize: 11,
    color: BrandColors.slateMuted,
  },
  certList: {
    gap: 10,
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  certThumb: {
    width: 60,
    height: 45,
    borderRadius: 6,
  },
  certThumbPlaceholder: {
    width: 60,
    height: 45,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certInfo: {
    flex: 1,
    gap: 4,
  },
  certTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  certBadgeRow: {
    flexDirection: 'row',
  },
  certStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  certVerified: {
    backgroundColor: '#DCFCE7',
  },
  certPending: {
    backgroundColor: '#FEF3C7',
  },
  certStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  certVerifiedText: {
    color: '#15803D',
  },
  certPendingText: {
    color: '#B45309',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  saveButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  certModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 16,
  },
  certModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  certModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  certModalBody: {
    gap: 8,
  },
  certImageUploadBox: {
    height: 120,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  certUploadedPreview: {
    width: '100%',
    height: '100%',
  },
  certUploadPlaceholder: {
    alignItems: 'center',
    gap: 6,
  },
  certUploadPlaceholderText: {
    fontSize: 12,
    color: BrandColors.slateMuted,
  },
  submitCertBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitCertBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolioGridItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  portfolioImageThumb: {
    width: '100%',
    height: '100%',
  },
  deletePortfolioItemBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
