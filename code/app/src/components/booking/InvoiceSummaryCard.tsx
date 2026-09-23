import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { InvoicePreviewRes } from '@/services/pricing.service';

interface Props {
  invoicePreview: InvoicePreviewRes | null;
  isCalculating: boolean;
  voucherCode: string;
  onApplyVoucher: (code: string) => void;
}

export const InvoiceSummaryCard: React.FC<Props> = ({
  invoicePreview,
  isCalculating,
  voucherCode,
  onApplyVoucher,
}) => {
  const [inputCode, setInputCode] = useState(voucherCode);

  const formatPrice = (price?: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  const basePrice = invoicePreview?.packageInfo?.basePrice || 650000;
  const addOns = invoicePreview?.addOns || [];
  const distanceFee = invoicePreview?.distanceInfo?.distanceFee || 0;
  const isSurge = invoicePreview?.surgePricing?.isSurgeApplied;
  const surgeAmount = invoicePreview?.surgePricing?.surgeAmount || 0;
  const discountAmount = invoicePreview?.discount?.discountAmount || 0;

  const totalAmount = invoicePreview?.financialSummary?.totalAmount || basePrice;
  const depositAmount = invoicePreview?.financialSummary?.depositRequiredAmount || totalAmount * 0.3;
  const remainingAmount = invoicePreview?.financialSummary?.remainingPayableAmount || totalAmount - depositAmount;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Ionicons name="receipt-outline" size={18} color={BrandColors.primary} />
          <Text style={styles.title}>Chi Tiết Hóa Đơn & Đặt Cọc</Text>
        </View>
        {isCalculating && (
          <View style={styles.calculatingBadge}>
            <ActivityIndicator size="small" color={BrandColors.primary} />
            <Text style={styles.calculatingText}>Đang tính...</Text>
          </View>
        )}
      </View>

      {/* DANH SÁCH BÓC TÁCH CHI PHÍ */}
      <View style={styles.breakdownList}>
        {/* Giá gói gốc */}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>
            {invoicePreview?.packageInfo?.packageName || 'Gói dịch vụ đã chọn'}
          </Text>
          <Text style={styles.rowValue}>{formatPrice(basePrice)}</Text>
        </View>

        {/* Các bước mua thêm */}
        {addOns.map((addon) => (
          <View key={addon.itemId} style={styles.row}>
            <Text style={styles.rowSubLabel}>+ {addon.name}</Text>
            <Text style={styles.rowSubValue}>{formatPrice(addon.price)}</Text>
          </View>
        ))}

        {/* Cước phí di chuyển theo km */}
        {distanceFee > 0 && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              Phụ phí di chuyển ({invoicePreview?.distanceInfo?.excessDistanceKm?.toFixed(1) || 0} km vượt)
            </Text>
            <Text style={styles.rowValue}>+{formatPrice(distanceFee)}</Text>
          </View>
        )}

        {/* Phụ phí giờ cao điểm / sáng sớm */}
        {isSurge && surgeAmount > 0 && (
          <View style={styles.row}>
            <View style={styles.surgeTagRow}>
              <Ionicons name="flash" size={12} color="#D97706" />
              <Text style={styles.surgeLabel}>
                {invoicePreview?.surgePricing?.surgeReason || 'Phụ phí giờ cao điểm sáng sớm'}
              </Text>
            </View>
            <Text style={styles.surgeValue}>+{formatPrice(surgeAmount)}</Text>
          </View>
        )}

        {/* Giảm giá voucher */}
        {discountAmount > 0 && (
          <View style={styles.row}>
            <Text style={styles.discountLabel}>Khuyến mãi voucher</Text>
            <Text style={styles.discountValue}>-{formatPrice(discountAmount)}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* KHUNG NHẬP MÃ KHUYẾN MÃI */}
        <View style={styles.voucherContainer}>
          <TextInput
            style={styles.voucherInput}
            placeholder="Nhập mã ưu đãi (VD: CUOI2026)"
            placeholderTextColor="#94A3B8"
            value={inputCode}
            onChangeText={setInputCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.voucherBtn}
            onPress={() => {
              Haptics.selectionAsync();
              onApplyVoucher(inputCode);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.voucherBtnText}>Áp dụng</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* TỔNG TIỀN VÀ TIỀN CỌC ESCROW */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng chi phí ca làm:</Text>
          <Text style={styles.totalValue}>{formatPrice(totalAmount)}</Text>
        </View>

        <View style={styles.depositBox}>
          <View style={styles.depositRow}>
            <View style={styles.depositTitleRow}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.depositTitle}>Tiền cọc giữ chỗ (30%):</Text>
            </View>
            <Text style={styles.depositValue}>{formatPrice(depositAmount)}</Text>
          </View>
          <View style={styles.remainingRow}>
            <Text style={styles.remainingLabel}>Thanh toán sau khi make-up xong:</Text>
            <Text style={styles.remainingValue}>{formatPrice(remainingAmount)}</Text>
          </View>
          <Text style={styles.escrowNotice}>
            🔒 Tiền cọc được giữ an toàn tại Quỹ Escrow và chỉ giải ngân cho thợ sau khi bạn nghiệm thu hoàn tất ca làm đẹp.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  calculatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calculatingText: {
    fontSize: 11,
    color: BrandColors.primary,
    fontWeight: '600',
  },
  breakdownList: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
    paddingRight: 8,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowSubLabel: {
    fontSize: 12,
    color: '#64748B',
    paddingLeft: 8,
    flex: 1,
  },
  rowSubValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  surgeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  surgeLabel: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  surgeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  discountLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  discountValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  voucherContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  voucherInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  voucherBtn: {
    paddingHorizontal: 16,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  depositBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    marginTop: 4,
  },
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  depositTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  depositTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  depositValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  remainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  remainingValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  escrowNotice: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
    marginTop: 4,
  },
});
