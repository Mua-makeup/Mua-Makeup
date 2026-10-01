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
import { depositService, CustomerWalletInfo, CustomerWalletTransaction } from '@/services/deposit.service';

function formatVnd(val?: number): string {
  if (!val && val !== 0) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(val)
    .replace('₫', 'đ');
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${d.toLocaleDateString('vi-VN')}`;
  } catch {
    return isoStr;
  }
}

export default function CustomerWalletScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wallet, setWallet] = useState<CustomerWalletInfo | null>(null);

  const fetchWallet = async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const data = await depositService.getCustomerWallet();
      setWallet(data);
    } catch (err: any) {
      Alert.alert('Ví Cá Nhân', err?.message || 'Không thể tải thông tin ví cá nhân.');
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

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải ví cá nhân...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const transactions = wallet?.recentTransactions || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Điều Hướng Chuẩn - Tránh Chồng Chéo */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ví Cá Nhân</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
          <Ionicons name="reload" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {/* Thẻ Số Dư Khả Dụng - Luxury Beauty Aesthetics */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCardHeader}>
            <View style={styles.walletIconCircle}>
              <Ionicons name="wallet" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.escrowBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#10B981" />
              <Text style={styles.escrowBadgeText}>Bảo Chứng Escrow 100%</Text>
            </View>
          </View>
          <Text style={styles.walletLabel}>Số dư ví khả dụng</Text>
          <Text style={styles.balanceAmount}>{formatVnd(wallet?.availableBalance || 0)}</Text>
          <Text style={styles.balanceSub}>
            Tiền hoàn cọc từ thợ và các khoản tích lũy được bảo lưu an toàn
          </Text>
        </View>

        {/* Banner Quyền Lợi Bảo Vệ Khách Hàng */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.infoBannerTitle}>Chính Sách Hoàn Cọc Tự Động</Text>
            <Text style={styles.infoBannerDesc}>
              Khi Thợ make-up hủy ca hẹn đã cọc, hệ thống Escrow sẽ tự động hoàn 100% tiền cọc về ví của bạn ngay lập tức.
            </Text>
          </View>
        </View>

        {/* Lịch Sử Biến Động Số Dư */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lịch Sử Biến Động Số Dư</Text>
          <Text style={styles.sectionCount}>({transactions.length} giao dịch gần nhất)</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="cash-clock" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Chưa có biến động số dư</Text>
            <Text style={styles.emptyDesc}>
              Các giao dịch hoàn tiền cọc hoặc nạp/rút sẽ được hiển thị chi tiết tại đây.
            </Text>
          </View>
        ) : (
          transactions.map((item) => {
            const isCredit = item.entryType === 'CREDIT';
            const isRefund = item.referenceType === 'BOOKING_REFUND';

            return (
              <View key={item.id} style={styles.txCard}>
                <View
                  style={[
                    styles.txIconCircle,
                    { backgroundColor: isCredit ? '#DCFCE7' : '#FEE2E2' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={isRefund ? 'cash-refund' : isCredit ? 'arrow-down-left' : 'arrow-up-right'}
                    size={22}
                    color={isCredit ? '#10B981' : '#EF4444'}
                  />
                </View>

                <View style={styles.txInfo}>
                  <View style={styles.txTitleRow}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {isRefund ? 'Hoàn cọc hủy ca' : item.description || 'Giao dịch ví'}
                    </Text>
                    {isRefund && (
                      <View style={styles.refundTag}>
                        <Text style={styles.refundTagText}>Hoàn Cọc</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
                  {item.description && !isRefund && (
                    <Text style={styles.txDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>

                <View style={styles.txAmountCol}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: isCredit ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {isCredit ? '+' : '-'}{formatVnd(item.amount)}
                  </Text>
                  {item.balanceAfter != null && (
                    <Text style={styles.txBalanceAfter}>
                      Dư: {formatVnd(item.balanceAfter)}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  escrowBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34D399',
  },
  walletLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  balanceSub: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 2,
  },
  infoBannerDesc: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionCount: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  txIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  txTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  refundTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  refundTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  txDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  txDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  txBalanceAfter: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
