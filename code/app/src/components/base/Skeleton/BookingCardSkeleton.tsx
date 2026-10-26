import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonCircle } from './SkeletonCircle';

export interface BookingCardSkeletonProps {
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export const BookingCardSkeleton: React.FC<BookingCardSkeletonProps> = ({
  count = 3,
  style,
}) => {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={idx}
          style={styles.card}
        >
          {/* Top Status & Date Row */}
          <View style={styles.topRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Skeleton width={80} height={20} borderRadius={6} />
              <Skeleton width={60} height={18} borderRadius={4} />
            </View>
            <Skeleton width={110} height={14} borderRadius={4} />
          </View>

          {/* Middle Body with Avatar & Info */}
          <View style={styles.bodyRow}>
            <SkeletonCircle size={48} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Skeleton width="85%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="55%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="95%" height={12} borderRadius={4} />
            </View>
          </View>

          {/* Price & Deposit Summary Box */}
          <View style={styles.priceBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width={70} height={13} borderRadius={4} />
              <Skeleton width={100} height={16} borderRadius={4} />
            </View>
          </View>

          {/* Bottom Actions Row */}
          <View style={styles.actionRow}>
            <Skeleton width={90} height={34} borderRadius={18} />
            <Skeleton width={110} height={34} borderRadius={18} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
});
