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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { customerProfileService } from '@/services/customer-profile.service';
import { SavedAddressModal } from '@/components/customer/SavedAddressModal';
import { SavedAddress, customerProfileSchema } from '@/schemas/customer-profile.schema';
import { parseApiError } from '@/utils/error';

export default function UserProfileEditScreen() {
  const { userInfo, refreshCurrentUser } = useAuthStore();
  const isMUA = userInfo?.roles?.includes('ROLE_FREELANCE_MUA');
  const isAgencyStaff = userInfo?.roles?.includes('ROLE_AGENCY_STAFF');
  const isCustomer = !isMUA && !isAgencyStaff;

  // Thông tin cá nhân cơ bản (auth_schema.users)
  const [fullName, setFullName] = useState(userInfo?.fullName || '');
  const [phoneNumber] = useState(userInfo?.phoneNumber || '');
  const [email, setEmail] = useState(userInfo?.email || '');
  const [gender, setGender] = useState<'FEMALE' | 'MALE' | 'OTHER'>(
    (userInfo?.gender as any) || 'FEMALE'
  );
  const [avatarUri, setAvatarUri] = useState<string>(
    userInfo?.avatarUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  );

  // Quản lý địa chỉ (Chỉ dành cho Khách hàng)
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isCustomer) {
      customerProfileService.getSavedAddresses().then(setAddresses);
    }
  }, [isCustomer]);

  // Cập nhật khi userInfo thay đổi
  useEffect(() => {
    if (userInfo) {
      if (userInfo.fullName) setFullName(userInfo.fullName);
      if (userInfo.email) setEmail(userInfo.email);
      if (userInfo.avatarUrl) setAvatarUri(userInfo.avatarUrl);
      if (userInfo.gender) setGender(userInfo.gender as any);
    }
  }, [userInfo]);

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Vui lòng cấp quyền truy cập thư viện ảnh để đổi ảnh đại diện.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const pickedUri = result.assets[0].uri;
        setAvatarUri(pickedUri);

        // Upload ngay lên Cloudinary qua API chung /api/v1/users/avatar
        setIsUploadingAvatar(true);
        try {
          const formData = new FormData();
          if (Platform.OS === 'web') {
            const fetchRes = await fetch(pickedUri);
            const blob = await fetchRes.blob();
            formData.append('file', blob, 'avatar.jpg');
          } else {
            formData.append('file', {
              uri: pickedUri,
              name: 'avatar.jpg',
              type: 'image/jpeg',
            } as any);
          }
          const uploadRes = await customerProfileService.uploadAvatar(formData);
          if (uploadRes?.avatarUrl) {
            setAvatarUri(uploadRes.avatarUrl);
          }
          await refreshCurrentUser().catch(() => {});
          Alert.alert('Thành công', 'Ảnh đại diện cá nhân đã được cập nhật!');
        } catch (uploadErr) {
          const parsed = parseApiError(uploadErr);
          Alert.alert('Lỗi tải ảnh đại diện', parsed.message || 'Không thể upload ảnh.');
        } finally {
          setIsUploadingAvatar(false);
        }
      }
    } catch (err) {
      console.error('Lỗi khi chọn ảnh đại diện:', err);
    }
  };

  const handleSaveAddresses = async (updated: SavedAddress[]) => {
    setAddresses(updated);
    await customerProfileService.saveAddresses(updated);
  };

  const handleSaveProfile = async () => {
    setFieldErrors({});

    // 1. Validate form cơ bản phía Client qua Zod
    const validationResult = customerProfileSchema.safeParse({
      fullName,
      phoneNumber,
      email,
      gender,
    });

    if (!validationResult.success) {
      const errMap: Record<string, string> = {};
      validationResult.error.errors.forEach((e) => {
        const field = e.path[0] as string;
        if (field && !errMap[field]) {
          errMap[field] = e.message;
        }
      });
      setFieldErrors(errMap);
      return;
    }

    setIsSubmitting(true);
    try {
      // 2. Gọi API cập nhật thông tin người dùng (Họ tên, Email, Giới tính)
      await customerProfileService.updateProfile({
        fullName: fullName.trim(),
        email: email ? email.trim() : undefined,
        gender,
      });

      // 3. Đồng bộ lại thông tin người dùng trong Auth Store
      await refreshCurrentUser().catch(() => {});

      Alert.alert(
        'Thành công',
        'Thông tin cá nhân của bạn đã được cập nhật thành công!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
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

  const roleLabel = isMUA
    ? 'Thợ Make-up Tự Do'
    : isAgencyStaff
      ? 'Nhân Viên Studio'
      : 'Khách Hàng Thân Thiết';

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
        <Text style={styles.headerTitle}>Thông Tin Cá Nhân</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* AVATAR SECTION */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
            {isUploadingAvatar && (
              <View style={styles.avatarUploadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={handlePickAvatar}
              activeOpacity={0.8}
              disabled={isUploadingAvatar}
            >
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.avatarHint}>Chạm vào máy ảnh để đổi ảnh đại diện cá nhân</Text>
          <View style={styles.rolePill}>
            <Ionicons
              name={isMUA ? 'color-wand-outline' : isAgencyStaff ? 'business-outline' : 'heart-outline'}
              size={13}
              color={BrandColors.primary}
            />
            <Text style={styles.rolePillText}>{roleLabel}</Text>
          </View>
        </View>

        {/* THÔNG TIN TÀI KHOẢN CƠ BẢN */}
        <View style={styles.formCard}>
          <Text style={styles.formCardTitle}>Thông Tin Tài Khoản</Text>

          {/* Họ và tên */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Họ và tên <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, fieldErrors.fullName && styles.inputError]}
              placeholder="Nhập họ và tên đầy đủ..."
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (fieldErrors.fullName) {
                  setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                }
              }}
            />
            {fieldErrors.fullName ? (
              <Text style={styles.errorText}>{fieldErrors.fullName}</Text>
            ) : null}
          </View>

          {/* Số điện thoại (Read-only) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Số điện thoại liên hệ</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={phoneNumber}
              editable={false}
              placeholder="Chưa cập nhật số điện thoại"
            />
            <Text style={styles.helperText}>Số điện thoại dùng để nhận mã xác thực OTP đăng nhập.</Text>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={[styles.input, fieldErrors.email && styles.inputError]}
              placeholder="example@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: '' }));
                }
              }}
            />
            {fieldErrors.email ? (
              <Text style={styles.errorText}>{fieldErrors.email}</Text>
            ) : null}
          </View>

          {/* Giới tính */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Giới tính</Text>
            <View style={styles.genderRow}>
              {[
                { label: 'Nữ', val: 'FEMALE' },
                { label: 'Nam', val: 'MALE' },
                { label: 'Khác', val: 'OTHER' },
              ].map((g) => {
                const isSelected = gender === g.val;
                return (
                  <TouchableOpacity
                    key={`g-${g.val}`}
                    style={[styles.genderChip, isSelected && styles.genderChipActive]}
                    onPress={() => setGender(g.val as any)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.genderChipText,
                        isSelected && styles.genderChipTextActive,
                      ]}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* NẾU LÀ KHÁCH HÀNG: QUẢN LÝ SỔ ĐỊA CHỈ */}
        {isCustomer && (
          <View style={styles.formCard}>
            <View style={styles.addressHeader}>
              <View>
                <Text style={styles.formCardTitle}>Sổ Địa Chỉ Thân Quen</Text>
                <Text style={styles.addressSub}>
                  Lưu các địa chỉ thường xuyên đặt lịch để chọn nhanh
                </Text>
              </View>
              <TouchableOpacity
                style={styles.manageAddressBtn}
                onPress={() => setIsAddressModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={16} color={BrandColors.primary} />
                <Text style={styles.manageAddressBtnText}>Quản lý ({addresses.length})</Text>
              </TouchableOpacity>
            </View>

            {addresses.length === 0 ? (
              <View style={styles.emptyAddressBox}>
                <Ionicons name="map-outline" size={28} color={BrandColors.slateMuted} />
                <Text style={styles.emptyAddressText}>Chưa có địa chỉ nào được lưu</Text>
                <TouchableOpacity
                  style={styles.addFirstAddressBtn}
                  onPress={() => setIsAddressModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addFirstAddressText}>+ Thêm địa chỉ mới</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.addressListMini}>
                {addresses.slice(0, 3).map((item) => (
                  <View key={item.id} style={styles.addressItemMini}>
                    <Ionicons
                      name={item.isDefault ? 'radio-button-on' : 'radio-button-off'}
                      size={16}
                      color={item.isDefault ? BrandColors.primary : BrandColors.slateMuted}
                    />
                    <View style={styles.addressItemMiniInfo}>
                      <View style={styles.addressLabelRow}>
                        <Text style={styles.addressItemMiniLabel}>{item.label}</Text>
                        {item.isDefault && (
                          <View style={styles.defaultBadgeMini}>
                            <Text style={styles.defaultBadgeMiniText}>Mặc định</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.addressItemMiniDetail} numberOfLines={1}>
                        {item.addressLine}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* FOOTER SAVE BUTTON */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSaveProfile}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Lưu Thông Tin Cá Nhân</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL QUẢN LÝ ĐỊA CHỈ KHÁCH HÀNG */}
      <SavedAddressModal
        visible={isAddressModalVisible}
        onClose={() => setIsAddressModalVisible(false)}
        addresses={addresses}
        onSaveAddresses={handleSaveAddresses}
      />
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
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 16,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarWrapper: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: BrandColors.primary,
    backgroundColor: '#F1F5F9',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  avatarUploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    marginTop: 8,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
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
  inputDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    color: '#64748B',
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
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderChip: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  genderChipActive: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFE4E6',
  },
  genderChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  genderChipTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressSub: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    marginTop: 2,
  },
  manageAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFE4E6',
  },
  manageAddressBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  emptyAddressBox: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyAddressText: {
    fontSize: 13,
    color: BrandColors.slateMuted,
  },
  addFirstAddressBtn: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: BrandColors.primary,
  },
  addFirstAddressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addressListMini: {
    gap: 8,
  },
  addressItemMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  addressItemMiniInfo: {
    flex: 1,
    gap: 2,
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressItemMiniLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  defaultBadgeMini: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultBadgeMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  addressItemMiniDetail: {
    fontSize: 12,
    color: BrandColors.slateMuted,
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
});
