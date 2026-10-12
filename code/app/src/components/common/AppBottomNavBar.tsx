import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { useAccountModalStore } from '@/store/account-modal.store';
import { useNotificationStore } from '@/store/notification.store';

export type BottomNavTab = 'home' | 'explore' | 'appointments' | 'tracking' | 'messages' | 'account';

interface AppBottomNavBarProps {
  activeTab: BottomNavTab;
  onAccountPress?: () => void;
}

export const AppBottomNavBar: React.FC<AppBottomNavBarProps> = ({
  activeTab,
  onAccountPress,
}) => {
  const insets = useSafeAreaInsets();
  const { userInfo, isAuthenticated } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const isMUA = userInfo?.roles?.includes('ROLE_FREELANCE_MUA');
  const isAgencyStaff = userInfo?.roles?.includes('ROLE_AGENCY_STAFF');

  const handleTabPress = (tab: BottomNavTab) => {
    // Luôn dọn dẹp sạch stack các màn hình con trước khi chuyển tab ("không lưu stack trang cũ")
    const navigateTab = (targetRoute: string) => {
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace(targetRoute as any);
    };

    switch (tab) {
      case 'home':
        if (activeTab !== 'home') {
          navigateTab('/');
        }
        break;
      case 'explore':
        if (isMUA) {
          if (activeTab !== 'explore') {
            navigateTab('/mua/packages');
          }
        } else if (isAgencyStaff) {
          if (activeTab !== 'explore') {
            navigateTab('/bookings');
          }
        } else {
          if (activeTab !== 'explore') {
            navigateTab('/explore');
          }
        }
        break;
      case 'appointments':
        if (activeTab !== 'appointments') {
          navigateTab('/bookings');
        }
        break;
      case 'tracking':
      case 'messages':
        if (!isAuthenticated) {
          router.push('/(auth)/login');
        } else if (activeTab !== 'tracking') {
          navigateTab('/activity');
        }
        break;
      case 'account':
        if (!isAuthenticated) {
          router.push('/(auth)/login');
        } else if (onAccountPress) {
          onAccountPress();
        } else {
          useAccountModalStore.getState().openAccountModal();
        }
        break;
    }
  };

  return (
    <View
      style={[
        styles.bottomNav,
        {
          height: 62 + (insets.bottom > 0 ? insets.bottom : 10),
          paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 10,
          paddingTop: 8,
        },
      ]}
    >
      {/* 1. Trang Chủ / Bàn Làm Việc */}
      <TouchableOpacity
        style={styles.bottomNavItem}
        activeOpacity={0.8}
        onPress={() => handleTabPress('home')}
      >
        <Ionicons
          name={
            isMUA || isAgencyStaff
              ? activeTab === 'home'
                ? 'briefcase'
                : 'briefcase-outline'
              : activeTab === 'home'
              ? 'home'
              : 'home-outline'
          }
          size={22}
          color={activeTab === 'home' ? BrandColors.primary : BrandColors.slateMuted}
        />
        <Text
          style={[
            styles.bottomNavLabel,
            activeTab === 'home' && styles.bottomNavLabelActive,
          ]}
        >
          {isMUA || isAgencyStaff ? 'Bàn Làm Việc' : 'Trang Chủ'}
        </Text>
      </TouchableOpacity>

      {/* 2. Khám Phá (Khách) / Gói Dịch Vụ (Thợ MUA) / Ca Studio (Staff) */}
      <TouchableOpacity
        style={styles.bottomNavItem}
        activeOpacity={0.8}
        onPress={() => handleTabPress('explore')}
      >
        <Ionicons
          name={
            isMUA
              ? activeTab === 'explore'
                ? 'cube'
                : 'cube-outline'
              : isAgencyStaff
              ? activeTab === 'explore'
                ? 'business'
                : 'business-outline'
              : activeTab === 'explore'
              ? 'compass'
              : 'compass-outline'
          }
          size={22}
          color={activeTab === 'explore' ? BrandColors.primary : BrandColors.slateMuted}
        />
        <Text
          style={[
            styles.bottomNavLabel,
            activeTab === 'explore' && styles.bottomNavLabelActive,
          ]}
        >
          {isMUA ? 'Gói Dịch Vụ' : isAgencyStaff ? 'Ca Studio' : 'Khám Phá'}
        </Text>
      </TouchableOpacity>

      {/* 3. Lịch Hẹn */}
      <TouchableOpacity
        style={styles.bottomNavItem}
        activeOpacity={0.8}
        onPress={() => handleTabPress('appointments')}
      >
        <Ionicons
          name={activeTab === 'appointments' ? 'calendar' : 'calendar-outline'}
          size={22}
          color={activeTab === 'appointments' ? BrandColors.primary : BrandColors.slateMuted}
        />
        <Text
          style={[
            styles.bottomNavLabel,
            activeTab === 'appointments' && styles.bottomNavLabelActive,
          ]}
        >
          Lịch Hẹn
        </Text>
      </TouchableOpacity>

      {/* 4. Theo Dõi (Tiến trình đơn hàng) */}
      <TouchableOpacity
        style={styles.bottomNavItem}
        activeOpacity={0.8}
        onPress={() => handleTabPress('tracking')}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={activeTab === 'tracking' ? 'time' : 'time-outline'}
            size={22}
            color={activeTab === 'tracking' ? BrandColors.primary : BrandColors.slateMuted}
          />
          {unreadCount > 0 ? (
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          style={[
            styles.bottomNavLabel,
            activeTab === 'tracking' && styles.bottomNavLabelActive,
          ]}
        >
          Theo Dõi
        </Text>
      </TouchableOpacity>

      {/* 5. Tài Khoản */}
      <TouchableOpacity
        style={styles.bottomNavItem}
        activeOpacity={0.8}
        onPress={() => handleTabPress('account')}
      >
        <Ionicons
          name={
            activeTab === 'account'
              ? 'person'
              : isAuthenticated
              ? 'person'
              : 'person-outline'
          }
          size={22}
          color={
            activeTab === 'account' || isAuthenticated
              ? BrandColors.primary
              : BrandColors.slateMuted
          }
        />
        <Text
          style={[
            styles.bottomNavLabel,
            (activeTab === 'account' || isAuthenticated) && styles.bottomNavLabelActive,
          ]}
        >
          Tài Khoản
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  bottomNavLabel: {
    fontSize: 11,
    color: BrandColors.slateMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  bottomNavLabelActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
});
