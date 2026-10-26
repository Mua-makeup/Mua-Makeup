import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';

export interface SkeletonCircleProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  animate?: boolean;
  backgroundColor?: string;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 40,
  style,
  animate = true,
  backgroundColor,
}) => {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
      animate={animate}
      backgroundColor={backgroundColor}
    />
  );
};
