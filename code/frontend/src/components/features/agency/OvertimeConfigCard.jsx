import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { Badge } from '../../base/Badge';
import { Modal } from '../../base/Modal';
import { Textarea } from '../../base/Textarea';
import { agencyService } from '../../../services/agency.service';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import { overtimeRuleSchema } from '../../../schemas/agency.schema';
import { useI18nStore } from '../../../store/useI18nStore';

export const OvertimeConfigCard = () => {
  const { t } = useI18nStore();
  const [ratePerHour, setRatePerHour] = useState(100000);
  const [maxOvertimeHours, setMaxOvertimeHours] = useState(4);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isNotVerified, setIsNotVerified] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setApiError(null);
    try {
      // Load rules
      const rulesRes = await agencyService.getOvertimeRules().catch((err) => {
        const errCode = err.response?.data?.errorCode;
        const errMsg = err.response?.data?.message || '';
        if (errCode === 'ERR_AGENCY_NOT_VERIFIED' || errMsg.toLowerCase().includes('not verified')) {
          setIsNotVerified(true);
        }
        return null;
      });
      const rules = rulesRes?.data || rulesRes || [];
      if (Array.isArray(rules) && rules.length > 0) {
        if (rules[0].ratePerHour) setRatePerHour(rules[0].ratePerHour);
        if (rules[0].maxOvertimeHours) setMaxOvertimeHours(rules[0].maxOvertimeHours);
      }

      // Load reports
      const reportsRes = await agencyService.getOvertimeReports().catch((err) => {
        const errCode = err.response?.data?.errorCode;
        const errMsg = err.response?.data?.message || '';
        if (errCode === 'ERR_AGENCY_NOT_VERIFIED' || errMsg.toLowerCase().includes('not verified')) {
          setIsNotVerified(true);
        } else {
          setApiError(
            !err.response || err.code === 'ERR_NETWORK'
              ? t('error_api_connection')
              : errMsg || err.message
          );
        }
        return null;
      });
      const repList =
        reportsRes?.data?.content ||
        reportsRes?.data ||
        reportsRes?.content ||
        reportsRes ||
        [];
      setReports(Array.isArray(repList) ? repList : []);
    } catch (err) {
      const errCode = err.response?.data?.errorCode;
      const errMsg = err.response?.data?.message || err.message || '';
      if (errCode === 'ERR_AGENCY_NOT_VERIFIED' || errMsg.toLowerCase().includes('not verified')) {
        setIsNotVerified(true);
        setApiError(null);
      } else {
        setApiError(
          !err.response || err.code === 'ERR_NETWORK'
            ? t('error_api_connection')
            : errMsg
        );
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveRule = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validation = overtimeRuleSchema.safeParse({
      ratePerHour: Number(ratePerHour),
      maxOvertimeHours: Number(maxOvertimeHours),
    });

    if (!validation.success) {
      setError(validation.error.errors[0]?.message || t('invalid_data'));
      return;
    }

    setIsLoading(true);
    try {
      await agencyService.createOrUpdateOvertimeRule({
        ratePerHour: Number(ratePerHour),
        maxOvertimeHours: Number(maxOvertimeHours),
      });
      setSuccess(t('save_success'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || t('error_general'));
    } finally {
      setIsLoading(false);
    }
  };

  const openReview = (report, action) => {
    setSelectedReport(report);
    setReviewAction(action);
    setReviewNote('');
    setIsReviewModalOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!selectedReport) return;
    setIsLoading(true);
    try {
      await agencyService.reviewOvertimeReport(selectedReport.id, {
        status: reviewAction,
        reviewNote: reviewNote.trim() || undefined,
      });
      setIsReviewModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || t('error_general'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Real API Error Alert */}
      {apiError && !isNotVerified && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold text-sm">
              {apiError.toLowerCase().includes('connect') || apiError.toLowerCase().includes('network')
                ? t('error_api_connection')
                : t('error_system_notice')}
            </strong>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400 font-mono">
              {apiError}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadData}>
              {t('retry')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setApiError(null)}>
              {t('close')}
            </Button>
          </div>
        </div>
      )}

      {/* Unverified Notice */}
      {isNotVerified && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center gap-3 text-amber-900 dark:text-amber-200 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span>{t('overtime_pending_verification_desc')}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl font-medium">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Cấu hình Quy tắc Overtime */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/50">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('overtime_rules')}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('overtime_sub')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveRule} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <Input
            label={t('overtime_rate_per_hour')}
            type="number"
            min="10000"
            step="10000"
            required
            value={ratePerHour}
            onChange={(e) => setRatePerHour(e.target.value)}
            helperText={t('overtime_rate_per_hour_helper')}
          />

          <Input
            label={t('overtime_max_hours')}
            type="number"
            min="1"
            max="12"
            required
            value={maxOvertimeHours}
            onChange={(e) => setMaxOvertimeHours(e.target.value)}
            helperText={t('overtime_max_hours_helper')}
          />

          <div>
            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              {t('save')}
            </Button>
          </div>
        </form>
      </div>

      {/* Bảng Xét Duyệt Báo Cáo Overtime Từ Thợ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('overtime_reports')} ({reports.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('overtime_sub')}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="px-5 py-3">{t('col_staff_name')}</th>
                <th className="px-5 py-3">{t('overtime_col_booking_time')}</th>
                <th className="px-5 py-3">{t('overtime_col_incurred')}</th>
                <th className="px-5 py-3">{t('overtime_col_reason')}</th>
                <th className="px-5 py-3">{t('status')}</th>
                <th className="px-5 py-3 text-right">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                    {t('empty_reports_msg')}
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900 dark:text-white block">{r.staffName || `${t('staff_label')} #${r.staffId}`}</span>
                      <span className="text-xs text-slate-400 font-mono">Staff ID: {r.staffId}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 block">{t('booking_label')} #{r.bookingId}</span>
                      <span className="text-slate-400 font-mono">{formatDateTime(r.createdAt)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">+{r.actualOvertimeMinutes} {t('unit_minutes')}</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">{formatCurrency(r.calculatedAmount)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs max-w-xs">
                      <p className="text-slate-600 dark:text-slate-400 truncate" title={r.reason}>
                        {r.reason || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      {r.status === 'PENDING' && <Badge variant="pending">{t('status_pending')}</Badge>}
                      {r.status === 'APPROVED' && <Badge variant="active">{t('status_verified')}</Badge>}
                      {r.status === 'REJECTED' && <Badge variant="rejected">{t('status_rejected')}</Badge>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {r.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={CheckCircle2}
                            onClick={() => openReview(r, 'APPROVED')}
                          >
                            {t('action_approve')}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            icon={XCircle}
                            onClick={() => openReview(r, 'REJECTED')}
                          >
                            {t('action_reject')}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Duyệt / Từ chối Overtime */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>
              {reviewAction === 'APPROVED' ? t('action_approve') : t('action_reject')}
            </span>
          </div>
        }
        maxWidth="max-w-md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsReviewModalOpen(false)}
              disabled={isLoading}
            >
              {t('cancel')}
            </Button>
            <Button
              variant={reviewAction === 'APPROVED' ? 'primary' : 'danger'}
              onClick={handleConfirmReview}
              isLoading={isLoading}
            >
              {reviewAction === 'APPROVED' ? t('action_approve') : t('action_reject')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
            <p className="text-slate-700 dark:text-slate-300">
              {t('staff_label')} <strong className="text-slate-900 dark:text-white">{selectedReport?.staffName}</strong> • {t('booking_label')}: <strong className="text-slate-900 dark:text-white">#{selectedReport?.bookingId}</strong>
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              {t('overtime_incurred_label')}: <strong className="text-slate-900 dark:text-white">+{selectedReport?.actualOvertimeMinutes} {t('unit_minutes')}</strong> ({formatCurrency(selectedReport?.calculatedAmount)})
            </p>
            <p className="text-slate-500 dark:text-slate-400 italic mt-1">"{selectedReport?.reason}"</p>
          </div>

          <Textarea
            label={t('overtime_review_agency_notes')}
            placeholder={t('overtime_review_agency_notes_placeholder')}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
};
