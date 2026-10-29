import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { agencyStaffService, OvertimeReportItem } from '@/services/agency-staff.service';
import { websocketService } from '@/services/websocket.service';
import { useAuthStore } from '@/store/auth.store';
import { formatDateTimeVN } from '@/utils/date';
import { ImageViewerModal } from '@/components/common/ImageViewerModal';

type FilterTab = 'ALL' | 'PENDING' | 'APPROVED' | 'PENALIZED';

export default function StaffOvertimeReportsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reports, setReports] = useState<OvertimeReportItem[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const loadReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await agencyStaffService.getMyOvertimeReports();
      setReports(data || []);
    } catch {
      setReports([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Realtime WebSocket subscription
  useEffect(() => {
    if (!user?.id) return;
    const topic = `/topic/staff-overtime/${user.id}`;
    const unsubscribe = websocketService.subscribe(topic, (updatedReport: any) => {
      if (updatedReport && updatedReport.id) {
        setReports((prevList) => {
          const index = prevList.findIndex((item) => item.id === updatedReport.id);
          if (index >= 0) {
            const newList = [...prevList];
            newList[index] = { ...newList[index], ...updatedReport };
            return newList;
          }
          return [updatedReport, ...prevList];
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else {
        websocketService.unsubscribe(topic);
      }
    };
  }, [user?.id]);

  // Thống kê số lượng
  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => r.status === 'PENDING_AGENCY_REVIEW' || r.status === 'PENDING').length;
    const approved = reports.filter((r) => r.status === 'APPROVED_WAIVED' || r.status === 'APPROVED').length;
    const penalized = reports.filter((r) => r.status === 'PENALIZED' || r.status === 'REJECTED').length;
    return { total, pending, approved, penalized };
  }, [reports]);

  // Danh sách đã lọc theo tab và từ khóa
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      if (filterTab === 'PENDING') {
        if (item.status !== 'PENDING_AGENCY_REVIEW' && item.status !== 'PENDING') return false;
      } else if (filterTab === 'APPROVED') {
        if (item.status !== 'APPROVED_WAIVED' && item.status !== 'APPROVED') return false;
      } else if (filterTab === 'PENALIZED') {
        if (item.status !== 'PENALIZED' && item.status !== 'REJECTED') return false;
      }

      if (searchKeyword.trim()) {
        const query = searchKeyword.trim().toLowerCase();
        const code = (item.bookingCode || '').toLowerCase();
        const idStr = String(item.bookingId || '');
        const reason = (item.explanationText || '').toLowerCase();
        const pkg = (item.packageName || '').toLowerCase();
        return code.includes(query) || idStr.includes(query) || reason.includes(query) || pkg.includes(query);
      }

      return true;
    });
  }, [reports, filterTab, searchKeyword]);

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const renderStatusBadge = (status?: string) => {
    if (status === 'APPROVED_WAIVED' || status === 'APPROVED') {
      return (
        <View style={[styles.badge, styles.badgeApproved]}>
          <Text style={styles.badgeTextApproved}>Đã duyệt thưởng</Text>
        </View>
      );
    }
    if (status === 'PENALIZED' || status === 'REJECTED') {
      return (
        <View style={[styles.badge, styles.badgePenalized]}>
          <Text style={styles.badgeTextPenalized}>Bị phạt / Từ chối</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgePending]}>
        <Text style={styles.badgeTextPending}>Chờ duyệt</Text>
      </View>
    );
  };

  const renderPaymentBadge = (item: OvertimeReportItem) => {
    if (item.status !== 'APPROVED_WAIVED' && item.status !== 'APPROVED') return null;
    const payStatus = item.allowancePaymentStatus;
    if (payStatus === 'PAID') {
      return (
        <View style={[styles.badge, styles.badgePaid]}>
          <Text style={styles.badgeTextPaid}>Đã chuyển ví</Text>
        </View>
      );
    }
    if (payStatus === 'PENDING_SETTLEMENT') {
      return (
        <View style={[styles.badge, styles.badgePendingPay]}>
          <Text style={styles.badgeTextPendingPay}>Chờ thanh toán</Text>
        </View>
      );
    }
    if (payStatus === 'NEEDS_RECONCILIATION') {
      return (
        <View style={[styles.badge, styles.badgeReconcile]}>
          <Text style={styles.badgeTextReconcile}>Cần đối soát</Text>
        </View>
      );
    }
    return null;
  };

  const renderRoleBadge = (item: OvertimeReportItem) => {
    const isAssistant = item.assignmentRole === 'ASSISTANT_MUA';
    return (
      <View style={[styles.badge, isAssistant ? styles.badgeAssistant : styles.badgePrimary]}>
        <Text style={[styles.badgeRoleText, isAssistant ? styles.badgeAssistantText : styles.badgePrimaryText]}>
          {item.assignmentRoleName || (isAssistant ? 'Thợ phụ' : 'Thợ chính')}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* HEADER BASIC */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Lịch Sử Giải Trình</Text>
        </View>
        <TouchableOpacity
          onPress={() => loadReports(true)}
          style={styles.refreshBtn}
          disabled={isLoading || isRefreshing}
          activeOpacity={0.7}
        >
          <Text style={styles.refreshBtnText}>Làm mới</Text>
        </TouchableOpacity>
      </View>

      {/* FILTER TABS BASIC */}
      <View style={styles.filterTabsRow}>
        {(
          [
            { id: 'ALL', label: `Tất cả (${stats.total})` },
            { id: 'PENDING', label: `Chờ duyệt (${stats.pending})` },
            { id: 'APPROVED', label: `Đã duyệt (${stats.approved})` },
            { id: 'PENALIZED', label: `Từ chối (${stats.penalized})` },
          ] as Array<{ id: FilterTab; label: string }>
        ).map((tab) => {
          const isActive = filterTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterTabPill, isActive && styles.filterTabPillActive]}
              onPress={() => setFilterTab(tab.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterTabPillText, isActive && styles.filterTabPillTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* SEARCH BOX BASIC */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm mã đơn, gói dịch vụ, lý do..."
          placeholderTextColor="#94A3B8"
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          clearButtonMode="while-editing"
        />
        {searchKeyword.length > 0 && (
          <TouchableOpacity onPress={() => setSearchKeyword('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Xóa</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* DANH SÁCH BÁO CÁO GIẢI TRÌNH */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="small" color="#0F172A" />
          <Text style={styles.loadingText}>Đang tải danh sách...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={[
            styles.listScrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadReports(true)}
              colors={['#0F172A']}
            />
          }
        >
          {filteredReports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Chưa có đơn giải trình nào</Text>
              <Text style={styles.emptySub}>
                {searchKeyword.length > 0
                  ? 'Không tìm thấy đơn nào khớp với từ khóa.'
                  : 'Danh sách giải trình quá giờ sẽ hiển thị ở đây.'}
              </Text>
            </View>
          ) : (
            filteredReports.map((item) => {
              const bookingLabel = item.bookingCode || `#BK-${item.bookingId}`;
              const isApproved = item.status === 'APPROVED_WAIVED' || item.status === 'APPROVED';
              const isPenalized = item.status === 'PENALIZED' || item.status === 'REJECTED';
              const displayAmount = isApproved
                ? (item.penaltyAmountApplied || 0)
                : (item.estimatedAllowanceAmount || 0);

              return (
                <View key={item.id} style={styles.reportCard}>
                  {/* DÒNG 1: MÃ ĐƠN & HUY HIỆU */}
                  <View style={styles.cardRowBetween}>
                    <TouchableOpacity
                      onPress={() => router.push(`/booking/history-detail/${item.bookingId}` as any)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.bookingCodeText}>{bookingLabel} &gt;</Text>
                    </TouchableOpacity>

                    <View style={styles.badgesRightWrap}>
                      {renderRoleBadge(item)}
                      {renderStatusBadge(item.status)}
                    </View>
                  </View>

                  {/* DÒNG 2: GÓI DỊCH VỤ & THỜI GIAN QUÁ GIỜ */}
                  <View style={[styles.cardRowBetween, { marginTop: 6 }]}>
                    <Text style={styles.packageNameText} numberOfLines={1}>
                      {item.packageName || 'Dịch vụ trang điểm'}
                    </Text>
                    <Text style={styles.overtimeText}>+{item.overtimeMinutes} phút</Text>
                  </View>

                  {/* DÒNG 3: TIỀN PHỤ CẤP & TRẠNG THÁI THANH TOÁN */}
                  <View style={[styles.cardRowBetween, { marginTop: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.metaLabel}>
                        {isApproved ? 'Thực nhận:' : isPenalized ? 'Mức phạt:' : 'Dự kiến:'}
                      </Text>
                      <Text
                        style={[
                          styles.amountText,
                          isApproved && styles.amountApproved,
                          isPenalized && styles.amountPenalized,
                        ]}
                      >
                        {isPenalized ? `-${formatCurrency(item.penaltyAmountApplied)}` : `+${formatCurrency(displayAmount)}`}
                      </Text>
                    </View>
                    {renderPaymentBadge(item)}
                  </View>

                  {/* DÒNG 4: LÝ DO GIẢI TRÌNH */}
                  <View style={styles.reasonWrap}>
                    <Text style={styles.reasonLabel}>Lý do:</Text>
                    <Text style={styles.reasonText}>{item.explanationText || 'Không có lý do'}</Text>
                  </View>

                  {/* DÒNG 5: ẢNH ĐỐI CHỨNG (NẾU CÓ) */}
                  {Boolean(item.proofImageUrl) && (
                    <View style={styles.proofRow}>
                      <TouchableOpacity
                        onPress={() => setPreviewImageUrl(item.proofImageUrl!)}
                        activeOpacity={0.8}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      >
                        <Image
                          source={{ uri: item.proofImageUrl }}
                          style={styles.proofThumb}
                          contentFit="cover"
                        />
                        <Text style={styles.proofBtnText}>Xem ảnh đối chứng</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* DÒNG 6: GHI CHÚ TỪ STUDIO */}
                  {Boolean(item.adminNotes) && (
                    <View style={styles.adminNotesWrap}>
                      <Text style={styles.adminNotesLabel}>Studio phản hồi:</Text>
                      <Text style={styles.adminNotesText}>{item.adminNotes}</Text>
                    </View>
                  )}

                  {/* FOOTER: MỐC THỜI GIAN (GMT+7) */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>
                      Gửi: {formatDateTimeVN(item.createdAt)}
                    </Text>
                    {Boolean(item.reviewedAt) && (
                      <Text style={styles.dateText}>
                        | Duyệt: {formatDateTimeVN(item.reviewedAt)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* LIGHTBOX POPUP XEM ẢNH */}
      <ImageViewerModal
        visible={Boolean(previewImageUrl)}
        images={previewImageUrl ? [previewImageUrl] : []}
        onClose={() => setPreviewImageUrl(null)}
        title="Ảnh Đối Chứng"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  refreshBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterTabPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  filterTabPillActive: {
    backgroundColor: '#0F172A',
  },
  filterTabPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  filterTabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 38,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: 38,
    fontSize: 13,
    color: '#0F172A',
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  clearBtnText: {
    fontSize: 12,
    color: '#64748B',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748B',
  },
  listScroll: {
    flex: 1,
  },
  listScrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  badgesRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePrimary: {
    backgroundColor: '#FEF3C7',
  },
  badgeAssistant: {
    backgroundColor: '#F3E8FF',
  },
  badgeRoleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  badgePrimaryText: {
    color: '#B45309',
  },
  badgeAssistantText: {
    color: '#6D28D9',
  },
  badgePending: {
    backgroundColor: '#FFFBEB',
  },
  badgeApproved: {
    backgroundColor: '#ECFDF5',
  },
  badgePenalized: {
    backgroundColor: '#FEF2F2',
  },
  badgeTextPending: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B45309',
  },
  badgeTextApproved: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
  },
  badgeTextPenalized: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B91C1C',
  },
  badgePaid: {
    backgroundColor: '#D1FAE5',
  },
  badgeTextPaid: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
  },
  badgePendingPay: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextPendingPay: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  badgeReconcile: {
    backgroundColor: '#FEE2E2',
  },
  badgeTextReconcile: {
    fontSize: 10,
    fontWeight: '600',
    color: '#991B1B',
  },
  packageNameText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    marginRight: 8,
  },
  overtimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
  },
  amountApproved: {
    color: '#059669',
  },
  amountPenalized: {
    color: '#DC2626',
  },
  reasonWrap: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 17,
  },
  proofRow: {
    marginTop: 8,
  },
  proofThumb: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  proofBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  adminNotesWrap: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
  },
  adminNotesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 2,
  },
  adminNotesText: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  dateText: {
    fontSize: 10,
    color: '#94A3B8',
  },
});
