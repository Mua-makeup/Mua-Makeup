import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';

export type BottomNavTab = 'home' | 'explore' | 'appointments' | 'messages' | 'account';

interface AppBottomNavBarProps {
  activeTab: BottomNavTab;
  onAccountPress?: () => void;
}

export const AppBottomNavBar: React.FC<AppBottomNavBarProps> = ({
  activeTab,
  onAccountPress,
}) => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();

  const handleTabPress = (tab: BottomNavTab) => {
    switch (tab) {
      case 'home':
        if (activeTab !== 'home') {
          router.replace('/');
        }
        break;
      case 'explore':
        if (activeTab !== 'explore') {
          router.push('/explore');
        }
        break;
      case 'appointments':
        if (!isAuthenticated) {
          router.push('/(auth)/login');
        } else {
          Alert.alert('Lịch Hẹn', 'Danh sách các lịch hẹn trang điểm của bạn.');
        }
        break;
      case 'messages':
        if (!isAuthenticated) {
          router.push('/(auth)/login');
        } else {
          Alert.alert('Tin Nhắn', 'Hộp thư tin nhắn tư vấn và hỗ trợ realtime.');
        }
        break;
      case 'account':
        if (!isAuthenticated) {
          router.push('/(auth)/login');
        } else if (onAccountPress) {
          onAccountPress();
        } else {
          // Khi đang ở trang khác (như Explore), quay về Trang chủ để mở menu tài khoản
          router.replace('/');
        }
        break;
    }
  };

  return (
    <View
      style={[
        styles.bottomNav,
        {
          height: 54 + (insets.bottom > 0 ? insets.bottom : 8),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
        },
      ]}
    >
      {/* 1. Trang Chủ */}
      <TouchableOpacity
        style={styles.bottomNavItem}
        activeOpacity={0.8}
        onPress={() => handleTabPress('home')}
      >
        <Ionicons
          name={activeTab === 'home' ? 'home' : 'home-outline'}
          size={22}
          color={activeTab === 'home' ? BrandColors.primary : BrandColors.slateMuted}
        />
        <Text
          style={[
            styles.bottomNavLabel,
            activeTab === 'home' && styles.bottomNavLabelActive,
          ]}
        >
          Trang Chủ
        </Text>
      </TouchableOpacity>

      {/* 2. Khám Phá */}
      <TouchableOpacity
        style={styles.bottomNavItem}
        activeOpacity={0.8}
        onPress={() => handleTabPress('explore')}
      >
        <Ionicons
          name={activeTab === 'explore' ? 'compass' : 'compass-outline'}
          size={22}
          color={activeTab === 'explore' ? BrandColors.primary : BrandColors.slateMuted}
        />
        <Text
          style={[
            styles.bottomNavLabel,
            activeTab === 'explore' && styles.bottomNavLabelActive,
          ]}
        >
          Khám Phá
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

      {/* 4. Tin Nhắn */}
      <TouchableOpacity
        style={styles.bottomNavItem}
        activeOpacity={0.8}
        onPress={() => handleTabPress('messages')}
      >
        <Ionicons
          name={activeTab === 'messages' ? 'chatbubbles' : 'chatbubbles-outline'}
          size={22}
          color={activeTab === 'messages' ? BrandColors.primary : BrandColors.slateMuted}
        />
        <Text
          style={[
            styles.bottomNavLabel,
            activeTab === 'messages' && styles.bottomNavLabelActive,
          ]}
        >
          Tin Nhắn
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
});
