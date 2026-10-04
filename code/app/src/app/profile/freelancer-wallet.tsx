import { DateRangePicker } from '@/components/common/DateRangePicker';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import { depositService, FreelancerWalletInfo, FreelancerBookingDepositItem, FreelancerTransactionItem } from '@/services/deposit.service';
import {
  TransactionDetailModal,
  TransactionDetailData,
} from '@/components/common/TransactionDetailModal';

function formatVnd(val?: number): string {
  if (!val && val !== 0) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(val)
    .replace('₫', 'đ');
}

function formatDateShort(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoStr;
  }
}

function formatDateTimeFull(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${time} ${day}/${month}/${year}`;
  } catch {
    return isoStr;
  }
}

export default function FreelancerWalletScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wallet, setWallet] = useState<FreelancerWalletInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'HELD_DEPOSITS' | 'TRANSACTIONS'>('TRANSACTIONS');
  const [selectedTx, setSelectedTx] = useState<TransactionDetailData | null>(null);

  // Filter state (icon phễu & khoảng ngày)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'CUSTOM'>('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const applyPreset = (preset: 'ALL' | 'TODAY' | '7DAYS' | '30DAYS') => {
    setSelectedPreset(preset);
    const today = new Date();
    const formatDateInput = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'ALL') {
      setFilterStartDate('');
      setFilterEndDate('');
    } else if (preset === 'TODAY') {
      const str = formatDateInput(today);
      setFilterStartDate(str);
      setFilterEndDate(str);
    } else if (preset === '7DAYS') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setFilterStartDate(formatDateInput(past));
      setFilterEndDate(formatDateInput(today));
    } else if (preset === '30DAYS') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      setFilterStartDate(formatDateInput(past));
      setFilterEndDate(formatDateInput(today));
    }
  };

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

  useFocusEffect(useCallback(() => {
    void fetchWallet();
  }, []));

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
          <Text style={styles.loadingText}>Đang tải ví chuyên gia...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const heldDeposits = wallet?.heldDeposits || [];
  const rawTransactions = wallet?.recentTransactions || [];

  const filteredTransactions = rawTransactions.filter((item) => {
    if (!item.createdAt) return true;
    if (!filterStartDate && !filterEndDate) return true;
    try {
      const itemDate = new Date(item.createdAt);
      if (filterStartDate) {
        const start = new Date(filterStartDate + 'T00:00:00');
        if (itemDate < start) return false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate + 'T23:59:59');
        if (itemDate > end) return false;
      }
      return true;
    } catch {
      return true;
    }
  });

  const isFilterActive = Boolean(filterStartDate || filterEndDate || selectedPreset !== 'ALL');

  const getTransactionViewModel = (item: FreelancerTransactionItem): {
    code: string;
    summary: string;
    sign: '+' | '-';
    amountColor: string;
    statusText: string;
    statusBadgeColor: string;
    statusTextColor: string;
    transactionType: string;
    fullDesc: string;
  } => {
    const isCredit = item.entryType === 'CREDIT';
    const isCompensation = (item.description || '').toLowerCase().includes('bồi thường') || (item.description || '').toLowerCase().includes('cọc');
    const code = item.bookingCode || (item.referenceId ? `BK-${item.referenceId}` : `TXN-${item.id}`);

    if (isCompensation) {
      return {
        code,
        summary: item.description || `${code} - Bồi thường 100% tiền cọc`,
        sign: '+',
        amountColor: '#059669',
        statusText: 'Bồi Thường Cho Thợ (Thu Nhập)',
        statusBadgeColor: '#ECFDF5',
        statusTextColor: '#059669',
        transactionType: 'Bồi thường cọc hủy ca',
        fullDesc: item.description || `Khách hủy ca sau khi thợ đã tiếp nhận & đang di chuyển. 100% tiền cọc (${formatVnd(item.amount)}) được bồi thường vào ví khả dụng của thợ.`,
      };
    }

    if (isCredit) {
      return {
        code,
        summary: item.description || `${code} - Quyết toán dịch vụ`,
        sign: '+',
        amountColor: '#059669',
        statusText: 'Quyết Toán Dịch Vụ Thành Công',
        statusBadgeColor: '#ECFDF5',
        statusTextColor: '#059669',
        transactionType: 'Thù lao hoàn tất ca làm',
        fullDesc: item.description || `Quyết toán hợp đồng dịch vụ hoàn tất 100%. Tiền thù lao đã được cộng vào ví khả dụng của chuyên viên.`,
      };
    }

    return {
      code,
      summary: item.description || `${code} - Khấu trừ ví`,
      sign: '-',
      amountColor: '#DC2626',
      statusText: 'Khấu Trừ Thành Công',
      statusBadgeColor: '#FEF2F2',
      statusTextColor: '#DC2626',
      transactionType: 'Rút tiền / Khấu trừ ví',
      fullDesc: item.description || `Giao dịch khấu trừ số dư ví chuyên viên ${formatVnd(item.amount)}.`,
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Điều Hướng */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
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
        {/* Thẻ Số Dư & Cọc Đang Giữ */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.balanceHeaderLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.balanceTitle}>Số dư khả dụng</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#10B981" />
              <Text style={styles.verifiedText}>Đã xác minh</Text>
            </View>
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
          /* Nội dung Tab Lịch Sử Biến Động Chuẩn Banking Sáng */
          <>
            {/* Thanh tiêu đề biến động & Nút Lọc Phễu */}
            <View style={styles.transactionsHeaderRow}>
              <View style={styles.transactionsHeaderLeft}>
                <Text style={styles.transactionsHeaderTitle}>
                  Biến Động Số Dư
                </Text>
                <Text style={styles.transactionsHeaderCount}>
                  ({filteredTransactions.length} giao dịch)
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.filterBtn, isFilterActive && styles.filterBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setIsFilterModalOpen(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isFilterActive ? 'funnel' : 'funnel-outline'}
                  size={16}
                  color={isFilterActive ? '#FFFFFF' : '#475569'}
                />
                {isFilterActive && <View style={styles.filterDot} />}
              </TouchableOpacity>
            </View>

            {/* Banner Lọc Đang Hoạt Động (Nếu có) */}
            {isFilterActive && (
              <View style={styles.activeFilterTagRow}>
                <View style={styles.activeFilterTagContent}>
                  <Ionicons name="calendar-outline" size={13} color="#0284C7" />
                  <Text style={styles.activeFilterTagText}>
                    {filterStartDate && filterEndDate
                      ? `${formatDateShort(filterStartDate)} - ${formatDateShort(filterEndDate)}`
                      : filterStartDate
                      ? `Từ ${formatDateShort(filterStartDate)}`
                      : `Đến ${formatDateShort(filterEndDate)}`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    applyPreset('ALL');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={styles.clearFilterChip}
                >
                  <Ionicons name="close-circle" size={15} color="#DC2626" />
                  <Text style={styles.clearFilterText}>Xóa lọc</Text>
                </TouchableOpacity>
              </View>
            )}

            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>
                  {isFilterActive ? 'Không tìm thấy giao dịch nào' : 'Chưa có biến động số dư'}
                </Text>
                <Text style={styles.emptyDesc}>
                  {isFilterActive
                    ? 'Không có giao dịch nào khớp với khoảng thời gian đã chọn.'
                    : 'Bút toán cộng tiền vào ví khả dụng sẽ được ghi nhận sau khi đơn hoàn tất và quyết toán thành công.'}
                </Text>
                {isFilterActive && (
                  <TouchableOpacity
                    onPress={() => applyPreset('ALL')}
                    style={styles.resetFilterActionBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.resetFilterActionBtnText}>Xem Tất Cả Giao Dịch</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.bankingListCard}>
                {filteredTransactions.map((item, index) => {
                  const vm = getTransactionViewModel(item);
                  const isLast = index === filteredTransactions.length - 1;

                  return (
                    <View key={item.id}>
                      <TouchableOpacity
                        style={styles.bankingRow}
                        activeOpacity={0.7}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedTx({
                            transactionCode: vm.code,
                            bookingCode: item.bookingCode,
                            dateTime: formatDateTimeFull(item.createdAt),
                            amount: item.amount,
                            sign: vm.sign,
                            amountColor: vm.amountColor,
                            statusText: vm.statusText,
                            statusBadgeColor: vm.statusBadgeColor,
                            statusTextColor: vm.statusTextColor,
                            transactionType: vm.transactionType,
                            description: vm.fullDesc,
                            balanceAfter: item.balanceAfter,
                          });
                        }}
                      >
                        {/* Cột trái: Ngày ở trên, Tên/Mã ở dưới */}
                        <View style={styles.bankingRowLeft}>
                          <Text style={styles.bankingDateText}>{formatDateShort(item.createdAt)}</Text>
                          <Text style={styles.bankingCodeText} numberOfLines={1}>
                            {vm.summary}
                          </Text>
                        </View>

                        {/* Cột phải: Số tiền (+ hoặc -) và Mũi tên > */}
                        <View style={styles.bankingRowRight}>
                          <Text style={[styles.bankingAmountText, { color: vm.amountColor }]}>
                            {vm.sign} {formatVnd(item.amount)}
                          </Text>
                          <Ionicons name="chevron-forward" size={17} color="#94A3B8" style={{ marginLeft: 6 }} />
                        </View>
                      </TouchableOpacity>

                      {!isLast && <View style={styles.bankingDivider} />}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal Xem Chi Tiết Giao Dịch Chuẩn Banking */}
      <TransactionDetailModal
        visible={Boolean(selectedTx)}
        data={selectedTx}
        onClose={() => setSelectedTx(null)}
      />

      {/* MODAL LỌC GIAO DỊCH TỐI GIẢN */}
      <Modal
        visible={isFilterModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContent}>
            {/* Header Modal */}
            <View style={styles.filterModalHeader}>
              <View style={styles.filterModalTitleGroup}>
                <Ionicons name="funnel" size={18} color="#0F172A" />
                <Text style={styles.filterModalTitle}>Lọc Giao Dịch</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsFilterModalOpen(false)}
                style={styles.filterCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Quick Presets */}
              <Text style={styles.filterSectionLabel}>Khoảng thời gian nhanh</Text>
              <View style={styles.presetChipsRow}>
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'TODAY', label: 'Hôm nay' },
                  { key: '7DAYS', label: '7 ngày qua' },
                  { key: '30DAYS', label: '30 ngày qua' },
                ].map((item) => {
                  const isSelected = selectedPreset === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      onPress={() => applyPreset(item.key as any)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Tùy chỉnh ngày */}
              <Text style={[styles.filterSectionLabel, { marginTop: 18 }]}>
                Hoặc chọn khoảng ngày
              </Text>
              <DateRangePicker start={filterStartDate} end={filterEndDate} onChange={(start, end) => {
                setSelectedPreset('CUSTOM');
                setFilterStartDate(start);
                setFilterEndDate(end);
              }} />
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.filterActionRow}>
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={() => {
                  applyPreset('ALL');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.resetFilterBtnText}>Đặt Lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyFilterBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIsFilterModalOpen(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.applyFilterBtnText}>Áp Dụng ({filteredTransactions.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceTitle: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  balanceSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 12,
  },
  escrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  escrowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  escrowTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  escrowSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  escrowAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
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
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#E11D48',
    fontWeight: '700',
  },
  depositItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  depositItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  depositBookingCode: {
    fontSize: 14,
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
    marginVertical: 12,
  },
  depositItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  depositItemAmountLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  depositItemAmount: {
    fontSize: 15,
    fontWeight: '800',
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

  resetFilterActionBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  resetFilterActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: BrandColors.primary,
  },

  transactionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  transactionsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  transactionsHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  transactionsHeaderCount: {
    fontSize: 12,
    color: '#64748B',
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  activeFilterTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 12,
  },
  activeFilterTagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeFilterTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  clearFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearFilterText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#DC2626',
  },

  /* DANH SÁCH BIẾN ĐỘNG CHUẨN GIAO DIỆN SÁNG ELEGANT */
  bankingListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    paddingHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  bankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  bankingRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  bankingDateText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  bankingCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  bankingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bankingAmountText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  bankingDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  /* MODAL LỌC GIAO DỊCH STYLES */
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  filterModalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#FFF1F2',
    borderColor: BrandColors.primary,
  },
  presetChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  dateInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateInputCol: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  dateTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  dateInputDivider: {
    paddingTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resetFilterBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetFilterBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  applyFilterBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFilterBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
