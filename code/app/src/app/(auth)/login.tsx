import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandLogo } from '@/components/auth/BrandLogo';
import { QuickTestAccounts } from '@/components/auth/QuickTestAccounts';
import { BaseButton } from '@/components/base/BaseButton';
import { BaseInput } from '@/components/base/BaseInput';
import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { parseApiError } from '@/utils/error';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  // Đã bỏ giá trị điền trước theo yêu cầu của bạn
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      return;
    }

    setErrorMessage('');
    try {
      await login({
        loginIdentifier: identifier.trim(),
        password: password.trim(),
      });
      // Đăng nhập thành công -> chuyển về Trang chủ
      router.replace('/');
    } catch (err: any) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message);
    }
  };

  const handleSelectQuickAccount = (phone: string, roleName: string) => {
    setIdentifier(phone);
    setPassword('Password@123');
    setErrorMessage('');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexOne}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          {/* Header Brand */}
          <BrandLogo
            title="Đăng Nhập Hệ Thống"
            subtitle="Nền tảng Quản trị & Đặt lịch Make-up Chuyên Nghiệp"
          />

          {/* Form Card */}
          <View style={styles.card}>
            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={BrandColors.danger} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Input Phone / Email */}
            <BaseInput
              label="Số Điện Thoại hoặc Email"
              required
              iconName="person-outline"
              placeholder="Nhập số điện thoại hoặc email"
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                if (errorMessage) setErrorMessage('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* Input Password */}
            <BaseInput
              label="Mật Khẩu Đăng Nhập"
              required
              iconName="lock-closed-outline"
              placeholder="Nhập mật khẩu"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errorMessage) setErrorMessage('');
              }}
              isPassword
            />

            {/* Submit Button */}
            <BaseButton
              title="Đăng Nhập Vào Hệ Thống"
              loading={isLoading}
              onPress={handleLogin}
            />

            {/* Switch to Register */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Chưa có tài khoản? </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                activeOpacity={0.7}>
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Test Accounts */}
            <QuickTestAccounts onSelectAccount={handleSelectQuickAccount} />
          </View>

          {/* Back to Home Link */}
          <TouchableOpacity
            style={styles.backHomeLink}
            onPress={() => router.replace('/')}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={16} color={BrandColors.slateMuted} />
            <Text style={styles.backHomeText}>Quay lại Trang Chủ</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BrandColors.softBorder,
    borderRadius: 26,
    padding: 22,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: BrandColors.danger,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  switchText: {
    fontSize: 13,
    color: BrandColors.slateMuted,
    fontWeight: '500',
  },
  registerLink: {
    fontSize: 13,
    color: BrandColors.primary,
    fontWeight: '700',
  },
  backHomeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  backHomeText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.slateMuted,
  },
});
