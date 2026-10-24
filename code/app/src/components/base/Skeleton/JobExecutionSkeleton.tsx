import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonCircle } from './SkeletonCircle';

export interface JobExecutionSkeletonProps {
  style?: StyleProp<ViewStyle>;
}

export const JobExecutionSkeleton: React.FC<JobExecutionSkeletonProps> = ({ style }) => {
  return (
    <ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={false}>
      {/* 1. Status & Timer Hero Box */}
      <View style={styles.heroBox}>
        <Skeleton width={140} height={26} borderRadius={8} style={{ marginBottom: 10 }} />
        <Skeleton width="85%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
        <Skeleton width="50%" height={14} borderRadius={4} />
      </View>

      {/* 2. Customer Contact Card */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <SkeletonCircle size={52} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Skeleton width="65%" height={17} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={13} borderRadius={3} />
          </View>
          <Skeleton width={44} height={44} borderRadius={22} />
        </View>
        <View style={styles.divider} />
        <Skeleton width="90%" height={13} borderRadius={3} />
      </View>

      {/* 3. Workflow Stepper Progress */}
      <View style={styles.card}>
        <Skeleton width={130} height={16} borderRadius={4} style={{ marginBottom: 14 }} />
        <View style={styles.stepperRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.stepCol}>
              <SkeletonCircle size={32} style={{ marginBottom: 6 }} />
              <Skeleton width={45} height={10} borderRadius={2} />
            </View>
          ))}
        </View>
      </View>

      {/* 4. Service Package Details Card */}
      <View style={styles.card}>
        <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
        <Skeleton width="75%" height={15} borderRadius={4} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={13} borderRadius={3} style={{ marginBottom: 12 }} />
        <View style={styles.divider} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width={90} height={14} borderRadius={4} />
          <Skeleton width={110} height={18} borderRadius={4} />
        </View>
      </View>

      {/* 5. Big Action Button */}
      <View style={{ marginTop: 8, marginBottom: 40 }}>
        <Skeleton width="100%" height={52} borderRadius={26} />
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
  heroBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stepCol: {
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
});
