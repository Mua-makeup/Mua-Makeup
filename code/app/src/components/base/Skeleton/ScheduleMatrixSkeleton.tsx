import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';

export interface ScheduleMatrixSkeletonProps {
  style?: StyleProp<ViewStyle>;
}

export const ScheduleMatrixSkeleton: React.FC<ScheduleMatrixSkeletonProps> = ({ style }) => {
  return (
    <View style={[styles.container, style]}>
      {/* 1. Week Days Header */}
      <View style={styles.daysHeader}>
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => (
          <View key={idx} style={styles.dayCol}>
            <Skeleton width={24} height={12} borderRadius={3} style={{ marginBottom: 4 }} />
            <Skeleton width={28} height={16} borderRadius={4} />
          </View>
        ))}
      </View>

      {/* 2. 3 Shifts (Sáng, Chiều, Tối) Grid Skeleton */}
      {['Ca Sáng (08:00 - 12:00)', 'Ca Chiều (13:00 - 17:00)', 'Ca Tối (17:30 - 21:30)'].map((shiftName, sIdx) => (
        <View key={sIdx} style={styles.shiftCard}>
          <Skeleton width={160} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
          <View style={styles.shiftCellsRow}>
            {Array.from({ length: 7 }).map((_, cIdx) => (
              <View key={cIdx} style={styles.shiftCell}>
                <Skeleton width="100%" height={42} borderRadius={8} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dayCol: {
    alignItems: 'center',
    flex: 1,
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  shiftCellsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  shiftCell: {
    flex: 1,
  },
});
