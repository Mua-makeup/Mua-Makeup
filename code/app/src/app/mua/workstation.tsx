import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { WorkstationHeader } from '@/components/mua/WorkstationHeader';
import { WorkstationStatCards } from '@/components/mua/WorkstationStatCards';
import { TodayBookingCard } from '@/components/mua/TodayBookingCard';
import { useWorkstationStore } from '@/store/workstation.store';

export default function MuaWorkstationScreen() {
  const {
    todayBookings,
    isLoading,
    selectedFilter,
    setFilter,
    fetchWorkstationData,
  } = useWorkstationStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchWorkstationData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWorkstationData();
    setRefreshing(false);
  };

  const filters = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'UPCOMING', label: 'Sắp làm' },
    { key: 'COMPLETED', label: 'Đã xong' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBackBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Bàn Làm Việc Thợ MUA</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={todayBookings}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TodayBookingCard booking={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoading} onRefresh={handleRefresh} colors={['#E11D48']} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Header with Avatar & Online Switch */}
            <WorkstationHeader />

            {/* 3 Metric Stat Cards */}
            <WorkstationStatCards />

            {/* Phím tắt Hồ Sơ Nghề Nghiệp & Chứng Chỉ */}
            <TouchableOpacity
              style={styles.profileShortcutBanner}
              activeOpacity={0.8}
              onPress={() => router.push('/profile/mua-profile' as any)}
            >
              <View style={styles.profileShortcutLeft}>
                <View style={styles.profileShortcutIcon}>
                  <Ionicons name="ribbon" size={16} color="#7C3AED" />
                </View>
                <View>
                  <Text style={styles.profileShortcutTitle}>Hồ Sơ Nghề Nghiệp & Chứng Chỉ</Text>
                  <Text style={styles.profileShortcutSub}>Cập nhật tiểu sử, kinh nghiệm & chứng chỉ MUA</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Filter Tabs for Today's Bookings */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Lịch Hẹn Hôm Nay</Text>
              <View style={styles.filterPills}>
                {filters.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.filterPill,
                      selectedFilter === f.key && styles.filterPillActive,
                    ]}
                    onPress={() => setFilter(f.key as any)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selectedFilter === f.key && styles.filterTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-outline" size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Chưa Có Ca Làm Việc Hôm Nay</Text>
              <Text style={styles.emptySubtext}>
                Hãy bật công tắc Trực tuyến để hệ thống tự động điều phối đơn khẩn cấp và khách đặt hẹn đến bạn.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  testRadarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  testRadarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E11D48',
  },
  listContent: {
    paddingBottom: 40,
  },
  shortcutsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  profileShortcutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  profileShortcutIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileShortcutTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileShortcutSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
