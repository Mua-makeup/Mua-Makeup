import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import { depositService, FreelancerWalletInfo, FreelancerBookingDepositItem } from '@/services/deposit.service';

function formatVnd(val?: number): string {
  if (!val && val !== 0) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(val)
    .replace('₫', 'đ');
}

export default function FreelancerWalletScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wallet, setWallet] = useState<FreelancerWalletInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'HELD_DEPOSITS' | 'TRANSACTIONS'>('HELD_DEPOSITS');

  const fetchWallet = async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await depositService.getFreelancerWallet();
      setWallet(data);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tải thông tin ví.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchWallet(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải ví chuyên gia...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const heldDeposits = wallet?.heldDeposits || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ví & Tài Chính Thợ</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
          <Ionicons name="reload" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {/* Thẻ Số Dư Khả Dụng */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCardHeader}>
            <View style={styles.walletIconCircle}>
              <Ionicons name="wallet-outline" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.walletLabel}>Số dư khả dụng (Rút được)</Text>
          </View>
          <Text style={styles.balanceAmount}>{formatVnd(wallet?.availableBalance || 0)}</Text>
          <Text style={styles.balanceSub}>
            Tiền thực có trong ví sau khi đã hoàn thành dịch vụ và quyết toán.
          </Text>

          <View style={styles.balanceDivider} />

          {/* Cọc khách đang được giữ cho đơn của thợ */}
          <View style={styles.escrowRow}>
            <View style={styles.escrowLeft}>
              <Ionicons name="lock-closed" size={16} color="#D97706" />
              <View>
                <Text style={styles.escrowTitle}>Cọc đơn đang giữ trong Escrow:</Text>
                <Text style={styles.escrowSubtitle}>Chưa thể rút cho đến khi hoàn tất dịch vụ</Text>
              </View>
            </View>
            <Text style={styles.escrowAmount}>{formatVnd(wallet?.bookingDepositsHeld || 0)}</Text>
          </View>
        </View>

        {/* Tab chuyển đổi */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'HELD_DEPOSITS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('HELD_DEPOSITS')}
          >
            <Text style={[styles.tabText, activeTab === 'HELD_DEPOSITS' && styles.tabTextActive]}>
              Cọc Đang Giữ ({heldDeposits.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'TRANSACTIONS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('TRANSACTIONS')}
          >
            <Text style={[styles.tabText, activeTab === 'TRANSACTIONS' && styles.tabTextActive]}>
              Lịch Sử Biến Động
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nội dung Tab Cọc Đang Giữ */}
        {activeTab === 'HELD_DEPOSITS' ? (
          heldDeposits.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Không có khoản cọc nào đang giữ</Text>
              <Text style={styles.emptyDesc}>
                Khi khách hàng đặt đơn và thanh toán cọc online, khoản cọc bảo chứng Escrow sẽ hiển thị tại đây.
              </Text>
            </View>
          ) : (
            heldDeposits.map((item) => (
              <View key={item.bookingId} style={styles.depositItemCard}>
                <View style={styles.depositItemHeader}>
                  <View>
                    <Text style={styles.depositBookingCode}>#{item.bookingCode}</Text>
                    <Text style={styles.depositCustomerName}>Khách: {item.customerName || 'Ẩn danh'}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>ESCROW ACTIVE</Text>
                  </View>
                </View>

                <View style={styles.depositItemDivider} />

                <View style={styles.depositItemFooter}>
                  <Text style={styles.depositItemAmountLabel}>Số tiền cọc bảo lưu:</Text>
                  <Text style={styles.depositItemAmount}>{formatVnd(item.amount)}</Text>
                </View>
              </View>
            ))
          )
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Chưa có biến động số dư</Text>
            <Text style={styles.emptyDesc}>
              Bút toán cộng tiền vào ví sẽ được ghi nhận sau khi đơn hoàn tất và cả 2 bên xác nhận tiền mặt.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
  },
  balanceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  walletIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  balanceSub: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 14,
  },
  escrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: 12,
    borderRadius: 12,
  },
  escrowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  escrowTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },
  escrowSubtitle: {
    fontSize: 10,
    color: '#D1D5DB',
  },
  escrowAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FBBF24',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: BrandColors.primary,
  },
  depositItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  depositItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  depositBookingCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  depositCustomerName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  depositItemDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  depositItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  depositItemAmountLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  depositItemAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
