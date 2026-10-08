import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '@/store/notification.store';
import { useAuthStore } from '@/store/auth.store';
import { NotificationItem } from '@/services/notification.service';
import { BrandColors } from '@/constants/theme';
import { useUndoStore } from '@/store/undo.store';

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    hasMore,
    currentPage,
    fetchNotifications,
    fetchUnreadCount,
    setFilter,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotificationStore();

  const { userInfo } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');

  // Tự động tải lại thông báo mỗi khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications(0, true);
      fetchUnreadCount();
    }, [])
  );

  const handleTabChange = (tab: 'ALL' | 'UNREAD') => {
    setActiveTab(tab);
    setFilter(tab === 'UNREAD' ? false : undefined);
  };

  const handleClearAllConfirm = () => {
    if (notifications.length === 0) return;
    const oldList = [...notifications];
    const oldUnread = unreadCount;

    Alert.alert(
      'Xóa Tất Cả Thông Báo',
      'Bạn có chắc chắn muốn xóa toàn bộ thông báo trong lịch sử không? Bạn có thể hoàn tác ngay sau khi xóa.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa Sạch',
          style: 'destructive',
          onPress: () => {
            // Loại bỏ lạc quan khỏi store
            useNotificationStore.setState({ notifications: [], unreadCount: 0 });

            // Kích hoạt Toast thông báo xóa thành công kèm nút Hoàn tác
            useUndoStore.getState().showUndoToast({
              message: 'Đã xóa toàn bộ thông báo trong lịch sử',
              onUndo: () => {
                useNotificationStore.setState({
                  notifications: oldList,
                  unreadCount: oldUnread,
                });
              },
              onCommit: async () => {
                await clearAll();
              },
            });
          },
        },
      ]
    );
  };

  const handleNotificationPress = (item: NotificationItem) => {
    // 1. Đánh dấu đã đọc
    if (!item.isRead) {
      markAsRead(item.id);
    }

    // 2. Deep link tới đơn hàng nếu có
    const bookingId = item.bookingId || item.metadata?.bookingId;
    if (bookingId) {
      const isMua = userInfo?.roles?.some(
        (r) => r === 'ROLE_FREELANCE_MUA' || r === 'ROLE_AGENCY_STAFF'
      );

      if (isMua) {
        router.push(`/job-execution/${bookingId}` as any);
      } else {
        if (item.type === 'BOOKING_ON_THE_WAY') {
          router.push(`/booking/tracking/${bookingId}` as any);
        } else {
          router.push(`/booking/detail/${bookingId}` as any);
        }
      }
      return;
    }

    // 3. Deep link cho kết quả duyệt chứng chỉ hoặc đơn gia nhập Studio
    if (
      item.type === 'CERTIFICATE_APPROVED' ||
      item.type === 'CERTIFICATE_REJECTED' ||
      item.type === 'STAFF_APPLICATION_APPROVED' ||
      item.type === 'STAFF_APPLICATION_REJECTED'
    ) {
      router.push('/profile/mua-profile' as any);
    }
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Vừa xong';
    try {
      const now = new Date().getTime();
      const created = new Date(isoString).getTime();
      const diffMinutes = Math.floor((now - created) / 60000);

      if (diffMinutes < 1) return 'Vừa xong';
      if (diffMinutes < 60) return `${diffMinutes} phút trước`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return new Date(isoString).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return 'Vừa xong';
    }
  };

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case 'BOOKING_ACCEPTED':
      case 'SCHEDULED_BOOKING_ACCEPTED':
        return { name: 'calendar-outline' as const, color: '#2563EB', bgColor: '#EFF6FF' };
      case 'BOOKING_ON_THE_WAY':
        return { name: 'car-outline' as const, color: '#0284C7', bgColor: '#F0F9FF' };
      case 'BOOKING_ARRIVED':
        return { name: 'location-outline' as const, color: '#059669', bgColor: '#ECFDF5' };
      case 'BOOKING_IN_PROGRESS':
        return { name: 'color-palette-outline' as const, color: '#DB2777', bgColor: '#FDF2F8' };
      case 'BOOKING_COMPLETED':
      case 'PAID_OUT':
        return { name: 'checkmark-circle-outline' as const, color: '#16A34A', bgColor: '#F0FDF4' };
      case 'BOOKING_CANCELLED':
      case 'CANCELLED_EXPIRED':
        return { name: 'close-circle-outline' as const, color: '#DC2626', bgColor: '#FEF2F2' };
      case 'CERTIFICATE_APPROVED':
        return { name: 'ribbon-outline' as const, color: '#16A34A', bgColor: '#F0FDF4' };
      case 'CERTIFICATE_REJECTED':
      case 'CERTIFICATE_VERIFICATION':
        return { name: 'alert-circle-outline' as const, color: '#DC2626', bgColor: '#FEF2F2' };
      case 'STAFF_APPLICATION':
        return { name: 'person-add-outline' as const, color: '#2563EB', bgColor: '#EFF6FF' };
      case 'STAFF_APPLICATION_APPROVED':
        return { name: 'ribbon-outline' as const, color: '#16A34A', bgColor: '#F0FDF4' };
      case 'STAFF_APPLICATION_REJECTED':
        return { name: 'close-circle-outline' as const, color: '#EA580C', bgColor: '#FFF7ED' };
      default:
        return { name: 'notifications-outline' as const, color: '#64748B', bgColor: '#F8FAFC' };
    }
  };

  const formatLocalizedTitle = (rawTitle?: string) => {
    if (!rawTitle) return 'Thông báo mới';
    const lower = rawTitle.toLowerCase();
    if (lower.includes('booking has been cancelled') || lower.includes('booking cancelled')) {
      return 'Lịch hẹn đã bị hủy';
    }
    if (lower.includes('booking accepted') || lower.includes('booking has been accepted')) {
      return 'Chuyên viên đã nhận lịch';
    }
    if (lower.includes('booking completed')) {
      return 'Ca trang điểm hoàn thành';
    }
    if (lower.includes('deposit paid') || lower.includes('deposit completed')) {
      return 'Đã thanh toán tiền cọc';
    }
    if (lower.includes('refund')) {
      return 'Đã hoàn tiền cọc';
    }
    return rawTitle;
  };

  const formatLocalizedContent = (item: NotificationItem) => {
    let text = item.content || '';
    if (text.includes('{0}')) {
      const name = (item.metadata?.certName as string) || (item.metadata?.title as string) || '';
      text = text.replace(/\{0\}/g, name ? `"${name}"` : '');
    }
    text = text.replace(/was cancelled\./gi, 'đã bị hủy.');
    text = text.replace(/Reason:/gi, 'Lý do:');
    return text;
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const badge = getBadgeIcon(item.type);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          !item.isRead && styles.cardUnread,
        ]}
        activeOpacity={0.82}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconWrapper, { backgroundColor: badge.bgColor }]}>
          <Ionicons name={badge.name} size={18} color={badge.color} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text
              style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]}
              numberOfLines={2}
            >
              {formatLocalizedTitle(item.title)}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.cardBody} numberOfLines={3}>
            {formatLocalizedContent(item)}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.timeWrap}>
              <Ionicons name="time-outline" size={11} color="#94A3B8" />
              <Text style={styles.cardTime}>{formatRelativeTime(item.createdAt)}</Text>
            </View>

            <TouchableOpacity
              style={styles.deleteIconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => deleteNotification(item.id)}
            >
              <Ionicons name="trash-outline" size={14} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Trung Tâm Thông Báo
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badgeBox}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => markAllAsRead()}
              activeOpacity={0.7}
              accessibilityLabel="Đọc hết"
            >
              <Ionicons name="checkmark-done" size={17} color={BrandColors.primary} />
            </TouchableOpacity>
          )}

          {notifications.length > 0 && (
            <TouchableOpacity
              style={[styles.headerIconBtn, styles.headerIconBtnDanger]}
              onPress={handleClearAllConfirm}
              activeOpacity={0.7}
              accessibilityLabel="Xóa tất cả"
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs Bar */}
      <View style={styles.filterBar}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'ALL' && styles.tabButtonActive]}
            onPress={() => handleTabChange('ALL')}
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'ALL' && styles.tabButtonTextActive]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'UNREAD' && styles.tabButtonActive]}
            onPress={() => handleTabChange('UNREAD')}
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'UNREAD' && styles.tabButtonTextActive]}
            >
              Chưa đọc {unreadCount > 0 ? `(${unreadCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.quickMarkReadLink}
            onPress={() => markAllAsRead()}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done-outline" size={13} color={BrandColors.primary} />
            <Text style={styles.quickMarkReadText}>Đọc hết</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content Area */}
      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải thông báo từ hệ thống...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchNotifications(0, true)}
              tintColor={BrandColors.primary}
              colors={[BrandColors.primary]}
            />
          }
          onEndReached={() => {
            if (hasMore && !isLoading) {
              fetchNotifications(currentPage + 1, false);
            }
          }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={44} color="#FDA4AF" />
              </View>
              <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
              <Text style={styles.emptyDesc}>
                {activeTab === 'UNREAD'
                  ? 'Tuyệt vời! Bạn đã xem hết các thông báo chưa đọc.'
                  : 'Cập nhật về tiến trình cuốc hẹn và thanh toán sẽ xuất hiện tại đây.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            <>
              {isLoading && notifications.length > 0 && (
                <View style={styles.footerLoading}>
                  <ActivityIndicator size="small" color={BrandColors.primary} />
                </View>
              )}
              {!hasMore && notifications.length > 0 && (
                <View style={styles.endOfListContainer}>
                  <View style={styles.endOfListDivider} />
                  <Text style={styles.endOfListText}>Bạn đã xem hết thông báo</Text>
                  <View style={styles.endOfListDivider} />
                </View>
              )}
            </>
          }
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  badgeBox: {
    marginLeft: 6,
    backgroundColor: BrandColors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtnDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickMarkReadLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  quickMarkReadText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabButtonActive: {
    backgroundColor: BrandColors.primary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
    gap: 10,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardUnread: {
    backgroundColor: '#FAFAFA',
    borderLeftWidth: 3,
    borderLeftColor: BrandColors.primary,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
    lineHeight: 19,
  },
  cardTitleUnread: {
    color: '#0F172A',
    fontWeight: '800',
  },
  cardBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#F1F5F9',
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: BrandColors.primary,
    marginTop: 6,
  },
  deleteIconBtn: {
    padding: 4,
    borderRadius: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  endOfListContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 12,
  },
  endOfListDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  endOfListText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  footerLoading: {
    paddingVertical: 14,
    alignItems: 'center',
  },
});
