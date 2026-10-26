import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonCircle } from './SkeletonCircle';

export interface ExploreSkeletonProps {
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export const ExploreSkeleton: React.FC<ExploreSkeletonProps> = ({
  count = 4,
  style,
}) => {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={idx}
          style={styles.card}
        >
          {/* Top Info */}
          <View style={styles.topRow}>
            <SkeletonCircle size={56} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Skeleton width="65%" height={17} borderRadius={4} style={{ marginBottom: 6 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Skeleton width={50} height={13} borderRadius={3} />
                <Skeleton width={70} height={13} borderRadius={3} />
              </View>
              <Skeleton width="90%" height={12} borderRadius={3} />
            </View>
          </View>

          {/* Badges Row */}
          <View style={styles.badgesRow}>
            <Skeleton width={68} height={22} borderRadius={6} />
            <Skeleton width={84} height={22} borderRadius={6} />
            <Skeleton width={72} height={22} borderRadius={6} />
          </View>

          {/* Bottom Action */}
          <View style={styles.bottomRow}>
            <View>
              <Skeleton width={80} height={11} borderRadius={3} style={{ marginBottom: 4 }} />
              <Skeleton width={110} height={18} borderRadius={4} />
            </View>
            <Skeleton width={96} height={36} borderRadius={18} />
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
    alignItems: 'center',
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
});
