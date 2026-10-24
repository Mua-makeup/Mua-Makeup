import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonCircle } from './SkeletonCircle';

export interface DetailScreenSkeletonProps {
  style?: StyleProp<ViewStyle>;
}

export const DetailScreenSkeleton: React.FC<DetailScreenSkeletonProps> = ({ style }) => {
  return (
    <ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={false}>
      {/* Top Cover Banner */}
      <Skeleton width="100%" height={220} borderRadius={0} backgroundColor="#F1F5F9" />

      <View style={styles.content}>
        {/* Floating Profile Info */}
        <View style={styles.profileCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <SkeletonCircle size={68} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Skeleton width="75%" height={20} borderRadius={4} style={{ marginBottom: 8 }} />
              <Skeleton width="45%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="85%" height={12} borderRadius={3} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <Skeleton width="28%" height={32} borderRadius={8} />
            <Skeleton width="28%" height={32} borderRadius={8} />
            <Skeleton width="28%" height={32} borderRadius={8} />
          </View>
        </View>

        {/* Tab Pills */}
        <View style={styles.tabsRow}>
          <Skeleton width={90} height={36} borderRadius={18} />
          <Skeleton width={110} height={36} borderRadius={18} />
          <Skeleton width={90} height={36} borderRadius={18} />
        </View>

        {/* Service Package Items */}
        {Array.from({ length: 3 }).map((_, idx) => (
          <View key={idx} style={styles.serviceCard}>
            <Skeleton width="70%" height={17} borderRadius={4} style={{ marginBottom: 8 }} />
            <Skeleton width="95%" height={12} borderRadius={3} style={{ marginBottom: 6 }} />
            <Skeleton width="60%" height={12} borderRadius={3} style={{ marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width={110} height={20} borderRadius={4} />
              <Skeleton width={90} height={34} borderRadius={17} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    marginTop: -30,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
});
