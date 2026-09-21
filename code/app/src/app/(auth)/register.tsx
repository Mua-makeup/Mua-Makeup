import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandLogo } from '@/components/auth/BrandLogo';
import { BaseInput } from '@/components/base/BaseInput';
import { BaseButton } from '@/components/base/BaseButton';
import { RoleSegmentedControl, RoleType } from '@/components/auth/RoleSegmentedControl';
import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { RegisterReq } from '@/services/auth.service';
import { parseApiError } from '@/utils/error';

export default function RegisterScreen() {
  const [selectedRole, setSelectedRole] = useState<RoleType>('CUSTOMER');
  
  // Common Form Fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // MUA Extra Fields
  const [experienceYears, setExperienceYears] = useState('2');
  const [maxRadiusKm, setMaxRadiusKm] = useState('15');
  const [bio, setBio] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { register: registerApi, isLoading } = useAuthStore();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên';
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Vui lòng nhập số điện thoại';
    } else if (!/^(0[3|5|7|8|9])+([0-9]{8})$/.test(phoneNumber.trim())) {
      newErrors.phoneNumber = 'Số điện thoại không hợp lệ (10 chữ số VN)';
    }

    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập địa chỉ email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Địa chỉ email không đúng định dạng';
    }

    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 8) {
      newErrors.password = 'Mật khẩu phải chứa ít nhất 8 ký tự';
    } else if (!/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!._-]).*$/.test(password)) {
      newErrors.password = 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt (@#$%^&+=!._-).';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp';
    }

    if (selectedRole === 'FREELANCER_MUA') {
      const expNum = parseInt(experienceYears, 10);
      if (isNaN(expNum) || expNum < 0) {
        newErrors.experienceYears = 'Số năm kinh nghiệm không hợp lệ';
      }
      const radiusNum = parseInt(maxRadiusKm, 10);
      if (isNaN(radiusNum) || radiusNum <= 0) {
        newErrors.maxRadiusKm = 'Bán kính hoạt động không hợp lệ';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      const payload: RegisterReq = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim().toLowerCase(),
        password,
        accountType: selectedRole,
      };

      if (selectedRole === 'FREELANCER_MUA') {
        payload.muaDetails = {
          experienceYears: parseInt(experienceYears, 10) || 1,
          maxServiceRadiusKm: parseInt(maxRadiusKm, 10) || 15,
          bio: bio.trim() || undefined,
        };
      }

      const res = await registerApi(payload);

      Alert.alert(
        'Đăng Ký Thành Công!',
        selectedRole === 'FREELANCER_MUA'
          ? `Chào mừng đối tác MUA ${res.fullName}! Mã hồ sơ của bạn là ${res.muaCode || 'đang duyệt'}. Hãy đăng nhập để kích hoạt tài khoản.`
          : `Chào mừng ${res.fullName} đến với MUA Makeup! Hãy đăng nhập để bắt đầu trải nghiệm dịch vụ.`,
        [
          {
            text: 'Đăng Nhập Ngay',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (err: any) {
      const parsed = parseApiError(err);
      // Map trực tiếp lỗi trường dữ liệu từ backend vào form helper error
      if (parsed.fieldErrors) {
        setErrors((prev) => ({ ...prev, ...parsed.fieldErrors }));
      }
      Alert.alert('Lỗi Đăng Ký', parsed.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={BrandColors.slateHeading} />
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>Tạo Tài Khoản Mới</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled">
          
          {/* Logo & Header */}
          <BrandLogo
            title="Gia Nhập Nền Tảng"
            subtitle="Trải nghiệm dịch vụ make-up chuyên nghiệp hàng đầu"
          />

          {/* Role Switcher */}
          <RoleSegmentedControl
            selectedRole={selectedRole}
            onSelectRole={(role) => {
              setSelectedRole(role);
              setErrors({});
            }}
          />

          {/* Role Tip Badge */}
          <View style={styles.roleTipCard}>
            <Ionicons
              name={selectedRole === 'CUSTOMER' ? 'heart' : 'sparkles'}
              size={18}
              color={BrandColors.primary}
            />
            <Text style={styles.roleTipText}>
              {selectedRole === 'CUSTOMER'
                ? 'Đặt lịch trang điểm nhanh chóng, định vị thợ thời gian thực và thanh toán an toàn.'
                : 'Nhận ca tức thì 30s, kết nối khách hàng xung quanh, tự chủ thời gian & thu nhập cao.'}
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <BaseInput
              label="Họ và Tên"
              placeholder="VD: Nguyễn Mai Anh"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errors.fullName) setErrors({ ...errors, fullName: '' });
              }}
              iconName="person-outline"
              error={errors.fullName}
              required
            />

            <BaseInput
              label="Số Điện Thoại"
              placeholder="0912345678"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: '' });
              }}
              iconName="call-outline"
              keyboardType="phone-pad"
              error={errors.phoneNumber}
              required
            />

            <BaseInput
              label="Địa Chỉ Email"
              placeholder="maianh@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              iconName="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              required
            />

            <BaseInput
              label="Mật Khẩu"
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              iconName="lock-closed-outline"
              isPassword
              error={errors.password}
              required
            />

            <BaseInput
              label="Xác Nhận Mật Khẩu"
              placeholder="Nhập lại mật khẩu vừa tạo"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
              }}
              iconName="shield-checkmark-outline"
              isPassword
              error={errors.confirmPassword}
              required
            />

            {/* Thợ MUA Extra Fields */}
            {selectedRole === 'FREELANCER_MUA' && (
              <View style={styles.muaExtraBox}>
                <View style={styles.muaExtraHeader}>
                  <Ionicons name="color-palette-outline" size={18} color={BrandColors.primary} />
                  <Text style={styles.muaExtraTitle}>Hồ Sơ Nghề Nghiệp Thợ MUA</Text>
                </View>

                <View style={styles.rowTwoCols}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <BaseInput
                      label="Năm Kinh Nghiệm"
                      placeholder="VD: 3"
                      value={experienceYears}
                      onChangeText={(text) => {
                        setExperienceYears(text);
                        if (errors.experienceYears) setErrors({ ...errors, experienceYears: '' });
                      }}
                      iconName="ribbon-outline"
                      keyboardType="numeric"
                      error={errors.experienceYears}
                      required
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <BaseInput
                      label="Bán Kính Phục Vụ (km)"
                      placeholder="VD: 15"
                      value={maxRadiusKm}
                      onChangeText={(text) => {
                        setMaxRadiusKm(text);
                        if (errors.maxRadiusKm) setErrors({ ...errors, maxRadiusKm: '' });
                      }}
                      iconName="navigate-outline"
                      keyboardType="numeric"
                      error={errors.maxRadiusKm}
                      required
                    />
                  </View>
                </View>

                <BaseInput
                  label="Giới Thiệu Phong Cách Sở Trường"
                  placeholder="VD: Chuyên make-up cô dâu tông Hàn Quốc, tiệc sang trọng..."
                  value={bio}
                  onChangeText={setBio}
                  iconName="document-text-outline"
                />
              </View>
            )}

            {/* Terms Notice */}
            <View style={styles.termsBox}>
              <Ionicons name="shield-checkmark" size={16} color={BrandColors.primary} />
              <Text style={styles.termsText}>
                Bằng việc nhấn Đăng ký, bạn đồng ý với{' '}
                <Text style={styles.termsHighlight}>Điều khoản sử dụng</Text> và{' '}
                <Text style={styles.termsHighlight}>Chính sách bảo mật</Text> của MUA Platform.
              </Text>
            </View>

            {/* Submit CTA */}
            <BaseButton
              title="Đăng Ký Tài Khoản"
              onPress={handleRegister}
              loading={isLoading}
            />
          </View>

          {/* Login Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 36,
  },
  headerBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  roleTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.light,
    borderWidth: 1,
    borderColor: BrandColors.softBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 8,
  },
  roleTipText: {
    flex: 1,
    fontSize: 12,
    color: BrandColors.slateBody,
    lineHeight: 17,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
  },
  muaExtraBox: {
    backgroundColor: '#FDF2F8',
    borderWidth: 1,
    borderColor: '#FCE7F3',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  muaExtraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  muaExtraTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  rowTwoCols: {
    flexDirection: 'row',
  },
  termsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: BrandColors.slateMuted,
    lineHeight: 18,
  },
  termsHighlight: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: BrandColors.slateMuted,
  },
  footerLink: {
    fontSize: 14,
    color: BrandColors.primary,
    fontWeight: '700',
  },
});
