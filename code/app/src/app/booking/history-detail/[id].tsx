import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { bookingService, BookingStatusDetailRes, BookingStatusType } from '@/services/booking.service';
import { depositService } from '@/services/deposit.service';
import { freelancerBookingService } from '@/services/freelancer-booking.service';
import { formatDateTimeVN } from '@/utils/date';

export default function BookingHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const { userInfo, isAuthenticated } = useAuthStore();
  const isMUA = userInfo?.roles?.includes('ROLE_FREELANCE_MUA');
  const isAgencyStaff = userInfo?.roles?.includes('ROLE_AGENCY_STAFF');
  const isWorkstationRole = (isMUA || isAgencyStaff) && isAuthenticated;

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bookingDetail, setBookingDetail] = useState<BookingStatusDetailRes | null>(null);

  // Modal phóng to ảnh nghiệm thu
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);

  // Trạng thái thanh toán 70% còn lại cho Khách
  const [isCashPaidConfirmed, setIsCashPaidConfirmed] = useState(false);
  const [isConfirmingCash, setIsConfirmingCash] = useState(false);
  const [isPayingOnline, setIsPayingOnline] = useState(false);
  const [onlineGatewayPaying, setOnlineGatewayPaying] = useState<'MOMO' | 'VNPAY' | null>(null);

  // Trạng thái xác nhận đã nhận tiền mặt cho Thợ
  const [isConfirmingMuaReceivedCash, setIsConfirmingMuaReceivedCash] = useState(false);

  const loadData = async (refresh = false) => {
    if (!bookingId) return;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await bookingService.getBookingStatus(bookingId);
      setBookingDetail(data);
    } catch (err: any) {
      Alert.alert('Lỗi Tải Dữ Liệu', err?.response?.data?.message || err.message || 'Không thể tải chi tiết đơn hàng.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [bookingId]);

  const formatPrice = (price?: number | null) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  // Xử lý Khách xác nhận trả tiền mặt
  const handleConfirmCustomerCash = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Xác Nhận Trả Tiền Mặt',
      `Bạn xác nhận sẽ thanh toán trực tiếp số tiền ${formatPrice(remainingAmount)} bằng tiền mặt cho chuyên viên?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác Nhận Đã Đưa Tiền',
          onPress: async () => {
            try {
              setIsConfirmingCash(true);
              await depositService.confirmCustomerCashPayment(bookingId, 'v1');
              setIsCashPaidConfirmed(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Thành Công', 'Đã ghi nhận thanh toán tiền mặt. Chờ chuyên viên xác nhận nhận đủ tiền.');
              await loadData(true);
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể ghi nhận thanh toán tiền mặt.');
            } finally {
              setIsConfirmingCash(false);
            }
          },
        },
      ]
    );
  };

  // Xử lý Khách thanh toán online 70% qua MoMo / VNPay
  const handlePayRemainingOnline = async (gateway: 'MOMO' | 'VNPAY') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setIsPayingOnline(true);
      setOnlineGatewayPaying(gateway);

      const payRes = await depositService.createFinalPaymentIntent(bookingId, gateway);
      const paymentLink = payRes?.paymentUrl;

      if (paymentLink) {
        try {
          const supported = await Linking.canOpenURL(paymentLink);
          if (supported) {
            await Linking.openURL(paymentLink);
          } else {
            await WebBrowser.openBrowserAsync(paymentLink, {
              presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
              toolbarColor: '#0F172A',
            });
          }
        } catch {
          await WebBrowser.openBrowserAsync(paymentLink, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
            toolbarColor: '#0F172A',
          });
        }
      }
      await loadData(true);
    } catch (err: any) {
      Alert.alert('Lỗi Thanh Toán', err?.response?.data?.message || err?.message || 'Không thể tạo liên kết thanh toán.');
    } finally {
      setIsPayingOnline(false);
      setOnlineGatewayPaying(null);
    }
  };

  // Xử lý Thợ xác nhận đã thu đủ tiền mặt từ Khách
  const handleMuaConfirmReceivedCash = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Xác Nhận Đã Thu Đủ Tiền Mặt',
      `Bạn xác nhận đã nhận đủ ${formatPrice(remainingAmount)} tiền mặt trực tiếp từ khách hàng? Ca làm sẽ được chuyển sang trạng thái ĐÃ QUYẾT TOÁN 100% và giải ngân cọc Escrow vào Ví thợ.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác Nhận Đã Nhận',
          onPress: async () => {
            try {
              setIsConfirmingMuaReceivedCash(true);
              await freelancerBookingService.transitionBookingState(
                bookingId,
                'PAID_OUT',
                'Chuyên viên xác nhận đã thu đủ 70% tiền mặt từ khách'
              );
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('🎉 Quyết Toán Thành Công!', 'Ca làm đã hoàn tất 100%. Khoản cọc Escrow đã được tự động giải ngân vào Ví của bạn.');
              await loadData(true);
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể cập nhật quyết toán.');
            } finally {
              setIsConfirmingMuaReceivedCash(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading && !bookingDetail) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải hóa đơn & chi tiết lịch sử...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!bookingDetail) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi Tiết Đơn Hàng</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={54} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Không tìm thấy hóa đơn lịch sử</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.goBackBtnText}>Quay Lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPaidOut = bookingDetail.status === 'PAID_OUT';
  const isCompleted = bookingDetail.status === 'COMPLETED';
  const isCancelled = bookingDetail.status === 'CANCELLED' || bookingDetail.status === 'CANCELLED_EXPIRED';
  const isDisputed = bookingDetail.status === 'DISPUTED';

  const totalAmount = bookingDetail.totalAmount || 0;
  const depositAmount = bookingDetail.depositAmount || 0;
  const remainingAmount = Math.max(0, totalAmount - depositAmount);

  // Phí sàn và thu nhập thợ
  const platformFee = bookingDetail.platformFee || Math.round(totalAmount * 0.2);
  const earningsAmount = bookingDetail.earningsAmount || (totalAmount - platformFee);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* HEADER TOP BAR */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(isWorkstationRole ? '/' : '/bookings');
            }
          }}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Hóa Đơn & Lịch Sử Đơn</Text>
          <Text style={styles.headerSubtitle}>{bookingDetail.bookingCode || `#BK-${bookingDetail.bookingId}`}</Text>
        </View>
        <TouchableOpacity onPress={() => loadData(true)} style={styles.refreshIconBtn} activeOpacity={0.7}>
          <Ionicons name="reload-outline" size={20} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} colors={[BrandColors.primary]} />
        }
      >
        {/* BANNER KẾT QUẢ / TRẠNG THÁI QUYẾT TOÁN RÕ RÀNG */}
        {isPaidOut && (
          <View style={[styles.statusCard, styles.statusCardPaidOut]}>
            <View style={styles.statusCardHeader}>
              <View style={[styles.statusIconBox, { backgroundColor: '#10B981' }]}>
                <Ionicons name="checkmark-done" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusCardTitle, { color: '#065F46' }]}>ĐÃ HOÀN TẤT & QUYẾT TOÁN 100%</Text>
                <Text style={styles.statusCardDesc}>
                  Ca làm đẹp đã nghiệm thu hoàn hảo. Toàn bộ tiền cọc bảo chứng và chi phí dịch vụ đã được quyết toán minh bạch.
                </Text>
              </View>
            </View>
            <View style={styles.statusCardFooterRow}>
              <View style={styles.statusPillSuccess}>
                <Ionicons name="shield-checkmark" size={13} color="#059669" />
                <Text style={styles.statusPillSuccessText}>Hợp Đồng Hoàn Tất</Text>
              </View>
              <Text style={styles.statusTimeText}>
                {bookingDetail.updatedAt ? formatDateTimeVN(bookingDetail.updatedAt) : 'Đã kết thúc'}
              </Text>
            </View>
          </View>
        )}

        {isCompleted && (
          <View style={[styles.statusCard, styles.statusCardCompleted]}>
            <View style={styles.statusCardHeader}>
              <View style={[styles.statusIconBox, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="time" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusCardTitle, { color: '#92400E' }]}>
                  {isCashPaidConfirmed
                    ? 'ĐÃ NGHIỆM THU • CHỜ THỢ XÁC NHẬN TIỀN MẶT'
                    : 'ĐÃ HOÀN THÀNH CA • CHỜ THANH TOÁN 70%'}
                </Text>
                <Text style={styles.statusCardDesc}>
                  {isWorkstationRole
                    ? isCashPaidConfirmed
                      ? 'Khách hàng đã xác nhận đưa tiền mặt. Vui lòng kiểm tra và bấm "Xác Nhận Đã Thu Tiền Mặt" bên dưới.'
                      : 'Ca làm đã hoàn tất. Đang chờ khách hàng thanh toán 70% còn lại (Tiền mặt hoặc Ví điện tử).'
                    : isCashPaidConfirmed
                    ? `Bạn đã xác nhận trả ${formatPrice(remainingAmount)} tiền mặt. Chuyên viên đang kiểm tra để chốt quyết toán.`
                    : `Chuyên viên đã hoàn thành buổi trang điểm. Vui lòng thanh toán khoản tiền còn lại ${formatPrice(remainingAmount)}.`}
                </Text>
              </View>
            </View>
            <View style={styles.statusCardFooterRow}>
              <View style={styles.statusPillPending}>
                <Ionicons name="alert-circle" size={13} color="#D97706" />
                <Text style={styles.statusPillPendingText}>
                  Còn lại: {formatPrice(remainingAmount)}
                </Text>
              </View>
              <Text style={styles.statusTimeText}>
                {bookingDetail.updatedAt ? formatDateTimeVN(bookingDetail.updatedAt) : 'Đang chờ xử lý'}
              </Text>
            </View>
          </View>
        )}

        {isCancelled && (
          <View style={[styles.statusCard, styles.statusCardCancelled]}>
            <View style={styles.statusCardHeader}>
              <View style={[styles.statusIconBox, { backgroundColor: '#DC2626' }]}>
                <Ionicons name="close-circle" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusCardTitle, { color: '#991B1B' }]}>ĐƠN HÀNG ĐÃ HỦY</Text>
                <Text style={styles.statusCardDesc}>
                  {bookingDetail.cancellationReason || 'Lịch hẹn đã bị hủy do yêu cầu từ hai bên hoặc quá hạn đặt cọc.'}
                </Text>
              </View>
            </View>
            {bookingDetail.isDepositPaid && (
              <View style={styles.refundNoticeBox}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
                <Text style={styles.refundNoticeText}>
                  Khoản cọc 30% ({formatPrice(depositAmount)}) đã được bảo chứng và hoàn lại 100% vào Ví cá nhân của khách.
                </Text>
              </View>
            )}
          </View>
        )}

        {isDisputed && (
          <View style={[styles.statusCard, styles.statusCardDisputed]}>
            <View style={styles.statusCardHeader}>
              <View style={[styles.statusIconBox, { backgroundColor: '#EA580C' }]}>
                <Ionicons name="warning" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusCardTitle, { color: '#9A3412' }]}>ĐƠN ĐANG TRANH CHẤP / KHIẾU NẠI</Text>
                <Text style={styles.statusCardDesc}>
                  Ban Quản Trị đang xác minh minh chứng và liên hệ các bên để giải quyết tranh chấp trong 24h.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* CỤM THANH TOÁN 70% CHO KHÁCH HÀNG NẾU ĐƠN CHƯA QUYẾT TOÁN XONG */}
        {!isWorkstationRole && isCompleted && !isPaidOut && (
          <View style={styles.settleActionCard}>
            <View style={styles.settleActionHeader}>
              <Ionicons name="wallet" size={20} color={BrandColors.primary} />
              <Text style={styles.settleActionTitle}>
                Thanh Toán 70% Còn Lại: <Text style={styles.settleActionHighlight}>{formatPrice(remainingAmount)}</Text>
              </Text>
            </View>
            <Text style={styles.settleActionDesc}>
              Vui lòng chọn 1 phương thức thanh toán an toàn để hoàn tất hợp đồng:
            </Text>

            <View style={styles.settleBtnGroup}>
              {/* 1. Trả tiền mặt */}
              <TouchableOpacity
                style={[styles.settleMethodBtn, { borderColor: '#10B981', backgroundColor: '#ECFDF5' }]}
                onPress={handleConfirmCustomerCash}
                disabled={isConfirmingCash || isPayingOnline}
                activeOpacity={0.8}
              >
                {isConfirmingCash ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <>
                    <Ionicons name="cash-outline" size={22} color="#059669" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.settleMethodTitle, { color: '#059669' }]}>Tiền Mặt Trực Tiếp</Text>
                      <Text style={styles.settleMethodSub}>Đưa tiền mặt trực tiếp cho chuyên viên</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#059669" />
                  </>
                )}
              </TouchableOpacity>

              {/* 2. MoMo */}
              <TouchableOpacity
                style={[styles.settleMethodBtn, { borderColor: '#D82D8B', backgroundColor: '#FDF2F8' }]}
                onPress={() => handlePayRemainingOnline('MOMO')}
                disabled={isConfirmingCash || isPayingOnline}
                activeOpacity={0.8}
              >
                {isPayingOnline && onlineGatewayPaying === 'MOMO' ? (
                  <ActivityIndicator size="small" color="#D82D8B" />
                ) : (
                  <>
                    <Ionicons name="phone-portrait-outline" size={22} color="#D82D8B" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.settleMethodTitle, { color: '#D82D8B' }]}>Ví Điện Tử MoMo</Text>
                      <Text style={styles.settleMethodSub}>Thanh toán online tức thì qua App MoMo</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#D82D8B" />
                  </>
                )}
              </TouchableOpacity>

              {/* 3. VNPay */}
              <TouchableOpacity
                style={[styles.settleMethodBtn, { borderColor: '#0066CC', backgroundColor: '#EFF6FF' }]}
                onPress={() => handlePayRemainingOnline('VNPAY')}
                disabled={isConfirmingCash || isPayingOnline}
                activeOpacity={0.8}
              >
                {isPayingOnline && onlineGatewayPaying === 'VNPAY' ? (
                  <ActivityIndicator size="small" color="#0066CC" />
                ) : (
                  <>
                    <Ionicons name="qr-code-outline" size={22} color="#0066CC" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.settleMethodTitle, { color: '#0066CC' }]}>Cổng Thanh Toán VNPay</Text>
                      <Text style={styles.settleMethodSub}>Quét mã VietQR hoặc Thẻ ATM / Visa / Mastercard</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#0066CC" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* CỤM XÁC NHẬN THU TIỀN MẶT DÀNH CHO THỢ NẾU KHÁCH CHƯA QUYẾT TOÁN XONG */}
        {isWorkstationRole && isCompleted && !isPaidOut && (
          <View style={styles.muaSettleCard}>
            <View style={styles.muaSettleHeader}>
              <View style={styles.muaSettleIconBox}>
                <Ionicons name="cash" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.muaSettleTitle}>Thu Tiền Mặt Từ Khách Hàng</Text>
                <Text style={styles.muaSettleSub}>
                  Số tiền cần thu khi hoàn thành (70%): <Text style={styles.muaSettleHighlight}>{formatPrice(remainingAmount)}</Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.muaConfirmCashBtn}
              onPress={handleMuaConfirmReceivedCash}
              disabled={isConfirmingMuaReceivedCash}
              activeOpacity={0.85}
            >
              {isConfirmingMuaReceivedCash ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.muaConfirmCashBtnText}>
                    Xác Nhận Đã Nhận Đủ {formatPrice(remainingAmount)} Tiền Mặt
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* THÔNG TIN ĐỐI TÁC (THỢ HOẶC KHÁCH HÀNG) */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>
            {isWorkstationRole ? 'Thông Tin Khách Hàng' : 'Chuyên Viên Trang Điểm'}
          </Text>
          <View style={styles.partnerRow}>
            <Image
              source={{
                uri: isWorkstationRole
                  ? bookingDetail.customerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400'
                  : bookingDetail.muaAvatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400',
              }}
              style={styles.partnerAvatar}
              contentFit="cover"
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.partnerName} numberOfLines={1}>
                  {isWorkstationRole
                    ? bookingDetail.customerName || 'Khách Hàng'
                    : bookingDetail.muaName || 'Chuyên Viên Make-up'}
                </Text>
                <View style={[styles.roleTag, isWorkstationRole ? styles.roleTagCustomer : styles.roleTagMua]}>
                  <Text style={[styles.roleTagText, isWorkstationRole ? styles.roleTagTextCustomer : styles.roleTagTextMua]}>
                    {isWorkstationRole ? 'Khách Hàng' : 'PRO MUA'}
                  </Text>
                </View>
              </View>
              <Text style={styles.partnerPhone}>
                SĐT: {isWorkstationRole ? bookingDetail.customerPhone || 'Chưa cung cấp' : bookingDetail.muaPhone || 'Chưa cung cấp'}
              </Text>
              {!isWorkstationRole && bookingDetail.rating && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.ratingText}>{bookingDetail.rating.toFixed(1)} (Đánh giá cao)</Text>
                </View>
              )}
            </View>

            {(isWorkstationRole ? bookingDetail.customerPhone : bookingDetail.muaPhone) && (
              <TouchableOpacity
                style={styles.partnerCallBtn}
                onPress={() => {
                  const phone = isWorkstationRole ? bookingDetail.customerPhone : bookingDetail.muaPhone;
                  if (phone) Linking.openURL(`tel:${phone}`);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={18} color="#059669" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* CHI TIẾT DỊCH VỤ & ĐỊA ĐIỂM */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Chi Tiết Gói Dịch Vụ</Text>

          <View style={styles.serviceHeaderRow}>
            <View style={styles.serviceIconBox}>
              <Ionicons name="sparkles" size={18} color={BrandColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.servicePackageTitle}>{bookingDetail.packageName}</Text>
              {bookingDetail.styleName && (
                <Text style={styles.serviceStyleSub}>Phong cách: {bookingDetail.styleName}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoColLabel}>Ngày Hẹn</Text>
                <Text style={styles.infoColValue}>
                  {bookingDetail.bookingDate ? formatDateTimeVN(bookingDetail.bookingDate) : 'Hôm nay'}
                </Text>
              </View>
            </View>

            <View style={styles.infoCol}>
              <Ionicons name="time-outline" size={16} color="#64748B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoColLabel}>Giờ Bắt Đầu</Text>
                <Text style={styles.infoColValue}>{bookingDetail.startTime || 'Đúng giờ'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.addressBox}>
            <Ionicons name="location-outline" size={18} color="#E11D48" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Địa điểm làm đẹp:</Text>
              <Text style={styles.addressValue}>{bookingDetail.destinationAddress || 'Trang điểm tại nhà riêng'}</Text>
            </View>
          </View>

          {/* CÁC BƯỚC / HẠNG MỤC DỊCH VỤ NẾU CÓ */}
          {bookingDetail.packageItems && bookingDetail.packageItems.length > 0 && (
            <View style={styles.itemsListWrap}>
              <Text style={styles.itemsListTitle}>Quy trình & Hạng mục đã thực hiện:</Text>
              {bookingDetail.packageItems.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ẢNH NGHIỆM THU SAU KHI MAKE-UP NẾU CÓ */}
        {bookingDetail.completionPhotoUrl && (
          <View style={styles.card}>
            <View style={styles.photoHeaderRow}>
              <Ionicons name="image" size={18} color="#059669" />
              <Text style={styles.cardSectionTitle}>Ảnh Nghiệm Thu Thành Phẩm</Text>
            </View>
            <TouchableOpacity
              style={styles.photoContainer}
              onPress={() => setIsPhotoModalVisible(true)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: bookingDetail.completionPhotoUrl }}
                style={styles.completionPhoto}
                contentFit="cover"
              />
              <View style={styles.photoOverlayBadge}>
                <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
                <Text style={styles.photoOverlayText}>Chạm để phóng to</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* HÓA ĐƠN TÀI CHÍNH & SỔ CÁI QUYẾT TOÁN MINH BẠCH */}
        <View style={styles.card}>
          <View style={styles.invoiceHeaderRow}>
            <Ionicons name="receipt-outline" size={18} color="#0F172A" />
            <Text style={styles.cardSectionTitle}>Bảng Kê Chi Tiết Tài Chính</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Gói dịch vụ chính</Text>
            <Text style={styles.billValue}>{formatPrice(bookingDetail.serviceSubtotal || totalAmount)}</Text>
          </View>

          {(bookingDetail.surchargeFee && bookingDetail.surchargeFee > 0) ? (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Phụ phí phát sinh</Text>
              <Text style={styles.billValue}>+{formatPrice(bookingDetail.surchargeFee)}</Text>
            </View>
          ) : null}

          {(bookingDetail.distanceFee && bookingDetail.distanceFee > 0) ? (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Phí di chuyển xa</Text>
              <Text style={styles.billValue}>+{formatPrice(bookingDetail.distanceFee)}</Text>
            </View>
          ) : null}

          <View style={styles.billDivider} />

          <View style={styles.billRow}>
            <Text style={styles.billTotalLabel}>Tổng Giá Trị Đơn Hàng (100%):</Text>
            <Text style={styles.billTotalValue}>{formatPrice(totalAmount)}</Text>
          </View>

          {/* KHOẢN CỌC ESCROW 30% */}
          <View style={styles.escrowBillBox}>
            <View style={styles.escrowBillLeft}>
              <Text style={styles.escrowBillTitle}>Khoản cọc Escrow (30%):</Text>
              <Text style={styles.escrowBillSub}>Đã bảo chứng qua Quỹ Escrow an toàn</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.escrowBillAmount}>-{formatPrice(depositAmount)}</Text>
              <View style={styles.escrowPaidTag}>
                <Ionicons name="checkmark-circle" size={11} color="#059669" />
                <Text style={styles.escrowPaidTagText}>Đã Thanh Toán</Text>
              </View>
            </View>
          </View>

          {/* KHOẢN CÒN LẠI 70% */}
          <View style={[styles.remainingBillBox, isPaidOut ? styles.remainingPaidBox : styles.remainingUnpaidBox]}>
            <View style={styles.escrowBillLeft}>
              <Text style={[styles.remainingBillTitle, { color: isPaidOut ? '#065F46' : '#9A3412' }]}>
                Khoản Còn Lại (70%):
              </Text>
              <Text style={styles.remainingBillSub}>
                {isPaidOut
                  ? 'Đã thanh toán và quyết toán hoàn tất'
                  : 'Cần thanh toán trực tiếp hoặc qua cổng online'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.remainingBillAmount, { color: isPaidOut ? '#059669' : '#DC2626' }]}>
                {formatPrice(remainingAmount)}
              </Text>
              <View style={[styles.remainingTag, isPaidOut ? styles.remainingTagPaid : styles.remainingTagUnpaid]}>
                <Ionicons
                  name={isPaidOut ? 'checkmark-circle' : 'time-outline'}
                  size={11}
                  color={isPaidOut ? '#059669' : '#DC2626'}
                />
                <Text style={[styles.remainingTagText, { color: isPaidOut ? '#059669' : '#DC2626' }]}>
                  {isPaidOut ? 'Đã Quyết Toán' : 'Chưa Quyết Toán'}
                </Text>
              </View>
            </View>
          </View>

          {/* PHẦN DÀNH RIÊNG CHO THỢ MUA: PHÂN BỔ THU NHẬP VÀ VÍ */}
          {isWorkstationRole && (
            <View style={styles.muaEarningsCard}>
              <View style={styles.muaEarningsHeader}>
                <Ionicons name="cash-outline" size={16} color="#7C3AED" />
                <Text style={styles.muaEarningsTitle}>Quyền Lợi & Thu Nhập Chuyên Viên</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Khấu trừ phí sàn (20%):</Text>
                <Text style={[styles.billValue, { color: '#EF4444' }]}>-{formatPrice(platformFee)}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.muaNetEarningsLabel}>Thu Nhập Thực Nhận (80%):</Text>
                <Text style={styles.muaNetEarningsValue}>{formatPrice(earningsAmount)}</Text>
              </View>
              <View style={styles.muaWalletStatusBox}>
                <Ionicons
                  name={isPaidOut ? 'wallet' : 'hourglass-outline'}
                  size={16}
                  color={isPaidOut ? '#059669' : '#D97706'}
                />
                <Text style={[styles.muaWalletStatusText, { color: isPaidOut ? '#059669' : '#D97706' }]}>
                  {isPaidOut
                    ? 'Thu nhập đã được cộng thành công vào Ví Thợ khả dụng của bạn.'
                    : 'Khoản cọc 30% bảo lưu trong Escrow, sẽ giải ngân cùng 70% ngay khi quyết toán xong.'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* FOOTER ACTIONS */}
        <View style={styles.footerButtonsGroup}>
          {!isWorkstationRole ? (
            <>
              <TouchableOpacity
                style={styles.rebookBtn}
                onPress={() => router.replace('/explore')}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.rebookBtnText}>Đặt Lại Ca Này</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reviewBtn}
                onPress={() => {
                  Alert.alert('Đánh Giá Dịch Vụ ⭐', 'Cảm ơn bạn đã sử dụng nền tảng! Tính năng đánh giá sao đang được kích hoạt.');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="star-outline" size={17} color={BrandColors.primary} />
                <Text style={styles.reviewBtnText}>Đánh Giá Dịch Vụ</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.rebookBtn}
                onPress={() => router.replace('/')}
                activeOpacity={0.85}
              >
                <Ionicons name="home-outline" size={18} color="#FFFFFF" />
                <Text style={styles.rebookBtnText}>Về Bàn Làm Việc</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reviewBtn}
                onPress={() => router.push('/profile/freelancer-wallet')}
                activeOpacity={0.8}
              >
                <Ionicons name="wallet-outline" size={17} color={BrandColors.primary} />
                <Text style={styles.reviewBtnText}>Kiểm Tra Ví Thợ</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* MODAL XEM PHÓNG TO ẢNH NGHIỆM THU */}
      <Modal visible={isPhotoModalVisible} transparent animationType="fade" onRequestClose={() => setIsPhotoModalVisible(false)}>
        <Pressable style={styles.photoModalBackdrop} onPress={() => setIsPhotoModalVisible(false)}>
          <View style={styles.photoModalContent}>
            <TouchableOpacity style={styles.closePhotoBtn} onPress={() => setIsPhotoModalVisible(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            {bookingDetail.completionPhotoUrl && (
              <Image
                source={{ uri: bookingDetail.completionPhotoUrl }}
                style={styles.photoModalImage}
                contentFit="contain"
              />
            )}
            <Text style={styles.photoModalCaption}>Ảnh Nghiệm Thu Thành Phẩm Sau Make-up</Text>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  refreshIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  loadingContainer: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 14,
  },
  goBackBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: BrandColors.primary,
  },
  goBackBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  statusCardPaidOut: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusCardCompleted: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusCardCancelled: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusCardDisputed: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  statusCardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  statusIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  statusCardDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  statusCardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  statusPillSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  statusPillPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillPendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  statusTimeText: {
    fontSize: 11,
    color: '#64748B',
  },
  refundNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  refundNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    lineHeight: 16,
  },
  settleActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FDA4AF',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  settleActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settleActionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  settleActionHighlight: {
    color: '#E11D48',
    fontWeight: '800',
  },
  settleActionDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 12,
  },
  settleBtnGroup: {
    gap: 10,
  },
  settleMethodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  settleMethodTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  settleMethodSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  muaSettleCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  muaSettleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  muaSettleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muaSettleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },
  muaSettleSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  muaSettleHighlight: {
    fontWeight: '800',
    color: '#E11D48',
  },
  muaConfirmCashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  muaConfirmCashBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleTagCustomer: {
    backgroundColor: '#F1F5F9',
  },
  roleTagMua: {
    backgroundColor: '#FDF2F8',
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  roleTagTextCustomer: {
    color: '#475569',
  },
  roleTagTextMua: {
    color: BrandColors.primary,
  },
  partnerPhone: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  partnerCallBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  serviceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  servicePackageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceStyleSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    gap: 12,
    marginBottom: 12,
  },
  infoCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoColLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  infoColValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 1,
  },
  addressBox: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  addressLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  addressValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
    marginTop: 2,
    lineHeight: 18,
  },
  itemsListWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  itemsListTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemText: {
    fontSize: 12,
    color: '#334155',
  },
  photoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  completionPhoto: {
    width: '100%',
    height: '100%',
  },
  photoOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoOverlayText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  invoiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  billLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  billTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  billTotalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#E11D48',
  },
  escrowBillBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  escrowBillLeft: {
    flex: 1,
  },
  escrowBillTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  escrowBillSub: {
    fontSize: 11,
    color: '#059669',
    marginTop: 1,
  },
  escrowBillAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  escrowPaidTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  escrowPaidTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  remainingBillBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
  },
  remainingPaidBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  remainingUnpaidBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  remainingBillTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  remainingBillSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  remainingBillAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  remainingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  remainingTagPaid: {
    opacity: 1,
  },
  remainingTagUnpaid: {
    opacity: 1,
  },
  remainingTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  muaEarningsCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  muaEarningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  muaEarningsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B21A8',
  },
  muaNetEarningsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  muaNetEarningsValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7C3AED',
  },
  muaWalletStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  muaWalletStatusText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  footerButtonsGroup: {
    gap: 12,
    marginTop: 8,
  },
  rebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  rebookBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BrandColors.primary,
  },
  reviewBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  photoModalContent: {
    width: '100%',
    alignItems: 'center',
  },
  closePhotoBtn: {
    alignSelf: 'flex-end',
    padding: 10,
    marginBottom: 10,
  },
  photoModalImage: {
    width: '100%',
    height: 420,
    borderRadius: 12,
  },
  photoModalCaption: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
