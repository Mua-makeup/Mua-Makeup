import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  MapPin,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Badge } from '../../base/Badge';
import { ConfirmDialog } from '../../base/ConfirmDialog';
import { useI18nStore } from '../../../store/useI18nStore';
import { agencyService } from '../../../services/agency.service';
import { parseApiError } from '../../../utils/error';
import { formatBookingDateTime } from '../../../utils/formatters';

export const StaffAssignmentMatrixModal = ({ isOpen, onClose, booking, onSuccess }) => {
  const { t } = useI18nStore();
  const [loading, setLoading] = useState(false);
  const [matrixData, setMatrixData] = useState(null);
  const [primaryStaffId, setPrimaryStaffId] = useState(null);
  const [assistantStaffIds, setAssistantStaffIds] = useState([]);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'qualified' | 'unqualified'

  // Helper: check if a staff is fully qualified for this booking
  const isStaffQualified = (s) => {
    if (s?.hasReportedBusy) return false;
    return Boolean(
      (s?.isFullyQualified ?? s?.fullyQualified) ||
      (s?.hasShift && s?.hasPackage && s?.hasStyle && s?.hasCalendarFree)
    );
  };

  // Reject view states
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  const bookingId = booking?.bookingId || booking?.id;

  useEffect(() => {
    if (isOpen && bookingId) {
      loadMatrix();
    } else {
      resetState();
    }
  }, [isOpen, bookingId]);

  const resetState = () => {
    setMatrixData(null);
    setPrimaryStaffId(null);
    setAssistantStaffIds([]);
    setDispatchNotes('');
    setErrorMsg('');
    setFilterTab('all');
    setIsSubmitting(false);
    setShowConfirmModal(false);
    setShowRejectForm(false);
    setRejectReason('');
    setRejectNote('');
  };

  const loadMatrix = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await agencyService.getStaffMatrix(bookingId);
      const data = res?.data || res;
      setMatrixData(data);

      // Pre-select existing assignments ONLY IF they are currently qualified
      if (data?.staffList) {
        const existingPrimary = data.staffList.find(
          (s) => s.currentRole === 'PRIMARY_MUA' && isStaffQualified(s)
        );
        setPrimaryStaffId(existingPrimary ? existingPrimary.staffId : null);

        const existingAssistants = data.staffList
          .filter((s) => s.currentRole === 'ASSISTANT_MUA' && Boolean(s.hasShift && s.hasCalendarFree))
          .map((s) => s.staffId);
        setAssistantStaffIds(existingAssistants);
      }
    } catch (err) {
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPrimary = (staffId) => {
    const target = matrixData?.staffList?.find((s) => s.staffId === staffId);
    if (!target || !isStaffQualified(target)) return;

    setPrimaryStaffId(staffId);
    // If this staff was previously selected as assistant, remove from assistants
    setAssistantStaffIds((prev) => prev.filter((id) => id !== staffId));
    setErrorMsg('');
  };

  const handleToggleAssistant = (staffId) => {
    if (staffId === primaryStaffId) return;

    if (assistantStaffIds.includes(staffId)) {
      setAssistantStaffIds((prev) => prev.filter((id) => id !== staffId));
      setErrorMsg('');
      return;
    }

    const target = matrixData?.staffList?.find((s) => s.staffId === staffId);
    if (!target || !target.hasShift || !target.hasCalendarFree) {
      setErrorMsg(t('dispatch_err_unqualified_assistant'));
      return;
    }

    if (assistantStaffIds.length >= 2) {
      setErrorMsg(t('dispatch_err_max_assistants'));
      return;
    }
    setAssistantStaffIds((prev) => [...prev, staffId]);
    setErrorMsg('');
  };

  const handleInitiateDispatch = () => {
    if (!primaryStaffId) {
      setErrorMsg(t('dispatch_err_select_primary') || 'Vui lòng chọn 1 thợ chính đủ điều kiện');
      return;
    }

    const selectedPrimary = matrixData?.staffList?.find((s) => s.staffId === primaryStaffId);
    if (!selectedPrimary || !isStaffQualified(selectedPrimary)) {
      setErrorMsg(t('dispatch_err_unqualified_primary'));
      setPrimaryStaffId(null);
      return;
    }

    const invalidAssistant = assistantStaffIds.find((id) => {
      const ast = matrixData?.staffList?.find((s) => s.staffId === id);
      return !ast || !ast.hasShift || !ast.hasCalendarFree;
    });
    if (invalidAssistant) {
      setErrorMsg(t('dispatch_err_unqualified_assistant'));
      setAssistantStaffIds((prev) => prev.filter((id) => {
        const ast = matrixData?.staffList?.find((s) => s.staffId === id);
        return Boolean(ast && ast.hasShift && ast.hasCalendarFree);
      }));
      return;
    }

    setErrorMsg('');
    setShowConfirmModal(true);
  };

  const handleExecuteDispatch = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await agencyService.assignStaff(bookingId, {
        primaryStaffId,
        assistantStaffIds,
        dispatchNotes: dispatchNotes.trim() || undefined,
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

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setErrorMsg(t('dispatch_reject_reason_placeholder'));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await agencyService.rejectDispatchBooking(bookingId, {
        rejectionReason: rejectReason.trim(),
        rejectionNote: rejectNote.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      setErrorMsg(parsed.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={showRejectForm ? t('dispatch_reject_title') : t('dispatch_modal_title')}
      subtitle={showRejectForm ? booking?.bookingCode : t('dispatch_modal_subtitle')}
      size="5xl"
      height="h-[90vh] max-h-[90vh]"
      footer={
        showRejectForm ? (
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                setShowRejectForm(false);
                setErrorMsg('');
              }}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleConfirmReject}
              isLoading={isSubmitting}
            >
              {t('dispatch_reject_confirm_btn')}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setShowRejectForm(true);
                setErrorMsg('');
              }}
              disabled={isSubmitting || loading}
            >
              {t('dispatch_btn_reject')}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleInitiateDispatch}
              disabled={!primaryStaffId || isSubmitting || loading}
              isLoading={isSubmitting}
            >
              {t('dispatch_btn_confirm')}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-6">
        {/* Booking Brief Card */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-500/5 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-amber-700 dark:text-gold-400">
                #{booking?.bookingCode}
              </span>
              <Badge variant="purple" size="sm">
                {matrixData?.packageName || booking?.servicePackageName || booking?.packageName || t('package_label')}
              </Badge>
              {matrixData?.styleName && (
                <Badge variant="pink" size="sm">
                  {matrixData.styleName}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-gold-400" />
              <span>{formatBookingDateTime(booking?.startTime, booking?.bookingDate)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <span className="line-clamp-1">{booking?.destinationAddress}</span>
          </div>

          {matrixData?.needsEmergencyReassignment && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
              <span>
                <strong>{t('dispatch_emergency_reason_label')}</strong> {matrixData.emergencyReason}
              </span>
            </div>
          )}
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
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 dark:text-gold-400" />
            <p className="text-xs">{t('loading')}</p>
          </div>
        ) : showRejectForm ? (
          /* REJECT FORM VIEW */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('dispatch_reject_reason')} <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                {[
                  t('dispatch_reject_reason_full'),
                  t('dispatch_reject_reason_outside'),
                  t('dispatch_reject_reason_skill'),
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setRejectReason(reason);
                      setErrorMsg('');
                    }}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-colors ${
                      rejectReason === reason
                        ? 'border-rose-300 dark:border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-200 font-medium'
                        : 'border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('dispatch_reject_reason_placeholder')}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-rose-500 focus:outline-none shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('dispatch_reject_note')}
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                placeholder={t('dispatch_reject_note_placeholder')}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-rose-500 focus:outline-none shadow-2xs"
              />
            </div>
          </div>
        ) : (
          /* MATRIX SELECTION VIEW */
          <div className="space-y-5">
            {/* Guide & Summary */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filterTab === 'all'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {t('dispatch_filter_all')} ({matrixData?.totalStaffCount || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('qualified')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filterTab === 'qualified'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                  }`}
                >
                  {t('dispatch_filter_qualified')} ({matrixData?.qualifiedCount || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('unqualified')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filterTab === 'unqualified'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
                  }`}
                >
                  {t('dispatch_filter_unqualified')} ({Math.max(0, (matrixData?.totalStaffCount || 0) - (matrixData?.qualifiedCount || 0))})
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span>{t('dispatch_assistants_count')}</span>
                <span className="font-bold text-amber-600 dark:text-gold-400">
                  {assistantStaffIds.length} / 2
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 max-h-[380px] overflow-y-auto shadow-xs">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 normal-case tracking-normal backdrop-blur font-semibold text-xs">
                  <tr>
                    <th className="py-3 px-4 whitespace-nowrap">{t('dispatch_table_col_staff')}</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">{t('dispatch_table_col_shift')}</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">{t('dispatch_table_col_package')}</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">{t('dispatch_table_col_style')}</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">{t('dispatch_table_col_calendar')}</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">{t('dispatch_table_col_status')}</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">{t('dispatch_table_col_primary')}</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">{t('dispatch_table_col_assistant')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(() => {
                    const displayedStaff = (matrixData?.staffList || []).filter((staff) => {
                      const qualified = isStaffQualified(staff);
                      if (filterTab === 'qualified') return qualified;
                      if (filterTab === 'unqualified') return !qualified;
                      return true;
                    });

                    if (displayedStaff.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500">
                            {t('no_data')}
                          </td>
                        </tr>
                      );
                    }

                    return displayedStaff.map((staff) => {
                      const isQualified = isStaffQualified(staff);
                      const isPrimary = primaryStaffId === staff.staffId && isQualified;
                      const isAssistant = assistantStaffIds.includes(staff.staffId);

                      return (
                        <tr
                          key={staff.staffId}
                          className={`transition-colors ${
                            staff.hasReportedBusy
                              ? 'opacity-60 bg-rose-50/20 dark:bg-rose-950/20'
                              : isPrimary
                              ? 'bg-amber-50/80 dark:bg-gold-500/10'
                              : isAssistant
                              ? 'bg-indigo-50/80 dark:bg-indigo-500/10'
                              : isQualified
                              ? 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                              : 'opacity-60 bg-slate-50/40 dark:bg-slate-900/40'
                          }`}
                        >
                          {/* Staff Info */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              {staff.staffAvatarUrl ? (
                                <img
                                  src={staff.staffAvatarUrl}
                                  alt={staff.staffName}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                  {staff.staffName?.charAt(0) || 'M'}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-slate-200 line-clamp-1">
                                  {staff.staffName}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                  {staff.staffPhone}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* 1. Shift */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {staff.hasShift ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 mx-auto" />
                            )}
                          </td>

                          {/* 2. Package */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {staff.hasPackage ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 mx-auto" />
                            )}
                          </td>

                          {/* 3. Style */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {staff.hasStyle ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 mx-auto" />
                            )}
                          </td>

                          {/* 4. Calendar */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {staff.hasCalendarFree ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 mx-auto" />
                            )}
                          </td>

                          {/* Overall Eligibility */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {staff.hasReportedBusy ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs">
                                {t('dispatch_badge_reported_busy')}
                              </span>
                            ) : isQualified ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                                {t('dispatch_badge_qualified')}
                              </span>
                            ) : (
                              <span
                                title={staff.disqualificationReason}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 cursor-help"
                              >
                                {t('dispatch_badge_unqualified')}
                              </span>
                            )}
                          </td>

                          {/* Select Primary MUA (Radio) */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <input
                              type="radio"
                              name="primaryStaff"
                              checked={isPrimary}
                              disabled={!isQualified || staff.hasReportedBusy}
                              onChange={() => {
                                if (isQualified && !staff.hasReportedBusy) {
                                  handleSelectPrimary(staff.staffId);
                                }
                              }}
                              className="w-4 h-4 text-amber-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-amber-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                            />
                          </td>

                          {/* Select Assistant MUA (Checkbox) */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isAssistant}
                              disabled={
                                staff.hasReportedBusy ||
                                isPrimary ||
                                (!isAssistant && (!staff.hasShift || !staff.hasCalendarFree)) ||
                                (!isAssistant && assistantStaffIds.length >= 2)
                              }
                              onChange={() => handleToggleAssistant(staff.staffId)}
                              className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                            />
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Notes Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('dispatch_notes')}
              </label>
              <textarea
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                rows={2}
                placeholder={t('dispatch_notes_placeholder')}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>

    {/* Pop-up Confirmation Dialog for Dispatch */}
    <ConfirmDialog
      isOpen={showConfirmModal}
      onClose={() => setShowConfirmModal(false)}
      onConfirm={handleExecuteDispatch}
      title={t('dispatch_confirm_dialog_title') || 'Xác Nhận Điều Phối Thợ'}
      message={
        <div className="space-y-3">
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs">
            {(() => {
              const primary = matrixData?.staffList?.find((s) => s.staffId === primaryStaffId);
              const primaryName = primary?.staffName || '';
              const assistantNames = assistantStaffIds
                .map((id) => matrixData?.staffList?.find((s) => s.staffId === id)?.staffName)
                .filter(Boolean);
              const assistantText = assistantNames.length > 0 ? ` cùng thợ phụ (${assistantNames.join(', ')})` : '';
              return t('dispatch_confirm_dialog_msg')
                ?.replace('{primaryName}', primaryName)
                ?.replace('{assistantText}', assistantText)
                ?.replace('{bookingCode}', booking?.bookingCode || '') ||
                `Bạn có chắc chắn muốn phân công thợ ${primaryName}${assistantText} cho đơn #${booking?.bookingCode}?`;
            })()}
          </p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">{t('col_booking_code')}:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">#{booking?.bookingCode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">{t('col_role_primary')}:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {matrixData?.staffList?.find((s) => s.staffId === primaryStaffId)?.staffName} ({matrixData?.staffList?.find((s) => s.staffId === primaryStaffId)?.staffPhone})
              </span>
            </div>
            {assistantStaffIds.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('col_role_assistant')}:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {assistantStaffIds
                    .map((id) => matrixData?.staffList?.find((s) => s.staffId === id)?.staffName)
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
            {dispatchNotes?.trim() && (
              <div className="flex justify-between items-start gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">{t('field_notes')}:</span>
                <span className="text-right text-slate-700 dark:text-slate-300 font-medium break-words">
                  {dispatchNotes}
                </span>
              </div>
            )}
          </div>
        </div>
      }
      confirmText={t('dispatch_btn_confirm')}
      cancelText={t('cancel')}
      variant="primary"
      isLoading={isSubmitting}
      zIndex="z-[10000]"
    />
    </>
  );
};
