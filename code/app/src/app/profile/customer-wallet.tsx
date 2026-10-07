import { DismissibleModal } from '@/components/common/DismissibleModal';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import { depositService, CustomerWalletInfo, CustomerWalletTransaction } from '@/services/deposit.service';
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

export default function CustomerWalletScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wallet, setWallet] = useState<CustomerWalletInfo | null>(null);
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

      const data = await depositService.getCustomerWallet();
      setWallet(data);
    } catch (err: any) {
      Alert.alert('Ví Cá Nhân', err?.message || 'Không thể tải thông tin ví cá nhân.');
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
          <Text style={styles.loadingText}>Đang tải ví cá nhân...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

  const getTransactionViewModel = (item: CustomerWalletTransaction): {
    code: string;
    summary: string;
    sign: '+' | '-' | '';
    amountColor: string;
    statusText: string;
    statusBadgeColor: string;
    statusTextColor: string;
    transactionType: string;
    fullDesc: string;
  } => {
    const isCompensated = item.holdStatus === 'COMPENSATED_TO_MUA' || item.holdStatus === 'FORFEITED';
    const isRefund = item.referenceType === 'BOOKING_REFUND';
    const isConsumed = item.holdStatus === 'CONSUMED';
    const isActive = item.holdStatus === 'ACTIVE';

    const code = item.bookingCode || (item.referenceId ? `BK-${item.referenceId}` : `TXN-${item.id}`);

    if (item.referenceType === 'BOOKING_FINAL_PAYMENT') {
      return { code, summary: `${code} - Thanh toán phần còn lại (70%)`, sign: '-',
        amountColor: '#059669', statusText: 'Thanh Toán Thành Công', statusBadgeColor: '#ECFDF5',
        statusTextColor: '#059669', transactionType: 'Thanh toán online phần còn lại',
        fullDesc: item.description || 'Đã thanh toán phần còn lại qua cổng thanh toán.' };
    }

    // 1. Khoản Ký quỹ cọc ban đầu qua cổng thanh toán (Escrow hold)
    if (item.referenceType === 'BOOKING_DEPOSIT') {
      const isHoldRefunded = item.holdStatus === 'REFUNDED';
      const isHoldConsumed = item.holdStatus === 'CONSUMED';
      const isHoldCompensated = item.holdStatus === 'COMPENSATED_TO_MUA' || item.holdStatus === 'FORFEITED';

      let statusText = 'Đang Ký Quỹ Escrow';
      let statusBadgeColor = '#FFFBEB';
      let statusTextColor = '#D97706';
      let fullDesc = `Khoản tiền cọc (${formatVnd(item.amount)}) được bảo chứng an toàn trong quỹ Escrow.`;

      if (isHoldRefunded) {
        statusText = 'Đã Hoàn Về Ví Khả Dụng';
        statusBadgeColor = '#F1F5F9';
        statusTextColor = '#64748B';
        fullDesc = `Khoản tiền cọc (${formatVnd(item.amount)}) đã được ký quỹ trước đó và hiện đã được hệ thống hoàn lại 100% vào ví khả dụng do ca hẹn đã hủy.`;
      } else if (isHoldConsumed) {
        statusText = 'Đã Quyết Toán Cho Thợ';
        statusBadgeColor = '#F1F5F9';
        statusTextColor = '#475569';
        fullDesc = `Khoản tiền cọc (${formatVnd(item.amount)}) đã được đối soát và quyết toán thành công vào hợp đồng dịch vụ cho thợ make-up khi ca làm hoàn tất 100%.`;
      } else if (isHoldCompensated) {
        statusText = 'Khấu Trừ Bồi Thường Cho Thợ';
        statusBadgeColor = '#FEF2F2';
        statusTextColor = '#DC2626';
        fullDesc = `Khoản tiền cọc (${formatVnd(item.amount)}) đã được khấu trừ bồi thường cho thợ make-up do vi phạm điều kiện hủy ca.`;
      }

      return {
        code,
        summary: `${code} - Ký quỹ cọc Escrow`,
        sign: '',
        amountColor: isHoldRefunded ? '#64748B' : '#D97706',
        statusText,
        statusBadgeColor,
        statusTextColor,
        transactionType: 'Ký quỹ bảo chứng Escrow',
        fullDesc,
      };
    }

    if (isCompensated) {
      return {
        code,
        summary: `${code} - Bồi thường cọc thợ`,
        sign: '-',
        amountColor: '#DC2626',
        statusText: 'Bồi Thường Cho Thợ (Mất Cọc)',
        statusBadgeColor: '#FEF2F2',
        statusTextColor: '#DC2626',
        transactionType: 'Khấu trừ cọc bồi thường',
        fullDesc: `Khách hủy lịch sau khi chuyên viên make-up đã nhận đơn và đang di chuyển. 100% tiền cọc (${formatVnd(item.amount)}) được khấu trừ bồi thường chi phí di chuyển cho thợ make-up (Không hoàn cọc).`,
      };
    }

    if (isRefund) {
      return {
        code,
        summary: `${code} - Hoàn cọc về ví`,
        sign: '+',
        amountColor: '#059669',
        statusText: 'Đã Hoàn Cọc Thành Công',
        statusBadgeColor: '#ECFDF5',
        statusTextColor: '#059669',
        transactionType: 'Hoàn tiền cọc Escrow',
        fullDesc: item.description || `Hoàn 100% tiền cọc (${formatVnd(item.amount)}) vào ví khả dụng của khách hàng do thợ hủy ca hoặc hủy theo quy định miễn phí của hệ thống.`,
      };
    }

    if (isConsumed) {
      return {
        code,
        summary: `${code} - Quyết toán dịch vụ`,
        sign: '-',
        amountColor: '#64748B',
        statusText: 'Đã Quyết Toán Ca Make-up',
        statusBadgeColor: '#F1F5F9',
        statusTextColor: '#475569',
        transactionType: 'Quyết toán hợp đồng dịch vụ',
        fullDesc: `Khoản tiền cọc ký quỹ Escrow (${formatVnd(item.amount)}) đã được đối soát và quyết toán thành công vào hợp đồng dịch vụ khi ca làm hoàn tất 100%.`,
      };
    }

    if (isActive) {
      return {
        code,
        summary: `${code} - Ký quỹ cọc Escrow`,
        sign: '',
        amountColor: '#D97706',
        statusText: 'Đang Giữ Trong Quỹ Escrow',
        statusBadgeColor: '#FFFBEB',
        statusTextColor: '#D97706',
        transactionType: 'Ký quỹ bảo chứng Escrow',
        fullDesc: `Tiền cọc (${formatVnd(item.amount)}) đang được hệ thống Escrow tạm giữ an toàn để bảo chứng ca làm cho chuyên viên và khách hàng.`,
      };
    }

    // Giao dịch nạp / rút / phát sinh khác
    const isCredit = item.entryType === 'CREDIT';
    return {
      code,
      summary: item.description || (isCredit ? 'Cộng tiền vào ví' : 'Trừ tiền từ ví'),
      sign: isCredit ? '+' : '-',
      amountColor: isCredit ? '#059669' : '#DC2626',
      statusText: isCredit ? 'Nạp Tiền Thành Công' : 'Thanh Toán Thành Công',
      statusBadgeColor: isCredit ? '#ECFDF5' : '#FEF2F2',
      statusTextColor: isCredit ? '#059669' : '#DC2626',
      transactionType: isCredit ? 'Cộng tiền vào ví' : 'Trừ tiền ví',
      fullDesc: item.description || `Giao dịch biến động số dư ví cá nhân số tiền ${formatVnd(item.amount)}.`,
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
        {/* Thẻ Số Dư Ví & Ký Quỹ Escrow - Luxury Beauty Aesthetics */}
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

          <View style={styles.balanceRowTwoCol}>
            <View style={styles.balanceCol}>
              <Text style={styles.walletLabel}>Số dư khả dụng</Text>
              <Text style={styles.balanceAmount}>{formatVnd(wallet?.availableBalance || 0)}</Text>
              <Text style={styles.balanceSub}>Tiền hoàn cọc / Khả dụng rút</Text>
            </View>
            <View style={styles.balanceColDivider} />
            <View style={styles.balanceCol}>
              <Text style={styles.walletLabel}>Đang Ký Quỹ Escrow</Text>
              <Text style={[styles.balanceAmount, { color: '#38BDF8' }]}>
                {formatVnd(wallet?.frozenBalance || 0)}
              </Text>
              <Text style={styles.balanceSub}>Tiền cọc giữ chỗ ca làm</Text>
            </View>
          </View>
        </View>

        {/* Banner Quyền Lợi Bảo Vệ Khách Hàng */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.infoBannerTitle}>Chính Sách Hoàn Cọc Tự Động</Text>
            <Text style={styles.infoBannerDesc}>
              Khi Thợ make-up hủy ca hẹn đã cọc, hệ thống Escrow sẽ tự động hoàn 100% tiền cọc về Ví khả dụng của bạn ngay lập tức.
            </Text>
          </View>
        </View>

        {/* Tiêu đề mục Biến Động Số Dư & Nút Lọc Phễu */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Lịch Sử Biến Động Số Dư</Text>
            <Text style={styles.sectionCount}>({filteredTransactions.length} giao dịch)</Text>
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
              size={17}
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

        {/* Danh Sách Biến Động Chuẩn Giao Diện Sáng Banking */}
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="cash-clock" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>
              {isFilterActive ? 'Không tìm thấy giao dịch nào' : 'Chưa có biến động số dư'}
            </Text>
            <Text style={styles.emptyDesc}>
              {isFilterActive
                ? 'Không có giao dịch nào khớp với khoảng thời gian đã chọn.'
                : 'Các giao dịch hoàn tiền cọc hoặc nạp/rút sẽ được hiển thị chi tiết tại đây.'}
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
      </ScrollView>

      {/* Modal Xem Chi Tiết Giao Dịch Chuẩn Banking */}
      <TransactionDetailModal
        visible={Boolean(selectedTx)}
        data={selectedTx}
        onClose={() => setSelectedTx(null)}
      />

      {/* MODAL LỌC GIAO DỊCH TỐI GIẢN */}
      <DismissibleModal visible={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} overlayStyle={styles.filterModalOverlay} contentStyle={styles.filterModalContent}>
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
          </DismissibleModal>
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
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  balanceRowTwoCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  balanceCol: {
    flex: 1,
  },
  balanceColDivider: {
    width: 1,
    height: '85%',
    backgroundColor: '#334155',
    marginHorizontal: 16,
    alignSelf: 'center',
  },
  balanceSub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginTop: 2,
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
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
