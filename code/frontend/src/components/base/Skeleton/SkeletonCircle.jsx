import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Circular Skeleton component for Avatars, Badges, and round Icons.
 */
export const SkeletonCircle = ({
  size = 'w-10 h-10',
  className = '',
  ...props
}) => {
  return (
    <Skeleton
      rounded="rounded-full"
      className={`shrink-0 ${size} ${className}`}
      {...props}
    />
  );
};
