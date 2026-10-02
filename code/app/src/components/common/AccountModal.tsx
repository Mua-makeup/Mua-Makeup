import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { useAccountModalStore } from '@/store/account-modal.store';
import { SwipeableBottomSheet } from '@/components/common/SwipeableBottomSheet';

export const AccountModal: React.FC = () => {
  const { isOpen, closeAccountModal } = useAccountModalStore();
  const { userInfo, logout } = useAuthStore();

  const isMUA = userInfo?.roles?.includes('ROLE_FREELANCE_MUA');
  const isAgencyStaff = userInfo?.roles?.includes('ROLE_AGENCY_STAFF');

  const handleLogout = () => {
    Alert.alert('Đăng Xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng Xuất',
        style: 'destructive',
        onPress: async () => {
          closeAccountModal();
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  const handleNavigate = (action: () => void) => {
    closeAccountModal();
    // Delay nhỏ để Modal đóng mượt mà trước khi chuyển trang
    setTimeout(() => {
      action();
    }, 120);
  };

  if (!isOpen) return null;

  return (
    <SwipeableBottomSheet
      visible={isOpen}
      onClose={closeAccountModal}
      showCloseButton={false}
      showHandleBar={true}
    >
      <View style={styles.modalSheet}>

              {/* Thông tin User Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalAvatarBox}>
                  <Text style={styles.modalAvatarText}>
                    {userInfo?.fullName ? userInfo.fullName.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
                <Text style={styles.modalUserName}>{userInfo?.fullName || 'Người Dùng'}</Text>
                <Text style={styles.modalUserPhone}>{userInfo?.phoneNumber || userInfo?.email}</Text>
                <View style={styles.modalRolePill}>
                  <Text style={styles.modalRolePillText}>
                    {isMUA
                      ? 'Thợ Make-up Tự Do'
                      : isAgencyStaff
                      ? 'Nhân Viên Agency'
                      : 'Khách Hàng Thân Thiết'}
                  </Text>
                </View>
              </View>

              <View style={styles.modalDivider} />

              {/* 1. Thông Tin Cá Nhân (Chung cho TẤT CẢ mọi Role) */}
              <TouchableOpacity
                style={styles.modalActionRow}
                onPress={() => handleNavigate(() => router.push('/profile/edit'))}
                activeOpacity={0.7}
              >
                <Ionicons name="person-circle-outline" size={22} color={BrandColors.slateHeading} />
                <Text style={styles.modalActionText}>Thông Tin Cá Nhân</Text>
                <Ionicons name="chevron-forward" size={18} color={BrandColors.slateMuted} />
              </TouchableOpacity>

              {/* 2. Hồ Sơ Nghề Nghiệp Thợ MUA (Chỉ dành cho MUA) */}
              {isMUA && (
                <TouchableOpacity
                  style={styles.modalActionRow}
                  onPress={() => handleNavigate(() => router.push('/profile/mua-profile'))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="color-wand-outline" size={22} color={BrandColors.primary} />
                  <Text style={[styles.modalActionText, { color: BrandColors.primary, fontWeight: '700' }]}>
                    Hồ Sơ Nghề Nghiệp MUA
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={BrandColors.primary} />
                </TouchableOpacity>
              )}

              {/* 2.1. Quản Lý Gói Dịch Vụ Cá Nhân (Chỉ dành cho Freelance MUA) */}
              {isMUA && (
                <TouchableOpacity
                  style={styles.modalActionRow}
                  onPress={() => handleNavigate(() => router.push('/mua/packages' as any))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="briefcase-outline" size={22} color={BrandColors.primary} />
                  <Text style={[styles.modalActionText, { color: BrandColors.primary, fontWeight: '700' }]}>
                    Quản Lý Gói Dịch Vụ Của Tôi
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={BrandColors.primary} />
                </TouchableOpacity>
              )}

              {/* 3. Trang Cá Nhân Công Khai (Chỉ dành cho MUA) */}
              {isMUA && (
                <TouchableOpacity
                  style={styles.modalActionRow}
                  onPress={() =>
                    handleNavigate(() =>
                      router.push({
                        pathname: '/mua-detail/[id]',
                        params: { id: userInfo?.muaId || 4 },
                      })
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="globe-outline" size={22} color={BrandColors.slateHeading} />
                  <Text style={styles.modalActionText}>Trang Cá Nhân Công Khai</Text>
                  <Ionicons name="chevron-forward" size={18} color={BrandColors.slateMuted} />
                </TouchableOpacity>
              )}

              {/* 4. Hồ Sơ Nhân Sự Studio (Chỉ dành cho Agency Staff) */}
              {isAgencyStaff && (
                <TouchableOpacity
                  style={styles.modalActionRow}
                  onPress={() => handleNavigate(() => router.push('/profile/staff-profile'))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="business-outline" size={22} color={BrandColors.primary} />
                  <Text style={[styles.modalActionText, { color: BrandColors.primary, fontWeight: '700' }]}>
                    Hồ Sơ Nhân Sự Studio
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={BrandColors.primary} />
                </TouchableOpacity>
              )}

              {/* 5. Ví Tiền & Cọc Escrow */}
              <TouchableOpacity
                style={styles.modalActionRow}
                onPress={() =>
                  handleNavigate(() => {
                    if (isMUA) {
                      router.push('/profile/freelancer-wallet');
                    } else {
                      router.push('/profile/customer-wallet');
                    }
                  })
                }
                activeOpacity={0.7}
              >
                <Ionicons name="wallet-outline" size={22} color={BrandColors.primary} />
                <Text style={[styles.modalActionText, { color: BrandColors.primary, fontWeight: '700' }]}>
                  {isMUA ? 'Ví & Tài Chính Thợ' : 'Ví Cá Nhân Của Tôi'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={BrandColors.primary} />
              </TouchableOpacity>

              <View style={styles.modalDivider} />

              {/* 6. Đăng Xuất Tài Khoản */}
              <TouchableOpacity
                style={[styles.modalActionRow, { marginBottom: 12 }]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={22} color={BrandColors.danger} />
                <Text style={[styles.modalActionText, { color: BrandColors.danger }]}>
                  Đăng Xuất Tài Khoản
                </Text>
              </TouchableOpacity>

              {/* Nút Đóng */}
              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={closeAccountModal}
                activeOpacity={0.8}
              >
                <Text style={styles.closeModalBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
    </SwipeableBottomSheet>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    paddingBottom: Platform.OS === 'ios' ? 14 : 6,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalAvatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.slateHeading,
  },
  modalUserPhone: {
    fontSize: 13,
    color: BrandColors.slateMuted,
    marginTop: 2,
  },
  modalRolePill: {
    backgroundColor: BrandColors.light,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  modalRolePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  modalActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  closeModalBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  closeModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
});
