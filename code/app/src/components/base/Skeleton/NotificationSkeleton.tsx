import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonCircle } from './SkeletonCircle';

export interface NotificationSkeletonProps {
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export const NotificationSkeleton: React.FC<NotificationSkeletonProps> = ({
  count = 5,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.item}>
          <SkeletonCircle size={44} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Skeleton width="65%" height={15} borderRadius={4} />
              <Skeleton width={50} height={12} borderRadius={3} />
            </View>
            <Skeleton width="92%" height={12} borderRadius={3} style={{ marginBottom: 4 }} />
            <Skeleton width="45%" height={12} borderRadius={3} />
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
  item: {
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
