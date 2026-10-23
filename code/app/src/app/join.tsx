import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Platform,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import {
  staffProfileService,
  AgencyStaffProfile,
  PublicAgencyInvitation,
} from '@/services/staff-profile.service';
import { useAuthStore } from '@/store/auth.store';
import { parseApiError } from '@/utils/error';
import { scanFromURLAsync } from 'expo-camera';
import { QrScannerView } from '@/components/common/QrScannerModal';

export default function JoinStudioScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { userInfo, isAuthenticated } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [staffProfile, setStaffProfile] = useState<AgencyStaffProfile | null>(null);

  // Modal Quét Mã QR Qua Camera
  const [isScannerVisible, setIsScannerVisible] = useState(false);

  // Modal Nhập Mã Mời
  const [isInputModalVisible, setIsInputModalVisible] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  // Modal Xem Trước Thông Tin Studio & Xác Nhận
  const [previewInvitation, setPreviewInvitation] = useState<PublicAgencyInvitation | null>(null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tải trạng thái nhân sự hiện tại của thợ
  const loadCurrentStaffStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await staffProfileService.getMyStaffProfile();
      setStaffProfile(data);
    } catch {
      // Nếu 404 (chưa nộp đơn nào), staffProfile = null
      setStaffProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCurrentStaffStatus();
  }, [loadCurrentStaffStatus]);

  // Tự động kiểm tra lại trạng thái liên kết khi quyền tài khoản cập nhật sang ROLE_AGENCY_STAFF
  const isAgencyStaff = userInfo?.roles?.includes('ROLE_AGENCY_STAFF');
  useEffect(() => {
    if (isAgencyStaff) {
      loadCurrentStaffStatus();
    }
  }, [isAgencyStaff, loadCurrentStaffStatus]);

  // Hiển thị thông báo chúc mừng khi trạng thái đơn chuyển từ PENDING -> ACTIVE trong thời gian thực
  const prevStatusRef = React.useRef(staffProfile?.status);
  useEffect(() => {
    if (prevStatusRef.current === 'PENDING' && staffProfile?.status === 'ACTIVE') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Chúc Mừng Bạn! 🎉',
        `Đơn xin gia nhập Studio "${staffProfile.agencyName}" đã được duyệt thành công. Bạn đã chính thức trở thành Nhân sự của Studio!`,
        [
          {
            text: 'Xem Hồ Sơ Nhân Sự',
            onPress: () => router.replace('/profile/staff-profile'),
          },
          {
            text: 'Về Bàn Làm Việc',
            onPress: () => router.replace('/'),
          },
        ]
      );
    }
    prevStatusRef.current = staffProfile?.status;
  }, [staffProfile?.status, staffProfile?.agencyName]);

  // Kiểm tra nếu có mã code truyền từ Deep Link hoặc params
  useEffect(() => {
    if (code && code.trim()) {
      handleInspectCode(code.trim());
    }
  }, [code]);

  // Trích xuất mã mời từ chuỗi URL hoặc mã text thô
  const extractCodeFromText = (rawText: string): string => {
    if (!rawText) return '';
    const trimmed = rawText.trim();
    if (trimmed.includes('code=')) {
      try {
        const match = trimmed.match(/[?&]code=([^&]+)/);
        if (match && match[1]) {
          return decodeURIComponent(match[1]).trim();
        }
      } catch {
        // im lặng
      }
    }
    return trimmed;
  };

  // Tra cứu thông tin Studio từ mã mời
  const handleInspectCode = async (targetCode: string) => {
    const cleanCode = extractCodeFromText(targetCode);
    if (!cleanCode) {
      Alert.alert('Mã Mời Trống', 'Vui lòng nhập hoặc quét mã mời hợp lệ.');
      return;
    }

    setIsCheckingCode(true);
    try {
      const info = await staffProfileService.getPublicInvitationInfo(cleanCode);
      setPreviewInvitation(info);
      setIsInputModalVisible(false);
      setIsPreviewModalVisible(true);
    } catch (err: any) {
      const parsed = parseApiError(err);
      Alert.alert('Không Tìm Thấy Mã Mời', parsed.message || 'Mã mời không tồn tại hoặc đã hết hạn.');
    } finally {
      setIsCheckingCode(false);
    }
  };

  // Thao tác 1: Quét Mã QR (Khởi động Camera Live Viewfinder với hiệu ứng Laser)
  const handleScanQrAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsScannerVisible(true);
  };

  // Thao tác 2: Mở Modal nhập mã mời trực tiếp
  const handleOpenManualInput = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInviteCodeInput('');
    setIsInputModalVisible(true);
  };

  // Thao tác 3: Chọn ảnh QR từ thư viện máy và tự động nhận diện mã
  const handlePickQrImageDirectly = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const imageUri = res.assets[0].uri;
        setIsCheckingCode(true);
        try {
          const results = await scanFromURLAsync(imageUri, ['qr']);
          if (results && results.length > 0 && results[0]?.data) {
            await handleInspectCode(results[0].data);
          } else {
            Alert.alert(
              'Không Tìm Thấy Mã QR',
              'Ảnh bạn chọn không chứa mã QR hoặc mã QR quá mờ. Vui lòng chọn ảnh khác hoặc dùng camera quét trực tiếp.',
              [
                { text: 'Chọn Lại', onPress: handlePickQrImageDirectly },
                {
                  text: 'Nhập Bằng Tay',
                  onPress: () => {
                    setInviteCodeInput('');
                    setIsInputModalVisible(true);
                  },
                },
                { text: 'Đóng', style: 'cancel' },
              ]
            );
          }
        } catch {
          Alert.alert('Lỗi Nhận Diện', 'Không thể đọc mã QR từ ảnh này. Vui lòng thử ảnh khác hoặc nhập mã mời.');
        } finally {
          setIsCheckingCode(false);
        }
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể truy cập thư viện ảnh của thiết bị.');
    }
  };

  // Nút Dán (Paste) từ bộ nhớ tạm
  const handlePasteClipboard = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setInviteCodeInput(extractCodeFromText(text));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Bộ Nhớ Đệm', 'Không có dữ liệu trong bộ nhớ tạm.');
      }
    } catch {
      // Ignored
    }
  };

  // Gửi đơn xin gia nhập Studio
  const handleConfirmSubmitApplication = async () => {
    if (!previewInvitation) return;
    if (!isAuthenticated) {
      Alert.alert('Yêu Cầu Đăng Nhập', 'Vui lòng đăng nhập tài khoản Thợ MUA để nộp đơn xin gia nhập.', [
        { text: 'Đăng Nhập', onPress: () => router.push('/(auth)/login') },
        { text: 'Hủy', style: 'cancel' },
      ]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    try {
      await staffProfileService.acceptInvitation(previewInvitation.inviteCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đã Gửi Đơn Thành Công 🎉',
        `Yêu cầu xin gia nhập Studio "${previewInvitation.agencyName}" đã được gửi. Quản lý Studio sẽ xem xét hồ sơ và phê duyệt cho bạn.`
      );
      setIsPreviewModalVisible(false);
      setPreviewInvitation(null);
      await loadCurrentStaffStatus();
    } catch (err: any) {
      const parsed = parseApiError(err);
      Alert.alert('Lỗi Nộp Đơn', parsed.message || 'Không thể gửi đơn xin gia nhập lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${minutes} ngày ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // KHI BẬT QUÉT QR: HIỂN THỊ TOÀN MÀN HÌNH NATIVE QrScannerView TRỰC TIẾP
  if (isScannerVisible) {
    return (
      <QrScannerView
        onClose={() => setIsScannerVisible(false)}
        onScanSuccess={(scannedCode) => {
          setIsScannerVisible(false);
          handleInspectCode(scannedCode);
        }}
        onOpenManualInput={() => {
          setIsScannerVisible(false);
          setInviteCodeInput('');
          setIsInputModalVisible(true);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={BrandColors.slateHeading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gia Nhập Studio</Text>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={loadCurrentStaffStatus} activeOpacity={0.7}>
          <Ionicons name="reload-outline" size={20} color={BrandColors.slateMuted} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang kiểm tra hồ sơ liên kết...</Text>
        </View>
      ) : staffProfile?.status === 'PENDING' ? (
        /* TRƯỜNG HỢP 2: ĐÃ GỬI ĐƠN VÀ ĐANG CHỜ DUYỆT (PENDING) */
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.pendingStatusCard}>
            {/* Header Badge */}
            <View style={styles.pendingBadgeRow}>
              <View style={styles.pendingPill}>
                <Ionicons name="time" size={14} color="#D97706" />
                <Text style={styles.pendingPillText}>ĐANG CHỜ DUYỆT (PENDING)</Text>
              </View>
              <Text style={styles.appliedTimeText}>
                {staffProfile.joinedAt ? formatDateTime(staffProfile.joinedAt) : 'Mới nộp gần đây'}
              </Text>
            </View>

            {/* Thông tin Studio đã nộp */}
            <View style={styles.studioDetailsBox}>
              <View style={styles.studioAvatarRow}>
                {staffProfile.agencyLogoUrl ? (
                  <Image source={{ uri: staffProfile.agencyLogoUrl }} style={styles.studioLogo} contentFit="cover" />
                ) : (
                  <View style={styles.studioLogoPlaceholder}>
                    <Ionicons name="business" size={26} color={BrandColors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.studioNameText}>{staffProfile.agencyName || 'Studio Làm Đẹp'}</Text>
                  <Text style={styles.agencyCodeText}>
                    Mã Studio: {staffProfile.agencyCode || `AG-${staffProfile.agencyId}`}
                  </Text>
                  {staffProfile.agencyPhone ? (
                    <Text style={styles.agencyHotlineText}>Hotline: {staffProfile.agencyPhone}</Text>
                  ) : null}
                </View>
              </View>

              {staffProfile.agencyAddress ? (
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={15} color="#64748B" />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {staffProfile.agencyAddress}
                  </Text>
                </View>
              ) : null}

              {/* Thông tin đề xuất hoa hồng */}
              <View style={styles.commissionBox}>
                <Text style={styles.commissionLabel}>Mức hoa hồng đề xuất:</Text>
                <Text style={styles.commissionValue}>
                  {staffProfile.agreedCommissionRate != null ? `${staffProfile.agreedCommissionRate}%` : 'Theo thỏa thuận'}
                </Text>
              </View>

              {staffProfile.note ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteLabel}>Ghi chú:</Text>
                  <Text style={styles.noteContent}>{staffProfile.note}</Text>
                </View>
              ) : null}
            </View>

            {/* Lời nhắn trạng thái */}
            <View style={styles.pendingNoticeBox}>
              <Ionicons name="information-circle" size={18} color="#B45309" />
              <Text style={styles.pendingNoticeText}>
                Đơn xin gia nhập của bạn đã được chuyển tới Quản lý Studio. Studio sẽ đối chiếu chứng chỉ và hồ sơ năng lực của bạn để phê duyệt vào danh sách nhân viên chính thức.
              </Text>
            </View>

            {/* Nút kiểm tra lại */}
            <TouchableOpacity style={styles.refreshStatusBtn} onPress={loadCurrentStaffStatus} activeOpacity={0.8}>
              <Ionicons name="sync-outline" size={17} color="#FFFFFF" />
              <Text style={styles.refreshStatusBtnText}>Kiểm Tra Phê Duyệt Mới Nhất</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : staffProfile?.status === 'ACTIVE' ? (
        /* TRƯỜNG HỢP 3: ĐÃ LÀ NHÂN VIÊN CHÍNH THỨC */
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle" size={54} color="#059669" />
          <Text style={styles.activeTitle}>Bạn Đã Là Nhân Sự Studio</Text>
          <Text style={styles.activeSub}>
            Bạn đang làm việc chính thức tại Studio "{staffProfile.agencyName}".
          </Text>
          <TouchableOpacity
            style={styles.viewStaffProfileBtn}
            onPress={() => router.replace('/profile/staff-profile')}
            activeOpacity={0.8}
          >
            <Ionicons name="business-outline" size={18} color="#FFFFFF" />
            <Text style={styles.viewStaffProfileBtnText}>Xem Hồ Sơ Nhân Sự Studio</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* TRƯỜNG HỢP 1: CHƯA NỘP ĐƠN - HIỂN THỊ 2 NÚT HÀNH ĐỘNG LỚN */
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Banner Giới thiệu */}
          <View style={styles.heroIntroCard}>
            <Text style={styles.heroIntroTitle}>Hợp Tác Cùng Studio Làm Đẹp</Text>
            <Text style={styles.heroIntroSub}>
              Gia nhập đội ngũ Studio uy tín để nhận thêm các ca làm tiệc cưới, sự kiện lớn và bảo đảm thu nhập ổn định.
            </Text>
          </View>

          <Text style={styles.actionSectionTitle}>CHỌN PHƯƠNG THỨC GIA NHẬP</Text>

          {/* 2 NÚT HÀNH ĐỘNG LỚN */}
          <View style={styles.actionButtonGroup}>
            {/* NÚT LỚN 1: QUÉT MÃ QR */}
            <TouchableOpacity style={styles.bigActionButtonPrimary} onPress={handleScanQrAction} activeOpacity={0.85}>
              <View style={styles.bigActionIconBoxPrimary}>
                <Ionicons name="qr-code-outline" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.bigActionTextBox}>
                <Text style={styles.bigActionTitlePrimary}>Quét Mã QR Tuyển Dụng</Text>
                <Text style={styles.bigActionSubPrimary}>
                  Quét mã QR từ Studio trên máy tính, tài liệu hoặc chọn ảnh QR từ máy của bạn.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#FB7185" />
            </TouchableOpacity>

            {/* NÚT LỚN 2: NHẬP MÃ MỜI TRỰC TIẾP */}
            <TouchableOpacity style={styles.bigActionButtonSecondary} onPress={handleOpenManualInput} activeOpacity={0.85}>
              <View style={styles.bigActionIconBoxSecondary}>
                <Ionicons name="keypad-outline" size={32} color={BrandColors.primary} />
              </View>
              <View style={styles.bigActionTextBox}>
                <Text style={styles.bigActionTitleSecondary}>Nhập Mã Mời Trực Tiếp</Text>
                <Text style={styles.bigActionSubSecondary}>
                  Nhập mã mời do Studio cung cấp (ví dụ: INV-AGY-GLAMOUR-...) để kiểm tra hồ sơ.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#94A3B8" />
            </TouchableOpacity>

            {/* NÚT PHỤ: CHỌN ẢNH QR TRỰC TIẾP TỪ THƯ VIỆN */}
            <TouchableOpacity
              style={styles.pickImageActionBtn}
              onPress={handlePickQrImageDirectly}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={20} color={BrandColors.primary} />
              <Text style={styles.pickImageActionText}>Hoặc chọn ảnh mã QR từ thư viện máy</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* MODAL 1: NHẬP MÃ MỜI THỦ CÔNG */}
      <Modal visible={isInputModalVisible} transparent animationType="fade" onRequestClose={() => setIsInputModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Nhập Mã Mời Studio</Text>
              <TouchableOpacity onPress={() => setIsInputModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Nhập mã mời được Studio cấp hoặc dán đường dẫn trực tiếp:
            </Text>

            <View style={styles.inputContainerRow}>
              <TextInput
                style={styles.textInput}
                placeholder="VD: INV-AGY-GLAMOUR-01-277145"
                placeholderTextColor="#94A3B8"
                value={inviteCodeInput}
                onChangeText={setInviteCodeInput}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.pasteBtn} onPress={handlePasteClipboard} activeOpacity={0.7}>
                <Ionicons name="clipboard-outline" size={16} color={BrandColors.primary} />
                <Text style={styles.pasteBtnText}>Dán</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooterButtons}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsInputModalVisible(false)}
                disabled={isCheckingCode}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelModalBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={() => handleInspectCode(inviteCodeInput)}
                disabled={isCheckingCode || !inviteCodeInput.trim()}
                activeOpacity={0.8}
              >
                {isCheckingCode ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="search" size={16} color="#FFFFFF" />
                    <Text style={styles.submitModalBtnText}>Kiểm Tra Mã</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: XEM TRƯỚC THÔNG TIN STUDIO & XÁC NHẬN NỘP ĐƠN */}
      <Modal visible={isPreviewModalVisible} transparent animationType="slide" onRequestClose={() => setIsPreviewModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Thông Tin Tuyển Dụng Studio</Text>
              <TouchableOpacity onPress={() => setIsPreviewModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {previewInvitation && (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <View style={styles.previewStudioCard}>
                  {previewInvitation.logoUrl ? (
                    <Image source={{ uri: previewInvitation.logoUrl }} style={styles.previewLogo} contentFit="cover" />
                  ) : (
                    <View style={styles.previewLogoPlaceholder}>
                      <Ionicons name="business" size={32} color={BrandColors.primary} />
                    </View>
                  )}
                  <Text style={styles.previewStudioName}>{previewInvitation.agencyName}</Text>
                  <Text style={styles.previewAgencyCode}>
                    Mã: {previewInvitation.agencyCode || `AG-${previewInvitation.agencyId}`}
                  </Text>
                  {previewInvitation.hotline ? (
                    <Text style={styles.previewHotline}>Hotline: {previewInvitation.hotline}</Text>
                  ) : null}

                  {previewInvitation.addressStreet ? (
                    <View style={styles.previewAddressBox}>
                      <Ionicons name="location" size={14} color="#64748B" />
                      <Text style={styles.previewAddressText}>
                        {[previewInvitation.addressStreet, previewInvitation.district, previewInvitation.city]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Chính sách thỏa thuận */}
                <View style={styles.previewPolicyBox}>
                  <View style={styles.policyRow}>
                    <Text style={styles.policyLabel}>Mã mời áp dụng:</Text>
                    <Text style={styles.policyCodeHighlight}>{previewInvitation.inviteCode}</Text>
                  </View>
                  <View style={styles.policyRow}>
                    <Text style={styles.policyLabel}>Hoa hồng đề xuất:</Text>
                    <Text style={styles.policyValueHighlight}>
                      {previewInvitation.proposedCommissionRate != null
                        ? `${previewInvitation.proposedCommissionRate}%`
                        : 'Theo thỏa thuận'}
                    </Text>
                  </View>
                  {previewInvitation.note ? (
                    <View style={styles.policyRow}>
                      <Text style={styles.policyLabel}>Ghi chú:</Text>
                      <Text style={styles.policyNoteText}>{previewInvitation.note}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.termsNoticeText}>
                  * Khi gửi đơn, hồ sơ năng lực và các chứng chỉ nghề nghiệp của bạn sẽ được gửi tới Quản lý Studio để đối soát và kích hoạt quyền nhận đơn phân công.
                </Text>
              </ScrollView>
            )}

            <View style={styles.modalFooterButtons}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsPreviewModalVisible(false)}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelModalBtnText}>Đổi Mã Khác</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmApplyBtn}
                onPress={handleConfirmSubmitApplication}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                    <Text style={styles.confirmApplyBtnText}>Gửi Đơn Xin Gia Nhập</Text>
                  </>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  refreshIconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroIntroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    marginBottom: 20,
    shadowColor: '#BE123C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroIntroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#9F1239',
    marginBottom: 6,
    textAlign: 'center',
  },
  heroIntroSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    textAlign: 'center',
  },
  actionSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 12,
    marginLeft: 4,
  },
  actionButtonGroup: {
    gap: 14,
  },
  bigActionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    borderRadius: 18,
    padding: 18,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  bigActionIconBoxPrimary: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bigActionTextBox: {
    flex: 1,
    paddingRight: 8,
  },
  bigActionTitlePrimary: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bigActionSubPrimary: {
    fontSize: 12,
    color: '#FFE4E6',
    lineHeight: 16,
  },
  bigActionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  bigActionIconBoxSecondary: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bigActionTitleSecondary: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.slateHeading,
    marginBottom: 4,
  },
  bigActionSubSecondary: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  pickImageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  pickImageActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },

  /* PENDING STATE CARD */
  pendingStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  appliedTimeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  studioDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  studioAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  studioLogo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  studioLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  agencyCodeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  agencyHotlineText: {
    fontSize: 12,
    color: BrandColors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  addressText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  commissionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  commissionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  commissionValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
  },
  noteBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  noteContent: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  pendingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  pendingNoticeText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
    flex: 1,
  },
  refreshStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshStatusBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ACTIVE STATE */
  activeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#065F46',
    marginTop: 14,
  },
  activeSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    maxWidth: 280,
  },
  viewStaffProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewStaffProfileBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.slateHeading,
  },
  modalDesc: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 18,
  },
  inputContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    marginBottom: 18,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: BrandColors.slateHeading,
    paddingVertical: 12,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pasteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  modalFooterButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  submitModalBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* PREVIEW STUDIO MODAL */
  previewStudioCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  previewLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 10,
  },
  previewLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  previewStudioName: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.slateHeading,
    textAlign: 'center',
  },
  previewAgencyCode: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  previewHotline: {
    fontSize: 12,
    color: BrandColors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  previewAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  previewAddressText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  previewPolicyBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 8,
    marginBottom: 10,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  policyLabel: {
    fontSize: 12,
    color: '#7C2D12',
    fontWeight: '600',
  },
  policyCodeHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C2410C',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  policyValueHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C2410C',
  },
  policyNoteText: {
    fontSize: 12,
    color: '#431407',
    flex: 1,
    textAlign: 'right',
  },
  termsNoticeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 4,
  },
  confirmApplyBtn: {
    flex: 1.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmApplyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
