import React, { useEffect, isValidElement } from 'react';
import { X } from 'lucide-react';

const SIZE_MAP = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  '2xl': 'max-w-3xl',
  '3xl': 'max-w-4xl',
  '4xl': 'max-w-5xl',
  '5xl': 'max-w-6xl',
  '6xl': 'max-w-7xl',
  full: 'max-w-[95vw]',
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth,
  size = 'xl',
  minHeight = '',
  height = 'max-h-[90vh]',
  zIndex = 'z-[9999]',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedMaxWidth = maxWidth || SIZE_MAP[size] || 'max-w-2xl';
  const resolvedZIndex = (zIndex === 'z-[60]' || zIndex === 'z-[70]' || zIndex === 'z-[80]' || zIndex === 'z-50')
    ? 'z-[10000]'
    : (zIndex || 'z-[9999]');

  const renderFooterContent = () => {
    if (!footer) return null;

    let childrenArray = [];
    if (isValidElement(footer) && footer.type === React.Fragment) {
      childrenArray = React.Children.toArray(footer.props.children);
    } else if (Array.isArray(footer)) {
      childrenArray = footer;
    } else {
      childrenArray = React.Children.toArray(footer);
    }

    // Nếu footer có 2 nút: Nút thứ nhất chiếm 1/3 (col-span-1), Nút thứ hai chiếm 2/3 (col-span-2)
    if (childrenArray.length === 2) {
      return (
        <div className="grid grid-cols-3 gap-3 w-full items-center">
          <div className="col-span-1 flex [&>*]:w-full">
            {childrenArray[0]}
          </div>
          <div className="col-span-2 flex [&>*]:w-full">
            {childrenArray[1]}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-3 w-full">
        {footer}
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 ${resolvedZIndex} overflow-y-auto`}>
      {/* Backdrop with rich frosted glass blur */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
        <div
          className={`w-full ${resolvedMaxWidth} ${minHeight} ${height} flex flex-col justify-between transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-slate-800 my-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 flex-1 overflow-y-auto text-slate-700 dark:text-slate-300">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0 w-full flex items-center">
              {renderFooterContent()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
