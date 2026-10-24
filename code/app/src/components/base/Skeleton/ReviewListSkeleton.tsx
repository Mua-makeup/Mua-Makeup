import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonCircle } from './SkeletonCircle';

export interface ReviewListSkeletonProps {
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export const ReviewListSkeleton: React.FC<ReviewListSkeletonProps> = ({
  count = 3,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.reviewCard}>
          <View style={styles.headerRow}>
            <SkeletonCircle size={44} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Skeleton width="60%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Skeleton width={80} height={12} borderRadius={3} />
                <Skeleton width={60} height={12} borderRadius={3} />
              </View>
            </View>
          </View>
          <Skeleton width="95%" height={13} borderRadius={3} style={{ marginBottom: 6 }} />
          <Skeleton width="80%" height={13} borderRadius={3} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Skeleton width={64} height={64} borderRadius={8} />
            <Skeleton width={64} height={64} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
});
