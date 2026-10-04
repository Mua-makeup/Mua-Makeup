import { DismissibleModal } from '@/components/common/DismissibleModal';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface TransactionDetailData {
  transactionCode: string;
  bookingCode?: string;
  dateTime: string;
  amount: number;
  sign: '+' | '-' | '';
  amountColor: string;
  statusText: string;
  statusBadgeColor?: string;
  statusTextColor?: string;
  transactionType: string;
  description: string;
  balanceAfter?: number;
}

interface Props {
  visible: boolean;
  data: TransactionDetailData | null;
  onClose: () => void;
}

function formatVnd(val?: number): string {
  if (!val && val !== 0) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(val)
    .replace('₫', 'đ');
}

export const TransactionDetailModal: React.FC<Props> = ({ visible, data, onClose }) => {
  if (!visible || !data) return null;

  const handleClose = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onClose();
  };

  return (
    <DismissibleModal visible={visible} onClose={handleClose} contentStyle={{ backgroundColor: '#FFFFFF' }} fullHeight>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header Chi Tiết Giao Dịch */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết giao dịch</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Card Thông Tin Chi Tiết */}
          <View style={styles.detailCard}>
            {/* Mã giao dịch */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Mã giao dịch</Text>
              <Text style={styles.valueHighlight} selectable>
                {data.bookingCode || data.transactionCode}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Ngày giao dịch */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Ngày giao dịch</Text>
              <Text style={styles.valueText}>{data.dateTime}</Text>
            </View>

            <View style={styles.divider} />

            {/* Số tiền thanh toán */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Số tiền biến động</Text>
              <Text style={[styles.amountValue, { color: data.amountColor }]}>
                {data.sign} {formatVnd(data.amount)}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Trạng thái giao dịch */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Trạng thái</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: data.statusBadgeColor || '#F1F5F9' },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: data.statusTextColor || '#334155' }]}>
                  {data.statusText}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Loại giao dịch */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Loại nghiệp vụ</Text>
              <Text style={styles.valueText}>{data.transactionType}</Text>
            </View>

            {data.balanceAfter !== undefined && data.balanceAfter !== null && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Số dư sau GD</Text>
                  <Text style={styles.valueText}>{formatVnd(data.balanceAfter)}</Text>
                </View>
              </>
            )}

            <View style={styles.divider} />

            {/* Nội dung giao dịch */}
            <View style={styles.descRow}>
              <Text style={styles.label}>Nội dung giao dịch</Text>
              <View style={styles.descBox}>
                <Text style={styles.descValue}>{data.description}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </DismissibleModal>
  );
};

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
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 18,
    paddingVertical: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  descRow: {
    flexDirection: 'column',
    gap: 8,
    paddingVertical: 14,
  },
  label: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
  },
  valueText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  valueHighlight: {
    fontSize: 14.5,
    color: '#0284C7',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  descBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  descValue: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
});
