import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { DismissibleModal } from '@/components/common/DismissibleModal';
import { bookingService } from '@/services/booking.service';
import { formatDateTimeVN } from '@/utils/date';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatVnd = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

interface DisputeDossierModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId?: number;
  cancellationReason?: string;
  emergencyReason?: string;
  emergencyProofUrl?: string;
  reportedAt?: string;
  viewAsRole: 'CUSTOMER' | 'MUA';
  bookingCode?: string;
  depositAmount?: number;
  totalAmount?: number;
  bookingStatus?: string;
  disputeOrigin?: string;
  counterpartyName?: string;
  isAgencyBooking?: boolean;
  autoOpenForm?: boolean;
  isAssistantRole?: boolean;
  onCounterDispute?: () => void;
  onDisputeSuccess?: () => void;
}

const CUSTOMER_QUICK_REASONS = [
  'Make-up không đúng thỏa thuận / chất lượng kém',
  'Thợ làm hỏng / bẩn trang phục, đồ dùng cá nhân',
  'Thợ thu phụ phí bất hợp lý ngoài hợp đồng',
  'Thợ có thái độ thô lỗ / không chuyên nghiệp',
  'Tôi đã có mặt đúng giờ và chờ tại điểm hẹn',
  'Chuyên viên make-up không đến điểm hẹn',
  'Chuyên viên đến trễ quá thời gian thỏa thuận',
  'Lý do khác...',
];

const MUA_QUICK_REASONS = [
  'Đã có mặt tại địa chỉ nhưng không gặp khách',
  'Gọi điện thoại nhiều lần khách không nhấc máy',
  'Khách báo bận/hủy hẹn đột xuất tại chỗ',
  'Lý do khác...',
];

const MUA_POST_COMPLETION_REASONS = [
  'Đã hoàn thành đúng mẫu thỏa thuận và khách đã nghiệm thu',
  'Khách đã kiểm tra, hài lòng và xác nhận tại chỗ trước khi về',
  'Khách tự ý can thiệp hoặc làm hỏng lớp trang điểm sau khi thợ bàn giao',
  'Đã sử dụng mỹ phẩm chính hãng và tư vấn kỹ càng trước khi làm',
  'Đã có mặt và phục vụ đúng thời gian cam kết',
  'Lý do khác...',
];

function cleanProofImageUrl(raw?: string | null): string | null {
  if (!raw) return null;
  let clean = raw.replace(/^\[.*?\]:?\s*/, '').trim();
  if (clean.startsWith('[') && clean.endsWith(']')) {
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        clean = parsed[0];
      }
    } catch {}
  }
  const match = clean.match(/https?:\/\/[^\s"',|\]]+/);
  return match ? match[0] : (clean.startsWith('http') ? clean : null);
}

export const DisputeDossierModal: React.FC<DisputeDossierModalProps> = ({
  visible,
  onClose,
  bookingId,
  cancellationReason,
  emergencyReason,
  emergencyProofUrl,
  reportedAt,
  viewAsRole,
  bookingCode,
  depositAmount = 0,
  totalAmount = 0,
  bookingStatus,
  disputeOrigin,
  counterpartyName,
  isAgencyBooking = false,
  autoOpenForm = false,
  isAssistantRole = false,
  onCounterDispute,
  onDisputeSuccess,
}) => {
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // 1. Phân loại ca đã hoàn tất dịch vụ
  const isPostCompletion =
    bookingStatus === 'COMPLETED' ||
    bookingStatus === 'PAID_OUT' ||
    (Boolean(totalAmount && depositAmount && totalAmount > depositAmount) &&
      !emergencyReason?.toLowerCase().includes('vắng mặt') &&
      !emergencyReason?.toLowerCase().includes('không gặp khách'));

  // 2. Bóc tách nội dung và ảnh minh chứng của 2 bên
  const rawReason = (emergencyReason || cancellationReason || '').trim();
  const rawProof = (emergencyProofUrl || '').trim();
  const proofUrls = rawProof ? rawProof.split('|').map((u) => u.trim()).filter(Boolean) : [];

  const hasCustomerTag = rawReason.includes('[Khách hàng]');
  const hasMuaTag = rawReason.includes('[Chuyên viên MUA]');

  const isDual =
    disputeOrigin === 'DUAL' ||
    (hasCustomerTag && hasMuaTag);

  const isMuaOnly =
    !isDual &&
    (disputeOrigin === 'MUA' ||
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

  // Allocate proofs
  let customerProof: string | undefined;
  let muaProof: string | undefined;

  const proofItems = rawProof ? rawProof.split('|').map((u) => u.trim()).filter(Boolean) : [];
  const hasTaggedProofs = proofItems.some((p) => p.includes('[Khách hàng]') || p.includes('[Chuyên viên MUA]'));

  if (hasTaggedProofs) {
    proofItems.forEach((item) => {
      if (item.includes('[Khách hàng]')) {
        customerProof = item.replace(/\[Khách hàng\]:?/, '').trim();
      } else if (item.includes('[Chuyên viên MUA]')) {
        muaProof = item.replace(/\[Chuyên viên MUA\]:?/, '').trim();
      } else {
        if (!muaProof) muaProof = item;
        else if (!customerProof) customerProof = item;
      }
    });
  } else {
    if (isDual) {
      if (rawReason.startsWith('[Khách hàng]')) {
        customerProof = proofItems[0];
        muaProof = proofItems[1];
      } else {
        muaProof = proofItems[0];
        customerProof = proofItems[1];
      }
    } else if (isMuaOnly) {
      muaProof = proofItems[0]?.replace(/\[.*?\]:?/, '')?.trim();
      customerProof = undefined;
    } else {
      customerProof = proofItems[0]?.replace(/\[.*?\]:?/, '')?.trim();
      muaProof = undefined;
    }
  }

  // 3. Đơn hàng CHỈ ĐƯỢC COI LÀ CÓ KHIẾU NẠI khi thực sự có lý do sự cố hoặc phán quyết tranh chấp
  const hasEverDisputed = Boolean(
    (emergencyReason && emergencyReason.trim().length > 0) ||
    (cancellationReason && (
      cancellationReason.toLowerCase().includes('khiếu nại') ||
      cancellationReason.toLowerCase().includes('giải trình') ||
      cancellationReason.toLowerCase().includes('bác bỏ') ||
      cancellationReason.toLowerCase().includes('bồi thường') ||
      cancellationReason.toLowerCase().includes('hòa giải')
    )) ||
    bookingStatus === 'DISPUTED' ||
    bookingStatus === 'DISPUTE_REFUNDED' ||
    bookingStatus === 'DISPUTE_COMPENSATED'
  );

  const cleanCustomerStatement = hasEverDisputed ? customerStatement : '';
  const cleanMuaStatement = hasEverDisputed ? muaStatement : '';
  const cleanCustomerProof = hasEverDisputed ? customerProof : undefined;
  const cleanMuaProof = hasEverDisputed ? muaProof : undefined;

  const isMUA = viewAsRole === 'MUA';
  const counterpartyTitle = isMUA
    ? `Báo Cáo Của Khách Hàng (${counterpartyName || 'Khách Hàng'})`
    : `Báo Cáo Của Chuyên Viên MUA (${counterpartyName || 'Thợ Trang Điểm'})`;

  const counterpartyStatement = isMUA ? cleanCustomerStatement : cleanMuaStatement;
  const counterpartyProof = isMUA ? cleanCustomerProof : cleanMuaProof;

  const myStatement = isMUA ? cleanMuaStatement : cleanCustomerStatement;
  const myProof = isMUA ? cleanMuaProof : cleanCustomerProof;
  const hasMyStatement = Boolean(myStatement);

  // Trạng thái ĐÃ GIẢI QUYẾT chỉ kích hoạt khi đơn hàng THỰC SỰ ĐÃ TỪNG KHIẾU NẠI
  const isResolved = hasEverDisputed && (
    bookingStatus === 'PAID_OUT' ||
    bookingStatus === 'DISPUTE_REFUNDED' ||
    bookingStatus === 'DISPUTE_COMPENSATED'
  );

  const quickReasons =
    viewAsRole === 'CUSTOMER'
      ? CUSTOMER_QUICK_REASONS
      : isPostCompletion
      ? MUA_POST_COMPLETION_REASONS
      : MUA_QUICK_REASONS;

  // Thợ phụ (ASSISTANT_MUA) tuyệt đối không có quyền can thiệp/nộp giải trình khiếu nại (chỉ Thợ chính)
  const canIntervene = !isAssistantRole;

  // Inline counter dispute state:
  const [isEditingCounterDispute, setIsEditingCounterDispute] = useState(
    autoOpenForm && !isResolved && canIntervene
  );
  const [selectedReason, setSelectedReason] = useState(quickReasons[0]);
  const [detailReason, setDetailReason] = useState('');
  const [proofLocalUri, setProofLocalUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && autoOpenForm && !isResolved && canIntervene) {
      setIsEditingCounterDispute(true);
    }
    if (!visible || !canIntervene) {
      setIsEditingCounterDispute(false);
      setSelectedReason(quickReasons[0]);
      setDetailReason('');
      setProofLocalUri(null);
    }
  }, [visible, autoOpenForm, isResolved, canIntervene]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền Truy Cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để tải lên minh chứng.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofLocalUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền Truy Cập', 'Vui lòng cấp quyền máy ảnh để chụp ảnh minh chứng.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofLocalUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở máy ảnh.');
    }
  };

  const handleSubmitDispute = async () => {
    if (!bookingId) {
      Alert.alert('Lỗi', 'Không tìm thấy mã đơn hàng.');
      return;
    }

    if (isAssistantRole) {
      Alert.alert('Không Có Quyền', 'Chỉ Thợ Chính mới có thẩm quyền gửi lời khai giải trình cho ca làm việc này.');
      return;
    }

    const finalReasonText =
      selectedReason === 'Lý do khác...'
        ? detailReason.trim()
        : detailReason.trim()
        ? `${selectedReason}: ${detailReason.trim()}`
        : selectedReason;

    if (!finalReasonText.trim()) {
      Alert.alert(
        'Thiếu Thông Tin',
        isMUA
          ? 'Vui lòng chọn hoặc nhập lý do giải trình của bạn.'
          : 'Vui lòng chọn hoặc nhập lý do khiếu nại của bạn.'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    try {
      let uploadedUrl: string | undefined = undefined;

      if (proofLocalUri) {
        try {
          const uploadRes = await bookingService.uploadDisputeProof(bookingId, proofLocalUri);
          uploadedUrl = uploadRes?.completionPhotoUrl || uploadRes?.photoUrl;
        } catch {
          console.warn('[DisputeDossierModal] Proof upload failed, proceeding with statement only');
        }
      }

      await bookingService.transitionBookingState(bookingId, 'DISPUTED', finalReasonText, uploadedUrl);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        isMUA ? 'Đã Gửi Lời Khai Giải Trình' : 'Đã Gửi Yêu Cầu Khiếu Nại',
        isMUA
          ? 'Lời khai giải trình và minh chứng của bạn đã được gửi thành công tới Ban Quản Trị để đối chiếu công bằng với khiếu nại của khách.'
          : 'Yêu cầu khiếu nại và minh chứng của bạn đã được gửi tới Ban Quản Trị. Admin sẽ xác minh và phản hồi sớm nhất.'
      );
      setIsEditingCounterDispute(false);
      try {
        onDisputeSuccess?.();
      } catch (cbErr) {
        console.warn('[DisputeDossierModal] onDisputeSuccess error:', cbErr);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || err.message || (isMUA ? 'Không thể gửi giải trình.' : 'Không thể gửi khiếu nại.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalEscalateToAdmin = () => {
    Alert.alert(
      'Chuyển Khiếu Nại Lên Admin Sàn',
      'Bạn không đồng ý với quyết định của Studio và muốn chuyển hồ sơ lên Ban Quản Trị Sàn để làm trọng tài phân xử tối hậu?',
      [
        { text: 'Suy Nghĩ Lại', style: 'cancel' },
        {
          text: 'Chuyển Lên Sàn Phân Xử',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await bookingService.escalateDispute(bookingId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Đã Chuyển Lên Sàn', 'Hồ sơ đã được gửi lên Ban Quản Trị Sàn phân xử tối hậu.');
              onDisputeSuccess?.();
              onClose();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể chuyển khiếu nại lên Admin.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <DismissibleModal
      visible={visible}
      onClose={onClose}
      avoidKeyboard={false}
      dismissDisabled={Boolean(previewPhotoUrl)}
      contentStyle={styles.modalContent}
      overlays={
        previewPhotoUrl ? (
          <View style={styles.lightboxOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => setPreviewPhotoUrl(null)}
              activeOpacity={1}
            />
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setPreviewPhotoUrl(null)}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={38} color="#FFFFFF" />
            </TouchableOpacity>
            <Image
              source={{ uri: previewPhotoUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          </View>
        ) : null
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerIconWrap}>
          <Ionicons name="scale-outline" size={20} color="#E11D48" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>
            {isMUA
              ? 'Hồ Sơ Khiếu Nại & Giải Trình'
              : (hasMyStatement ? 'Hồ Sơ Khiếu Nại Của Bạn' : 'Gửi Yêu Cầu Khiếu Nại')}
          </Text>
          <Text style={styles.headerSub}>
            {isPostCompletion
              ? (isResolved
                  ? `Mã ca: #${bookingCode || 'N/A'} • Đã giải quyết khiếu nại`
                  : `Mã ca: #${bookingCode || 'N/A'} • Tổng tiền: ${formatVnd(totalAmount || depositAmount)} (Hoàn 100%)`)
              : (isResolved
                  ? `Mã ca: #${bookingCode || 'N/A'} • Đã giải quyết khiếu nại cọc`
                  : `Mã ca: #${bookingCode || 'N/A'} • Tiền cọc: ${formatVnd(depositAmount)}`)}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
          {/* Dispute Origin / Resolution Banner */}
          {isResolved ? (
            <View
              style={[
                styles.bannerResolved,
                {
                  backgroundColor: bookingStatus === 'PAID_OUT' ? (isMUA ? '#ECFDF5' : '#FFF1F2') : '#ECFDF5',
                  borderColor: bookingStatus === 'PAID_OUT' ? (isMUA ? '#A7F3D0' : '#FECDD3') : '#A7F3D0',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Ionicons
                  name={bookingStatus === 'PAID_OUT' ? (isMUA ? 'shield-checkmark' : 'shield-half') : 'shield-checkmark'}
                  size={20}
                  color={bookingStatus === 'PAID_OUT' ? (isMUA ? '#059669' : '#E11D48') : '#059669'}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.bannerDualTitle,
                      {
                        color: bookingStatus === 'PAID_OUT' ? (isMUA ? '#065F46' : '#9F1239') : '#065F46',
                      },
                    ]}
                  >
                    {bookingStatus === 'PAID_OUT'
                      ? (isPostCompletion
                          ? (isMUA ? 'KHIẾU NẠI ĐÃ GIẢI QUYẾT • BÁC KHIẾU NẠI CỦA KHÁCH' : 'KHIẾU NẠI ĐÃ XỬ LÝ • BÁC BỎ YÊU CẦU KHIẾU NẠI')
                          : (isMUA ? 'KHIẾU NẠI ĐÃ GIẢI QUYẾT • BỒI THƯỜNG CHO THỢ' : 'KHIẾU NẠI ĐÃ XỬ LÝ • BỒI THƯỜNG CHO THỢ'))
                      : (isPostCompletion
                          ? (isMUA ? 'KHIẾU NẠI ĐÃ GIẢI QUYẾT • CHẤP NHẬN KHIẾU NẠI CỦA KHÁCH' : 'KHIẾU NẠI ĐÃ GIẢI QUYẾT • HOÀN TIỀN 100% ĐƠN HÀNG')
                          : (isMUA ? 'KHIẾU NẠI ĐÃ GIẢI QUYẾT • HOÀN CỌC CHO KHÁCH' : 'KHIẾU NẠI ĐÃ GIẢI QUYẾT • ĐÃ HOÀN 100% TIỀN CỌC'))}
                  </Text>
                  <Text style={[styles.bannerDualSub, { color: '#334155', marginTop: 4 }]}>
                    {bookingStatus === 'PAID_OUT'
                      ? (isPostCompletion
                          ? (isMUA
                              ? (cancellationReason?.includes('Studio')
                                  ? `Studio quản lý đã bác bỏ khiếu nại của khách hàng. Toàn bộ thù lao ca làm việc (${formatVnd(totalAmount || depositAmount)}) được bảo lưu nguyên vẹn, bạn không bị trừ tiền.`
                                  : `Admin đã công nhận giải trình của bạn và bác bỏ khiếu nại của khách. Toàn bộ thù lao ca làm việc (${formatVnd(totalAmount || depositAmount)}) được bảo lưu nguyên vẹn, bạn không bị trừ tiền.`)
                              : (cancellationReason?.includes('Studio')
                                  ? `Studio quản lý quyết định bác bỏ yêu cầu khiếu nại của bạn. Toàn bộ kết quả ca làm việc được giữ nguyên.`
                                  : `Căn cứ lời khai giải trình và minh chứng của chuyên viên, Ban Quản Trị quyết định bác bỏ yêu cầu khiếu nại của bạn. Đơn hàng giữ nguyên kết quả đã hoàn thành.`))
                          : (isMUA
                              ? (cancellationReason?.includes('Studio')
                                  ? `Studio quản lý đã bác bỏ yêu cầu hoàn cọc của khách để bảo vệ quyền lợi của bạn.`
                                  : `Admin đã phê duyệt khiếu nại và giải ngân tiền cọc bồi thường (${formatVnd(depositAmount)}) vào ví của bạn.`)
                              : (cancellationReason?.includes('Studio')
                                  ? `Studio quản lý đã từ chối yêu cầu hoàn cọc của bạn.`
                                  : `Ban Quản Trị đã từ chối yêu cầu hoàn cọc và chuyển tiền cọc (${formatVnd(depositAmount)}) bồi thường cho thợ.`)))
                      : (isPostCompletion
                          ? (isMUA
                              ? (cancellationReason?.includes('Studio')
                                  ? `Studio quản lý đã chấp thuận khiếu nại của khách hàng, tiến hành hoàn 100% tiền đơn (${formatVnd(totalAmount || depositAmount)}) cho khách. Đơn hàng không phát sinh thu nhập thợ.`
                                  : `Ban Quản Trị đã chấp thuận khiếu nại của khách hàng, tiến hành hoàn 100% tiền đơn (${formatVnd(totalAmount || depositAmount)}) cho khách. Đơn hàng không phát sinh thu nhập thợ.`)
                              : (cancellationReason?.includes('Studio')
                                  ? `Studio quản lý đã phê duyệt yêu cầu khiếu nại của bạn. Toàn bộ 100% chi phí dịch vụ (${formatVnd(totalAmount || depositAmount)}) đã được hoàn trả trực tiếp vào Ví cá nhân của bạn.`
                                  : `Admin đã phê duyệt yêu cầu khiếu nại của bạn. Toàn bộ 100% chi phí dịch vụ (${formatVnd(totalAmount || depositAmount)}) đã được hoàn trả trực tiếp vào Ví cá nhân của bạn.`))
                          : (isMUA
                              ? (cancellationReason?.includes('Studio')
                                  ? `Studio quản lý đã chấp thuận hoàn 100% tiền cọc (${formatVnd(depositAmount)}) cho khách hàng.`
                                  : `Ban Quản Trị đã chấp thuận hoàn 100% tiền cọc (${formatVnd(depositAmount)}) cho khách hàng.`)
                              : (cancellationReason?.includes('Studio')
                                  ? `Studio quản lý đã phê duyệt hoàn trả 100% tiền cọc (${formatVnd(depositAmount)}) vào Ví cá nhân của bạn.`
                                  : `Admin đã phê duyệt hoàn trả 100% tiền cọc (${formatVnd(depositAmount)}) vào Ví cá nhân của bạn.`)))}
                  </Text>
                </View>
              </View>

              {cancellationReason ? (
                <View style={styles.adminVerdictBox}>
                  <Text style={styles.adminVerdictLabel}>
                    {cancellationReason.includes('Studio') ? 'Phán quyết của Studio:' : 'Phán quyết của Admin:'}
                  </Text>
                  <Text style={styles.adminVerdictContent}>{cancellationReason}</Text>
                </View>
              ) : null}
            </View>
          ) : cancellationReason?.includes('[LEO_THANG_ADMIN]') || emergencyReason?.includes('[LEO_THANG_ADMIN]') ? (
            <View style={[styles.bannerSingle, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerSingleTitle, { color: '#991B1B' }]}>
                  Đang Chờ Admin Sàn Phán Quyết
                </Text>
                <Text style={[styles.bannerSingleSub, { color: '#7F1D1D' }]}>
                  {isMUA
                    ? 'Khách hàng đã chuyển khiếu nại lên Ban Quản Trị Sàn phân xử tối hậu. Quyền lợi và thù lao hai bên đang được bảo lưu xem xét.'
                    : 'Hồ sơ khiếu nại đã được chuyển lên Ban Quản Trị Sàn phân xử tối hậu. Quyền lợi hai bên được bảo chứng an toàn.'}
                </Text>
              </View>
            </View>
          ) : cancellationReason?.includes('[STUDIO_TU_CHOI]') || emergencyReason?.includes('[STUDIO_TU_CHOI]') ? (
            <View style={[styles.bannerSingle, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }]}>
              <Ionicons name="alert-circle" size={18} color="#EA580C" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerSingleTitle, { color: '#9A3412' }]}>
                  {isMUA
                    ? (isPostCompletion ? 'Studio Đã Bác Bỏ Khiếu Nại Của Khách' : 'Studio Đã Từ Chối Yêu Cầu Cọc Của Khách')
                    : (isPostCompletion ? 'Studio Đã Bác Bỏ Khiếu Nại Của Bạn' : 'Studio Đã Từ Chối Hoàn Cọc')}
                </Text>
                <Text style={[styles.bannerSingleSub, { color: '#7C2D12' }]}>
                  {isMUA
                    ? 'Studio quản lý đã bác bỏ khiếu nại của khách hàng để bảo vệ quyền lợi ca làm việc của bạn. Đang chờ phản hồi tiếp theo từ phía khách hàng.'
                    : 'Studio quản lý đã từ chối yêu cầu của bạn. Bạn có thể chấp nhận giải quyết nội bộ hoặc chuyển hồ sơ lên Ban Quản Trị Sàn phân xử tối hậu.'}
                </Text>
              </View>
            </View>
          ) : isDual ? (
            <View style={styles.bannerDual}>
              <Ionicons name="git-compare-outline" size={18} color="#2563EB" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerDualTitle}>Tranh Chấp 2 Chiều Phát Sinh Đồng Thời</Text>
                <Text style={styles.bannerDualSub}>
                  {isMUA
                    ? (isAgencyBooking
                        ? 'Cả bạn và khách hàng đều đã gửi lời khai đối lập nhau. Quản lý Studio sẽ đối chiếu lời khai và ảnh minh chứng của hai bên để xử lý thỏa đáng.'
                        : `Cả bạn và khách hàng đều đã gửi lời khai đối lập nhau. Ban Quản Trị Sàn sẽ đối chiếu lời khai và ảnh minh chứng để ra phán quyết ${isPostCompletion ? `hoàn 100% (${formatVnd(totalAmount || depositAmount)})` : 'xử lý tiền cọc'} hoặc bảo lưu thù lao.`)
                    : (isAgencyBooking
                        ? 'Cả bạn và chuyên viên make-up đều đã gửi lời khai đối lập nhau. Quản lý Studio sẽ đối chiếu lời khai và ảnh minh chứng của hai bên để xử lý thỏa đáng.'
                        : `Cả bạn và chuyên viên make-up đều đã gửi lời khai đối lập nhau. Ban Quản Trị Sàn sẽ đối chiếu lời khai và ảnh minh chứng để ra phán quyết ${isPostCompletion ? `hoàn 100% (${formatVnd(totalAmount || depositAmount)})` : 'xử lý tiền cọc'} hoặc bảo lưu thù lao.`)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.bannerSingle}>
              <Ionicons name="alert-circle-outline" size={18} color="#059669" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerSingleTitle}>
                  {isPostCompletion
                    ? isMUA
                      ? 'Khách Hàng Khiếu Nại Chất Lượng Sau Ca'
                      : hasMyStatement
                      ? 'Yêu Cầu Khiếu Nại Đang Được Tiếp Nhận'
                      : 'Gửi Khiếu Nại Dịch Vụ Sau Ca Làm'
                    : isMUA
                    ? (isMuaOnly ? 'Báo Cáo Sự Cố Do Bạn Khởi Tạo' : 'Đơn Hàng Do Khách Hàng Khiếu Nại')
                    : hasMyStatement
                    ? 'Yêu Cầu Khiếu Nại Đang Được Xử Lý'
                    : 'Gửi Yêu Cầu Khiếu Nại Dịch Vụ'}
                </Text>
                <Text style={styles.bannerSingleSub}>
                  {isPostCompletion
                    ? isMUA
                      ? `Đơn hàng đã hoàn thành ca. Khách hàng đang khiếu nại yêu cầu hoàn 100% tiền đơn (${formatVnd(totalAmount || depositAmount)}). Bạn có quyền giải trình và gửi ảnh minh chứng để bảo vệ quyền lợi.`
                      : hasMyStatement
                      ? (isAgencyBooking
                          ? `Yêu cầu khiếu nại chất lượng ca làm việc đã được gửi tới Studio quản lý. Số tiền yêu cầu hoàn: ${formatVnd(totalAmount || depositAmount)} (100% giá trị đơn). Quản lý Studio sẽ đối soát và phản hồi kết quả.`
                          : `Yêu cầu khiếu nại chất lượng ca làm việc đã được gửi tới Ban Quản Trị. Số tiền yêu cầu hoàn: ${formatVnd(totalAmount || depositAmount)} (100% giá trị đơn). Admin sẽ xác minh và phản hồi kết quả sớm nhất.`)
                      : `Nếu dịch vụ không đạt yêu cầu hoặc có sự cố, bạn có thể gửi yêu cầu khiếu nại. Số tiền yêu cầu hoàn: ${formatVnd(totalAmount || depositAmount)} (100% giá trị đơn). Ban Quản Trị sẽ tiếp nhận và xử lý thỏa đáng.`
                    : isAgencyBooking
                    ? `Tiền cọc ${formatVnd(depositAmount)} đang được khóa an toàn trong Quỹ Escrow. Quản lý Studio sẽ kiểm tra minh chứng và xử lý.`
                    : hasMyStatement
                    ? `Tiền cọc ${formatVnd(depositAmount)} đang được khóa an toàn trong Quỹ Escrow. Admin sẽ đối chiếu minh chứng và giải ngân công bằng.`
                    : `Nếu có sự cố phát sinh tại buổi hẹn, bạn có thể gửi yêu cầu khiếu nại để Ban Quản Trị can thiệp xử lý tiền cọc.`}
                </Text>
              </View>
            </View>
          )}

          {/* Phán quyết giải quyết từ Studio nếu Studio đã xử lý từ chối */}
          {(cancellationReason?.includes('[STUDIO_TU_CHOI]') || emergencyReason?.includes('[STUDIO_TU_CHOI]')) && (
            <View style={[styles.adminVerdictBox, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', marginTop: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="document-text" size={15} color="#C2410C" />
                <Text style={[styles.adminVerdictLabel, { color: '#C2410C', marginBottom: 0 }]}>
                  Ghi chú phán quyết từ Studio:
                </Text>
              </View>
              <Text style={[styles.adminVerdictContent, { color: '#7C2D12' }]}>
                {(cancellationReason || emergencyReason || '').replace(/\[STUDIO_TU_CHOI\]:\s*/g, '')}
              </Text>
            </View>
          )}

          {/* Nút hành động cho khách hàng khi Studio đã từ chối nhưng chưa leo thang */}
          {!isMUA &&
            (cancellationReason?.includes('[STUDIO_TU_CHOI]') || emergencyReason?.includes('[STUDIO_TU_CHOI]')) &&
            !(cancellationReason?.includes('[LEO_THANG_ADMIN]') || emergencyReason?.includes('[LEO_THANG_ADMIN]')) && (
              <View style={{ marginTop: 10, gap: 8 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#DC2626',
                    paddingVertical: 11,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  onPress={handleModalEscalateToAdmin}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  <Ionicons name="shield-outline" size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                    Không Đồng Ý - Chuyển Lên Admin Sàn Phân Xử
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          {/* Section 1: Counterparty Dossier (CHỈ HIỂN THỊ VỚI THỢ MUA KHI CÓ KHIẾU NẠI) */}
          {isMUA && hasEverDisputed && (
            <View style={styles.dossierCard}>
              <View style={styles.dossierHeader}>
                <View style={[styles.dossierRoleBadge, { backgroundColor: '#FFF1F2' }]}>
                  <Ionicons
                    name="person-outline"
                    size={13}
                    color="#E11D48"
                  />
                  <Text style={[styles.dossierRoleText, { color: '#E11D48' }]}>
                    Phía Khách Hàng
                  </Text>
                </View>
                {reportedAt ? (
                  <Text style={styles.dossierTimeText}>{formatDateTimeVN(reportedAt)}</Text>
                ) : null}
              </View>

              <Text style={styles.dossierTitle}>{counterpartyTitle}</Text>

              <View style={styles.statementBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#64748B" style={styles.quoteIcon} />
                <Text style={styles.statementText}>
                  "{counterpartyStatement || 'Khách hàng chưa nộp lời khai riêng'}"
                </Text>
              </View>

              {/* Proof photo of counterparty */}
              <View style={styles.proofSection}>
                <Text style={styles.proofLabel}>Ảnh minh chứng khách hàng gửi:</Text>
                {cleanProofImageUrl(counterpartyProof) ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setPreviewPhotoUrl(cleanProofImageUrl(counterpartyProof))}
                    style={styles.proofThumbnailWrap}
                  >
                    <Image source={{ uri: cleanProofImageUrl(counterpartyProof)! }} style={styles.proofThumbnail} resizeMode="cover" />
                    <View style={styles.zoomBadge}>
                      <Ionicons name="expand" size={13} color="#FFFFFF" />
                      <Text style={styles.zoomText}>Phóng to</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noProofBox}>
                    <Ionicons name="image-outline" size={16} color="#94A3B8" />
                    <Text style={styles.noProofText}>Không có ảnh minh chứng đính kèm</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Section 2: My Dossier (Hồ sơ của bạn) */}
          <View style={[styles.dossierCard, !hasMyStatement && styles.dossierCardPending]}>
            <View style={styles.dossierHeader}>
              <View style={[styles.dossierRoleBadge, { backgroundColor: isMUA ? '#F1F5F9' : '#FFF1F2' }]}>
                <Ionicons
                  name={isMUA ? 'shield-outline' : 'warning-outline'}
                  size={13}
                  color={isMUA ? '#475569' : '#E11D48'}
                />
                <Text style={[styles.dossierRoleText, { color: isMUA ? '#475569' : '#E11D48' }]}>
                  {isMUA
                    ? (isAssistantRole ? 'Lời Khai Giải Trình (Thợ Chính)' : 'Lời Khai Giải Trình Của Bạn')
                    : 'Nội Dung Khiếu Nại Của Bạn'}
                </Text>
              </View>
              {hasMyStatement && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {reportedAt ? (
                    <Text style={styles.dossierTimeText}>{formatDateTimeVN(reportedAt)}</Text>
                  ) : null}
                  <View style={styles.submittedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" />
                    <Text style={styles.submittedBadgeText}>Đã gửi</Text>
                  </View>
                </View>
              )}
            </View>

            {hasMyStatement ? (
              <>
                <View style={styles.statementBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#64748B" style={styles.quoteIcon} />
                  <Text style={styles.statementText}>"{myStatement}"</Text>
                </View>

                {cleanProofImageUrl(myProof) && (
                  <View style={styles.proofSection}>
                    <Text style={styles.proofLabel}>Ảnh minh chứng bạn đã tải lên:</Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPreviewPhotoUrl(cleanProofImageUrl(myProof))}
                      style={styles.proofThumbnailWrap}
                    >
                      <Image source={{ uri: cleanProofImageUrl(myProof)! }} style={styles.proofThumbnail} resizeMode="cover" />
                      <View style={styles.zoomBadge}>
                        <Ionicons name="expand" size={13} color="#FFFFFF" />
                        <Text style={styles.zoomText}>Phóng to</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : isEditingCounterDispute && canIntervene ? (
              /* Inline Form Soạn Thảo Khiếu Nại (Khách) / Lời Khai Giải Trình (MUA) */
              <View style={styles.inlineFormBox}>
                <View style={styles.inlineFormHeader}>
                  <Ionicons name="create" size={16} color="#EA580C" />
                  <Text style={styles.inlineFormTitle}>
                    {isMUA ? 'Soạn Thảo Lời Khai Giải Trình' : 'Soạn Thảo Yêu Cầu Khiếu Nại'}
                  </Text>
                </View>
                <Text style={styles.inlineFormSub}>
                  {isMUA
                    ? 'Chọn hoặc nhập lý do giải trình thực tế để Ban Quản Trị đối soát và bảo vệ quyền lợi thù lao:'
                    : 'Chọn hoặc nhập lý do khiếu nại dịch vụ để Ban Quản Trị tiếp nhận và giải quyết hoàn tiền:'}
                </Text>

                {/* Danh sách lý do giải trình chọn nhanh (Radio List chống tràn viền) */}
                <View style={styles.reasonRadioList}>
                  {quickReasons.map((r, idx) => {
                    const isSelected = selectedReason === r;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.reasonRadioItem, isSelected && styles.reasonRadioItemSelected]}
                        onPress={() => setSelectedReason(r)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'ellipse-outline'}
                          size={18}
                          color={isSelected ? '#EA580C' : '#94A3B8'}
                          style={{ marginRight: 8, marginTop: 1 }}
                        />
                        <Text style={[styles.reasonRadioText, isSelected && styles.reasonRadioTextSelected]}>
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Text Input */}
                <TextInput
                  style={styles.textArea}
                  placeholder={
                    isMUA
                      ? 'Nhập chi tiết lời khai giải trình, quy trình làm đẹp, thái độ hợp tác của khách...'
                      : 'Mô tả chi tiết vấn đề bạn gặp phải (make-up không đúng thỏa thuận, thợ đến muộn, làm hỏng đồ, thái độ không tốt...)'
                  }
                  placeholderTextColor="#94A3B8"
                  value={detailReason}
                  onChangeText={setDetailReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isSubmitting}
                />

                {/* Image Proof */}
                <Text style={styles.proofPickerLabel}>
                  {isMUA
                    ? 'Ảnh minh chứng nghiệm thu tại chỗ (hoặc nhật ký làm việc):'
                    : 'Ảnh minh chứng khiếu nại (ảnh lớp make-up, đồ vật bị ảnh hưởng, hiện trường...):'}
                </Text>
                {proofLocalUri ? (
                  <View style={styles.proofPreviewWrap}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPreviewPhotoUrl(proofLocalUri)}
                      style={{ width: '100%', height: 160 }}
                    >
                      <Image source={{ uri: proofLocalUri }} style={styles.proofPreviewImage} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeProofBtn}
                      onPress={() => setProofLocalUri(null)}
                      disabled={isSubmitting}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoActionRow}>
                    <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage} disabled={isSubmitting} activeOpacity={0.8}>
                      <Ionicons name="images-outline" size={16} color="#475569" />
                      <Text style={styles.uploadBtnText}>Thư viện ảnh</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadBtn} onPress={handleTakePhoto} disabled={isSubmitting} activeOpacity={0.8}>
                      <Ionicons name="camera-outline" size={16} color="#475569" />
                      <Text style={styles.uploadBtnText}>Chụp ảnh mới</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Form Action Buttons */}
                <View style={styles.inlineFormBtnRow}>
                  <TouchableOpacity
                    style={styles.inlineCancelBtn}
                    onPress={() => setIsEditingCounterDispute(false)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.inlineCancelBtnText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.inlineSubmitBtn, isSubmitting && { opacity: 0.7 }]}
                    onPress={handleSubmitDispute}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
                        <Text style={styles.inlineSubmitBtnText}>
                          {isMUA ? 'Gửi Lời Khai Giải Trình' : 'Gửi Yêu Cầu Khiếu Nại'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : isResolved ? (
              <View style={styles.notSubmittedBox}>
                <Ionicons name="checkmark-done-circle-outline" size={24} color="#059669" />
                <Text style={[styles.notSubmittedTitle, { color: '#065F46' }]}>
                  Vụ việc đã được Ban Quản Trị giải quyết dứt điểm
                </Text>
                <Text style={styles.notSubmittedSub}>
                  Hồ sơ khiếu nại của ca làm này đã đóng theo kết quả phán quyết chính thức của Admin.
                </Text>
              </View>
            ) : isAssistantRole ? (
              <View style={styles.notSubmittedBox}>
                <Ionicons name="information-circle-outline" size={22} color="#64748B" />
                <Text style={[styles.notSubmittedTitle, { color: '#334155' }]}>
                  Chỉ Thợ Chính Mới Có Quyền Giải Trình
                </Text>
                <Text style={styles.notSubmittedSub}>
                  Bạn đang tham gia ca làm việc với vai trò Thợ Phụ. Chỉ Thợ Chính phụ trách ca mới có thẩm quyền gửi lời khai giải trình và ảnh minh chứng đối soát cho Ban Quản Trị.
                </Text>
              </View>
            ) : (
              <View style={styles.notSubmittedBox}>
                <Ionicons name="information-circle-outline" size={20} color="#D97706" />
                <Text style={styles.notSubmittedTitle}>
                  {isMUA ? 'Bạn chưa gửi lời khai giải trình cho ca làm việc này' : 'Bạn chưa gửi yêu cầu khiếu nại cho ca làm việc này'}
                </Text>
                <Text style={styles.notSubmittedSub}>
                  {isMUA
                    ? 'Khách hàng đang khiếu nại ca này. Bạn hãy nộp lời khai giải trình và ảnh nghiệm thu thực tế để Ban Quản Trị xem xét bảo vệ quyền lợi của bạn.'
                    : 'Nếu ca làm việc có vấn đề về chất lượng hoặc sự cố phát sinh, bạn có thể gửi yêu cầu khiếu nại kèm minh chứng để yêu cầu hoàn tiền.'}
                </Text>

                <TouchableOpacity
                  style={styles.counterDisputeBtn}
                  onPress={() => setIsEditingCounterDispute(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.counterDisputeBtnText}>
                    {isMUA ? 'Soạn Lời Khai Giải Trình Ngay' : 'Soạn Yêu Cầu Khiếu Nại Ngay'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </DismissibleModal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '88%',
    padding: 0,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  bannerDual: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  bannerResolved: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
  },
  adminVerdictBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adminVerdictLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  adminVerdictContent: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  bannerDualTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  bannerDualSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  bannerSingle: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
  },
  bannerSingleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  bannerSingleSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  dossierCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
  },
  dossierCardPending: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },
  dossierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dossierRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dossierRoleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dossierTimeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  submittedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  dossierTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  statementBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    paddingLeft: 28,
  },
  quoteIcon: {
    position: 'absolute',
    top: 10,
    left: 8,
  },
  statementText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  proofSection: {
    marginTop: 10,
  },
  proofLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  proofThumbnailWrap: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  proofThumbnail: {
    width: '100%',
    height: '100%',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  noProofBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  noProofText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  notSubmittedBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  notSubmittedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 4,
    textAlign: 'center',
  },
  notSubmittedSub: {
    fontSize: 11,
    color: '#B45309',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 15,
  },
  counterDisputeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E11D48',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  counterDisputeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineFormBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  inlineFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inlineFormTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9A3412',
  },
  inlineFormSub: {
    fontSize: 11,
    color: '#C2410C',
    lineHeight: 16,
    marginBottom: 10,
  },
  reasonRadioList: {
    gap: 7,
    marginBottom: 12,
  },
  reasonRadioItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  reasonRadioItemSelected: {
    backgroundColor: '#FFEDD5',
    borderColor: '#EA580C',
    borderWidth: 1.5,
  },
  reasonRadioText: {
    flex: 1,
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
  },
  reasonRadioTextSelected: {
    color: '#9A3412',
    fontWeight: '700',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: '#1E293B',
    minHeight: 72,
    marginBottom: 10,
  },
  proofPickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 6,
  },
  proofPreviewWrap: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    height: 120,
    marginBottom: 10,
  },
  proofPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removeProofBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  uploadBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  inlineFormBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  inlineCancelBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  inlineSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#EA580C',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  inlineSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lightboxOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10000,
  },
  lightboxImage: {
    width: '92%',
    height: '78%',
  },
});
