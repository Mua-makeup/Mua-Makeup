import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, usePathname } from 'expo-router';
import { useWorkstationStore } from '@/store/workstation.store';
import { useAuthStore } from '@/store/auth.store';
import { BrandColors } from '@/constants/theme';

function formatVnd(val?: number): string {
  if (!val && val !== 0) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(val)
    .replace('₫', 'đ');
}

export const DepositConfirmedModal: React.FC = () => {
  const pathname = usePathname();
  const { depositNotice, isDepositModalVisible, dismissDepositNotice } = useWorkstationStore();
  const { userInfo } = useAuthStore();

  const [countdown, setCountdown] = useState<number>(5);
  const isPaymentCompleted = depositNotice?.type === 'PAYMENT_COMPLETED' || depositNotice?.status === 'PAID_OUT';

  const isMuaOrStaff =
    userInfo?.roles?.some((r) => r === 'ROLE_FREELANCE_MUA' || r === 'ROLE_AGENCY_STAFF') ||
    Boolean(userInfo?.muaId);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Hiệu ứng mở modal
  useEffect(() => {
    if (isDepositModalVisible && depositNotice) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [isDepositModalVisible, depositNotice]);

  // Bộ đếm ngược 5s tự động đóng pop up
  useEffect(() => {
    if (!isDepositModalVisible || !depositNotice || isPaymentCompleted) return;
    setCountdown(5);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Dùng setTimeout 0ms để defer setState ra ngoài render cycle
          // tránh lỗi "Cannot update a component while rendering a different component"
          setTimeout(() => {
            // A deposit timer must never close a newer settlement notice.
            if (useWorkstationStore.getState().depositNotice === depositNotice) {
              dismissDepositNotice();
            }
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDepositModalVisible, depositNotice, isPaymentCompleted]);

  if (
    !isMuaOrStaff ||
    !isDepositModalVisible ||
    !depositNotice ||
    depositNotice.type === 'CUSTOMER_CONFIRMED_ADDONS'
  ) {
    return null;
  }

  const handleGoToWallet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dismissDepositNotice();
    router.push('/profile/freelancer-wallet');
  };

  const handleGoToJob = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const bookingId = depositNotice.bookingId;
    dismissDepositNotice();
    if (!pathname.includes(`/job-execution/${bookingId}`)) {
      router.push(`/job-execution/${bookingId}`);
    }
  };

  const handleGoToWorkstation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dismissDepositNotice();
    router.replace('/mua/workstation');
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dismissDepositNotice();
  };

  return (
    <Modal visible={isDepositModalVisible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header Icon & Badge */}
          <View style={styles.headerSection}>
            <View style={[styles.iconCircle, isPaymentCompleted && styles.iconCircleSettled]}>
              <Ionicons
                name={isPaymentCompleted ? 'checkmark-done-circle' : 'shield-checkmark'}
                size={isPaymentCompleted ? 44 : 36}
                color="#059669"
              />
            </View>
            <View style={styles.badgeRow}>
              {isPaymentCompleted ? (
                <View style={styles.settledBadge}>
                  <Ionicons name="wallet" size={12} color="#047857" />
                  <Text style={styles.settledBadgeText}>QUYẾT TOÁN HOÀN TẤT • ĐÃ VÀO VÍ</Text>
                </View>
              ) : (
                <View style={styles.escrowBadge}>
                  <Ionicons name="lock-closed" size={12} color="#047857" />
                  <Text style={styles.escrowBadgeText}>QUỸ BẢO CHỨNG ESCROW ĐÃ NHẬN TIỀN</Text>
                </View>
              )}
            </View>
            <Text style={styles.title}>
              {isPaymentCompleted
                ? 'Đơn Hàng Quyết Toán Hoàn Tất! 🎉'
                : 'Khách Đã Đặt Cọc Thành Công! 🎉'}
            </Text>
            <Text style={styles.subtitle}>
              {isPaymentCompleted
                ? 'Khách hàng đã thanh toán 100%. Tiền thu nhập đã được quyết toán và cộng vào ví của bạn.'
                : 'Khách hàng đã hoàn tất thanh toán cọc đơn vào Quỹ Escrow an toàn.'}
            </Text>
          </View>

          {/* HERO AMOUNT BOX - HIỂN THỊ NỔI BẬT KHÔNG BỊ KHUẤT */}
          {isPaymentCompleted ? (
            <View style={styles.earningsHeroCard}>
              <Text style={styles.earningsHeroLabel}>THU NHẬP THỰC NHẬN CỦA THỢ</Text>
              <Text style={styles.earningsHeroValue}>
                +{formatVnd(depositNotice.earningsAmount)}
              </Text>
              <View style={styles.earningsMethodRow}>
                <Ionicons
                  name={depositNotice.paymentMethod === 'CASH' ? 'cash-outline' : 'card-outline'}
                  size={14}
                  color="#047857"
                />
                <Text style={styles.earningsHeroSub}>
                  Khách thanh toán qua {depositNotice.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Ví MoMo / VNPay'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.depositHeroCard}>
              <Text style={styles.depositHeroLabel}>TIỀN CỌC ĐÃ BẢO LƯU (ESCROW)</Text>
              <Text style={styles.depositHeroValue}>
                {formatVnd(depositNotice.depositAmount)}
              </Text>
              <Text style={styles.depositHeroSub}>
                Thu nhập dự kiến thợ nhận: {formatVnd(depositNotice.earningsAmount)}
              </Text>
            </View>
          )}

          {/* THÔNG TIN CHI TIẾT TÓM TẮT GỌN GÀNG */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mã đơn hàng:</Text>
              <Text style={styles.detailValueBold}>#{depositNotice.bookingCode}</Text>
            </View>

            {depositNotice.customerName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Khách hàng:</Text>
                <Text style={styles.detailValue}>{depositNotice.customerName}</Text>
              </View>
            )}

            {isPaymentCompleted && depositNotice.finalAmount != null && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Đã nhận phần còn lại (70%):</Text>
                <Text style={styles.detailValueBold}>{formatVnd(depositNotice.finalAmount)}</Text>
              </View>
            )}

            {depositNotice.customerPhone && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Số điện thoại:</Text>
                <Text style={styles.detailValue}>{depositNotice.customerPhone}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            {/* Nút Kiểm Tra Ví Thợ */}
            <TouchableOpacity
              style={styles.walletButton}
              onPress={handleGoToWallet}
              activeOpacity={0.85}
            >
              <Ionicons name="wallet-outline" size={20} color="#1E293B" />
              <Text style={styles.walletButtonText}>
                {isPaymentCompleted ? 'Kiểm Tra Ví Thợ & Số Dư' : 'Kiểm Tra Ví Thợ & Tiền Cọc'}
              </Text>
            </TouchableOpacity>

            {/* Nút chính */}
            {isPaymentCompleted ? (
              <TouchableOpacity
                style={styles.settledButton}
                onPress={handleGoToWorkstation}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.jobButtonText}>Đã Nhận Thông Báo Thanh Toán</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.jobButton}
                onPress={handleGoToJob}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-forward-circle" size={20} color="#FFFFFF" />
                <Text style={styles.jobButtonText}>Vào Xem Tiến Trình Ca Làm</Text>
              </TouchableOpacity>
            )}

            {/* Nút Đóng / Tự động đóng sau đếm ngược 5s */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>
                {isPaymentCompleted ? 'Đóng' : `Tự động đóng sau (${countdown}s)`}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  iconCircleSettled: {
    backgroundColor: '#DEF7EC',
    borderColor: '#10B981',
  },
  badgeRow: {
    marginBottom: 6,
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  escrowBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.5,
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  settledBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  earningsHeroCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  earningsHeroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  earningsHeroValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#059669',
    marginBottom: 4,
  },
  earningsMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  earningsHeroSub: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  depositHeroCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  depositHeroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  depositHeroValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2563EB',
    marginBottom: 4,
  },
  depositHeroSub: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  detailValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  actionSection: {
    gap: 8,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  walletButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  jobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  settledButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  jobButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
});
