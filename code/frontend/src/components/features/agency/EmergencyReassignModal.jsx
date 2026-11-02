import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Loader2,
  FileText,
  ExternalLink,
  CheckCircle2,
  User,
  UserX,
} from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Badge } from '../../base/Badge';
import { ConfirmDialog } from '../../base/ConfirmDialog';
import { useI18nStore } from '../../../store/useI18nStore';
import { agencyService } from '../../../services/agency.service';
import { parseApiError } from '../../../utils/error';
import { formatBookingDateTime } from '../../../utils/formatters';

export const EmergencyReassignModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const { t } = useI18nStore();
  const [loading, setLoading] = useState(false);
  const [matrixData, setMatrixData] = useState(null);
  const [selectedNewStaffId, setSelectedNewStaffId] = useState(null);
  const [reassignReason, setReassignReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSoloConfirmModal, setShowSoloConfirmModal] = useState(false);
  const [showCancelRefundModal, setShowCancelRefundModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const cleanEmergencyReason = (reason) => {
    if (!reason) return '';
    return reason.replace(/^\[[^\]]*\]\s*/, '');
  };

  const bookingId = booking?.bookingId || booking?.id;

  useEffect(() => {
    if (isOpen && bookingId) {
      setReassignReason(t('dispatch_default_reassign_reason'));
      loadMatrix();
    } else {
      setMatrixData(null);
      setSelectedNewStaffId(null);
      setReassignReason('');
      setErrorMsg('');
      setIsSubmitting(false);
      setShowConfirmModal(false);
      setShowSoloConfirmModal(false);
      setShowCancelRefundModal(false);
    }
  }, [isOpen, bookingId, t]);

  const loadMatrix = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await agencyService.getStaffMatrix(bookingId);
      const data = res?.data || res;
      setMatrixData(data);
    } catch (err) {
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateReassign = () => {
    if (!selectedNewStaffId) {
      setErrorMsg(t('dispatch_reassign_select_new'));
      return;
    }

    const targetStaff = qualifiedStaff.find((s) => s.staffId === selectedNewStaffId);
    if (!targetStaff) {
      setErrorMsg(t('dispatch_err_reassign_unqualified'));
      setSelectedNewStaffId(null);
      return;
    }

    if (!reassignReason.trim()) {
      setErrorMsg(t('dispatch_reassign_reason'));
      return;
    }

    setErrorMsg('');
    setShowConfirmModal(true);
  };

  const handleExecuteReassign = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const oldStaffId = resolvedOldStaffId;

      await agencyService.reassignStaff(bookingId, {
        oldStaffId,
        newStaffId: selectedNewStaffId,
        reassignmentReason: reassignReason.trim(),
      });

      setShowConfirmModal(false);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      setShowConfirmModal(false);
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteProceedSolo = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await agencyService.proceedSolo(bookingId, {
        resolutionNote: reassignReason.trim() || undefined,
      });
      setShowSoloConfirmModal(false);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      setShowSoloConfirmModal(false);
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteCancelAndRefund = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const finalReason = reassignReason.trim() || 'Studio không có thợ thay thế do thợ báo bận đột xuất';
      await agencyService.rejectDispatchBooking(bookingId, {
        rejectionReason: 'Không có thợ thay thế phù hợp',
        rejectionNote: finalReason,
      });
      setShowCancelRefundModal(false);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      setShowCancelRefundModal(false);
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) return null;

  const nonReplacedStaffList = (booking?.assignedStaff || []).filter((s) => s.status !== 'REPLACED');
  const emergencyAssignments = nonReplacedStaffList.filter((s) => s.status === 'EMERGENCY_CANCELLED');
  const emergencyCancelledStaffIds = emergencyAssignments.map((s) => s.staffId);
  const activeStaffIds = nonReplacedStaffList
    .filter((s) => s.status === 'ACTIVE')
    .map((s) => s.staffId);

  const currentStaffName = booking?.staffName;
  let detectedOldStaff = null;
  if (currentStaffName) {
    detectedOldStaff = emergencyAssignments.find((s) => s.staffName === currentStaffName);
  }
  if (!detectedOldStaff && emergencyAssignments.length > 0) {
    detectedOldStaff = emergencyAssignments[emergencyAssignments.length - 1];
  }
  if (!detectedOldStaff) {
    detectedOldStaff = nonReplacedStaffList.find((s) => s.role === 'PRIMARY_MUA');
  }

  let resolvedOldStaffId = detectedOldStaff?.staffId;
  if (!resolvedOldStaffId && booking?.staffMuaId && matrixData?.staffList) {
    const staffInMatrix = matrixData.staffList.find((s) => s.muaId === booking.staffMuaId);
    if (staffInMatrix) resolvedOldStaffId = staffInMatrix.staffId;
  }

  const activeStaff = nonReplacedStaffList.find(
    (s) => s.status === 'ACTIVE' || (!s.status && s.role === 'PRIMARY_MUA')
  );

  const qualifiedStaff =
    (matrixData?.staffList || []).filter((s) => {
      if (resolvedOldStaffId && s.staffId === resolvedOldStaffId) return false;
      if (emergencyCancelledStaffIds.includes(s.staffId)) return false;
      if (activeStaffIds.includes(s.staffId)) return false;
      if (s.currentRole || s.hasReportedBusy || !s.hasCalendarFree) return false;

      return (
        (s.isFullyQualified ?? s.fullyQualified) ||
        (s.hasShift && s.hasPackage && s.hasStyle && s.hasCalendarFree)
      );
    });

  // Lấy danh sách thợ đã báo bận cần đổi
  const busyStaffMap = new Map();
  emergencyAssignments.forEach((a) => {
    busyStaffMap.set(a.staffId || a.muaId, {
      staffId: a.staffId || a.muaId,
      staffName: a.staffName,
      staffPhone: a.staffPhone,
      role: a.role,
      cancellationReason: a.cancellationReason || booking?.emergencyReason,
      commissionRate: a.commissionRate,
    });
  });

  if (matrixData?.staffList) {
    matrixData.staffList.forEach((s) => {
      if (s.hasReportedBusy && !busyStaffMap.has(s.staffId)) {
        busyStaffMap.set(s.staffId, {
          staffId: s.staffId,
          staffName: s.staffName,
          staffPhone: s.staffPhone,
          role: s.currentRole || 'PRIMARY_MUA',
          cancellationReason: booking?.emergencyReason,
          commissionRate: s.commissionRate,
        });
      }
    });
  }

  if (busyStaffMap.size === 0 && (booking?.needsEmergencyReassignment || booking?.emergencyReason)) {
    if (detectedOldStaff) {
      busyStaffMap.set(detectedOldStaff.staffId || 1, {
        staffId: detectedOldStaff.staffId,
        staffName: detectedOldStaff.staffName || booking?.staffName,
        staffPhone: detectedOldStaff.staffPhone || booking?.staffPhone,
        role: detectedOldStaff.role || 'PRIMARY_MUA',
        cancellationReason: booking?.emergencyReason,
        commissionRate: detectedOldStaff.commissionRate,
      });
    } else if (booking?.staffName) {
      busyStaffMap.set(booking.staffMuaId || 1, {
        staffId: booking.staffMuaId,
        staffName: booking.staffName,
        staffPhone: booking.staffPhone,
        role: 'PRIMARY_MUA',
        cancellationReason: booking.emergencyReason,
        commissionRate: null,
      });
    }
  }

  const busyStaffList = Array.from(busyStaffMap.values());

  // Tính toán % hoa hồng chuyển giao khi để 1 thợ làm hết
  const emergencyCommissionRate = emergencyAssignments.reduce(
    (sum, s) => sum + (Number(s.commissionRate) || 0),
    0
  );
  const activeStaffBaseRate = Number(activeStaff?.commissionRate) || 70;
  const soloTotalRate = Math.min(100, activeStaffBaseRate + emergencyCommissionRate);
  const totalBookingAmount = booking?.totalAmount ? Number(booking.totalAmount) : 0;
  const soloTotalAmount = totalBookingAmount > 0
    ? Math.round((totalBookingAmount * soloTotalRate) / 100)
    : 0;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('dispatch_reassign_modal_title')}
      subtitle={t('dispatch_reassign_modal_subtitle')}
      size="lg"
    >
      <div className="space-y-5">
        {/* Emergency Alert Header */}
        <div className="rounded-xl border-2 border-red-600 bg-red-50 dark:bg-red-950/80 p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-extrabold text-sm uppercase tracking-wide">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span>{t('dispatch_emergency_alert_title')}</span>
          </div>

          {/* Danh Sách Thợ Đã Báo Bận */}
          {busyStaffList.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <UserX className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                {t('dispatch_busy_staff_card_title') || 'Thợ Đã Báo Bận (Cần Thay Thế)'}:
              </span>
              <div className="space-y-1.5">
                {busyStaffList.map((st) => (
                  <div
                    key={st.staffId}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
                        {st.staffName?.charAt(0) || 'M'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {st.staffName}
                          </span>
                          <Badge variant={st.role === 'PRIMARY_MUA' ? 'gold' : 'neutral'} size="sm">
                            {st.role === 'PRIMARY_MUA' ? t('dispatch_badge_primary') : t('dispatch_badge_assistant')}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {st.staffPhone}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      {t('dispatch_badge_reported_busy')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-slate-900 dark:text-white font-semibold leading-relaxed pt-1 border-t border-red-200 dark:border-red-800">
            <p>
              <strong className="text-red-800 dark:text-red-200">{t('dispatch_emergency_reason_label')}</strong>{' '}
              {cleanEmergencyReason(booking.emergencyReason) || t('dispatch_emergency_fallback_reason')}
            </p>
          </div>

          {/* Incident / Emergency Proof Document */}
          {(() => {
            const proofUrl = booking.emergencyProofUrl || matrixData?.emergencyProofUrl || booking.proofDocumentUrl || (booking.assignedStaff || []).find((s) => s.proofDocumentUrl)?.proofDocumentUrl;
            if (!proofUrl) return null;
            return (
              <div className="pt-2 border-t border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-red-600" />
                    {t('proof_document_label') || 'Ảnh minh chứng sự cố'}:
                  </span>
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 underline flex items-center gap-1 font-bold"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t('proof_document_view_full') || 'Xem ảnh gốc'}
                  </a>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-red-300 dark:border-red-800 bg-slate-900/5 dark:bg-slate-900 w-full h-60 sm:h-64 flex items-center justify-center group shadow-xs">
                  <img
                    src={proofUrl}
                    alt="Minh chứng báo bận"
                    className="w-full h-full object-cover object-center cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
                    onClick={() => window.open(proofUrl, '_blank')}
                  />
                </div>
              </div>
            );
          })()}

          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-800 dark:text-slate-200 font-semibold">
            <span className="font-mono text-red-700 dark:text-red-400 font-bold">#{booking.bookingCode}</span>
            <span>•</span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              {formatBookingDateTime(booking.startTime, booking.bookingDate)}
            </span>
          </div>
        </div>

        {/* Global Error Notice */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500 dark:text-gold-400" />
            <p className="text-xs">{t('loading')}</p>
          </div>
        ) : (
          /* Selection Screen */
          <div className="space-y-4">
            {/* Solo Option Banner if activeStaff exists */}
            {activeStaff && (
              <div className="rounded-xl border-2 border-emerald-500/80 bg-emerald-50/70 dark:bg-emerald-950/40 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t('proceed_solo_card_title')}</span>
                  </div>
                  <Badge variant="success" size="sm">
                    {t('solo_receive_full_commission', { rate: soloTotalRate }) || `Nhận trọn ${soloTotalRate}% hoa hồng`}
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {t('proceed_solo_card_desc')}
                </p>
                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {activeStaff.staffName || booking.staffName}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-mono">
                          {activeStaff.staffPhone || booking.staffPhone || ''}
                        </span>
                      </div>
                    </div>
                    <Badge variant="gold" size="sm">
                      {t('dispatch_badge_primary')}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900/60 flex flex-wrap items-center justify-between text-xs gap-2">
                    <span className="text-slate-600 dark:text-slate-400">
                      {t('solo_artist_label') || 'Hoa hồng thợ solo'}: <strong className="text-slate-900 dark:text-white">{activeStaffBaseRate}%</strong>
                      {emergencyCommissionRate > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold"> + {emergencyCommissionRate}% ({t('transferred_from_busy_staff') || 'chuyển từ thợ bận'})</span>
                      )}
                    </span>
                    <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-xs">
                      = {soloTotalRate}% {soloTotalAmount > 0 ? `(${soloTotalAmount.toLocaleString('vi-VN')} đ)` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {qualifiedStaff.length > 0 ? t('dispatch_reassign_select_new') : (t('or_select_replacement') || 'Hoặc chọn thợ thay thế:')}
              </label>

              {qualifiedStaff.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                  <p>{t('dispatch_no_qualified_staff')}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {qualifiedStaff.map((staff) => {
                    const isSelected = selectedNewStaffId === staff.staffId;
                    return (
                      <div
                        key={staff.staffId}
                        onClick={() => {
                          setSelectedNewStaffId(staff.staffId);
                          setErrorMsg('');
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/80 dark:bg-gold-500/10 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="newStaff"
                            checked={isSelected}
                            onChange={() => setSelectedNewStaffId(staff.staffId)}
                            className="w-4 h-4 text-amber-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-amber-500"
                          />
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                              {staff.staffName}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              {staff.staffPhone}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Badge variant="success" size="sm">{t('qualified_badge') || 'Đủ tiêu chuẩn'}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('dispatch_reassign_reason')}
              </label>
              <textarea
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                rows={2}
                placeholder={t('dispatch_reassign_reason_placeholder') || 'Nhập lý do đổi thợ dự phòng hoặc ghi chú xử lý...'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
                  {t('cancel')}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCancelRefundModal(true)}
                  disabled={isSubmitting || loading}
                  isLoading={isSubmitting}
                  className="border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 font-bold cursor-pointer shadow-xs"
                >
                  <UserX className="w-4 h-4 mr-1.5 text-rose-600 dark:text-rose-400" />
                  <span>{t('btn_cancel_and_refund')}</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {activeStaff && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowSoloConfirmModal(true)}
                    disabled={isSubmitting || loading}
                    isLoading={isSubmitting}
                    className="border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-bold cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                    <span>{t('btn_proceed_solo')}</span>
                  </Button>
                )}

                {qualifiedStaff.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleInitiateReassign}
                    disabled={!selectedNewStaffId || isSubmitting || loading}
                    isLoading={isSubmitting}
                  >
                    {t('dispatch_reassign_confirm_btn')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>

    {/* Pop-up Confirmation Dialog */}
    <ConfirmDialog
      isOpen={showConfirmModal}
      onClose={() => setShowConfirmModal(false)}
      onConfirm={handleExecuteReassign}
      title={t('dispatch_reassign_confirm_title') || 'Xác Nhận Đổi Thợ Khẩn Cấp'}
      message={
        <div className="space-y-3">
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs">
            {t('dispatch_reassign_confirm_msg')
              ?.replace(
                '{staffName}',
                qualifiedStaff.find((s) => s.staffId === selectedNewStaffId)?.staffName || ''
              )
              ?.replace('{bookingCode}', booking?.bookingCode || '') ||
              `Bạn có chắc chắn muốn đổi sang thợ thay thế ${
                qualifiedStaff.find((s) => s.staffId === selectedNewStaffId)?.staffName
              } cho đơn hàng #${booking?.bookingCode} không?`}
          </p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">{t('col_booking_code')}:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">#{booking?.bookingCode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">{t('dispatch_replacement_staff')}:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {qualifiedStaff.find((s) => s.staffId === selectedNewStaffId)?.staffName} ({qualifiedStaff.find((s) => s.staffId === selectedNewStaffId)?.staffPhone})
              </span>
            </div>
            {reassignReason && (
              <div className="flex justify-between items-start gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">{t('dispatch_reassign_reason')}:</span>
                <span className="text-right text-slate-700 dark:text-slate-300 font-medium break-words">
                  {reassignReason}
                </span>
              </div>
            )}
          </div>
        </div>
      }
      confirmText={t('dispatch_reassign_confirm_btn')}
      cancelText={t('cancel')}
      variant="danger"
      isDangerous={true}
      isLoading={isSubmitting}
      zIndex="z-[10000]"
    />

    {/* Pop-up Confirmation Dialog for Solo Proceed */}
    <ConfirmDialog
      isOpen={showSoloConfirmModal}
      onClose={() => setShowSoloConfirmModal(false)}
      onConfirm={handleExecuteProceedSolo}
      title={t('confirm_proceed_solo_title') || 'Xác Nhận Để 1 Thợ Làm Hết'}
      message={
        <div className="space-y-3">
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs">
            Bạn có chắc chắn muốn để thợ{' '}
            <strong className="text-emerald-700 dark:text-emerald-400">
              {activeStaff?.staffName || booking?.staffName || 'Thợ chính'}
            </strong>{' '}
            đảm nhiệm toàn bộ ca này một mình (Solo) không?
          </p>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-emerald-900 dark:text-emerald-200 font-semibold">
              <span>{t('solo_artist_label') || 'Thợ đảm nhiệm solo:'}</span>
              <span>{activeStaff?.staffName || booking?.staffName}</span>
            </div>
            {emergencyCommissionRate > 0 && (
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>{t('transferred_from_busy_staff') || 'Chuyển từ thợ báo bận:'}</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">+{emergencyCommissionRate}%</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-white font-bold">
              <span>{t('total_artist_commission') || 'Tổng hoa hồng thợ nhận:'}</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                {soloTotalRate}% {soloTotalAmount > 0 ? `(${soloTotalAmount.toLocaleString('vi-VN')} đ)` : ''}
              </span>
            </div>
          </div>
        </div>
      }
      confirmText={t('confirm_proceed_solo_btn') || 'Xác Nhận Để 1 Thợ'}
      cancelText={t('cancel')}
      variant="success"
      confirmClassName="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
      isLoading={isSubmitting}
      zIndex="z-[10000]"
    />

    {/* Pop-up Confirmation Dialog for Cancel and Refund */}
    <ConfirmDialog
      isOpen={showCancelRefundModal}
      onClose={() => setShowCancelRefundModal(false)}
      onConfirm={handleExecuteCancelAndRefund}
      title={t('confirm_cancel_and_refund_title') || 'Xác Nhận Hủy Đơn & Hoàn Cọc Cho Khách'}
      message={
        <div className="space-y-3">
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs">
            {t('confirm_cancel_and_refund_msg')?.replace('{bookingCode}', booking?.bookingCode || '') ||
              `Do không thể bố trí thợ thay thế, bạn có chắc chắn muốn hủy đơn hàng #${booking?.bookingCode} và hoàn trả ngay 100% tiền cọc về ví khách hàng không?`}
          </p>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-rose-900 dark:text-rose-200 font-semibold">
              <span>{t('booking_label') || 'Đơn hàng'}:</span>
              <span className="font-mono font-bold">#{booking?.bookingCode}</span>
            </div>
            <div className="flex justify-between items-center text-rose-900 dark:text-rose-200">
              <span>{t('deposit_refund_to_customer') || 'Tiền cọc hoàn trả khách:'}</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">100% ({t('deposit_full_refund') || 'Toàn bộ'})</span>
            </div>
            {reassignReason && (
              <div className="flex justify-between items-start gap-2 pt-1 border-t border-rose-200 dark:border-rose-800 text-slate-600 dark:text-slate-400">
                <span className="shrink-0">{t('cancel_notes_label') || 'Ghi chú hủy:'}</span>
                <span className="text-right font-medium">{reassignReason}</span>
              </div>
            )}
          </div>
        </div>
      }
      confirmText={t('btn_cancel_and_refund') || 'Hủy Đơn & Hoàn Cọc'}
      cancelText={t('cancel')}
      variant="danger"
      isDangerous={true}
      isLoading={isSubmitting}
      zIndex="z-[10000]"
    />
    </>
  );
};
