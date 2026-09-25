import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useI18nStore } from '../../store/useI18nStore';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant,
  isDangerous = false,
  isLoading = false,
  zIndex = 'z-[10000]',
  confirmClassName = '',
}) => {
  const { t } = useI18nStore();
  const effectiveTitle = title || t('modal_confirm_title');
  const effectiveConfirmText = confirmText || t('modal_confirm_btn');
  const effectiveCancelText = cancelText || t('modal_cancel_btn');
  const isDanger = isDangerous || variant === 'danger';
  const resolvedVariant = isDanger ? 'danger' : (variant || 'primary');
  const effectiveZIndex = (!zIndex || zIndex === 'z-[70]' || zIndex === 'z-[80]' || zIndex === 'z-[60]' || zIndex === 'z-50')
    ? 'z-[10000]'
    : zIndex;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={effectiveZIndex}
      title={
        <div className="flex items-center gap-2">
          {isDanger && <AlertTriangle className="w-5 h-5 text-red-500" />}
          <span>{effectiveTitle}</span>
        </div>
      }
      maxWidth="max-w-md"
      minHeight="min-h-0"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {effectiveCancelText}
          </Button>
          <Button
            variant={resolvedVariant}
            onClick={onConfirm}
            isLoading={isLoading}
            className={confirmClassName}
          >
            {effectiveConfirmText}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{message}</div>
    </Modal>
  );
};
