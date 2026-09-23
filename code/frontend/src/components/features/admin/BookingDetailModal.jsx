import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, MapPin, User, DollarSign, Image, AlertCircle, History, Package } from 'lucide-react';
import { superAdminService } from '../../../services/super-admin.service';
import { useI18nStore } from '../../../store/useI18nStore';
import { Badge } from '../../base/Badge';
import { formatDate, formatDateTime } from '../../../utils/formatters';

export const BookingDetailModal = ({ isOpen, onClose, booking }) => {
  const { t } = useI18nStore();
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && booking?.id) {
      const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const res = await superAdminService.getBookingHistory(booking.id);
          const historyData = res?.data || res;
          setHistory(historyData?.historyLogs || historyData?.historyRecords || historyData?.history || []);
        } catch (err) {
          console.error('Failed to load booking history:', err);
          setHistory([]);
        } finally {
          setIsLoadingHistory(false);
        }
      };
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const getStatusVariant = (status) => {
    switch (status) {
      case 'REQUESTED':
        return 'warning';
      case 'ACCEPTED':
      case 'AGENCY_ASSIGNED':
        return 'info';
      case 'ON_THE_WAY':
      case 'ARRIVED':
      case 'IN_PROGRESS':
        return 'primary';
      case 'COMPLETED':
      case 'PAID_OUT':
        return 'success';
      case 'CANCELLED':
        return 'rejected';
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = (status) => {
    const map = {
      REQUESTED: t('status_requested'),
      ACCEPTED: t('status_accepted'),
      ON_THE_WAY: t('status_on_the_way'),
      IN_PROGRESS: t('status_in_progress'),
      COMPLETED: t('status_completed'),
      CANCELLED: t('status_cancelled'),
      CONFIRMED: t('status_confirmed'),
      ARRIVED: t('status_arrived'),
      PENDING: t('status_pending'),
    };
    return map[status] || status;
  };

  const getTypeLabel = (type) => {
    if (type === 'REALTIME_INSTANT') return t('type_instant');
    if (type === 'PRE_ORDER') return t('type_scheduled');
    return type || '';
  };

  const getPartnerLabel = (partner) => {
    if (partner === 'FREELANCER_DIRECT') return t('partner_freelancer');
    if (partner === 'AGENCY_STUDIO') return t('partner_agency');
    return partner || '';
  };



  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center pt-16 sm:pt-20 pb-16 px-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-100 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[calc(100vh-160px)]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/40">
              #{booking.bookingCode || booking.id}
            </span>
            <Badge variant={getStatusVariant(booking.status)}>
              {getStatusLabel(booking.status)}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm flex-1">
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[11px]">
                <User className="w-3.5 h-3.5 text-rose-500" />
                <span>{t('col_customer')}</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {booking.customerName || 'N/A'}
              </div>
              <div className="text-slate-500 text-xs">{booking.customerPhone || t('not_updated')}</div>
              {booking.customerEmail && (
                <div className="text-slate-400 text-[11px] truncate">{booking.customerEmail}</div>
              )}
            </div>

            {/* MUA Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[11px]">
                <User className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('col_mua')}</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {booking.muaName || (booking.muaId ? `MUA #${booking.muaId}` : t('unassigned_staff'))}
              </div>
              <div className="text-slate-500 text-xs">{booking.muaPhone || 'N/A'}</div>
              {booking.agencyName && (
                <div className="text-xs text-rose-600 font-medium">
                  Studio: {booking.agencyName}
                </div>
              )}
            </div>
          </div>

          {/* Time & Location */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-rose-500" />
                <span>{booking.bookingDate ? formatDate(booking.bookingDate) : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-500" />
                <span>{booking.startTime || 'N/A'}</span>
              </div>
              <div className="ml-auto text-[11px] font-bold text-slate-400 uppercase">
                {getTypeLabel(booking.bookingType)} • {getPartnerLabel(booking.bookingPartner)}
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <MapPin className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600 dark:text-slate-300 text-xs">
                {booking.destinationAddress || t('address_not_provided')}
              </span>
            </div>
          </div>

          {/* Service Package Details Section */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-3">
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
                  {booking.packageName || booking.servicePackageName || t('unspecified_package')}
                </h4>
                {booking.packageDescription && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {booking.packageDescription}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {booking.packageDurationMinutes && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {booking.packageDurationMinutes} {t('unit_minutes') || 'phút'}
                  </span>
                )}
                {booking.packagePrice !== undefined && booking.packagePrice !== null && (
                  <span className="text-xs font-bold text-slate-900 dark:text-white bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                    {Number(booking.packagePrice).toLocaleString()} đ
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
                            +{Number(item.itemPrice).toLocaleString()} đ
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

          {/* Financial Breakdown */}
          <div className="p-4 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 space-y-2">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold uppercase text-[11px]">
              <DollarSign className="w-3.5 h-3.5" />
              <span>{t('financial_breakdown')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('fee_service')}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {Number(booking.serviceSubtotal || 0).toLocaleString()} đ
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('fee_distance')}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {Number(booking.distanceFee || 0).toLocaleString()} đ
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('fee_surcharge')}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {Number(booking.surchargeFee || 0).toLocaleString()} đ
                </span>
              </div>
              <div>
                <span className="text-[10px] text-rose-600 uppercase font-bold block">{t('col_total_amount')}</span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                  {Number(booking.totalAmount || 0).toLocaleString()} đ
                </span>
              </div>
            </div>
          </div>

          {/* Completion Photo (if any) */}
          {booking.completionPhotoUrl && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[11px]">
                <Image className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('completion_photo')}</span>
              </div>
              <div className="w-36 h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 mt-2">
                <img
                  src={booking.completionPhotoUrl}
                  alt="Completion proof"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Cancellation Reason (if any) */}
          {booking.cancellationReason && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">{t('cancellation_reason_title')}</span>
                <span>{booking.cancellationReason}</span>
              </div>
            </div>
          )}

          {/* Audit Log Timeline */}
          <div className="pt-2">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px] mb-3">
              <History className="w-3.5 h-3.5 text-rose-500" />
              <span>{t('audit_timeline')}</span>
            </div>

            {isLoadingHistory ? (
              <div className="text-xs text-slate-400 py-3 text-center">{t('loading')}</div>
            ) : history.length === 0 ? (
              <div className="text-xs text-slate-400 py-2 italic">{t('no_history')}</div>
            ) : (
              <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-2.5 space-y-4 py-1">
                {history.map((h, idx) => (
                  <div key={idx} className="relative pl-5">
                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-white dark:ring-slate-900" />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {h.fromStatus ? `${getStatusLabel(h.fromStatus)} ➔ ` : ''}{getStatusLabel(h.toStatus)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDateTime(h.createdAt || h.timestamp)}
                      </span>
                      {h.changedBy && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {h.changedBy}
                        </span>
                      )}
                    </div>
                    {(h.note || h.reason) && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">
                        "{h.note || h.reason}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
