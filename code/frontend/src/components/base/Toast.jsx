import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({
  message,
  type = 'success',
  duration = 3000,
  onClose,
  className = '',
}) => {
  // Auto dismiss after duration (default 3 seconds)
  useEffect(() => {
    if (!message || !onClose) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  const typeConfig = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />,
    },
    error: {
      bg: 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />,
    },
    info: {
      bg: 'bg-sky-50 dark:bg-sky-950/90 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200',
      icon: <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 flex-shrink-0" />,
    },
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 max-w-md flex items-center gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-bounce-short ${config.bg} ${className}`}
    >
      {config.icon}
      <div className="flex-1 text-sm font-medium leading-snug">{message}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity ml-2 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
