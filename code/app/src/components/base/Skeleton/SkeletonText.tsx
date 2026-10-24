import React from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';

export interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  spacing?: number;
  lastLineWidth?: DimensionValue;
  style?: StyleProp<ViewStyle>;
  animate?: boolean;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lineHeight = 14,
  spacing = 8,
  lastLineWidth = '60%',
  style,
  animate = true,
}) => {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1;
        const width: DimensionValue = isLast && lines > 1 ? lastLineWidth : '100%';

        return (
          <Skeleton
            key={index}
            width={width}
            height={lineHeight}
            borderRadius={lineHeight / 2}
            animate={animate}
            style={index < lines - 1 ? { marginBottom: spacing } : undefined}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
