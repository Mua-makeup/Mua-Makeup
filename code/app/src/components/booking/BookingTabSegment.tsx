import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';

interface Props {
  activeTab: 'UPCOMING' | 'HISTORY';
  upcomingCount: number;
  historyCount: number;
  onTabChange: (tab: 'UPCOMING' | 'HISTORY') => void;
}

export const BookingTabSegment: React.FC<Props> = ({
  activeTab,
  upcomingCount,
  historyCount,
  onTabChange,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === 'UPCOMING' && styles.tabBtnActive]}
        onPress={() => {
          Haptics.selectionAsync();
          onTabChange('UPCOMING');
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === 'UPCOMING' && styles.tabTextActive]}>
          Sắp Tới
        </Text>
        {upcomingCount > 0 && (
          <View
            style={[
              styles.badge,
              activeTab === 'UPCOMING' ? styles.badgeActive : styles.badgeInactive,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                activeTab === 'UPCOMING' ? styles.badgeTextActive : styles.badgeTextInactive,
              ]}
            >
              {upcomingCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabBtn, activeTab === 'HISTORY' && styles.tabBtnActive]}
        onPress={() => {
          Haptics.selectionAsync();
          onTabChange('HISTORY');
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>
          Lịch Sử
        </Text>
        {historyCount > 0 && (
          <View
            style={[
              styles.badge,
              activeTab === 'HISTORY' ? styles.badgeActive : styles.badgeInactive,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                activeTab === 'HISTORY' ? styles.badgeTextActive : styles.badgeTextInactive,
              ]}
            >
              {historyCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeActive: {
    backgroundColor: BrandColors.primary,
  },
  badgeInactive: {
    backgroundColor: '#E2E8F0',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  badgeTextInactive: {
    color: '#64748B',
  },
});
