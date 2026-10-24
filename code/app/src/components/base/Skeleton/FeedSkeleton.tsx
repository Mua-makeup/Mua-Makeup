import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonCircle } from './SkeletonCircle';

export interface FeedSkeletonProps {
  style?: StyleProp<ViewStyle>;
}

export const FeedSkeleton: React.FC<FeedSkeletonProps> = ({ style }) => {
  return (
    <View style={[styles.container, style]}>
      {/* 1. Hero Promo Banner */}
      <View style={styles.section}>
        <Skeleton width="100%" height={130} borderRadius={20} />
      </View>

      {/* 2. Categories Section Header + Horizontal Circles */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Skeleton width={150} height={18} borderRadius={4} />
          <Skeleton width={50} height={14} borderRadius={4} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.categoryCol}>
              <SkeletonCircle size={54} style={{ marginBottom: 6 }} />
              <Skeleton width={50} height={10} borderRadius={3} />
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 3. Featured MUAs Section */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Skeleton width={180} height={18} borderRadius={4} />
          <Skeleton width={60} height={14} borderRadius={4} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.muaCard}>
              <SkeletonCircle size={64} style={{ marginBottom: 10 }} />
              <Skeleton width="80%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="50%" height={12} borderRadius={3} style={{ marginBottom: 8 }} />
              <Skeleton width="90%" height={26} borderRadius={13} />
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 4. Featured Studios Section */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Skeleton width={160} height={18} borderRadius={4} />
          <Skeleton width={60} height={14} borderRadius={4} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {Array.from({ length: 2 }).map((_, i) => (
            <View key={i} style={styles.studioCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Skeleton width={44} height={44} borderRadius={10} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Skeleton width="80%" height={14} borderRadius={3} style={{ marginBottom: 4 }} />
                  <Skeleton width="60%" height={11} borderRadius={3} />
                </View>
              </View>
              <Skeleton width="100%" height={30} borderRadius={8} />
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  section: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  horizontalScroll: {
    paddingRight: 16,
    gap: 12,
  },
  categoryCol: {
    alignItems: 'center',
    marginRight: 8,
  },
  muaCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginRight: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  studioCard: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginRight: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
});
