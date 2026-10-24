import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonCircle } from './SkeletonCircle';

export interface BookingDetailSkeletonProps {
  style?: StyleProp<ViewStyle>;
}

export const BookingDetailSkeleton: React.FC<BookingDetailSkeletonProps> = ({ style }) => {
  return (
    <ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={false}>
      {/* 1. Status Banner Card */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Skeleton width={120} height={24} borderRadius={8} style={{ marginRight: 10 }} />
          <Skeleton width={100} height={18} borderRadius={4} />
        </View>
        <Skeleton width="90%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
        <Skeleton width="60%" height={14} borderRadius={4} />
      </View>

      {/* 2. Provider / Customer Info Card */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <SkeletonCircle size={56} style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <Skeleton width="70%" height={17} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="45%" height={13} borderRadius={3} style={{ marginBottom: 6 }} />
            <Skeleton width="85%" height={12} borderRadius={3} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Skeleton width="48%" height={38} borderRadius={10} />
          <Skeleton width="48%" height={38} borderRadius={10} />
        </View>
      </View>

      {/* 3. Service Package & Add-ons Card */}
      <View style={styles.card}>
        <Skeleton width={140} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Skeleton width="60%" height={15} borderRadius={4} />
          <Skeleton width={80} height={15} borderRadius={4} />
        </View>
        <Skeleton width="80%" height={12} borderRadius={3} style={{ marginBottom: 12 }} />
        <View style={styles.divider} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width={100} height={14} borderRadius={4} />
          <Skeleton width={110} height={18} borderRadius={4} />
        </View>
      </View>

      {/* 4. Location & Time Card */}
      <View style={styles.card}>
        <Skeleton width={130} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Skeleton width={20} height={20} borderRadius={10} style={{ marginRight: 10 }} />
          <Skeleton width="85%" height={14} borderRadius={4} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton width={20} height={20} borderRadius={10} style={{ marginRight: 10 }} />
          <Skeleton width="60%" height={14} borderRadius={4} />
        </View>
      </View>

      {/* 5. Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        <Skeleton width="48%" height={48} borderRadius={24} />
        <Skeleton width="48%" height={48} borderRadius={24} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 40,
  },
});
