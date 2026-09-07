import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility gộp class Tailwind CSS an toàn và tối ưu
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
