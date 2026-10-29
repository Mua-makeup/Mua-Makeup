import React from 'react';

/**
 * BrandLogo - Biểu tượng thương hiệu độc quyền Mua-Makeup
 * Thiết kế Monogram 'M' kết hợp Giác cắt Đá quý (Luxury Diamond Crest)
 * Tinh tế, sang trọng, loại bỏ hoàn toàn các biểu tượng dạng AI Sparkles/Gemini.
 */
export const BrandLogo = ({ className = 'w-5 h-5', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    {/* Geometric Luxury Diamond Crest contour with subtle translucent fill */}
    <path
      d="M12 2.5L20 7.5V16.5L12 21.5L4 16.5V7.5L12 2.5Z"
      fill="currentColor"
      fillOpacity="0.16"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    {/* Monogram M with luxury high-fashion proportions */}
    <path
      d="M7.5 16V9.5L12 13.8L16.5 9.5V16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Apex beauty pearl/gem accent */}
    <circle cx="12" cy="6" r="1.1" fill="currentColor" />
  </svg>
);

export default BrandLogo;

