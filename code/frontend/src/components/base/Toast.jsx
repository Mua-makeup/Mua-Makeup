import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({
  message,
  type = 'success',
  duration = 3000,
  action = null,
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

  const displayMessage =
    typeof message === 'object' && message !== null
      ? message.text || message.message || JSON.stringify(message)
      : message;

  if (!displayMessage) return null;

  const resolvedType =
    typeof message === 'object' && message !== null && message.type
      ? message.type
      : type;

  const typeConfig = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />,
      progressBar: 'bg-emerald-500/50',
    },
    error: {
      bg: 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />,
      progressBar: 'bg-rose-500/50',
    },
    info: {
      bg: 'bg-sky-50 dark:bg-sky-950/90 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200',
      icon: <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 flex-shrink-0" />,
      progressBar: 'bg-sky-500/50',
    },
  };

  const config = typeConfig[resolvedType] || typeConfig.info;
  const ActionIcon = action?.icon;

  return (
    <div
      className={`fixed bottom-4 sm:bottom-5 right-4 sm:right-5 left-4 sm:left-auto z-[999999] max-w-md flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all overflow-hidden ${config.bg} ${className}`}
    >
      {config.icon}
      <div className="flex-1 text-sm font-medium leading-snug">{displayMessage}</div>

      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick?.();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer ml-1"
        >
          {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
          <span>{action.label}</span>
        </button>
      )}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity ml-1 shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* 5-second or custom duration countdown progress bar */}
      {action && duration > 0 && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10 overflow-hidden pointer-events-none">
            <div
              className={`h-full ${config.progressBar}`}
              style={{
                animation: `toastCountdown ${duration}ms linear forwards`,
              }}
            />
          </div>
          <style>{`
            @keyframes toastCountdown {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </>
      )}
    </div>
  );
};
