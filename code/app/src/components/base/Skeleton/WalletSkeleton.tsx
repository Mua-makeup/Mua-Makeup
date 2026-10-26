import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonCircle } from './SkeletonCircle';

export interface WalletSkeletonProps {
  style?: StyleProp<ViewStyle>;
}

export const WalletSkeleton: React.FC<WalletSkeletonProps> = ({ style }) => {
  return (
    <View style={[styles.container, style]}>
      {/* 1. Main Balance Card (Thẻ số dư ví thanh lịch) */}
      <View style={styles.balanceCard}>
        <Skeleton width={120} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
        <Skeleton width={200} height={32} borderRadius={6} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width={130} height={14} borderRadius={4} />
          <Skeleton width={80} height={14} borderRadius={4} />
        </View>
      </View>

      {/* 2. Quick Action Buttons */}
      <View style={styles.actionsRow}>
        <Skeleton width="30%" height={46} borderRadius={12} />
        <Skeleton width="30%" height={46} borderRadius={12} />
        <Skeleton width="30%" height={46} borderRadius={12} />
      </View>

      {/* 3. Section Title */}
      <View style={styles.sectionTitleRow}>
        <Skeleton width={140} height={18} borderRadius={4} />
        <Skeleton width={70} height={14} borderRadius={4} />
      </View>

      {/* 4. Transactions List Skeleton (Trắng sáng đồng bộ) */}
      {Array.from({ length: 4 }).map((_, idx) => (
        <View key={idx} style={styles.txItem}>
          <SkeletonCircle size={40} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Skeleton width="70%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={12} borderRadius={3} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Skeleton width={85} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width={50} height={11} borderRadius={3} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
});
