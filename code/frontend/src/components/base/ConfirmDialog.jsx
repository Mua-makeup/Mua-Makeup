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
  isDangerous = false,
  isLoading = false,
}) => {
  const { t } = useI18nStore();
  const effectiveTitle = title || t('modal_confirm_title');
  const effectiveConfirmText = confirmText || t('modal_confirm_btn');
  const effectiveCancelText = cancelText || t('modal_cancel_btn');
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {isDangerous && <AlertTriangle className="w-5 h-5 text-red-500" />}
          <span>{effectiveTitle}</span>
        </div>
      }
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {effectiveCancelText}
          </Button>
          <Button
            variant={isDangerous ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {effectiveConfirmText}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-600 leading-relaxed">{message}</div>
    </Modal>
  );
};
