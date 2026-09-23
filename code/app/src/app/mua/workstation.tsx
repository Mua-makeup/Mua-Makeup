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
import { CountdownAcceptModal } from '@/components/mua/CountdownAcceptModal';
import { useWorkstationStore } from '@/store/workstation.store';

export default function MuaWorkstationScreen() {
  const {
    todayBookings,
    isLoading,
    selectedFilter,
    setFilter,
    fetchWorkstationData,
    triggerInstantOffer,
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

  const handleSimulateInstantOffer = () => {
    triggerInstantOffer({
      bookingId: Math.floor(1000 + Math.random() * 9000),
      bookingCode: `BK-FAST-${Math.floor(100000 + Math.random() * 900000)}`,
      customerName: 'Nguyễn Thu Trang',
      customerPhone: '0912345678',
      customerAddress: 'Số 45 Tràng Tiền, P. Tràng Tiền, Q. Hoàn Kiếm, Hà Nội',
      latitude: 21.0253,
      longitude: 105.8558,
      serviceName: 'Trang Điểm Dự Tiệc Khẩn Cấp (Glamour Party)',
      distanceKm: 1.6,
      earningsAmount: 480000,
      totalAmount: 600000,
      countdownSeconds: 30,
    });
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

            {/* Quick Management Shortcuts */}
            <View style={styles.shortcutsRow}>
              <TouchableOpacity
                style={styles.shortcutCard}
                activeOpacity={0.8}
                onPress={() => router.push('/mua/packages' as any)}
              >
                <View style={[styles.shortcutIcon, { backgroundColor: '#FFF1F2' }]}>
                  <Ionicons name="cube-outline" size={20} color="#E11D48" />
                </View>
                <View style={styles.shortcutText}>
                  <Text style={styles.shortcutTitle}>Gói Dịch Vụ</Text>
                  <Text style={styles.shortcutSub}>Quản lý giá & bước</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shortcutCard}
                activeOpacity={0.8}
                onPress={() => router.push('/profile/mua-profile' as any)}
              >
                <View style={[styles.shortcutIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="ribbon-outline" size={20} color="#2563EB" />
                </View>
                <View style={styles.shortcutText}>
                  <Text style={styles.shortcutTitle}>Hồ Sơ & Chứng Chỉ</Text>
                  <Text style={styles.shortcutSub}>Bán kính nhận ca</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

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

      {/* Modal 30s Nhận Ca Cấp Tốc */}
      <CountdownAcceptModal />
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
  shortcutCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  shortcutText: {
    flex: 1,
  },
  shortcutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  shortcutSub: {
    fontSize: 10,
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
