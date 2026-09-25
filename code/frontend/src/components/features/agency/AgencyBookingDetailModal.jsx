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
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Badge } from '../../base/Badge';
import { Button } from '../../base/Button';
import { agencyService } from '../../../services/agency.service';
import { useI18nStore } from '../../../store/useI18nStore';
import { formatDateTime, formatBookingDateTime } from '../../../utils/formatters';
import { AgencyCancelBookingModal } from './AgencyCancelBookingModal';

export const AgencyBookingDetailModal = ({
  isOpen,
  onClose,
  booking,
  onBookingUpdated,
  onReviewEmergency,
}) => {
  const { t, language } = useI18nStore();
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(booking);

  useEffect(() => {
    setCurrentBooking(booking);
  }, [booking]);

  const loadHistory = (bookingId) => {
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
  };

  useEffect(() => {
    const bookingId = currentBooking?.bookingId || currentBooking?.id;
    if (bookingId && isOpen) {
      loadHistory(bookingId);
    }
  }, [currentBooking, isOpen]);

  if (!booking) return null;

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatHistoryNote = (note) => {
    if (!note) return '';

    if (language === 'vi') {
      let vi = note;
      if (vi.startsWith('Staff reported emergency unavailability: ')) {
        vi = vi.replace('Staff reported emergency unavailability: ', 'Thợ báo bận đột xuất: ');
      }
      if (vi.startsWith('Studio reassigned staff from ')) {
        vi = vi.replace('Studio reassigned staff from ', 'Studio đổi thợ từ ');
        vi = vi.replace(' to ', ' sang ');
        vi = vi.replace(' (Reason: ', ' (Lý do: ');
      }
      if (vi.includes('Emergency backup reassignment due to primary staff unavailability')) {
        vi = vi.replace('Emergency backup reassignment due to primary staff unavailability', 'Đổi thợ dự phòng do thợ chính báo bận đột xuất');
      }
      if (vi.startsWith('Studio assigned primary artist: ')) {
        vi = vi.replace('Studio assigned primary artist: ', 'Studio đã phân công thợ chính: ');
        vi = vi.replace('(Assistants: ', '(Trợ lý: ');
      }
      if (vi.includes('confirmed assignment')) {
        vi = vi.replace('Artist (', 'Thợ (');
        vi = vi.replace(') confirmed assignment', ') xác nhận nhận ca');
      }
      if (vi.startsWith('Studio rejected: ')) {
        vi = vi.replace('Studio rejected: ', 'Studio từ chối: ');
      }
      if (vi === 'Created scheduled booking, reserved slot for 15 minutes for deposit payment') {
        vi = 'Tạo đơn đặt lịch hẹn trước, tạm giữ chỗ 15 phút để thanh toán cọc';
      }
      if (vi === 'Customer paid deposit successfully') {
        vi = 'Khách hàng thanh toán tiền cọc thành công';
      }
      return vi;
    }

    // language === 'en'
    let en = note;
    if (en === 'Tạo đơn đặt lịch hẹn trước, tạm giữ chỗ 15 phút để thanh toán cọc') {
      return 'Created scheduled booking, reserved slot for 15 minutes for deposit payment';
    }
    if (en === 'Khách hàng thanh toán tiền cọc thành công') {
      return 'Customer paid deposit successfully';
    }
    if (en.startsWith('Studio đã phân công thợ chính: ')) {
      en = en.replace('Studio đã phân công thợ chính: ', 'Studio assigned primary artist: ');
      en = en.replace('(Trợ lý: ', '(Assistants: ');
      return en;
    }
    if (en.startsWith('Studio đổi thợ từ ')) {
      en = en.replace('Studio đổi thợ từ ', 'Studio reassigned staff from ');
      en = en.replace(' sang ', ' to ');
      en = en.replace(' (Lý do: ', ' (Reason: ');
      en = en.replace('Đổi thợ dự phòng do thợ chính báo bận đột xuất', 'Emergency backup reassignment due to primary staff unavailability');
      return en;
    }
    if (en.startsWith('Thợ báo bận đột xuất: ')) {
      return en.replace('Thợ báo bận đột xuất: ', 'Staff reported emergency unavailability: ');
    }
    if (en.includes('xác nhận nhận ca')) {
      en = en.replace('Thợ (', 'Artist (');
      en = en.replace(') xác nhận nhận ca', ') confirmed assignment');
      return en;
    }
    if (en.startsWith('Studio từ chối: ')) {
      return en.replace('Studio từ chối: ', 'Studio rejected: ');
    }
    return en;
  };

  const parseEmergencyHistoryNote = (note) => {
    if (!note) return null;
    const isApproved = note.includes('Studio CHẤP THUẬN') || note.includes('Studio APPROVED emergency');
    const isRejected = note.includes('Studio TỪ CHỐI') || note.includes('Studio REJECTED emergency');
    const isReport = note.includes('Thợ báo bận đột xuất') || note.includes('Staff reported emergency');

    if (!isApproved && !isRejected && !isReport) return null;

    const proofMatch = note.match(/\[(?:Minh chứng|Proof):\s*(https?:\/\/[^\s\]]+)\]/i);
    const proofUrl = proofMatch ? proofMatch[1] : null;
    const cleanNote = note.replace(/\[(?:Minh chứng|Proof):\s*https?:\/\/[^\s\]]+\]/gi, '').trim();

    let type = 'report';
    let badgeLabel = t('dispatch_emergency_reported_badge');
    let badgeVariant = 'warning';

    if (isApproved) {
      type = 'approved';
      badgeLabel = t('dispatch_emergency_approved_badge');
      badgeVariant = 'success';
    } else if (isRejected) {
      type = 'rejected';
      badgeLabel = t('dispatch_emergency_rejected_badge');
      badgeVariant = 'danger';
    }

    return { type, badgeLabel, badgeVariant, cleanNote, proofUrl };
  };


  const statusMap = {
    PENDING_DEPOSIT: { variant: 'pending', label: t('status_pending_deposit') },
    REQUESTED: { variant: 'warning', label: t('status_requested') },
    PENDING_AGENCY_DISPATCH: { variant: 'orange', label: t('status_pending_agency_dispatch') },
    AGENCY_ASSIGNED: { variant: 'indigo', label: t('status_agency_assigned') },
    ACCEPTED: { variant: 'blue', label: t('status_accepted') },
    CONFIRMED: { variant: 'teal', label: t('status_confirmed') },
    ON_THE_WAY: { variant: 'purple', label: t('status_on_the_way') },
    ARRIVED: { variant: 'info', label: t('status_arrived') },
    IN_PROGRESS: { variant: 'pink', label: t('status_in_progress') },
    COMPLETED: { variant: 'success', label: t('status_completed') },
    PAID_OUT: { variant: 'active', label: t('status_paid_out') },
    CANCELLED: { variant: 'danger', label: t('status_cancelled') },
    CANCELLED_EXPIRED: { variant: 'inactive', label: t('status_cancelled_expired') },
    DISPUTED: { variant: 'rejected', label: t('status_disputed') },
    PENDING: { variant: 'pending', label: t('status_pending') },
  };

  const getStatusBadge = (status) => {
    const s = statusMap[status] || { variant: 'default', label: status || '—' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const currentStatus = currentBooking?.bookingStatus || currentBooking?.status;
  const isTerminated = ['CANCELLED', 'CANCELLED_EXPIRED', 'COMPLETED', 'REFUNDED'].includes(currentStatus);
  const canCancel = currentStatus === 'PENDING_AGENCY_DISPATCH' || currentStatus === 'AGENCY_ASSIGNED';

  const handleCancelSuccess = (reason) => {
    const updated = {
      ...currentBooking,
      bookingStatus: 'CANCELLED',
      status: 'CANCELLED',
      cancellationReason: reason,
      needsEmergencyReassignment: false,
      emergencyReason: null,
    };
    setCurrentBooking(updated);
    const bookingId = currentBooking?.bookingId || currentBooking?.id;
    if (bookingId) {
      loadHistory(bookingId);
    }
    if (onBookingUpdated) {
      onBookingUpdated(updated);
    }
  };

  const cleanEmergencyReason = (reason) => {
    if (!reason) return '';
    return reason.replace(/^\[[^\]]*\]\s*/, '');
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span>{t('booking_detail_title')}</span>
          <span className="text-xs font-mono bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 px-2 py-0.5 rounded-md font-bold">
            {currentBooking?.bookingCode || booking?.bookingCode}
          </span>
          {getStatusBadge(currentBooking?.bookingStatus || currentBooking?.status)}
        </div>
      }
      footer={
        canCancel ? (
          <div className="flex items-center justify-end w-full">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCancelModalOpen(true)}
              className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 font-semibold px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/40 transition-all cursor-pointer"
            >
              <XCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>{t('btn_cancel_booking')}</span>
            </Button>
          </div>
        ) : null
      }
      maxWidth="max-w-4xl"
      minHeight="min-h-[65vh]"
    >
      <div className="space-y-6">
        {(currentBooking?.needsEmergencyReassignment || booking?.needsEmergencyReassignment) && !isTerminated && (() => {
          const staffList = (currentBooking?.assignedStaff || booking?.assignedStaff || [])
            .filter((s) => s.status !== 'REPLACED');
          const emergencyStaffList = staffList.filter((s) => s.status === 'EMERGENCY_CANCELLED');
          const currentStaffName = currentBooking?.staffName || booking?.staffName;
          let latestEmergencyStaff = null;
          if (currentStaffName) {
            latestEmergencyStaff = emergencyStaffList.find((s) => s.staffName === currentStaffName);
          }
          if (!latestEmergencyStaff && emergencyStaffList.length > 0) {
            latestEmergencyStaff = emergencyStaffList[emergencyStaffList.length - 1];
          }

          const bannerReason =
            cleanEmergencyReason(latestEmergencyStaff?.cancellationReason) ||
            cleanEmergencyReason(currentBooking?.emergencyReason || booking?.emergencyReason);

          const bannerProofUrl =
            latestEmergencyStaff?.proofDocumentUrl ||
            currentBooking?.emergencyProofUrl ||
            currentBooking?.proofDocumentUrl ||
            booking?.emergencyProofUrl ||
            booking?.proofDocumentUrl;

          return (
          <div className="p-4 rounded-xl border-2 border-red-600 bg-red-50 dark:bg-red-950/80 shadow-xs flex flex-col gap-2.5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-extrabold text-red-700 dark:text-red-300 text-sm uppercase tracking-wide">
                  {t('dispatch_emergency_alert_banner')}
                </p>
                <p className="mt-1 text-slate-900 dark:text-slate-100 font-semibold text-xs leading-relaxed">
                  {bannerReason}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                  {bannerProofUrl && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800">
                      <img
                        src={bannerProofUrl}
                        alt="Minh chứng báo bận"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90"
                        onClick={() => window.open(bannerProofUrl, '_blank')}
                      />
                      <div className="text-xs space-y-0.5">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {t('proof_document_label') || 'Ảnh minh chứng sự cố'}:
                        </span>
                        <a
                          href={bannerProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-red-600 dark:text-red-400 underline font-bold hover:text-red-700 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {t('proof_document_view_full') || 'Xem ảnh gốc'}
                        </a>
                      </div>
                    </div>
                  )}

                  {onReviewEmergency && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        onClose();
                        onReviewEmergency(currentBooking || booking);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs font-bold shrink-0"
                    >
                      <ShieldAlert className="w-4 h-4 mr-1.5" />
                      <span>{t('dispatch_btn_review_emergency')}</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

        {/* Core Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer & Package */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('field_customer_info')}
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="font-bold">{booking.customerName || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="font-semibold">{booking.customerPhone || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <FileText className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="font-bold text-rose-700 dark:text-rose-300 text-sm">
                  {booking.servicePackageName || booking.packageName || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Schedule & Staff */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('field_schedule_staff')}
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="font-semibold">
                  {booking.scheduledStartTime
                    ? formatDateTime(booking.scheduledStartTime)
                    : formatBookingDateTime(booking.startTime, booking.bookingDate) || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="font-medium">
                  {booking.scheduledEndTime
                    ? formatDateTime(booking.scheduledEndTime)
                    : formatBookingDateTime(booking.endTime, booking.bookingDate) || '—'}
                </span>
              </div>

              {(() => {
                const staffList = (currentBooking?.assignedStaff || booking?.assignedStaff || [])
                  .filter((s) => s.status !== 'REPLACED');
                
                // 1. Identify primary MUA
                let primaryStaff = staffList.find(
                  (s) => s.role === 'PRIMARY_MUA' && (!s.status || s.status === 'ACTIVE')
                );
                if (!primaryStaff) {
                  const currentStaffName = currentBooking?.staffName || booking?.staffName;
                  if (currentStaffName) {
                    primaryStaff = staffList.find(
                      (s) => s.role === 'PRIMARY_MUA' && s.staffName === currentStaffName
                    );
                  }
                  if (!primaryStaff) {
                    const emergencyPrimaryList = staffList.filter(
                      (s) => s.role === 'PRIMARY_MUA' && s.status === 'EMERGENCY_CANCELLED'
                    );
                    primaryStaff = emergencyPrimaryList[emergencyPrimaryList.length - 1];
                  }
                }
                const fallbackPrimaryName = currentBooking?.staffName || booking?.staffName;
                const fallbackPrimaryPhone = currentBooking?.staffPhone || booking?.staffPhone;

                // 2. Identify assistant MUAs
                const assistantList = staffList.filter(
                  (s) => s.role === 'ASSISTANT_MUA' && (!s.status || s.status === 'ACTIVE')
                );

                const hasPrimary = primaryStaff || fallbackPrimaryName;
                const hasAssistants = assistantList.length > 0;

                if (!hasPrimary && !hasAssistants) {
                  return (
                    <div className="flex items-center gap-2 text-slate-400 italic text-xs pt-1">
                      <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{t('unassigned_staff')}</span>
                    </div>
                  );
                }

                return (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                      {t('dispatch_assigned_staff_title')}
                    </span>
                    <div className="space-y-1">
                      {/* Primary MUA */}
                      {primaryStaff ? (
                        <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                          <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                            <User className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span className="font-bold">{primaryStaff.staffName}</span>
                            {primaryStaff.staffPhone && (
                              <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                ({primaryStaff.staffPhone})
                              </span>
                            )}
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
                        <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                          <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                            <User className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span className="font-bold">{fallbackPrimaryName}</span>
                            {fallbackPrimaryPhone && (
                              <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                ({fallbackPrimaryPhone})
                              </span>
                            )}
                          </div>
                          <Badge variant="gold" size="sm">
                            {t('dispatch_badge_primary')}
                          </Badge>
                        </div>
                      ) : null}

                      {/* Assistant MUA(s) */}
                      {assistantList.map((assistant) => (
                        <div
                          key={assistant.id || assistant.staffId}
                          className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40"
                        >
                          <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                            <User className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                            <span className="font-bold">{assistant.staffName}</span>
                            {assistant.staffPhone && (
                              <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                ({assistant.staffPhone})
                              </span>
                            )}
                          </div>
                          <Badge variant="purple" size="sm">
                            {t('dispatch_badge_assistant')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Service Package Details Section */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold uppercase text-xs">
              <Package className="w-4 h-4 text-rose-600" />
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
              <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{t('col_total_amount')}</div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {formatCurrency(booking.totalAmount)}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                <span>{t('col_staff_commission')}</span>
                <span className="font-mono text-[10px] text-slate-500">
                  ({booking.staffCommissionRate || 0}%)
                </span>
              </div>
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {formatCurrency(booking.estimatedStaffCommission)}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{t('col_studio_net')}</div>
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
                  {(() => {
                    const note = item.note || item.notes;
                    const emergencyInfo = parseEmergencyHistoryNote(note);

                    if (emergencyInfo) {
                      return (
                        <div className="mt-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={emergencyInfo.badgeVariant} size="sm">
                              {emergencyInfo.badgeLabel}
                            </Badge>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              {emergencyInfo.type === 'approved'
                                ? t('emergency_history_approved_title')
                                : emergencyInfo.type === 'rejected'
                                ? t('emergency_history_rejected_title')
                                : t('emergency_history_reported_title')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                            {formatHistoryNote(emergencyInfo.cleanNote)}
                          </p>
                          {emergencyInfo.proofUrl && (
                            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 w-fit">
                              <img
                                src={emergencyInfo.proofUrl}
                                alt="Minh chứng"
                                className="w-10 h-10 object-cover rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90"
                                onClick={() => window.open(emergencyInfo.proofUrl, '_blank')}
                              />
                              <div className="text-[11px] space-y-0.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                  {t('proof_document_label') || 'Ảnh minh chứng sự cố'}
                                </span>
                                <a
                                  href={emergencyInfo.proofUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-rose-600 dark:text-rose-400 underline font-semibold inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>{t('proof_document_view_full') || 'Xem ảnh gốc'}</span>
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <>
                        {item.action && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.action}
                          </p>
                        )}
                        {note && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 italic">
                            "{formatHistoryNote(note)}"
                          </p>
                        )}
                      </>
                    );
                  })()}
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

    <AgencyCancelBookingModal
      isOpen={cancelModalOpen}
      onClose={() => setCancelModalOpen(false)}
      booking={currentBooking}
      onSuccess={handleCancelSuccess}
    />
    </>
  );
};
