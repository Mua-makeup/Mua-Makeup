import React, { useState } from 'react';
import { AlertTriangle, Check, XCircle } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { useI18nStore } from '../../../store/useI18nStore';
import { agencyService } from '../../../services/agency.service';
import { parseApiError } from '../../../utils/error';
import { formatDateTime, formatBookingDateTime } from '../../../utils/formatters';

export const AgencyCancelBookingModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const { t } = useI18nStore();
  const [reason, setReason] = useState('');
  const [selectedQuickReason, setSelectedQuickReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!booking) return null;

  const quickReasons = [
    { key: 'full', text: t('quick_reason_schedule_full') },
    { key: 'area', text: t('quick_reason_outside_area') },
    { key: 'call', text: t('quick_reason_customer_call') },
    { key: 'emergency', text: t('quick_reason_emergency') },
  ];

  const handleSelectQuickReason = (qrText) => {
    setSelectedQuickReason(qrText);
    setReason(qrText);
    setErrorMsg('');
  };

  const handleClose = () => {
    setReason('');
    setSelectedQuickReason('');
    setErrorMsg('');
    setIsSubmitting(false);
    onClose();
  };

  const handleConfirmCancel = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      setErrorMsg(t('cancel_reason_required'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const bookingId = booking.bookingId || booking.id;
      await agencyService.cancelBooking(bookingId, trimmedReason);
      if (onSuccess) {
        onSuccess(trimmedReason);
      }
      handleClose();
    } catch (err) {
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-lg"
      title={
        <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold text-slate-900 dark:text-white">
            {t('cancel_booking_title')}
          </span>
          <span className="text-xs font-mono bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 px-2 py-0.5 rounded font-bold">
            {booking.bookingCode}
          </span>
        </div>
      }
      footer={
        <div className="flex items-center justify-end w-full">
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirmCancel}
            isLoading={isSubmitting}
            className="w-full sm:w-1/3 text-xs !bg-rose-600 hover:!bg-rose-700 text-white font-semibold py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            {t('btn_confirm_cancel_booking')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Warning Banner */}
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
            <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5">
              {t('cancel_booking_confirm_desc')}
            </span>
          </div>
        </div>

        {/* Booking Summary Box */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
          <div>
            <span className="text-slate-400 block text-[11px]">{t('field_customer_info')}:</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block">
              {booking.customerName || '—'} ({booking.customerPhone || '—'})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">{t('col_scheduled_time')}:</span>
            <span className="font-semibold text-slate-900 dark:text-white block">
              {booking.scheduledStartTime
                ? formatDateTime(booking.scheduledStartTime)
                : formatBookingDateTime(booking.startTime, booking.bookingDate) || '—'}
            </span>
          </div>
          <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">{t('col_package')}:</span>
            <span className="font-medium text-rose-600 dark:text-rose-400 truncate block">
              {booking.servicePackageName || booking.packageName || '—'}
            </span>
          </div>
        </div>

        {/* Quick select chips */}
        <div className="space-y-1.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
            {t('quick_reason_title')}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {quickReasons.map((qr) => (
              <button
                key={qr.key}
                type="button"
                onClick={() => handleSelectQuickReason(qr.text)}
                className={`text-left p-2 rounded-lg border text-[11px] transition-all flex items-start justify-between gap-1.5 cursor-pointer ${
                  selectedQuickReason === qr.text
                    ? 'border-rose-500 bg-rose-50/70 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-semibold'
                    : 'border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span>{qr.text}</span>
                {selectedQuickReason === qr.text && (
                  <Check className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Reason Textarea */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
            {t('cancel_reason_label')} <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setErrorMsg('');
            }}
            placeholder={t('cancel_reason_placeholder')}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
          />
          {errorMsg && (
            <p className="text-red-600 dark:text-red-400 text-[11px] font-medium mt-1">
              {errorMsg}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
