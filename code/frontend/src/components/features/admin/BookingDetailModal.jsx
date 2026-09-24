import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, MapPin, User, DollarSign, Image, AlertCircle, History, Package } from 'lucide-react';
import { superAdminService } from '../../../services/super-admin.service';
import { useI18nStore } from '../../../store/useI18nStore';
import { Badge } from '../../base/Badge';
import { formatDate, formatDateTime } from '../../../utils/formatters';

export const BookingDetailModal = ({ isOpen, onClose, booking }) => {
  const { t, language } = useI18nStore();
  const [detailBooking, setDetailBooking] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const translateReasonOrNote = (text) => {
    if (!text) return '';
    const trimmed = text.trim();
    const mapEnToVi = {
      'Emergency issue, unable to assign staff': 'Sự cố phát sinh đột xuất, không thể bố trí thợ',
      'Studio is fully booked for this time slot': 'Studio kín lịch thợ vào khung giờ này',
      'Address is outside our service coverage': 'Địa chỉ khách hẹn ngoài tầm phục vụ',
      'Customer requested cancellation via phone call': 'Khách hàng liên hệ xin hủy hẹn qua điện thoại',
      'Pre-order booking created, deposit pending within 15 minutes': 'Tạo đơn đặt lịch hẹn trước, tạm giữ chỗ 15 phút để thanh toán cọc',
      'Customer paid deposit successfully': 'Khách hàng thanh toán tiền cọc thành công',
    };
    const mapViToEn = {
      'Sự cố phát sinh đột xuất, không thể bố trí thợ': 'Emergency issue, unable to assign staff',
      'Studio kín lịch thợ vào khung giờ này': 'Studio is fully booked for this time slot',
      'Địa chỉ khách hẹn ngoài tầm phục vụ': 'Address is outside our service coverage',
      'Khách hàng liên hệ xin hủy hẹn qua điện thoại': 'Customer requested cancellation via phone call',
      'Tạo đơn đặt lịch hẹn trước, tạm giữ chỗ 15 phút để thanh toán cọc': 'Pre-order booking created, deposit pending within 15 minutes',
      'Khách hàng thanh toán tiền cọc thành công': 'Customer paid deposit successfully',
    };

    if (language === 'vi') {
      if (mapEnToVi[trimmed]) return mapEnToVi[trimmed];
      if (trimmed.startsWith('Staff reported emergency unavailability:')) {
        return trimmed.replace('Staff reported emergency unavailability:', 'Thợ báo bận khẩn cấp:');
      }
      if (trimmed.startsWith('Artist (') && trimmed.includes('confirmed assignment')) {
        return trimmed
          .replace('Artist (', 'Thợ (')
          .replace(') confirmed assignment (', ') xác nhận nhận ca (')
          .replace('PRIMARY_MUA', 'Thợ chính')
          .replace('ASSISTANT_MUA', 'Thợ phụ');
      }
    } else {
      if (mapViToEn[trimmed]) return mapViToEn[trimmed];
      if (trimmed.startsWith('Thợ báo bận khẩn cấp:')) {
        return trimmed.replace('Thợ báo bận khẩn cấp:', 'Staff reported emergency unavailability:');
      }
      if (trimmed.startsWith('Thợ (') && trimmed.includes('xác nhận nhận ca')) {
        return trimmed
          .replace('Thợ (', 'Artist (')
          .replace(') xác nhận nhận ca (', ') confirmed assignment (')
          .replace('Thợ chính', 'PRIMARY_MUA')
          .replace('Thợ phụ', 'ASSISTANT_MUA');
      }
      if (trimmed.startsWith('Studio đã phân công thợ chính:')) {
        return trimmed
          .replace('Studio đã phân công thợ chính:', 'Studio assigned primary artist:')
          .replace('(Trợ lý:', '(Assistant:');
      }
    }
    return text;
  };

  useEffect(() => {
    if (isOpen && booking?.id) {
      setDetailBooking(booking);
      const fetchDetailAndHistory = async () => {
        setIsLoadingHistory(true);
        try {
          const [detailRes, histRes] = await Promise.allSettled([
            superAdminService.getBookingDetail(booking.id),
            superAdminService.getBookingHistory(booking.id),
          ]);
          if (detailRes.status === 'fulfilled') {
            const data = detailRes.value?.data || detailRes.value;
            if (data) setDetailBooking(data);
          }
          if (histRes.status === 'fulfilled') {
            const historyData = histRes.value?.data || histRes.value;
            setHistory(historyData?.historyLogs || historyData?.historyRecords || historyData?.history || []);
          }
        } catch (err) {
          console.error('Failed to load booking details:', err);
        } finally {
          setIsLoadingHistory(false);
        }
      };
      fetchDetailAndHistory();
    } else {
      setDetailBooking(null);
      setHistory([]);
    }
  }, [isOpen, booking]);

  const b = detailBooking || booking;
  if (!isOpen || !b) return null;

  const getStatusVariant = (status) => {
    switch (status) {
      case 'PENDING_DEPOSIT':
      case 'PENDING':
        return 'pending';
      case 'REQUESTED':
        return 'warning';
      case 'PENDING_AGENCY_DISPATCH':
        return 'orange';
      case 'AGENCY_ASSIGNED':
        return 'indigo';
      case 'ACCEPTED':
        return 'blue';
      case 'CONFIRMED':
        return 'teal';
      case 'ON_THE_WAY':
        return 'purple';
      case 'ARRIVED':
        return 'info';
      case 'IN_PROGRESS':
        return 'pink';
      case 'COMPLETED':
        return 'success';
      case 'PAID_OUT':
        return 'active';
      case 'CANCELLED':
        return 'danger';
      case 'CANCELLED_EXPIRED':
        return 'inactive';
      case 'DISPUTED':
        return 'rejected';
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = (status) => {
    const map = {
      PENDING_DEPOSIT: t('status_pending_deposit'),
      REQUESTED: t('status_requested'),
      PENDING_AGENCY_DISPATCH: t('status_pending_agency_dispatch'),
      AGENCY_ASSIGNED: t('status_agency_assigned'),
      ACCEPTED: t('status_accepted'),
      CONFIRMED: t('status_confirmed'),
      ON_THE_WAY: t('status_on_the_way'),
      ARRIVED: t('status_arrived'),
      IN_PROGRESS: t('status_in_progress'),
      COMPLETED: t('status_completed'),
      PAID_OUT: t('status_paid_out'),
      CANCELLED: t('status_cancelled'),
      CANCELLED_EXPIRED: t('status_cancelled_expired'),
      DISPUTED: t('status_disputed'),
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
              #{b.bookingCode || b.id}
            </span>
            <Badge variant={getStatusVariant(b.status)}>
              {getStatusLabel(b.status)}
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
                {b.customerName || 'N/A'}
              </div>
              <div className="text-slate-500 text-xs">{b.customerPhone || t('not_updated')}</div>
              {b.customerEmail && (
                <div className="text-slate-400 text-[11px] truncate">{b.customerEmail}</div>
              )}
            </div>

            {/* MUA Box with Assistant Support */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[11px]">
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t('col_mua')}</span>
                </div>
                {b.agencyName && (
                  <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/40">
                    Studio: {b.agencyName}
                  </span>
                )}
              </div>

              {(() => {
                const staffList = b.assignedStaff || [];
                let primaryStaff = staffList.find(
                  (s) => s.role === 'PRIMARY_MUA' && (!s.status || s.status === 'ACTIVE')
                );
                if (!primaryStaff) {
                  primaryStaff = staffList.find((s) => s.role === 'PRIMARY_MUA' && s.status === 'EMERGENCY_CANCELLED');
                }
                const fallbackPrimaryName = b.muaName || b.staffName;
                const fallbackPrimaryPhone = b.muaPhone || b.staffPhone;

                const assistantList = staffList.filter(
                  (s) => s.role === 'ASSISTANT_MUA' && (!s.status || s.status === 'ACTIVE')
                );

                const hasPrimary = primaryStaff || fallbackPrimaryName;
                const hasAssistants = assistantList.length > 0;

                if (hasPrimary || hasAssistants) {
                  return (
                    <div className="space-y-1.5 pt-1">
                      {/* Primary MUA */}
                      {primaryStaff ? (
                        <div className="flex items-center justify-between p-2 rounded-lg border text-xs bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-amber-600" />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {primaryStaff.staffName}
                              </span>
                              {primaryStaff.staffPhone && (
                                <span className="text-slate-500 font-mono text-[11px] ml-1.5">
                                  ({primaryStaff.staffPhone})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="gold" size="sm">
                              {t('dispatch_badge_primary')}
                            </Badge>
                            {primaryStaff.status === 'EMERGENCY_CANCELLED' && (
                              <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-1 py-0.5 rounded border border-red-200 dark:border-red-900/40">
                                Báo bận
                              </span>
                            )}
                          </div>
                        </div>
                      ) : fallbackPrimaryName ? (
                        <div className="flex items-center justify-between p-2 rounded-lg border text-xs bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-amber-600" />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {fallbackPrimaryName}
                              </span>
                              {fallbackPrimaryPhone && (
                                <span className="text-slate-500 font-mono text-[11px] ml-1.5">
                                  ({fallbackPrimaryPhone})
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="gold" size="sm">
                            {t('dispatch_badge_primary')}
                          </Badge>
                        </div>
                      ) : null}

                      {/* Assistant MUA(s) */}
                      {assistantList.map((staff) => (
                        <div
                          key={staff.id || staff.staffId}
                          className="flex items-center justify-between p-2 rounded-lg border text-xs bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60"
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-purple-600" />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {staff.staffName}
                              </span>
                              {staff.staffPhone && (
                                <span className="text-slate-500 font-mono text-[11px] ml-1.5">
                                  ({staff.staffPhone})
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="purple" size="sm">
                            {t('dispatch_badge_assistant')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="text-slate-400 italic text-xs py-1">
                    {t('unassigned_staff')}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Time & Location */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-rose-500" />
                <span>{b.bookingDate ? formatDate(b.bookingDate) : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-500" />
                <span>{b.startTime || 'N/A'}</span>
              </div>
              <div className="ml-auto text-[11px] font-bold text-slate-400 uppercase">
                {getTypeLabel(b.bookingType)} • {getPartnerLabel(b.bookingPartner)}
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <MapPin className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600 dark:text-slate-300 text-xs">
                {b.destinationAddress || t('address_not_provided')}
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
              {b.categoryName && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                  {b.categoryName}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {b.packageName || b.servicePackageName || t('unspecified_package')}
                </h4>
                {b.packageDescription && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {b.packageDescription}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {b.packageDurationMinutes && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {b.packageDurationMinutes} {t('unit_minutes') || 'phút'}
                  </span>
                )}
                {b.packagePrice !== undefined && b.packagePrice !== null && (
                  <span className="text-xs font-bold text-slate-900 dark:text-white bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                    {Number(b.packagePrice).toLocaleString()} đ
                  </span>
                )}
              </div>
            </div>

            {/* Package Items / Steps Breakdown */}
            {b.packageItems && b.packageItems.length > 0 && (
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                  {t('package_items_list') || 'Quy Trình & Chi Tiết Các Bước'} ({b.packageItems.length})
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {b.packageItems.map((item, idx) => (
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
                  {Number(b.serviceSubtotal || 0).toLocaleString()} đ
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('fee_distance')}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {Number(b.distanceFee || 0).toLocaleString()} đ
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t('fee_surcharge')}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {Number(b.surchargeFee || 0).toLocaleString()} đ
                </span>
              </div>
              <div>
                <span className="text-[10px] text-rose-600 uppercase font-bold block">{t('col_total_amount')}</span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                  {Number(b.totalAmount || 0).toLocaleString()} đ
                </span>
              </div>
            </div>
          </div>

          {/* Completion Photo (if any) */}
          {b.completionPhotoUrl && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[11px]">
                <Image className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('completion_photo')}</span>
              </div>
              <div className="w-36 h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 mt-2">
                <img
                  src={b.completionPhotoUrl}
                  alt="Completion proof"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Cancellation Reason (if any) */}
          {b.cancellationReason && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">{t('cancellation_reason_title')}</span>
                <span>{translateReasonOrNote(b.cancellationReason)}</span>
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
                        "{translateReasonOrNote(h.note || h.reason)}"
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
