import React, { useState } from 'react';
import {
  AlertTriangle,
  User,
  Clock,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Badge } from '../../base/Badge';
import { ConfirmDialog } from '../../base/ConfirmDialog';
import { useI18nStore } from '../../../store/useI18nStore';
import { agencyService } from '../../../services/agency.service';
import { parseApiError } from '../../../utils/error';
import { formatBookingDateTime } from '../../../utils/formatters';

const cleanEmergencyReason = (reason) => {
  if (!reason) return '';
  return reason.replace(/^\[.*?\]\s*/, '').trim();
};

export const EmergencyApprovalModal = ({
  isOpen,
  onClose,
  booking,
  onApprovedAndReassign,
  onSuccess,
}) => {
  const { t } = useI18nStore();
  const [adminReviewNote, setAdminReviewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  if (!booking) return null;

  // Identify reporting staff
  const reportingStaff = (booking.assignedStaff || []).find(
    (s) => s.status === 'EMERGENCY_CANCELLED'
  ) || (booking.assignedStaff || []).find((s) => s.role === 'PRIMARY_MUA');

  const staffName = reportingStaff?.staffName || booking.staffName || 'Thợ trang điểm';
  const staffPhone = reportingStaff?.staffPhone || booking.staffPhone || '';
  const staffRole = reportingStaff?.role === 'PRIMARY_MUA' ? t('dispatch_badge_primary') : t('dispatch_badge_assistant');
  const staffId = reportingStaff?.staffId || booking.staffMuaId;

  const proofUrl =
    booking.emergencyProofUrl ||
    booking.proofDocumentUrl ||
    reportingStaff?.proofDocumentUrl;

  const handleApprove = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await agencyService.reviewEmergencyReport(booking.id, staffId, {
        approved: true,
        adminReviewNote: adminReviewNote.trim() || undefined,
      });
      onClose();
      if (onApprovedAndReassign) {
        onApprovedAndReassign(booking);
      }
    } catch (err) {
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteReject = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await agencyService.reviewEmergencyReport(booking.id, staffId, {
        approved: false,
        adminReviewNote: adminReviewNote.trim() || undefined,
      });
      setShowRejectConfirm(false);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setShowRejectConfirm(false);
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('emergency_approval_modal_title') || 'Xét Duyệt Yêu Cầu Báo Bận Đột Xuất'}
        subtitle={t('emergency_approval_modal_subtitle') || 'Thẩm định lý do & minh chứng sự cố trước khi phê duyệt đổi thợ'}
        size="lg"
      >
        <div className="space-y-5 text-xs sm:text-sm">
          {/* Emergency Alert Banner */}
          <div className="rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-950/80 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-extrabold text-sm uppercase tracking-wide">
                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span>{t('dispatch_emergency_alert_title')}</span>
              </div>
              <Badge variant="danger" size="sm">
                #{booking.bookingCode}
              </Badge>
            </div>

            {/* Staff Info Box */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{staffName}</span>
                    <Badge variant={reportingStaff?.role === 'PRIMARY_MUA' ? 'gold' : 'purple'} size="sm">
                      {staffRole}
                    </Badge>
                  </div>
                  {staffPhone && <span className="text-slate-500 font-mono text-[11px]">{staffPhone}</span>}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1 justify-end font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{formatBookingDateTime(booking.startTime, booking.bookingDate)}</span>
                </div>
                <div className="line-clamp-1 max-w-[200px] text-slate-400 mt-0.5">
                  {booking.destinationAddress}
                </div>
              </div>
            </div>

            {/* Emergency Reason */}
            <div className="space-y-1">
              <span className="font-bold text-red-900 dark:text-red-200 block text-xs">
                {t('dispatch_emergency_reason_label')}
              </span>
              <p className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 text-slate-800 dark:text-slate-200 leading-relaxed font-medium text-xs">
                {cleanEmergencyReason(booking.emergencyReason) || t('dispatch_emergency_fallback_reason')}
              </p>
            </div>

            {/* Proof Document Preview */}
            {proofUrl && (
              <div className="pt-2 border-t border-red-200/80 dark:border-red-900/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-red-600" />
                    <span>{t('proof_document_label') || 'Ảnh minh chứng sự cố'}:</span>
                  </span>
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 underline flex items-center gap-1 font-bold"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>{t('proof_document_view_full') || 'Xem ảnh gốc'}</span>
                  </a>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-red-300 dark:border-red-800 bg-slate-900/5 dark:bg-slate-900 w-full h-56 sm:h-64 flex items-center justify-center group shadow-xs">
                  <img
                    src={proofUrl}
                    alt="Minh chứng báo bận"
                    className="w-full h-full object-cover object-center cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
                    onClick={() => window.open(proofUrl, '_blank')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Admin Review Note Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('emergency_review_note_label') || 'Ghi chú thẩm định của Studio (Tùy chọn)'}:
            </label>
            <textarea
              value={adminReviewNote}
              onChange={(e) => setAdminReviewNote(e.target.value)}
              rows={2}
              placeholder={t('emergency_review_note_placeholder') || 'Nhập chỉ đạo hoặc ghi chú phản hồi cho thợ...'}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-2xs"
            />
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRejectConfirm(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:hover:bg-red-950/40 cursor-pointer"
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              <span>{t('btn_reject_emergency') || 'Từ Chối Báo Bận'}</span>
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {t('cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                <span>{t('btn_approve_and_reassign') || 'Chấp Thuận & Đổi Thợ'}</span>
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog for Rejecting Emergency Report */}
      <ConfirmDialog
        isOpen={showRejectConfirm}
        onClose={() => setShowRejectConfirm(false)}
        onConfirm={handleExecuteReject}
        title={t('confirm_reject_emergency_title') || 'Xác Nhận Từ Chối Báo Bận'}
        message={
          t('confirm_reject_emergency_msg') ||
          'Bạn có chắc chắn muốn từ chối yêu cầu báo bận này? Thợ sẽ được khôi phục về ca trực và tiếp tục có trách nhiệm thực hiện đơn hàng.'
        }
        confirmText={t('btn_reject_emergency') || 'Từ Chối Báo Bận'}
        cancelText={t('cancel')}
        variant="danger"
        isDangerous={true}
        isLoading={isSubmitting}
      />
    </>
  );
};
