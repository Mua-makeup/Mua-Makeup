import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  DollarSign,
  AlertCircle,
  FileText,
  History,
  Package,
} from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Badge } from '../../base/Badge';
import { agencyService } from '../../../services/agency.service';
import { useI18nStore } from '../../../store/useI18nStore';
import { formatDateTime, formatBookingDateTime } from '../../../utils/formatters';

export const AgencyBookingDetailModal = ({ isOpen, onClose, booking }) => {
  const { t } = useI18nStore();
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const bookingId = booking?.bookingId || booking?.id;
    if (bookingId && isOpen) {
      setLoadingHistory(true);
      agencyService
        .getBookingHistory(bookingId)
        .then((res) => {
          const raw = res?.data || res;
          const list = Array.isArray(raw)
            ? raw
            : (raw?.historyLogs || raw?.historyRecords || raw?.history || []);
          setHistory(list);
        })
        .catch(() => setHistory([]))
        .finally(() => setLoadingHistory(false));
    }
  }, [booking, isOpen]);

  if (!booking) return null;

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };


  const statusMap = {
    PENDING_DEPOSIT: { variant: 'pending', label: t('status_pending_deposit') },
    REQUESTED: { variant: 'warning', label: t('status_requested') },
    PENDING_AGENCY_DISPATCH: { variant: 'warning', label: t('status_pending_agency_dispatch') },
    AGENCY_ASSIGNED: { variant: 'info', label: t('status_agency_assigned') },
    ACCEPTED: { variant: 'active', label: t('status_accepted') },
    CONFIRMED: { variant: 'active', label: t('status_confirmed') },
    ON_THE_WAY: { variant: 'info', label: t('status_on_the_way') },
    ARRIVED: { variant: 'info', label: t('status_arrived') },
    IN_PROGRESS: { variant: 'warning', label: t('status_in_progress') },
    COMPLETED: { variant: 'success', label: t('status_completed') },
    PAID_OUT: { variant: 'success', label: t('status_paid_out') },
    CANCELLED: { variant: 'inactive', label: t('status_cancelled') },
    CANCELLED_EXPIRED: { variant: 'inactive', label: t('status_cancelled_expired') },
    DISPUTED: { variant: 'danger', label: t('status_disputed') },
    PENDING: { variant: 'pending', label: t('status_pending') },
  };

  const getStatusBadge = (status) => {
    const s = statusMap[status] || { variant: 'default', label: status || '—' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span>{t('booking_detail_title')}</span>
          <span className="text-xs font-mono bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 px-2 py-0.5 rounded-md font-bold">
            {booking.bookingCode}
          </span>
          {getStatusBadge(booking.bookingStatus || booking.status)}
        </div>
      }
      maxWidth="max-w-4xl"
      minHeight="min-h-[65vh]"
    >
      <div className="space-y-6">
        {/* Core Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer & Package */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('field_customer_info')}
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-semibold">{booking.customerName || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>{booking.customerPhone || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-medium text-rose-600 dark:text-rose-400">
                  {booking.servicePackageName || booking.packageName || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Schedule & Staff */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('field_schedule_staff')}
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>
                  {booking.scheduledStartTime
                    ? formatDateTime(booking.scheduledStartTime)
                    : formatBookingDateTime(booking.startTime, booking.bookingDate) || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>
                  {booking.scheduledEndTime
                    ? formatDateTime(booking.scheduledEndTime)
                    : formatBookingDateTime(booking.endTime, booking.bookingDate) || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <User className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span className="font-medium">
                  {booking.staffName ? `${booking.staffName} (${booking.staffPhone || ''})` : t('unassigned_staff')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Service Package Details Section */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold uppercase text-[11px]">
              <Package className="w-3.5 h-3.5" />
              <span>{t('booking_package_details') || 'Gói Dịch Vụ Đã Đặt'}</span>
            </div>
            {booking.categoryName && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                {booking.categoryName}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {booking.servicePackageName || booking.packageName || t('unspecified_package')}
              </h4>
              {booking.packageDescription && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {booking.packageDescription}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {booking.packageDurationMinutes && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {booking.packageDurationMinutes} {t('unit_minutes') || 'phút'}
                </span>
              )}
              {booking.packagePrice !== undefined && booking.packagePrice !== null && (
                <span className="text-xs font-bold text-slate-900 dark:text-white bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                  {formatCurrency(booking.packagePrice)}
                </span>
              )}
            </div>
          </div>

          {/* Package Items / Steps Breakdown */}
          {booking.packageItems && booking.packageItems.length > 0 && (
            <div className="pt-2">
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                {t('package_items_list') || 'Quy Trình & Chi Tiết Các Bước'} ({booking.packageItems.length})
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {booking.packageItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {item.stepOrder || idx + 1}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.itemName}
                      </span>
                      {item.itemType && (
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                          {item.itemType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-slate-500 text-[11px]">
                      {item.durationMinutes && (
                        <span>{item.durationMinutes}p</span>
                      )}
                      {item.itemPrice && Number(item.itemPrice) > 0 ? (
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          +{formatCurrency(item.itemPrice)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                          {t('included') || 'Đã bao gồm'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Financial & Commission Breakdown */}
        <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span>{t('field_revenue_commission')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('col_total_amount')}</div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(booking.totalAmount)}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span>{t('col_staff_commission')}</span>
                <span className="font-mono text-[10px] text-slate-400">
                  ({booking.staffCommissionRate || 0}%)
                </span>
              </div>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {formatCurrency(booking.estimatedStaffCommission)}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('col_studio_net')}</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(booking.estimatedStudioNet)}
              </div>
            </div>
          </div>
        </div>

        {/* Notes or Cancellation Reason */}
        {booking.notes && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {t('col_notes')}:
            </span>
            <span className="text-slate-600 dark:text-slate-400">{booking.notes}</span>
          </div>
        )}

        {booking.cancellationReason && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-red-800 dark:text-red-300 block mb-0.5">
                {t('col_cancellation_reason')}:
              </span>
              <span className="text-red-700 dark:text-red-400">{booking.cancellationReason}</span>
            </div>
          </div>
        )}

        {/* Audit History Timeline */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            <History className="w-4 h-4 text-slate-500" />
            <span>{t('booking_history_title')}</span>
          </div>

          {loadingHistory ? (
            <div className="text-xs text-slate-400 py-3 text-center">{t('loading')}</div>
          ) : !Array.isArray(history) || history.length === 0 ? (
            <div className="text-xs text-slate-400 py-2 italic">{t('no_history')}</div>
          ) : (
            <div className="border-l-2 border-slate-200 dark:border-slate-800 ml-2 pl-4 space-y-4">
              {history.map((item, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-white dark:ring-slate-900" />
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {statusMap[item.toStatus]?.label || item.toStatus}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatDateTime(item.changedAt || item.createdAt)}
                    </span>
                  </div>
                  {item.action && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.action}
                    </p>
                  )}
                  {(item.note || item.notes) && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 italic">
                      "{item.note || item.notes}"
                    </p>
                  )}
                  {item.changedBy && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {item.changedBy}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
