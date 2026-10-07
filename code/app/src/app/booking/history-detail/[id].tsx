import { DismissibleModal } from '@/components/common/DismissibleModal';
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
  RefreshControl,
  Pressable,
  Modal,
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
import { formatDateTimeVN, formatDateVN, formatTimeVN } from '@/utils/date';
import { UserAvatar } from '@/components/common/UserAvatar';
import { DisputeDossierModal } from '@/components/booking/DisputeDossierModal';
import { websocketService } from '@/services/websocket.service';

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

  const hasAssignedMua = Boolean(
    bookingDetail?.muaId ||
    (bookingDetail?.muaName && bookingDetail.muaName !== 'Chuyên Viên Make-up' && bookingDetail.muaName.trim().length > 0)
  );

  // Modal phóng to ảnh nghiệm thu hoặc minh chứng
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [isDisputeDossierOpen, setIsDisputeDossierOpen] = useState(false);
  const [isDisputeDossierAutoOpen, setIsDisputeDossierAutoOpen] = useState(false);

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
    if (!bookingId) return;
    const topic = `/topic/booking-status/${bookingId}`;
    websocketService.subscribe(topic, (msg: any) => {
      if (msg?.status === 'PAID_OUT' || msg?.type === 'PAYMENT_COMPLETED') {
        setBookingDetail((prev) => (prev ? { ...prev, status: 'PAID_OUT' } : prev));
        loadData(true);
      }
    });
    return () => {
      websocketService.unsubscribe(topic);
    };
  }, [bookingId]);

  const formatPrice = (price?: number | null) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  const formatCancellationReason = (reason?: string | null) => {
    if (!reason) return '';
    return reason.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g, (match) => {
      try {
        const d = new Date(match);
        if (isNaN(d.getTime())) return match;
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${hours}:${minutes} ${day}/${month}/${year}`;
      } catch {
        return match;
      }
    });
  };

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
              await depositService.confirmFreelancerCashReceipt(bookingId, 'v1');
              setBookingDetail((prev) => (prev ? { ...prev, status: 'PAID_OUT' } : prev));
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

  const isDisputeRefunded = bookingDetail.status === 'DISPUTE_REFUNDED' || (
    isCancelled && (
      bookingDetail.cancellationReason?.toLowerCase().includes('khiếu nại') ||
      bookingDetail.cancellationReason?.toLowerCase().includes('hoàn cọc') ||
      !!bookingDetail.emergencyReason
    )
  );

  const isDisputeCompensated = bookingDetail.status === 'DISPUTE_COMPENSATED' || (
    isPaidOut && (
      (bookingDetail.cancellationReason && (
        bookingDetail.cancellationReason.toLowerCase().includes('bồi thường') ||
        bookingDetail.cancellationReason.toLowerCase().includes('từ chối') ||
        bookingDetail.cancellationReason.toLowerCase().includes('khiếu nại') ||
        bookingDetail.cancellationReason.toLowerCase().includes('vắng mặt')
      )) ||
      (!bookingDetail.completionPhotoUrl && !!bookingDetail.emergencyReason)
    )
  );
  const isNormalPaidOut = isPaidOut && !isDisputeCompensated;
  const isNormalCancelled = isCancelled && !isDisputeRefunded;

  const totalAmount = bookingDetail.totalAmount || 0;
  const depositAmount = bookingDetail.depositAmount ?? Math.round(totalAmount * 0.3);
  const remainingAmount = Math.max(0, totalAmount - depositAmount);

  // Phân loại ngữ cảnh hủy đơn và hoàn cọc
  const cancelReasonLower = (bookingDetail.cancellationReason || '').toLowerCase();
  const isSlotTakenCancelled =
    isCancelled &&
    (cancelReasonLower.includes('khách hàng khác') ||
      cancelReasonLower.includes('trùng') ||
      cancelReasonLower.includes('hoàn tất thanh toán trước') ||
      cancelReasonLower.includes('slot_taken'));

  const isNoMuaFound =
    cancelReasonLower.includes('không tìm thấy') ||
    cancelReasonLower.includes('chưa có thợ') ||
    cancelReasonLower.includes('không có chuyên viên') ||
    cancelReasonLower.includes('hết thời gian quét') ||
    !hasAssignedMua;

  const isDepositExpired =
    cancelReasonLower.includes('quá hạn đặt cọc') ||
    cancelReasonLower.includes('chưa đặt cọc') ||
    cancelReasonLower.includes('quá hạn cọc') ||
    cancelReasonLower.includes('chưa thanh toán cọc');

  const isCancelledByMua =
    cancelReasonLower.includes('chuyên viên') ||
    cancelReasonLower.includes('thợ') ||
    cancelReasonLower.includes('mua') ||
    cancelReasonLower.includes('từ chối') ||
    cancelReasonLower.includes('bận');

  // Đơn hoàn cọc 100%: nếu thợ hủy/từ chối, hoặc backend trả về isDepositPaid, hoặc có thợ nhận mà bị hủy (trừ khi khách quá hạn cọc / không tìm thấy thợ), hoặc bị hủy do trùng lịch
  const isDepositRefunded = isCancelled && (
    isSlotTakenCancelled ||
    bookingDetail.isDepositPaid ||
    isCancelledByMua ||
    (!isNoMuaFound && !isDepositExpired && hasAssignedMua)
  );

  // Phán quyết Hòa giải 50-50
  const isSplit5050 =
    cancelReasonLower.includes('50/50') ||
    cancelReasonLower.includes('50-50') ||
    cancelReasonLower.includes('hòa giải');

  // Bóc tách chi tiết hồ sơ khiếu nại (Lời khai & Ảnh minh chứng sạch của MUA và Khách)
  const disputeDossier = (() => {
    const rawReason = (bookingDetail.emergencyReason || bookingDetail.cancellationReason || '').trim();
    const rawProof = (bookingDetail.emergencyProofUrl || '').trim();
    const origin = bookingDetail.disputeOrigin;

    const hasCustomerTag = rawReason.includes('[Khách hàng]');
    const hasMuaTag = rawReason.includes('[Chuyên viên MUA]');

    const isDual =
      origin === 'DUAL' ||
      (hasCustomerTag && hasMuaTag);

    const isMuaOnly =
      !isDual &&
      (origin === 'MUA' ||
        (hasMuaTag && !hasCustomerTag) ||
        (!hasCustomerTag &&
          (rawReason.toLowerCase().includes('vắng mặt') ||
            rawReason.toLowerCase().includes('no-show') ||
            rawReason.toLowerCase().includes('không gặp khách'))));

    let customerStatement = '';
    let muaStatement = '';

    if (isDual) {
      const parts = rawReason.split('|');
      parts.forEach((p) => {
        const trimmed = p.trim();
        if (trimmed.includes('[Khách hàng]')) {
          customerStatement = trimmed.replace(/\[Khách hàng\]:?/, '').trim();
        } else if (trimmed.includes('[Chuyên viên MUA]')) {
          muaStatement = trimmed.replace(/\[Chuyên viên MUA\]:?/, '').trim();
        } else if (
          trimmed.toLowerCase().includes('khách hàng') ||
          trimmed.toLowerCase().includes('với khách') ||
          trimmed.toLowerCase().includes('vắng mặt')
        ) {
          muaStatement = trimmed;
        } else {
          if (!muaStatement) muaStatement = trimmed;
          else if (!customerStatement) customerStatement = trimmed;
        }
      });
    } else if (isMuaOnly) {
      muaStatement = rawReason.replace(/\[Chuyên viên MUA\]:?/, '').trim();
    } else {
      customerStatement = rawReason.replace(/\[Khách hàng\]:?/, '').trim();
    }

    let customerProofUrl: string | undefined;
    let muaProofUrl: string | undefined;

    const proofItems = rawProof ? rawProof.split('|').map((u) => u.trim()).filter(Boolean) : [];
    const hasTaggedProofs = proofItems.some((p) => p.includes('[Khách hàng]') || p.includes('[Chuyên viên MUA]'));

    if (hasTaggedProofs) {
      proofItems.forEach((item) => {
        if (item.includes('[Khách hàng]')) {
          customerProofUrl = item.replace(/\[Khách hàng\]:?/, '').trim();
        } else if (item.includes('[Chuyên viên MUA]')) {
          muaProofUrl = item.replace(/\[Chuyên viên MUA\]:?/, '').trim();
        } else {
          if (!muaProofUrl) muaProofUrl = item.replace(/^\[.*?\]:?/, '').trim();
          else if (!customerProofUrl) customerProofUrl = item.replace(/^\[.*?\]:?/, '').trim();
        }
      });
    } else {
      if (isDual) {
        if (rawReason.startsWith('[Khách hàng]')) {
          customerProofUrl = proofItems[0]?.replace(/^\[.*?\]:?/, '').trim();
          muaProofUrl = proofItems[1]?.replace(/^\[.*?\]:?/, '').trim();
        } else {
          muaProofUrl = proofItems[0]?.replace(/^\[.*?\]:?/, '').trim();
          customerProofUrl = proofItems[1]?.replace(/^\[.*?\]:?/, '').trim();
        }
      } else if (isMuaOnly) {
        muaProofUrl = proofItems[0]?.replace(/^\[.*?\]:?/, '').trim();
      } else {
        customerProofUrl = proofItems[0]?.replace(/^\[.*?\]:?/, '').trim();
      }
    }

    return {
      isDual,
      customerStatement,
      muaStatement,
      customerProofUrl,
      muaProofUrl,
      hasDisputeInfo: !!(customerStatement || muaStatement || customerProofUrl || muaProofUrl),
    };
  })();

  const renderDisputeDossierDetails = (isSplitVariant: boolean) => {
    if (!disputeDossier.hasDisputeInfo) {
      return null;
    }

    return (
      <View style={{ marginTop: 8, gap: 8 }}>
        {/* Card Thợ MUA */}
        {(disputeDossier.muaStatement || disputeDossier.muaProofUrl) && (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 10,
              padding: 10,
              borderWidth: 1,
              borderColor: isSplitVariant ? '#E9D5FF' : isWorkstationRole ? '#FDE68A' : '#E2E8F0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={13} color="#D97706" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>
                  {isWorkstationRole ? 'Báo Cáo Của Bạn (Chuyên Viên MUA)' : 'Báo Cáo Từ Chuyên Viên Make-up'}
                </Text>
              </View>
              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#B45309' }}>Phía Thợ</Text>
              </View>
            </View>

            {disputeDossier.muaStatement ? (
              <View style={{ backgroundColor: '#FFFBEB', padding: 8, borderRadius: 6, marginBottom: disputeDossier.muaProofUrl ? 6 : 0 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E', marginBottom: 2 }}>
                  Lý do sự cố báo cáo:
                </Text>
                <Text style={{ fontSize: 12, color: '#451A03', lineHeight: 17 }}>
                  "{disputeDossier.muaStatement}"
                </Text>
              </View>
            ) : null}

            {disputeDossier.muaProofUrl ? (
              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
                  Ảnh minh chứng hiện trường của Thợ:
                </Text>
                <TouchableOpacity
                  onPress={() => setPreviewPhotoUrl(disputeDossier.muaProofUrl!)}
                  activeOpacity={0.85}
                  style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}
                >
                  <Image
                    source={{ uri: disputeDossier.muaProofUrl }}
                    style={{ width: '100%', height: 160, borderRadius: 8, backgroundColor: '#F1F5F9' }}
                    contentFit="cover"
                  />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 6,
                      right: 6,
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Ionicons name="expand" size={11} color="#FFFFFF" />
                    <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '600' }}>Phóng to ảnh</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* Card Khách Hàng */}
        {(disputeDossier.customerStatement || disputeDossier.customerProofUrl) && (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 10,
              padding: 10,
              borderWidth: 1,
              borderColor: isSplitVariant ? '#E9D5FF' : !isWorkstationRole ? '#A7F3D0' : '#E2E8F0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="person" size={13} color="#059669" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#065F46' }}>
                  {!isWorkstationRole ? 'Khiếu Nại Của Bạn (Khách Hàng)' : 'Phản Ánh Từ Khách Hàng'}
                </Text>
              </View>
              <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#065F46' }}>Phía Khách</Text>
              </View>
            </View>

            {disputeDossier.customerStatement ? (
              <View style={{ backgroundColor: '#F0FDF4', padding: 8, borderRadius: 6, marginBottom: disputeDossier.customerProofUrl ? 6 : 0 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#065F46', marginBottom: 2 }}>
                  Nội dung khiếu nại:
                </Text>
                <Text style={{ fontSize: 12, color: '#064E3B', lineHeight: 17 }}>
                  "{disputeDossier.customerStatement}"
                </Text>
              </View>
            ) : null}

            {disputeDossier.customerProofUrl ? (
              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
                  Ảnh minh chứng của Khách hàng:
                </Text>
                <TouchableOpacity
                  onPress={() => setPreviewPhotoUrl(disputeDossier.customerProofUrl!)}
                  activeOpacity={0.85}
                  style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}
                >
                  <Image
                    source={{ uri: disputeDossier.customerProofUrl }}
                    style={{ width: '100%', height: 160, borderRadius: 8, backgroundColor: '#F1F5F9' }}
                    contentFit="cover"
                  />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 6,
                      right: 6,
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Ionicons name="expand" size={11} color="#FFFFFF" />
                    <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '600' }}>Phóng to ảnh</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  // Phí sàn 20% và thu nhập thợ 80% từ tổng giá trị đơn hàng
  const platformFee = bookingDetail.platformFee ?? Math.round(totalAmount * 0.2);
  const earningsAmount = bookingDetail.earningsAmount ?? (totalAmount - platformFee);
  const isScheduled = bookingDetail.bookingType === 'SCHEDULED' || bookingDetail.bookingCode?.startsWith('BK-SCHED');

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
        {/* HERO CARD RIÊNG BIỆT DÀNH CHO ĐƠN ĐẶT LỊCH TRƯỚC */}
        {isScheduled && (
          <View style={styles.scheduledHeroCard}>
            <View style={styles.scheduledHeroHeader}>
              <View style={styles.scheduledHeroBadge}>
                <Ionicons name="calendar-outline" size={13} color="#7C3AED" />
                <Text style={styles.scheduledHeroBadgeText}>LỊCH ĐẶT TRƯỚC</Text>
              </View>
              <Text style={styles.scheduledHeroCode}>{bookingDetail.bookingCode}</Text>
            </View>

            <View style={styles.scheduledHeroBody}>
              <View style={styles.scheduledHeroTimeCol}>
                <Text style={styles.scheduledHeroTimeLabel}>Thời Gian Hẹn</Text>
                <Text style={styles.scheduledHeroTimeValue}>
                  {bookingDetail.startTime ? formatTimeVN(bookingDetail.startTime) : '--:--'}
                </Text>
                <Text style={styles.scheduledHeroDateValue}>
                  {bookingDetail.bookingDate ? formatDateVN(bookingDetail.bookingDate) : '--/--/----'}
                </Text>
              </View>

              <View style={styles.scheduledHeroDivider} />

              <View style={styles.scheduledHeroServiceCol}>
                <Text style={styles.scheduledHeroServiceLabel}>Gói Dịch Vụ</Text>
                <Text style={styles.scheduledHeroServiceValue} numberOfLines={2}>
                  {bookingDetail.packageName || 'Dịch vụ trang điểm'}
                </Text>
                {bookingDetail.estimatedDurationMinutes ? (
                  <View style={styles.scheduledDurationPill}>
                    <Ionicons name="time-outline" size={11} color="#64748B" />
                    <Text style={styles.scheduledDurationPillText}>
                      {bookingDetail.estimatedDurationMinutes} phút
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* BANNER KẾT QUẢ / TRẠNG THÁI QUYẾT TOÁN RÕ RÀNG */}
        {isNormalPaidOut && (
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

        {isDisputeCompensated && (
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: isWorkstationRole ? '#ECFDF5' : '#FFF1F2',
                borderColor: isWorkstationRole ? '#A7F3D0' : '#FECDD3',
              },
            ]}
          >
            <View style={styles.statusCardHeader}>
              <View
                style={[
                  styles.statusIconBox,
                  { backgroundColor: isWorkstationRole ? '#059669' : '#E11D48' },
                ]}
              >
                <Ionicons
                  name={isWorkstationRole ? 'shield-checkmark' : 'shield-half'}
                  size={22}
                  color="#FFFFFF"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.statusCardTitle,
                    { color: isWorkstationRole ? '#065F46' : '#9F1239' },
                  ]}
                >
                  {isWorkstationRole
                    ? 'ĐÃ NHẬN 100% CỌC BỒI THƯỜNG'
                    : 'KHIẾU NẠI ĐÃ XỬ LÝ • BỒI THƯỜNG CHO THỢ'}
                </Text>
                <Text style={styles.statusCardDesc}>
                  {isWorkstationRole
                    ? `Admin đã phê duyệt khiếu nại (khách vắng mặt/bỏ hẹn) và giải ngân 100% tiền cọc (${formatPrice(depositAmount)}) vào ví thu nhập của bạn.`
                    : `Ban Quản Trị đã từ chối yêu cầu hoàn cọc và chuyển toàn bộ tiền cọc (${formatPrice(depositAmount)}) bồi thường cho thợ make-up theo chính sách bảo vệ ca hẹn.`}
                </Text>
              </View>
            </View>

            {bookingDetail.cancellationReason && (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: isWorkstationRole ? '#D1FAE5' : '#FFE4E6',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: isWorkstationRole ? '#065F46' : '#9F1239',
                    marginBottom: 2,
                  }}
                >
                  Căn cứ phán quyết của Admin:
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', fontStyle: 'italic' }}>
                  {bookingDetail.cancellationReason}
                </Text>
              </View>
            )}

            {/* HIỂN THỊ TÁCH BIỆT HỒ SƠ & MINH CHỨNG 2 BÊN */}
            {renderDisputeDossierDetails(false)}

            <View style={styles.statusCardFooterRow}>
              <View
                style={[
                  styles.statusPillSuccess,
                  {
                    backgroundColor: isWorkstationRole ? '#D1FAE5' : '#FFE4E6',
                    borderColor: isWorkstationRole ? '#A7F3D0' : '#FECDD3',
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={13}
                  color={isWorkstationRole ? '#059669' : '#E11D48'}
                />
                <Text
                  style={[
                    styles.statusPillSuccessText,
                    { color: isWorkstationRole ? '#059669' : '#E11D48' },
                  ]}
                >
                  {isWorkstationRole ? 'Đã Nhận Bồi Thường Cọc' : 'Khấu Trừ Bồi Thường Cọc'}
                </Text>
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

        {isDisputeRefunded && (
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: isSplit5050 ? '#FAF5FF' : isWorkstationRole ? '#FFFBEB' : '#ECFDF5',
                borderColor: isSplit5050 ? '#E9D5FF' : isWorkstationRole ? '#FDE68A' : '#A7F3D0',
              },
            ]}
          >
            <View style={styles.statusCardHeader}>
              <View
                style={[
                  styles.statusIconBox,
                  {
                    backgroundColor: isSplit5050 ? '#7C3AED' : isWorkstationRole ? '#D97706' : '#059669',
                  },
                ]}
              >
                <Ionicons
                  name={isSplit5050 ? 'git-compare' : isWorkstationRole ? 'alert-circle' : 'shield-checkmark'}
                  size={22}
                  color="#FFFFFF"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.statusCardTitle,
                    {
                      color: isSplit5050 ? '#6D28D9' : isWorkstationRole ? '#92400E' : '#065F46',
                    },
                  ]}
                >
                  {isSplit5050
                    ? 'KHIẾU NẠI ĐÃ GIẢI QUYẾT • HÒA GIẢI 50% - 50%'
                    : isWorkstationRole
                    ? 'KHIẾU NẠI ĐÃ GIẢI QUYẾT • HOÀN CỌC CHO KHÁCH'
                    : 'KHIẾU NẠI ĐÃ GIẢI QUYẾT • ĐÃ HOÀN 100% TIỀN CỌC'}
                </Text>
                <Text style={styles.statusCardDesc}>
                  {isSplit5050
                    ? isWorkstationRole
                      ? `Ban Quản Trị đã phê duyệt hòa giải 50/50. Bạn nhận được 50% cọc (${formatPrice(Math.round(depositAmount * 0.5))}) bồi thường vào Ví thợ, 50% còn lại đã hoàn trả về Ví khách hàng.`
                      : `Ban Quản Trị đã phê duyệt hòa giải 50/50. Bạn đã được hoàn trả 50% tiền cọc (${formatPrice(Math.round(depositAmount * 0.5))}) về Ví cá nhân, 50% còn lại được bồi thường cho thợ make-up.`
                    : isWorkstationRole
                    ? `Ban Quản Trị đã xem xét và chấp thuận hoàn 100% tiền cọc (${formatPrice(depositAmount)}) cho khách hàng do sự cố khiếu nại. Ca làm này không phát sinh thu nhập thợ.`
                    : `Admin đã phê duyệt yêu cầu khiếu nại của bạn. Toàn bộ 100% tiền cọc (${formatPrice(depositAmount)}) đã được bảo chứng và hoàn trả trực tiếp vào Ví cá nhân của bạn.`}
                </Text>
              </View>
            </View>

            {bookingDetail.cancellationReason && (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: isSplit5050 ? '#E9D5FF' : isWorkstationRole ? '#FDE68A' : '#D1FAE5',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: isSplit5050 ? '#6D28D9' : isWorkstationRole ? '#92400E' : '#065F46',
                    marginBottom: 2,
                  }}
                >
                  Căn cứ phán quyết của Admin:
                </Text>
                <Text style={{ fontSize: 12, color: '#334155', fontStyle: 'italic' }}>
                  {bookingDetail.cancellationReason}
                </Text>
              </View>
            )}

            {/* HIỂN THỊ TÁCH BIỆT HỒ SƠ & MINH CHỨNG 2 BÊN */}
            {renderDisputeDossierDetails(isSplit5050)}

            <View style={styles.statusCardFooterRow}>
              <View
                style={[
                  styles.statusPillSuccess,
                  isSplit5050
                    ? { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }
                    : isWorkstationRole
                    ? { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }
                    : undefined,
                ]}
              >
                <Ionicons
                  name={isSplit5050 ? 'git-compare' : isWorkstationRole ? 'information-circle' : 'checkmark-circle'}
                  size={13}
                  color={isSplit5050 ? '#7C3AED' : isWorkstationRole ? '#D97706' : '#059669'}
                />
                <Text
                  style={[
                    styles.statusPillSuccessText,
                    isSplit5050
                      ? { color: '#6D28D9' }
                      : isWorkstationRole
                      ? { color: '#B45309' }
                      : undefined,
                  ]}
                >
                  {isSplit5050
                    ? isWorkstationRole
                      ? 'Hòa Giải 50/50 • Nhận 50% Cọc'
                      : 'Hòa Giải 50/50 • Hoàn 50% Về Ví'
                    : isWorkstationRole
                    ? 'Đã Hoàn Cọc Khách Hàng'
                    : 'Đã Hoàn Cọc 100% Về Ví'}
                </Text>
              </View>
              <Text style={styles.statusTimeText}>
                {bookingDetail.updatedAt ? formatDateTimeVN(bookingDetail.updatedAt) : 'Đã giải quyết'}
              </Text>
            </View>
          </View>
        )}

        {isNormalCancelled && (
          <View
            style={[
              styles.statusCard,
              isSlotTakenCancelled
                ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
                : styles.statusCardCancelled,
            ]}
          >
            <View style={styles.statusCardHeader}>
              <View
                style={[
                  styles.statusIconBox,
                  { backgroundColor: isSlotTakenCancelled ? '#059669' : '#DC2626' },
                ]}
              >
                <Ionicons
                  name={isSlotTakenCancelled ? 'shield-checkmark' : 'close-circle'}
                  size={22}
                  color="#FFFFFF"
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[
                    styles.statusCardTitle,
                    { color: isSlotTakenCancelled ? '#065F46' : '#991B1B' },
                  ]}
                >
                  {isSlotTakenCancelled ? 'ĐƠN HÀNG ĐÃ HỦY • TRÙNG LỊCH HẸN' : 'ĐƠN HÀNG ĐÃ HỦY'}
                </Text>
                <Text style={styles.statusCardDesc}>
                  {isSlotTakenCancelled
                    ? (bookingDetail.cancellationReason ||
                      'Lịch hẹn này vừa có khách hàng khác đặt và hoàn tất thanh toán trước bạn. Tiền cọc đã được tự động hoàn trả 100% vào Ví của bạn.')
                    : (formatCancellationReason(bookingDetail.cancellationReason) ||
                      (isCancelledByMua
                        ? 'Chuyên viên đã từ chối hoặc hủy ca làm này.'
                        : 'Lịch hẹn đã bị hủy do yêu cầu từ hai bên hoặc quá hạn đặt cọc.'))}
                </Text>
              </View>
            </View>
            {isDepositRefunded ? (
              <View
                style={[
                  styles.refundNoticeBox,
                  isSlotTakenCancelled
                    ? { backgroundColor: '#FFFFFF', borderColor: '#A7F3D0' }
                    : undefined,
                ]}
              >
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <Text style={styles.refundNoticeText}>
                  {isSlotTakenCancelled
                    ? `Khoản cọc (${formatPrice(depositAmount)}) đã được hoàn trả 100% vào Ví cá nhân của bạn ngay sau khi thanh toán.`
                    : (isWorkstationRole
                    ? `Khoản cọc 30% (${formatPrice(depositAmount)}) đã được hoàn lại 100% vào Ví của khách hàng do thợ hủy ca.`
                    : `Khoản cọc 30% (${formatPrice(depositAmount)}) đã được bảo chứng và hoàn lại 100% vào Ví cá nhân của bạn.`)}
                </Text>
              </View>
            ) : (
              <View style={[styles.refundNoticeBox, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                <Ionicons name="information-circle-outline" size={16} color="#64748B" />
                <Text style={[styles.refundNoticeText, { color: '#64748B' }]}>
                  {isNoMuaFound
                    ? 'Đơn hàng tự động hủy do không có thợ tiếp nhận — Chưa phát sinh thu cọc của khách hàng.'
                    : 'Đơn hàng đã hủy — Miễn trừ khoản cọc.'}
                </Text>
              </View>
            )}

            {isSlotTakenCancelled && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: '#059669',
                  paddingVertical: 10,
                  borderRadius: 10,
                  marginTop: 10,
                }}
                onPress={() => router.push('/profile/customer-wallet' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                  Kiểm Tra Số Dư Ví Cá Nhân
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isDisputed && (() => {
          const rawDisputeReason = (bookingDetail.emergencyReason || bookingDetail.cancellationReason || '').trim();
          const rawDisputeProof = (bookingDetail.emergencyProofUrl || '').trim();
          const proofUrls = rawDisputeProof ? rawDisputeProof.split('|').map((u) => u.trim()).filter(Boolean) : [];

          const hasCustomerTag = rawDisputeReason.includes('[Khách hàng]');
          const hasMuaTag = rawDisputeReason.includes('[Chuyên viên MUA]');

          const isDual =
            bookingDetail.disputeOrigin === 'DUAL' ||
            (hasCustomerTag && hasMuaTag);

          const isMuaReport =
            !isDual &&
            (bookingDetail.disputeOrigin === 'MUA' ||
              (hasMuaTag && !hasCustomerTag) ||
              (!hasCustomerTag &&
                (rawDisputeReason.toLowerCase().includes('vắng mặt') ||
                  rawDisputeReason.toLowerCase().includes('no-show') ||
                  rawDisputeReason.toLowerCase().includes('không gặp khách'))));

          let customerStatement = '';
          let muaStatement = '';
          let customerProofUrl: string | undefined;
          let muaProofUrl: string | undefined;

          if (isDual) {
            const parts = rawDisputeReason.split('|');
            parts.forEach((p) => {
              const trimmed = p.trim();
              if (trimmed.includes('[Khách hàng]')) {
                customerStatement = trimmed.replace(/\[Khách hàng\]:?/, '').trim();
              } else if (trimmed.includes('[Chuyên viên MUA]')) {
                muaStatement = trimmed.replace(/\[Chuyên viên MUA\]:?/, '').trim();
              } else if (
                trimmed.toLowerCase().includes('khách hàng') ||
                trimmed.toLowerCase().includes('với khách') ||
                trimmed.toLowerCase().includes('vắng mặt')
              ) {
                muaStatement = trimmed;
              } else {
                if (!muaStatement) muaStatement = trimmed;
                else if (!customerStatement) customerStatement = trimmed;
              }
            });

            const hasTaggedProofs = proofUrls.some((p) => p.includes('[Khách hàng]') || p.includes('[Chuyên viên MUA]'));
            if (hasTaggedProofs) {
              proofUrls.forEach((item) => {
                if (item.includes('[Khách hàng]')) {
                  customerProofUrl = item.replace(/\[Khách hàng\]:?/, '').trim();
                } else if (item.includes('[Chuyên viên MUA]')) {
                  muaProofUrl = item.replace(/\[Chuyên viên MUA\]:?/, '').trim();
                } else {
                  if (!muaProofUrl) muaProofUrl = item;
                  else if (!customerProofUrl) customerProofUrl = item;
                }
              });
            } else {
              if (rawDisputeReason.startsWith('[Khách hàng]')) {
                customerProofUrl = proofUrls[0];
                muaProofUrl = proofUrls[1];
              } else {
                muaProofUrl = proofUrls[0];
                customerProofUrl = proofUrls[1];
              }
            }
          }

          let title = 'ĐƠN ĐANG TRANH CHẤP / KHIẾU NẠI';
          let subtitle = '';
          let reporterBadge = '';
          let reasonLabel = 'Lý do sự cố báo cáo:';
          let statement = rawDisputeReason.replace(/\[.*?\]:?/g, '').trim();

          if (isDual) {
            title = 'TRANH CHẤP 2 CHIỀU ĐANG ĐỐI SOÁT';
            subtitle = 'Cả bạn và đối phương đều đã nộp báo cáo tranh chấp. Ban Quản Trị đang tổng hợp minh chứng hai bên để đưa ra phán quyết công bằng.';
            reporterBadge = 'Tranh Chấp 2 Chiều';
            reasonLabel = 'Nội dung phản ánh hai bên:';
          } else if (isMuaReport) {
            if (isWorkstationRole) {
              title = 'BÁO CÁO SỰ CỐ TỪ BẠN (CHUYÊN VIÊN MUA)';
              subtitle = 'Bạn đã gửi báo cáo sự cố (khách vắng mặt/không liên lạc được). Ban Quản Trị đang đối soát minh chứng để giải ngân 100% tiền cọc cho bạn.';
              reporterBadge = 'Báo Cáo Từ Bạn (MUA)';
              reasonLabel = 'Lý do bạn báo cáo sự cố:';
            } else {
              title = 'CHUYÊN VIÊN MAKE-UP ĐÃ BÁO CÁO SỰ CỐ';
              subtitle = 'Chuyên viên make-up đã gửi báo cáo sự cố ca hẹn. Ban Quản Trị đang xác minh minh chứng từ hiện trường trong 24h.';
              reporterBadge = 'Chuyên Viên Make-up Báo Cáo';
              reasonLabel = 'Lý do chuyên viên báo cáo:';
            }
          } else {
            // Customer reported
            if (!isWorkstationRole) {
              title = 'YÊU CẦU KHIẾU NẠI TỪ BẠN (KHÁCH HÀNG)';
              subtitle = 'Bạn đã gửi yêu cầu khiếu nại ca hẹn này. Ban Quản Trị đang xác minh minh chứng để bảo vệ quyền lợi và hoàn cọc cho bạn.';
              reporterBadge = 'Khiếu Nại Của Bạn (Khách)';
              reasonLabel = 'Lý do bạn khiếu nại:';
            } else {
              title = 'KHÁCH HÀNG ĐÃ GỬI BÁO CÁO KHIẾU NẠI';
              subtitle = 'Khách hàng đã gửi khiếu nại về ca hẹn. Ban Quản Trị đang thụ lý và đối soát thông tin của hai bên.';
              reporterBadge = 'Khách Hàng Gửi Khiếu Nại';
              reasonLabel = 'Lý do khách hàng khiếu nại:';
            }
          }

          const canSubmitCounterDispute = !isDual && (
            (isWorkstationRole && !isMuaReport) ||
            (!isWorkstationRole && isMuaReport)
          );

          return (
            <View style={[styles.statusCard, styles.statusCardDisputed]}>
              <View style={styles.statusCardHeader}>
                <View style={[styles.statusIconBox, { backgroundColor: isDual ? '#7C3AED' : '#EA580C' }]}>
                  <Ionicons name={isDual ? 'scale' : 'warning'} size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
                    <Text style={[styles.statusCardTitle, { color: isDual ? '#6D28D9' : '#9A3412', marginBottom: 0 }]}>{title}</Text>
                    {reporterBadge ? (
                      <View style={{ backgroundColor: isDual ? '#F3E8FF' : isMuaReport ? '#FEF3C7' : '#FCE7F3', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: isDual ? '#E9D5FF' : isMuaReport ? '#FDE68A' : '#FBCFE8' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: isDual ? '#7E22CE' : isMuaReport ? '#92400E' : '#9D174D' }}>
                          {reporterBadge}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.statusCardDesc}>{subtitle}</Text>
                </View>
              </View>

              {isDual ? (
                <View style={{ gap: 8, marginTop: 10 }}>
                  {/* Báo cáo Phía Chuyên Viên */}
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FED7AA' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309' }}>Phía Chuyên Viên MUA</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>{bookingDetail.muaName || 'Chuyên viên'}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                      "{muaStatement || 'Chưa gửi lời khai riêng'}"
                    </Text>
                    {muaProofUrl ? (
                      <View style={{ marginTop: 8 }}>
                        <Image
                          source={{ uri: muaProofUrl }}
                          style={{ width: '100%', height: 140, borderRadius: 6, backgroundColor: '#F1F5F9' }}
                          contentFit="cover"
                        />
                      </View>
                    ) : null}
                  </View>

                  {/* Báo cáo Phía Khách Hàng */}
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#DDD6FE' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <View style={{ backgroundColor: '#F3E8FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#7E22CE' }}>Phía Khách Hàng</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>{bookingDetail.customerName || 'Khách hàng'}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                      "{customerStatement || 'Chưa gửi lời khai riêng'}"
                    </Text>
                    {customerProofUrl ? (
                      <View style={{ marginTop: 8 }}>
                        <Image
                          source={{ uri: customerProofUrl }}
                          style={{ width: '100%', height: 140, borderRadius: 6, backgroundColor: '#F1F5F9' }}
                          contentFit="cover"
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : (
                <>
                  {statement ? (
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#FED7AA' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9A3412', marginBottom: 2 }}>
                        {reasonLabel}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                        "{statement}"
                      </Text>
                    </View>
                  ) : null}

                  {proofUrls.length > 0 && (
                    <View style={{ marginTop: 10, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#FED7AA' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9A3412', marginBottom: 6 }}>
                        Ảnh minh chứng đính kèm ({isMuaReport ? 'Phía Chuyên Viên MUA' : 'Phía Khách Hàng'}):
                      </Text>
                      <Image
                        source={{ uri: proofUrls[0].replace(/\[.*?\]:?/, '').trim() }}
                        style={{ width: '100%', height: 180, borderRadius: 8, backgroundColor: '#F1F5F9' }}
                        contentFit="cover"
                      />
                    </View>
                  )}
                </>
              )}

              {/* Nút gửi lời khai / minh chứng đối chất nếu bên này chưa gửi */}
              {canSubmitCounterDispute && (
                <TouchableOpacity
                  style={{
                    marginTop: 12,
                    backgroundColor: '#DC2626',
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    shadowColor: '#DC2626',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                  onPress={() => {
                    setIsDisputeDossierAutoOpen(true);
                    setIsDisputeDossierOpen(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={17} color="#FFFFFF" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                    {isWorkstationRole
                      ? 'Gửi Báo Cáo Phản Hồi Khiếu Nại Của Thợ'
                      : 'Gửi Báo Cáo Đối Chất / Khiếu Nại Của Bạn'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Nút mở Modal xem chi tiết hồ sơ đối soát 2 bên */}
              <TouchableOpacity
                style={{
                  marginTop: canSubmitCounterDispute ? 8 : 12,
                  backgroundColor: canSubmitCounterDispute ? '#FFFFFF' : '#EA580C',
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: canSubmitCounterDispute ? 1 : 0,
                  borderColor: '#FED7AA',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  shadowColor: '#EA580C',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                onPress={() => {
                  setIsDisputeDossierAutoOpen(false);
                  setIsDisputeDossierOpen(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="document-text-outline" size={16} color={canSubmitCounterDispute ? '#9A3412' : '#FFFFFF'} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: canSubmitCounterDispute ? '#9A3412' : '#FFFFFF' }}>
                  Xem Toàn Bộ Hồ Sơ Khiếu Nại & Đối Chất
                </Text>
              </TouchableOpacity>
            </View>
          );
        })()}

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
        {!isWorkstationRole && !hasAssignedMua ? (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Chuyên Viên Trang Điểm</Text>
            <View style={styles.noMuaNoticeBox}>
              <View style={styles.noMuaIconWrap}>
                <Ionicons name="person-remove-outline" size={22} color="#D97706" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                  <Text style={[styles.noMuaTitle, { flexShrink: 1 }]}>Chưa có chuyên viên tiếp nhận</Text>
                  <View style={styles.noMuaBadge}>
                    <Text style={styles.noMuaBadgeText}>Chưa có thợ</Text>
                  </View>
                </View>
                <Text style={styles.noMuaDesc}>
                  Đơn hàng bị hủy do không tìm thấy chuyên viên trang điểm khả dụng trong khu vực để nhận ca.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>
              {isWorkstationRole ? 'Thông Tin Khách Hàng' : 'Chuyên Viên Trang Điểm'}
            </Text>
            <View style={styles.partnerRow}>
              <UserAvatar
                uri={isWorkstationRole ? bookingDetail.customerAvatar : bookingDetail.muaAvatar}
                name={isWorkstationRole ? bookingDetail.customerName : bookingDetail.muaName}
                size={52}
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
        )}

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
                  {formatDateVN(bookingDetail.bookingDate)}
                </Text>
              </View>
            </View>

            <View style={styles.infoCol}>
              <Ionicons name="time-outline" size={16} color="#64748B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoColLabel}>Giờ Bắt Đầu</Text>
                <Text style={styles.infoColValue}>{formatTimeVN(bookingDetail.startTime)}</Text>
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

          {/* CÁC BƯỚC / HẠNG MỤC DỊCH VỤ - TÁCH RIÊNG TIÊU CHUẨN VÀ ADD-ON */}
          {((bookingDetail.componentItems && bookingDetail.componentItems.length > 0) ||
            (!bookingDetail.addonItems?.length && bookingDetail.packageItems && bookingDetail.packageItems.length > 0)) && (
            <View style={styles.itemsListWrap}>
              <View style={styles.itemHeaderWrap}>
                <Ionicons name="sparkles" size={14} color="#059669" />
                <Text style={styles.itemsListTitle}>Quy trình & Hạng mục tiêu chuẩn trong gói:</Text>
              </View>
              {(bookingDetail.componentItems && bookingDetail.componentItems.length > 0
                ? bookingDetail.componentItems
                : bookingDetail.packageItems || []
              ).map((item, idx) => (
                <View key={`comp-${idx}`} style={styles.itemRow}>
                  <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {bookingDetail.addonItems && bookingDetail.addonItems.length > 0 && (
            <View style={[styles.itemsListWrap, styles.addonWrap]}>
              <View style={styles.itemHeaderWrap}>
                <Ionicons name="add-circle" size={15} color="#8B5CF6" />
                <Text style={[styles.itemsListTitle, { color: '#7C3AED' }]}>Dịch vụ & Tiện ích mua thêm (Add-on):</Text>
              </View>
              {bookingDetail.addonItems.map((item, idx) => (
                <View key={`addon-${idx}`} style={styles.itemRow}>
                  <View style={styles.addonTagPill}>
                    <Text style={styles.addonTagPillText}>Add-on</Text>
                  </View>
                  <Text style={[styles.itemText, styles.addonText]}>{item}</Text>
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
          {isDisputeRefunded ? (
            <View
              style={[
                styles.escrowBillBox,
                isSplit5050
                  ? { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }
                  : { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
              ]}
            >
              <View style={styles.escrowBillLeft}>
                <Text
                  style={[
                    styles.escrowBillTitle,
                    { color: isSplit5050 ? '#6D28D9' : '#065F46' },
                  ]}
                >
                  Khoản cọc Escrow (30%):
                </Text>
                <Text
                  style={[
                    styles.escrowBillSub,
                    { color: isSplit5050 ? '#7C3AED' : '#047857' },
                  ]}
                >
                  {isSplit5050
                    ? isWorkstationRole
                      ? `Hòa giải 50/50: Hoàn 50% (${formatPrice(Math.round(depositAmount * 0.5))}) về Khách & 50% (${formatPrice(Math.round(depositAmount * 0.5))}) về Thợ`
                      : `Hòa giải 50/50: Đã hoàn 50% (${formatPrice(Math.round(depositAmount * 0.5))}) về Ví cá nhân của bạn`
                    : isWorkstationRole
                    ? `Admin phê duyệt khiếu nại: Hoàn 100% (${formatPrice(depositAmount)}) về Ví của khách hàng`
                    : `Admin phê duyệt khiếu nại: Đã hoàn 100% (${formatPrice(depositAmount)}) về Ví cá nhân của bạn`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                <Text
                  style={[
                    styles.escrowBillAmount,
                    { color: isSplit5050 ? '#7C3AED' : '#059669' },
                  ]}
                >
                  {formatPrice(isSplit5050 && !isWorkstationRole ? Math.round(depositAmount * 0.5) : depositAmount)}
                </Text>
                <View
                  style={[
                    styles.escrowPaidTag,
                    isSplit5050 && { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' },
                  ]}
                >
                  <Ionicons
                    name={isSplit5050 ? 'git-compare' : 'shield-checkmark'}
                    size={11}
                    color={isSplit5050 ? '#7C3AED' : '#059669'}
                  />
                  <Text
                    style={[
                      styles.escrowPaidTagText,
                      isSplit5050 && { color: '#6D28D9' },
                    ]}
                  >
                    {isSplit5050 ? 'Hòa Giải 50/50' : 'Đã Hoàn Cọc Khiếu Nại'}
                  </Text>
                </View>
              </View>
            </View>
          ) : isNormalCancelled ? (
            isDepositRefunded ? (
              <View style={[styles.escrowBillBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <View style={styles.escrowBillLeft}>
                  <Text style={[styles.escrowBillTitle, { color: '#065F46' }]}>Khoản cọc Escrow (30%):</Text>
                  <Text style={[styles.escrowBillSub, { color: '#047857' }]}>
                    {isWorkstationRole
                      ? `Đã hoàn lại 100% (${formatPrice(depositAmount)}) về Ví cá nhân của khách`
                      : `Đã hoàn lại 100% (${formatPrice(depositAmount)}) về Ví cá nhân do hủy hợp lệ`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                  <Text style={[styles.escrowBillAmount, { color: '#059669' }]}>{formatPrice(depositAmount)}</Text>
                  <View style={styles.escrowPaidTag}>
                    <Ionicons name="shield-checkmark" size={11} color="#059669" />
                    <Text style={styles.escrowPaidTagText}>Đã Hoàn Cọc 100%</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.escrowBillBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                <View style={styles.escrowBillLeft}>
                  <Text style={[styles.escrowBillTitle, { color: '#64748B' }]}>Khoản cọc Escrow (30%):</Text>
                  <Text style={[styles.escrowBillSub, { color: '#64748B' }]}>
                    {isNoMuaFound
                      ? 'Đơn hủy do không có thợ — Chưa thu cọc'
                      : 'Đơn đã hủy — Không phát sinh thu cọc'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                  <Text style={[styles.escrowBillAmount, { color: '#64748B' }]}>{formatPrice(0)}</Text>
                  <View style={[styles.remainingTag, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', marginTop: 2 }]}>
                    <Ionicons name="close-circle" size={11} color="#64748B" />
                    <Text style={[styles.remainingTagText, { color: '#64748B' }]}>Miễn Cọc</Text>
                  </View>
                </View>
              </View>
            )
          ) : isDisputeCompensated ? (
            <View
              style={[
                styles.escrowBillBox,
                {
                  backgroundColor: isWorkstationRole ? '#ECFDF5' : '#FFF1F2',
                  borderColor: isWorkstationRole ? '#A7F3D0' : '#FECDD3',
                },
              ]}
            >
              <View style={styles.escrowBillLeft}>
                <Text style={[styles.escrowBillTitle, { color: isWorkstationRole ? '#065F46' : '#9F1239' }]}>
                  Khoản cọc Escrow (30%):
                </Text>
                <Text style={[styles.escrowBillSub, { color: isWorkstationRole ? '#047857' : '#BE123C' }]}>
                  {isWorkstationRole
                    ? `Đã nhận bồi thường 100% (${formatPrice(depositAmount)}) vào ví thu nhập`
                    : `Đã khấu trừ bồi thường cho thợ do vi phạm điều kiện hủy hẹn/vắng mặt`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                <Text style={[styles.escrowBillAmount, { color: isWorkstationRole ? '#059669' : '#E11D48' }]}>
                  {formatPrice(depositAmount)}
                </Text>
                <View
                  style={[
                    styles.escrowPaidTag,
                    {
                      backgroundColor: isWorkstationRole ? '#D1FAE5' : '#FFE4E6',
                    },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={11}
                    color={isWorkstationRole ? '#059669' : '#E11D48'}
                  />
                  <Text
                    style={[
                      styles.escrowPaidTagText,
                      { color: isWorkstationRole ? '#059669' : '#E11D48' },
                    ]}
                  >
                    {isWorkstationRole ? 'Đã Nhận Bồi Thường' : 'Khấu Trừ Bồi Thường'}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.escrowBillBox}>
              <View style={styles.escrowBillLeft}>
                <Text style={styles.escrowBillTitle}>Khoản cọc Escrow (30%):</Text>
                <Text style={styles.escrowBillSub}>
                  {bookingDetail.isDepositPaid
                    ? 'Đã bảo chứng qua Quỹ Escrow an toàn'
                    : 'Chờ thanh toán đặt cọc để giữ lịch hẹn'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.escrowBillAmount}>{formatPrice(depositAmount)}</Text>
                {bookingDetail.isDepositPaid ? (
                  <View style={styles.escrowPaidTag}>
                    <Ionicons name="checkmark-circle" size={11} color="#059669" />
                    <Text style={styles.escrowPaidTagText}>Đã Thanh Toán</Text>
                  </View>
                ) : (
                  <View style={[styles.remainingTag, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                    <Ionicons name="time-outline" size={11} color="#D97706" />
                    <Text style={[styles.remainingTagText, { color: '#D97706' }]}>Chờ Đặt Cọc</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* KHOẢN CÒN LẠI 70% */}
          {isCancelled || isDisputeCompensated || isDisputeRefunded ? (
            <View style={[styles.remainingBillBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
              <View style={styles.escrowBillLeft}>
                <Text style={[styles.remainingBillTitle, { color: '#64748B' }]}>
                  Khoản Còn Lại (70%):
                </Text>
                <Text style={styles.remainingBillSub}>
                  {isDisputeCompensated
                    ? 'Ca không diễn ra — Miễn thanh toán khoản còn lại 70%'
                    : isDisputeRefunded
                    ? 'Đã giải quyết khiếu nại — Miễn thanh toán khoản còn lại 70%'
                    : 'Đơn đã hủy — Miễn thanh toán khoản còn lại'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.remainingBillAmount, { color: '#64748B' }]}>
                  {formatPrice(0)}
                </Text>
                <View style={[styles.remainingTag, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
                  <Ionicons name="close-circle" size={11} color="#64748B" />
                  <Text style={[styles.remainingTagText, { color: '#64748B' }]}>Miễn Thu</Text>
                </View>
              </View>
            </View>
          ) : (
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
          )}

          {/* PHẦN DÀNH RIÊNG CHO THỢ MUA: PHÂN BỔ THU NHẬP VÀ VÍ */}
          {isWorkstationRole && (
            <View style={styles.muaEarningsCard}>
              <View style={styles.muaEarningsHeader}>
                <Ionicons name="cash-outline" size={16} color="#7C3AED" />
                <Text style={styles.muaEarningsTitle}>Quyền Lợi & Thu Nhập Chuyên Viên</Text>
              </View>
              {isDisputeRefunded || isNormalCancelled ? (
                isSplit5050 ? (
                  <>
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>Khoản bồi thường hòa giải (50% cọc):</Text>
                      <Text style={[styles.billValue, { color: '#7C3AED', fontWeight: '800' }]}>
                        +{formatPrice(Math.round(depositAmount * 0.5))}
                      </Text>
                    </View>
                    <View style={styles.billRow}>
                      <Text style={styles.muaNetEarningsLabel}>Thu Nhập Thực Nhận:</Text>
                      <Text style={[styles.muaNetEarningsValue, { color: '#7C3AED' }]}>
                        {formatPrice(Math.round(depositAmount * 0.5))}
                      </Text>
                    </View>
                    <View style={[styles.muaWalletStatusBox, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
                      <Ionicons name="wallet" size={16} color="#7C3AED" />
                      <Text style={[styles.muaWalletStatusText, { color: '#6D28D9' }]}>
                        Admin phê duyệt hòa giải 50/50. 50% tiền cọc ({formatPrice(Math.round(depositAmount * 0.5))}) đã được giải ngân trực tiếp vào Ví thu nhập của bạn.
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.billRow}>
                      <Text style={styles.muaNetEarningsLabel}>Thu Nhập Thực Nhận:</Text>
                      <Text style={[styles.muaNetEarningsValue, { color: '#64748B' }]}>{formatPrice(0)}</Text>
                    </View>
                    <View style={[styles.muaWalletStatusBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                      <Ionicons name="information-circle-outline" size={16} color="#64748B" />
                      <Text style={[styles.muaWalletStatusText, { color: '#64748B' }]}>
                        {isDisputeRefunded
                          ? 'Admin đã duyệt khiếu nại hoàn cọc cho khách hàng. Đơn không phát sinh thu nhập thợ.'
                          : 'Lịch hẹn đã bị hủy trước khi hoàn tất. Đơn không phát sinh thu nhập thợ.'}
                      </Text>
                    </View>
                  </>
                )
              ) : isDisputeCompensated ? (
                <>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Khoản bồi thường khiếu nại (100% cọc):</Text>
                    <Text style={[styles.billValue, { color: '#059669', fontWeight: '800' }]}>+{formatPrice(depositAmount)}</Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={styles.muaNetEarningsLabel}>Thu Nhập Thực Nhận:</Text>
                    <Text style={styles.muaNetEarningsValue}>{formatPrice(depositAmount)}</Text>
                  </View>
                  <View style={styles.muaWalletStatusBox}>
                    <Ionicons name="wallet" size={16} color="#059669" />
                    <Text style={[styles.muaWalletStatusText, { color: '#059669' }]}>
                      Admin đã duyệt bồi thường cọc cho thợ. Khoản tiền đã được giải ngân vào Ví Thu Nhập của bạn.
                    </Text>
                  </View>
                </>
              ) : (
                <>
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
                </>
              )}
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

              {isNormalPaidOut && (
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
              )}
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.rebookBtn}
                onPress={() => {
                  if (router.canGoBack()) {
                    router.dismissAll();
                  }
                  router.replace('/');
                }}
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

      {/* MODAL XEM PHÓNG TO ẢNH NGHIỆM THU HOẶC MINH CHỨNG */}
      <Modal
        visible={isPhotoModalVisible || !!previewPhotoUrl}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setIsPhotoModalVisible(false);
          setPreviewPhotoUrl(null);
        }}
      >
        <Pressable
          style={styles.photoModalFullscreen}
          onPress={() => {
            setIsPhotoModalVisible(false);
            setPreviewPhotoUrl(null);
          }}
        >
          {(previewPhotoUrl || bookingDetail.completionPhotoUrl) && (
            <Image
              source={{ uri: previewPhotoUrl || bookingDetail.completionPhotoUrl }}
              style={styles.photoModalImage}
              contentFit="contain"
            />
          )}
        </Pressable>
      </Modal>

      {/* MODAL XEM CHI TIẾT HỒ SƠ KHIẾU NẠI & MINH CHỨNG HAI BÊN (TÍCH HỢP INLINE FORM ĐỐI CHẤT) */}
      <DisputeDossierModal
        visible={isDisputeDossierOpen}
        onClose={() => {
          setIsDisputeDossierOpen(false);
          setIsDisputeDossierAutoOpen(false);
        }}
        bookingId={bookingId}
        cancellationReason={bookingDetail?.cancellationReason}
        emergencyReason={bookingDetail?.emergencyReason}
        emergencyProofUrl={bookingDetail?.emergencyProofUrl}
        reportedAt={bookingDetail?.emergencyReportedAt}
        viewAsRole={isWorkstationRole ? 'MUA' : 'CUSTOMER'}
        bookingCode={bookingDetail?.bookingCode}
        depositAmount={bookingDetail?.depositAmount}
        disputeOrigin={bookingDetail?.disputeOrigin}
        counterpartyName={isWorkstationRole ? bookingDetail?.customerName : bookingDetail?.muaName}
        autoOpenForm={isDisputeDossierAutoOpen}
        onDisputeSuccess={() => loadData(true)}
      />
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
    paddingBottom: 64,
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
    alignItems: 'flex-start',
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
  noMuaNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    gap: 12,
  },
  noMuaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMuaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  noMuaBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  noMuaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  noMuaDesc: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
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
  addonWrap: {
    backgroundColor: '#FAF5FF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginTop: 10,
  },
  itemHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  itemsListTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
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
  addonTagPill: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#C084FC',
  },
  addonTagPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7E22CE',
  },
  addonText: {
    color: '#581C87',
    fontWeight: '500',
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
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 12,
  },
  escrowBillLeft: {
    flex: 1,
    paddingRight: 12,
    minWidth: 0,
  },
  escrowBillTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  escrowBillSub: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
    lineHeight: 16,
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
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    gap: 12,
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
  photoModalFullscreen: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  photoModalContent: {
    width: '100%',
    alignItems: 'center',
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  photoModalCaptionBox: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoModalCaption: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  photoModalHint: {
    marginTop: 8,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  scheduledHeroCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  scheduledHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduledHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  scheduledHeroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  scheduledHeroCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B21A8',
  },
  scheduledHeroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  scheduledHeroTimeCol: {
    flex: 1,
  },
  scheduledHeroTimeLabel: {
    fontSize: 11,
    color: '#9333EA',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scheduledHeroTimeValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#581C87',
    marginTop: 2,
  },
  scheduledHeroDateValue: {
    fontSize: 12,
    color: '#7E22CE',
    fontWeight: '600',
    marginTop: 1,
  },
  scheduledHeroDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#F3E8FF',
    marginHorizontal: 12,
  },
  scheduledHeroServiceCol: {
    flex: 1.2,
  },
  scheduledHeroServiceLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scheduledHeroServiceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  scheduledDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  scheduledDurationPillText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});
