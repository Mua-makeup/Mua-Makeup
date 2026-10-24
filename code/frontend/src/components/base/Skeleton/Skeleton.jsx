import React from 'react';

/**
 * Base Atomic Skeleton component with luxury shimmer effect.
 * Preserves layout geometry, supports custom className and variant styles.
 */
export const Skeleton = ({
  className = '',
  variant = 'shimmer', // 'shimmer' | 'pulse'
  rounded = 'rounded-lg',
  as: Component = 'div',
  style,
  ...props
}) => {
  const animationClass =
    variant === 'pulse'
      ? 'animate-pulse bg-slate-200 dark:bg-slate-800'
      : 'skeleton-shimmer';

  return (
    <Component
      aria-hidden="true"
      className={`${animationClass} ${rounded} ${className}`}
      style={style}
      {...props}
    />
  );
};
