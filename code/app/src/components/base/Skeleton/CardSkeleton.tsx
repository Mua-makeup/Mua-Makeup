import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';
import { SkeletonCircle } from './SkeletonCircle';
import { SkeletonText } from './SkeletonText';

export interface CardSkeletonProps {
  hasImageBanner?: boolean;
  imageHeight?: number;
  hasAvatar?: boolean;
  lines?: number;
  style?: StyleProp<ViewStyle>;
  count?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  hasImageBanner = false,
  imageHeight = 140,
  hasAvatar = true,
  lines = 2,
  style,
  count = 1,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={idx}
          style={[styles.card, style]}
        >
          {hasImageBanner && (
            <Skeleton
              width="100%"
              height={imageHeight}
              borderRadius={12}
              style={{ marginBottom: 12 }}
            />
          )}

          <View style={styles.headerRow}>
            {hasAvatar && (
              <SkeletonCircle size={44} style={{ marginRight: 12 }} />
            )}
            <View style={{ flex: 1 }}>
              <Skeleton width="65%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="40%" height={12} borderRadius={4} />
            </View>
          </View>

          {lines > 0 && (
            <SkeletonText
              lines={lines}
              lineHeight={12}
              spacing={6}
              lastLineWidth="50%"
              style={{ marginTop: 12 }}
            />
          )}

          <View style={styles.bottomRow}>
            <Skeleton width="35%" height={16} borderRadius={4} />
            <Skeleton width={80} height={32} borderRadius={16} />
          </View>
        </View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
});
