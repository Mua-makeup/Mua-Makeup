import { DismissibleModal } from '@/components/common/DismissibleModal';
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BrandColors } from '@/constants/theme';
import { muaProfileService, MuaPublicProfile, MuaCertificate } from '@/services/mua-profile.service';
import { mapsService } from '@/services/maps.service';
import * as Location from 'expo-location';
import { parseApiError } from '@/utils/error';
import { SwipeableBottomSheet } from '@/components/common/SwipeableBottomSheet';
import { useWorkstationStore } from '@/store/workstation.store';

import { VerticalNumberPicker } from '@/components/common/VerticalNumberPicker';

export default function MuaWorkProfileScreen() {

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<MuaPublicProfile | null>(null);

  // Form fields nghề nghiệp
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [maxRadius, setMaxRadius] = useState('');
  const [savedRadius, setSavedRadius] = useState(15);
  const experienceOptions = useMemo(() => Array.from({ length: Math.max(100, Number(experienceYears) || 0) + 1 }, (_, i) => i), [experienceYears]);
  const radiusOptions = useMemo(() => [...new Set([...Array.from({ length: 50 }, (_, i) => i + 1), savedRadius])].sort((a, b) => a - b), [savedRadius]);
  const [baseAddressText, setBaseAddressText] = useState('');
  const [baseAddressLat, setBaseAddressLat] = useState<number | null>(null);
  const [baseAddressLng, setBaseAddressLng] = useState<number | null>(null);
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
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

  // Modal Xem trước ảnh phóng to (Chứng chỉ & Portfolio)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void loadMuaProfile();
  }, []));

  const loadMuaProfile = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await muaProfileService.getMyProfile();
      setProfile(data);
      setBio(data.bio ?? '');
      setExperienceYears(String(data.experienceYears ?? 0));
      setMaxRadius(String(data.maxServiceRadiusKm ?? 15));
      setSavedRadius(Number(data.maxServiceRadiusKm ?? 15));
      setBaseAddressText(data.baseAddressText ?? '');
      setBaseAddressLat(data.baseAddressLat == null ? null : Number(data.baseAddressLat));
      setBaseAddressLng(data.baseAddressLng == null ? null : Number(data.baseAddressLng));
      setCertificates(data.certificates ?? []);
      setPortfolioImages(data.portfolioImages ?? []);
    } catch (err: any) {
      const parsed = parseApiError(err);
      setLoadError(parsed.message || 'Không thể tải hồ sơ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setIsLocatingAddress(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền vị trí để lấy tọa độ hiện tại.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const geo = await mapsService.reverseGeocode(lat, lng);
      setBaseAddressLat(lat);
      setBaseAddressLng(lng);
      setFieldErrors((prev) => ({ ...prev, baseAddressText: '' }));
      setBaseAddressText(geo?.formattedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      Alert.alert('Đã định vị GPS', `Đã nhận diện vị trí cơ sở thành công:\n${geo?.formattedAddress || `${lat}, ${lng}`}`);
    } catch (e: any) {
      Alert.alert('Lỗi định vị', e.message || 'Không thể lấy vị trí hiện tại');
    } finally {
      setIsLocatingAddress(false);
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

    if (!baseAddressText.trim()) errors.baseAddressText = 'Vui lòng nhập địa điểm nhận ca.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      let latToSend = baseAddressLat;
      let lngToSend = baseAddressLng;

      // Nếu thợ đã nhập địa chỉ chữ nhưng chưa có tọa độ GPS, tự động geocode ngay
      if ((latToSend == null || lngToSend == null) && baseAddressText && baseAddressText.trim()) {
        try {
          const geo = await mapsService.geocode(baseAddressText.trim());
          if (geo?.latitude != null && geo?.longitude != null) {
            latToSend = geo.latitude;
            lngToSend = geo.longitude;
            setBaseAddressLat(latToSend);
            setBaseAddressLng(lngToSend);
          }
        } catch {
          // Hiển thị hướng dẫn bên dưới nếu chưa xác định được tọa độ.
        }
      }

      if (latToSend == null || lngToSend == null) {
        setFieldErrors({ baseAddressText: 'Không xác định được tọa độ. Nhập địa chỉ đầy đủ hoặc dùng GPS tại cơ sở.' });
        return;
      }
      const saved = await muaProfileService.updateMyProfile({
        bio: bio.trim(),
        experienceYears: expNum,
        maxServiceRadiusKm: radNum,
        baseAddressText: baseAddressText ? baseAddressText.trim() : undefined,
        baseAddressLat: latToSend ?? undefined,
        baseAddressLng: lngToSend ?? undefined,
      });

      setProfile(saved);
      setBaseAddressText(saved.baseAddressText ?? '');
      setBaseAddressLat(saved.baseAddressLat == null ? null : Number(saved.baseAddressLat));
      setBaseAddressLng(saved.baseAddressLng == null ? null : Number(saved.baseAddressLng));
      useWorkstationStore.setState({ profile: saved });

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
    if (!profile?.muaId) return;
    router.push({
      pathname: '/mua-detail/[id]',
      params: { id: profile.muaId },
    });
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={BrandColors.slateHeading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ nghề nghiệp</Text>
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
      ) : loadError ? (
        <View style={styles.centerLoading}>
          <Text style={styles.loadingText}>{loadError}</Text>
          <TouchableOpacity onPress={loadMuaProfile}>
            <Text style={styles.publicPreviewTitle}>Thử lại</Text>
          </TouchableOpacity>
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
              <View style={{ flex: 1 }}>
                <Text style={styles.publicPreviewTitle}>Xem Trang Cá Nhân Công Khai</Text>
                <Text style={styles.publicPreviewSub} numberOfLines={1}>
                  Xem cách khách hàng nhìn thấy dịch vụ và ảnh của bạn
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={BrandColors.primary} />
          </TouchableOpacity>

          {/* CARD ĐỊNH DANH MUA SANG TRỌNG & RỘNG RÃI */}
          <View style={styles.muaStatCard}>
            <View style={styles.muaCodeBadgeRow}>
              <View style={styles.muaCodeBadge}>
                <Ionicons name="shield-checkmark" size={15} color={BrandColors.primary} />
                <Text style={styles.muaCodeBadgeText}>
                  {profile?.muaCode ?? 'MUA-PLATFORM'}
                </Text>
              </View>
              <View style={styles.proPill}>
                <Text style={styles.proPillText}>Thợ Chuyên Nghiệp</Text>
              </View>
            </View>

            <View style={styles.muaDivider} />

            <View style={styles.muaStatRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Đánh giá thợ</Text>
                <View style={styles.statValRow}>
                  <Ionicons name="star" size={15} color="#F59E0B" />
                  <Text style={styles.statVal}>
                    {profile?.totalReviews ? Number(profile.ratingAverage).toFixed(1) : '5.0'}
                  </Text>
                  <Text style={styles.statSubText}>
                    ({profile?.totalReviews || 0} ĐG)
                  </Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Đơn hoàn tất</Text>
                <View style={styles.statValRow}>
                  <Ionicons name="ribbon" size={15} color="#059669" />
                  <Text style={[styles.statVal, { color: '#059669' }]}>
                    {profile?.totalCompletedJobs ?? 0}
                  </Text>
                  <Text style={styles.statSubText}>ca làm</Text>
                </View>
              </View>
            </View>
          </View>

          {/* CARD CHUYÊN MÔN, TIỂU SỬ & KINH NGHIỆM */}
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="document-text-outline" size={18} color={BrandColors.primary} />
              <Text style={styles.formCardTitle}>Giới thiệu & Kinh nghiệm</Text>
            </View>

            {/* Tiểu sử */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Giới thiệu bản thân</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Phong cách trang điểm, thế mạnh và kinh nghiệm của bạn…"
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

            {/* Kinh nghiệm làm nghề */}
            <View style={{ marginTop: 4 }}>
              <VerticalNumberPicker
                label="Kinh nghiệm làm nghề" unit="năm" value={Number(experienceYears)} options={experienceOptions}
                onChange={(value) => {
                  setExperienceYears(String(value));
                  setFieldErrors((prev) => ({ ...prev, experienceYears: '' }));
                }}
              />
              {fieldErrors.experienceYears ? <Text style={styles.errorText}>{fieldErrors.experienceYears}</Text> : null}
            </View>
          </View>

          {/* CARD KHU VỰC VÀ BÁN KÍNH NHẬN CA */}
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="location-outline" size={18} color={BrandColors.primary} />
              <Text style={styles.formCardTitle}>Khu vực & Bán kính nhận ca</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Hệ thống dùng địa điểm gốc này để tự động tính khoảng cách và phân bổ ca trang điểm phù hợp nhất trong bán kính phục vụ.
            </Text>

            {/* Địa chỉ cơ sở / Điểm xuất phát nhận ca */}
            <View style={styles.fieldGroup}>
              <View style={styles.addressLabelRow}>
                <Text style={styles.fieldLabel}>Địa điểm nhận ca</Text>
                <TouchableOpacity
                  style={styles.gpsAutoBtn}
                  onPress={handleUseCurrentLocation}
                  disabled={isLocatingAddress}
                  activeOpacity={0.7}
                >
                  {isLocatingAddress ? (
                    <ActivityIndicator size="small" color={BrandColors.primary} />
                  ) : (
                    <>
                      <Ionicons name="navigate-circle" size={15} color={BrandColors.primary} />
                      <Text style={styles.gpsAutoBtnText}>Dùng GPS tại đây</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.input, styles.addressInput, fieldErrors.baseAddressText && styles.inputError]}
                multiline
                textAlignVertical="top"
                placeholder="VD: 120 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP.HCM"
                value={baseAddressText}
                onChangeText={(text) => {
                  setBaseAddressText(text);
                  setBaseAddressLat(null);
                  setBaseAddressLng(null);
                  setFieldErrors((prev) => ({ ...prev, baseAddressText: '' }));
                }}
              />

              {fieldErrors.baseAddressText ? <Text style={styles.errorText}>{fieldErrors.baseAddressText}</Text> : null}
              {baseAddressLat != null && baseAddressLng != null ? (
                <View style={styles.coordsBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  <Text style={styles.coordsBadgeText}>
                    Đã ghim: ({Number(baseAddressLat).toFixed(4)}, {Number(baseAddressLng).toFixed(4)})
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Bán kính nhận ca */}
            <View style={{ marginTop: 4 }}>
              <VerticalNumberPicker
                label="Bán kính nhận ca tối đa" unit="km" value={Number(maxRadius)} options={radiusOptions}
                onChange={(value) => {
                  setMaxRadius(String(value));
                  setFieldErrors((prev) => ({ ...prev, maxRadius: '' }));
                }}
              />
              {fieldErrors.maxRadius ? <Text style={styles.errorText}>{fieldErrors.maxRadius}</Text> : null}
              <Text style={styles.helperText}>Khoảng cách di chuyển xa nhất bạn có thể đến phục vụ khách hàng.</Text>
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
                {certificates.map((c, idx) => {
                  const certImg = c.imageUrl || c.certificateImageUrl;
                  const certTitle = c.certName || c.certificateName || 'Chứng chỉ nghề nghiệp';
                  const isVerified = c.isVerified || c.status === 'VERIFIED';
                  const isRejected = c.status === 'REJECTED';

                  return (
                    <TouchableOpacity
                      key={`cert-${c.id || idx}`}
                      style={[styles.certCard, isRejected && styles.certCardRejected]}
                      activeOpacity={certImg ? 0.75 : 1}
                      onPress={() => {
                        if (certImg) setPreviewImageUrl(certImg);
                      }}
                    >
                      {certImg ? (
                        <Image
                          source={{ uri: certImg }}
                          style={styles.certThumb}
                          contentFit="cover"
                          transition={200}
                        />
                      ) : (
                        <View style={styles.certThumbPlaceholder}>
                          <Ionicons name="image-outline" size={20} color={BrandColors.slateMuted} />
                        </View>
                      )}
                      <View style={styles.certInfo}>
                        <Text style={styles.certTitle} numberOfLines={1}>
                          {certTitle}
                        </Text>
                        <View style={styles.certBadgeRow}>
                          <View
                            style={[
                              styles.certStatusBadge,
                              isVerified
                                ? styles.certVerified
                                : isRejected
                                ? styles.certRejected
                                : styles.certPending,
                            ]}
                          >
                            <Text
                              style={[
                                styles.certStatusText,
                                isVerified
                                  ? styles.certVerifiedText
                                  : isRejected
                                  ? styles.certRejectedText
                                  : styles.certPendingText,
                              ]}
                            >
                              {isVerified ? '✓ Đã xác thực' : isRejected ? '✕ Đã từ chối' : '⏳ Đang duyệt'}
                            </Text>
                          </View>
                        </View>
                        {isRejected && c.notes ? (
                          <Text style={styles.certRejectionReason} numberOfLines={2}>
                            Lý do: {c.notes}
                          </Text>
                        ) : null}
                      </View>
                      {certImg && (
                        <Ionicons name="scan-outline" size={16} color={BrandColors.slateMuted} style={{ marginLeft: 6 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
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
                    <Text style={styles.addCertBtnText}>+ Thêm Ảnh</Text>
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
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPreviewImageUrl(url)}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <Image source={{ uri: url }} style={styles.portfolioImageThumb} contentFit="cover" />
                    </TouchableOpacity>
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
          disabled={isSubmitting || isLocatingAddress || isLoading || !!loadError || !profile}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL THÊM CHỨNG CHỈ (HỖ TRỢ CLICK RA NGOÀI & KÉO TRƯỢT XUỐNG ĐỂ ĐÓNG) */}
      <SwipeableBottomSheet
        visible={isCertModalVisible}
        dismissDisabled={isUploadingCert}
        onClose={() => setIsCertModalVisible(false)}
        title="Thêm Chứng Chỉ Nghề Nghiệp"
        subtitle="Tải lên bằng cấp để xác thực hồ sơ và kích hoạt nhận đơn trực tuyến"
        avoidKeyboard={true}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.certModalBody}
          bounces={false}
        >
          <Text style={styles.fieldLabel}>
            Tên Chứng Chỉ / Bằng Cấp <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="VD: Chứng chỉ Makeup Cô dâu Chuyên nghiệp"
            value={certName}
            onChangeText={setCertName}
          />

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
            Ảnh Chụp Chứng Chỉ <Text style={styles.required}>*</Text>
          </Text>
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
        </ScrollView>
      </SwipeableBottomSheet>

      {/* MODAL XEM TRƯỚC ẢNH PHÓNG TO (CHỨNG CHỈ & TÁC PHẨM) */}
      <DismissibleModal visible={!!previewImageUrl} onClose={() => setPreviewImageUrl(null)} contentStyle={{ backgroundColor: '#000000' }} fullHeight>
        <TouchableOpacity
          style={styles.imageViewerOverlay}
          activeOpacity={1}
          onPress={() => setPreviewImageUrl(null)}
        >
          <TouchableOpacity
            style={styles.imageViewerCloseBtn}
            onPress={() => setPreviewImageUrl(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImageUrl && (
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.imageViewerFull}
              contentFit="contain"
            />
          )}
        </TouchableOpacity>
      </DismissibleModal>
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
    paddingBottom: 90,
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
  muaCodeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muaCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  muaCodeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.primary,
    letterSpacing: 0.2,
  },
  proPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  proPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  muaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
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
    marginBottom: 2,
  },
  statValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.slateHeading,
  },
  statSubText: {
    fontSize: 11,
    color: BrandColors.slateMuted,
    fontWeight: '500',
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
    gap: 12,
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
  sectionDescription: { fontSize: 12, lineHeight: 18, color: '#64748B' },
  addressInput: { height: 72, paddingVertical: 10, lineHeight: 20 },
  addressLabelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  gpsAutoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FDF2F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCE7F3',
  },
  gpsAutoBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  coordsBadgeText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
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
  numberPickersRow: { flexDirection: 'row', gap: 12 },
  certHeaderRow: {
    flexWrap: 'wrap',
    gap: 10,
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
  certRejected: {
    backgroundColor: '#FFE4E6',
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
  certRejectedText: {
    color: '#E11D48',
  },
  certCardRejected: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  certRejectionReason: {
    fontSize: 11,
    color: '#E11D48',
    marginTop: 3,
    fontWeight: '500',
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
    paddingBottom: 24,
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
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imageViewerCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerFull: {
    width: '100%',
    height: '80%',
    borderRadius: 8,
  },
});
