import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
} from 'lucide-react';
import { Button } from '../../base/Button';
import { Badge } from '../../base/Badge';
import { Input } from '../../base/Input';
import { Select } from '../../base/Select';
import { Modal } from '../../base/Modal';
import { Textarea } from '../../base/Textarea';
import { ConfirmDialog } from '../../base/ConfirmDialog';
import { Toast } from '../../base/Toast';
import { agencyService } from '../../../services/agency.service';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import { overtimeRuleSchema } from '../../../schemas/agency.schema';
import { useI18nStore } from '../../../store/useI18nStore';
import { TableSkeleton } from '../../base/Skeleton';


const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  return (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('data:image/') ||
    clean.startsWith('/uploads/') ||
    clean.startsWith('/api/v1/')
  );
};

export const OvertimeConfigCard = () => {
  const { t } = useI18nStore();

  // Rules State
  const [rules, setRules] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleName, setRuleName] = useState(t('overtime_rule_default_name') || 'Quy chế làm thêm giờ tiêu chuẩn');
  const [minOvertimeMinutes, setMinOvertimeMinutes] = useState(15);
  const [maxOvertimeMinutes, setMaxOvertimeMinutes] = useState(240);
  const [policyType, setPolicyType] = useState('ALLOWANCE');
  const [penaltyType, setPenaltyType] = useState('FIXED_AMOUNT');
  const [penaltyValue, setPenaltyValue] = useState(50000);
  const [isActive, setIsActive] = useState(true);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Reports State
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [customAllowance, setCustomAllowance] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [failedPreviewUrl, setFailedPreviewUrl] = useState(null);

  // Delete Rule State
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingRuleId, setTogglingRuleId] = useState(null);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isNotVerified, setIsNotVerified] = useState(false);
  const [modalError, setModalError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const policyTypeOptions = [
    { value: 'ALLOWANCE', label: t('overtime_policy_allowance') || 'Phụ cấp tăng ca (Cộng thù lao thợ)' },
    { value: 'PENALTY', label: t('overtime_policy_penalty') || 'Chế tài vi phạm (Khấu trừ phạt thợ)' },
  ];

  const penaltyTypeOptions = [
    { value: 'FIXED_AMOUNT', label: t('overtime_penalty_type_fixed') },
    { value: 'PERCENT_COMMISSION', label: t('overtime_penalty_type_percent') },
    { value: 'PER_MINUTE', label: t('overtime_penalty_type_per_minute') || 'Theo phút tăng ca (VNĐ/phút)' },
    { value: 'WARNING_ONLY', label: t('overtime_penalty_type_warning') },
  ];

  const handleOpenEdit = (rule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.ruleName || '');
    setMinOvertimeMinutes(rule.minOvertimeMinutes ?? 15);
    setMaxOvertimeMinutes(rule.maxOvertimeMinutes ?? '');
    setPolicyType(rule.policyType || 'ALLOWANCE');
    setPenaltyType(rule.penaltyType || 'FIXED_AMOUNT');
    setPenaltyValue(rule.penaltyValue !== undefined ? Number(rule.penaltyValue) : 0);
    setIsActive(rule.isActive ?? true);
    setFieldErrors({});
    setModalError('');
    setIsFormOpen(true);
  };

  const handleToggleRuleStatus = async (rule) => {
    const nextStatus = !rule.isActive;
    setTogglingRuleId(rule.id);
    try {
      await agencyService.toggleOvertimeRuleStatus(rule.id, nextStatus);
      await loadData();
      setToastMessage({
        type: 'success',
        text: nextStatus
          ? `${rule.ruleName}: ${t('status_active')}`
          : `${rule.ruleName}: ${t('status_paused')}`,
      });
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || t('error_general'),
      });
    } finally {
      setTogglingRuleId(null);
    }
  };

  const handleOpenCreate = () => {
    setEditingRuleId(null);
    setRuleName('');
    setMinOvertimeMinutes(15);
    setMaxOvertimeMinutes('');
    setPolicyType('ALLOWANCE');
    setPenaltyType('FIXED_AMOUNT');
    setPenaltyValue(50000);
    setIsActive(true);
    setFieldErrors({});
    setModalError('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRuleId(null);
    setFieldErrors({});
    setModalError('');
  };

  const loadData = async () => {
    setApiError(null);
    setIsLoading(true);
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
      const ruleList = rulesRes?.data || rulesRes || [];
      const parsedRules = Array.isArray(ruleList) ? ruleList : [];
      setRules(parsedRules);

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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveRule = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setModalError('');
    setFieldErrors({});

    const payload = {
      id: editingRuleId ? Number(editingRuleId) : undefined,
      ruleName: ruleName.trim(),
      minOvertimeMinutes: Number(minOvertimeMinutes),
      maxOvertimeMinutes:
        maxOvertimeMinutes !== '' && maxOvertimeMinutes !== null && maxOvertimeMinutes !== undefined
          ? Number(maxOvertimeMinutes)
          : null,
      penaltyType,
      policyType: penaltyType === 'WARNING_ONLY' ? 'WARNING' : policyType,
      penaltyValue: penaltyType === 'WARNING_ONLY' ? 0 : Number(penaltyValue),
      isActive: Boolean(isActive),
    };

    const validation = overtimeRuleSchema.safeParse(payload);

    if (!validation.success) {
      const formattedErrors = {};
      validation.error.issues.forEach((issue) => {
        const fieldName = issue.path[0];
        if (fieldName && !formattedErrors[fieldName]) {
          formattedErrors[fieldName] = issue.message;
        }
      });
      setFieldErrors(formattedErrors);
      setModalError(validation.error.issues[0]?.message || t('invalid_data'));
      return;
    }

    setIsSaving(true);
    try {
      await agencyService.createOrUpdateOvertimeRule(payload);

      setToastMessage({
        text: editingRuleId ? t('update_success') : t('save_success'),
        type: 'success',
      });

      // Close modal popup
      handleCloseForm();

      // Reload list
      await loadData();
    } catch (err) {
      const respData = err.response?.data?.data;
      if (respData && typeof respData === 'object') {
        setFieldErrors(respData);
      }
      const errMsg = err.response?.data?.message || err.message || t('error_general');
      setModalError(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDelete = (rule) => {
    setRuleToDelete(rule);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return;
    setIsDeleting(true);
    try {
      await agencyService.deleteOvertimeRule(ruleToDelete.id);
      setIsDeleteDialogOpen(false);
      setToastMessage({
        text: t('delete_success'),
        type: 'success',
      });

      if (editingRuleId === ruleToDelete.id) {
        handleCloseForm();
      }

      await loadData();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || t('error_general');
      setToastMessage({
        text: errMsg,
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
      setRuleToDelete(null);
    }
  };

  const openReview = (report, action) => {
    setSelectedReport(report);
    setReviewAction(action);
    setReviewNote('');
    setCustomAllowance('');
    setIsReviewModalOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!selectedReport) return;
    setIsSaving(true);
    try {
      const response = await agencyService.reviewOvertimeReport(selectedReport.id, {
        action: reviewAction,
        customPenaltyAmount: (reviewAction === 'APPROVE_ALLOWANCE' && customAllowance) ? Number(customAllowance) : undefined,
        adminNotes: reviewNote.trim() || undefined,
      });
      const reviewed = response?.data || response;
      setIsReviewModalOpen(false);
      setToastMessage({
        text: reviewAction === 'APPROVE_ALLOWANCE'
          ? (reviewed?.allowancePaymentStatus === 'PAID'
            ? (t('overtime_pay_toast_paid') || 'Đã duyệt và chuyển tiền tăng ca vào ví thợ.')
            : reviewed?.allowancePaymentStatus === 'RECONCILIATION_REQUIRED'
              ? (t('overtime_pay_toast_reconciliation') || 'Đã duyệt. Khoản tăng ca cần đối soát trước khi thanh toán.')
              : reviewed?.allowancePaymentStatus === 'NOT_APPLICABLE'
                ? (t('overtime_pay_toast_not_applicable') || 'Đã duyệt báo cáo. Không có khoản thưởng cần thanh toán.')
                : (t('overtime_pay_toast_pending') || 'Đã duyệt thưởng tăng ca. Khoản chưa thanh toán sẽ chờ ví Studio đủ số dư.'))
          : (t('update_success') || 'Đã xét duyệt báo cáo tăng ca thành công!'),
        type: 'success',
      });
      await loadData();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || t('error_general');
      setToastMessage({
        text: errMsg,
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderPenaltyDisplay = (rule) => {
    const isAllowance = rule.policyType === 'ALLOWANCE';

    if (rule.penaltyType === 'PERCENT_COMMISSION') {
      if (isAllowance) {
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono shadow-2xs">
            +{rule.penaltyValue}% {t('col_staff_commission') || 'Hoa hồng thợ'}
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 shadow-2xs font-mono">
          -{rule.penaltyValue}% {t('col_staff_commission') || 'Hoa hồng thợ'}
        </span>
      );
    }

    if (rule.penaltyType === 'FIXED_AMOUNT') {
      if (isAllowance) {
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono shadow-2xs">
            +{formatCurrency(rule.penaltyValue)}
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 shadow-2xs font-mono">
          -{formatCurrency(rule.penaltyValue)}
        </span>
      );
    }

    if (rule.penaltyType === 'PER_MINUTE') {
      if (isAllowance) {
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-mono shadow-2xs">
            +{formatCurrency(rule.penaltyValue)}{t('overtime_per_minute') || '/phút'}
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 shadow-2xs font-mono">
          -{formatCurrency(rule.penaltyValue)}{t('overtime_per_minute') || '/phút'}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
        {t('overtime_penalty_type_warning')}
      </span>
    );
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

      {/* Card Danh Sách Quy Tắc Tăng Ca */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('overtime_rules')}
              </h3>
              <Badge variant="neutral">
                {rules.length} {t('items')}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('overtime_sub')}
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            icon={Plus}
            className="shadow-xs"
          >
            {t('overtime_btn_add_new')}
          </Button>
        </div>

        {/* Bảng Danh sách Quy tắc đã lưu */}
        <div>
          {isLoading ? (
            <TableSkeleton
              columns={[
                { header: t('overtime_rule_name') },
                { header: t('overtime_threshold_label') },
                { header: t('overtime_penalty_label') },
                { header: t('status') },
                { header: t('col_actions'), align: 'right' },
              ]}
              rows={4}
              hasPagination={false}
            />
          ) : rules.length === 0 ? (
            <div className="p-8 bg-slate-50/70 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/60 rounded-2xl text-center space-y-3">
              <p className="text-xs text-slate-400 italic">
                {t('overtime_empty_rules')}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleOpenCreate}
                icon={Plus}
              >
                {t('overtime_btn_add_new')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full min-w-[700px] divide-y divide-slate-100 dark:divide-slate-800 text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300">
                  <tr className="whitespace-nowrap">
                    <th className="px-5 py-3.5 whitespace-nowrap">{t('overtime_rule_name')}</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">{t('overtime_threshold_label')}</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">{t('overtime_penalty_label')}</th>
                    <th className="px-5 py-3.5 whitespace-nowrap">{t('status')}</th>
                    <th className="px-5 py-3.5 text-right whitespace-nowrap">{t('col_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {rules.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Tên quy chế */}
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {r.ruleName}
                          </span>
                        </div>
                      </td>

                      {/* Cột Ngưỡng Quá Giờ Thiết Kế Tối Ưu & Đẹp Mắt */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50/90 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/50 w-fit shadow-2xs font-mono">
                            ≥ {r.minOvertimeMinutes} {t('unit_minutes')}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              {t('overtime_max_limit_label')}
                            </span>
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {r.maxOvertimeMinutes
                                ? `${r.maxOvertimeMinutes} ${t('unit_minutes')}`
                                : t('overtime_no_limit')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Chế tài áp dụng */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {renderPenaltyDisplay(r)}
                      </td>

                      {/* Trạng thái Toggle Switch */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={r.isActive !== false}
                            disabled={togglingRuleId === r.id}
                            onChange={() => handleToggleRuleStatus(r)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-xs"></div>
                        </label>
                      </td>

                      {/* Cột Thao tác Tối Ưu Hiện Đại */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                            title={t('btn_edit')}
                          >
                            <Edit2 className="w-4 h-4 shrink-0" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(r)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4 shrink-0" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Pop-up Thiết Lập / Chỉnh Sửa Quy Tắc */}
      <Modal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        maxWidth="max-w-xl"
        title={
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {editingRuleId ? t('overtime_form_title_edit') : t('overtime_form_title_create')}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              {t('overtime_modal_sub')}
            </p>
          </div>
        }
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseForm}
              disabled={isSaving}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              form="overtime-rule-form"
              onClick={handleSaveRule}
              variant="primary"
              className="px-6 shadow-xs"
              isLoading={isSaving}
            >
              {editingRuleId ? t('overtime_btn_update_rule') : t('overtime_btn_save_rule')}
            </Button>
          </>
        }
      >
        <form id="overtime-rule-form" onSubmit={handleSaveRule} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-xl font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
              <button
                type="button"
                onClick={() => setModalError('')}
                className="text-rose-500 hover:text-rose-700 text-xs font-semibold ml-2"
              >
                {t('close')}
              </button>
            </div>
          )}

          {/* Tên quy chế */}
          <Input
            label={t('overtime_rule_name')}
            type="text"
            required
            placeholder={t('overtime_rule_name_ph')}
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            error={fieldErrors.ruleName}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Số phút quá giờ tối thiểu */}
            <Input
              label={t('overtime_min_minutes')}
              type="number"
              min="0"
              required
              value={minOvertimeMinutes}
              onChange={(e) => setMinOvertimeMinutes(e.target.value)}
              helperText={t('overtime_min_minutes_helper')}
              error={fieldErrors.minOvertimeMinutes}
            />

            {/* Giới hạn tối đa phút */}
            <Input
              label={t('overtime_max_minutes')}
              type="number"
              min="0"
              placeholder={t('overtime_max_minutes_ph') || 'VD: 240'}
              value={maxOvertimeMinutes}
              onChange={(e) => setMaxOvertimeMinutes(e.target.value)}
              helperText={t('overtime_max_minutes_helper')}
              error={fieldErrors.maxOvertimeMinutes}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Loại chính sách */}
            <Select
              label={t('overtime_policy_type') || 'Loại Chính Sách'}
              required
              options={policyTypeOptions}
              value={policyType}
              onChange={(e) => setPolicyType(e.target.value)}
              disabled={penaltyType === 'WARNING_ONLY'}
            />

            {/* Hình thức áp dụng */}
            <Select
              label={t('overtime_penalty_type')}
              required
              options={penaltyTypeOptions}
              value={penaltyType}
              onChange={(e) => {
                setPenaltyType(e.target.value);
                if (e.target.value === 'WARNING_ONLY') {
                  setPenaltyValue(0);
                }
              }}
              error={fieldErrors.penaltyType}
            />
          </div>

          <div>
            {/* Mức phụ cấp / phạt */}
            <Input
              label={
                penaltyType === 'PERCENT_COMMISSION'
                  ? (policyType === 'ALLOWANCE' ? (t('overtime_allowance_rate_label') || 'Mức phụ cấp cộng thêm (%)') : (t('overtime_penalty_rate_label') || 'Mức phạt khấu trừ (%)'))
                  : penaltyType === 'PER_MINUTE'
                  ? (policyType === 'ALLOWANCE' ? (t('overtime_allowance_per_min_label') || 'Mức phụ cấp tính theo mỗi phút (VNĐ/phút)') : (t('overtime_penalty_per_min_label') || 'Mức phạt khấu trừ theo mỗi phút (VNĐ/phút)'))
                  : (policyType === 'ALLOWANCE' ? (t('overtime_allowance_fixed_label') || 'Mức phụ cấp cộng thêm (VNĐ)') : (t('overtime_penalty_fixed_label') || 'Mức phạt khấu trừ (VNĐ)'))
              }
              type="number"
              min="0"
              max={penaltyType === 'PERCENT_COMMISSION' ? '100' : undefined}
              step={penaltyType === 'PERCENT_COMMISSION' ? '1' : penaltyType === 'PER_MINUTE' ? '500' : '10000'}
              disabled={penaltyType === 'WARNING_ONLY'}
              required={penaltyType !== 'WARNING_ONLY'}
              value={penaltyValue}
              onChange={(e) => setPenaltyValue(e.target.value)}
              helperText={
                penaltyType === 'PERCENT_COMMISSION'
                  ? (policyType === 'ALLOWANCE'
                      ? (t('overtime_policy_allowance_percent_hint') || 'Tỷ lệ % hoa hồng được cộng thêm cho thợ')
                      : (t('overtime_policy_penalty_percent_hint') || 'Tỷ lệ % hoa hồng bị khấu trừ của thợ'))
                  : penaltyType === 'PER_MINUTE'
                  ? (policyType === 'ALLOWANCE'
                      ? (t('overtime_policy_allowance_per_min_hint') || 'Số tiền thù lao cộng thêm cho mỗi phút làm thêm giờ (Ví dụ: 1.000 đ/phút)')
                      : (t('overtime_policy_penalty_per_min_hint') || 'Số tiền phạt khấu trừ cho mỗi phút vi phạm (VNĐ/phút)'))
                  : penaltyType === 'WARNING_ONLY'
                  ? t('overtime_penalty_type_warning')
                  : (policyType === 'ALLOWANCE'
                      ? (t('overtime_policy_allowance_fixed_hint') || 'Số tiền thù lao cộng thêm cho thợ (VNĐ)')
                      : (t('overtime_policy_penalty_fixed_hint') || 'Số tiền phạt khấu trừ thợ (VNĐ)'))
              }
              error={fieldErrors.penaltyValue}
            />
          </div>
        </form>
      </Modal>

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
          <table className="w-full min-w-[850px] divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300">
              <tr className="whitespace-nowrap">
                <th className="px-5 py-3 whitespace-nowrap">{t('col_staff_name')}</th>
                <th className="px-5 py-3 whitespace-nowrap">{t('overtime_col_booking_time')}</th>
                <th className="px-5 py-3 whitespace-nowrap">{t('overtime_col_incurred')}</th>
                <th className="px-5 py-3 whitespace-nowrap">{t('overtime_col_reason')}</th>
                <th className="px-5 py-3 whitespace-nowrap">{t('status')}</th>
                <th className="px-5 py-3 text-right whitespace-nowrap">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {reports.length === 0 ? (
                <tr className="whitespace-nowrap">
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                    {t('empty_reports_msg')}
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {r.staffName || `${t('staff_label')} #${r.staffId}`}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Staff ID: {r.staffId}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 block">
                        {t('booking_label')} #{r.bookingId}
                      </span>
                      <span className="text-slate-400 font-mono">{formatDateTime(r.createdAt)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        +{r.overtimeMinutes ?? r.actualOvertimeMinutes ?? 0} {t('unit_minutes') || 'phút'}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {(r.status === 'PENDING_AGENCY_REVIEW' || r.status === 'PENDING')
                          ? `${t('overtime_estimated') || 'Dự kiến'}: ${formatCurrency(r.estimatedAllowanceAmount ?? 0)}`
                          : formatCurrency(r.penaltyAmountApplied || r.customerSurchargeAmount || 0)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs max-w-xs">
                      <p className="text-slate-700 dark:text-slate-300 font-medium" title={r.explanationText || r.reason}>
                        {r.explanationText || r.reason || '—'}
                      </p>
                      {r.proofImageUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(r.proofImageUrl)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> {t('overtime_view_proof') || 'Xem ảnh đối chứng'}
                        </button>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        {(r.status === 'PENDING_AGENCY_REVIEW' || r.status === 'PENDING') && (
                          <Badge variant="pending">{t('status_pending') || 'Chờ Duyệt'}</Badge>
                        )}
                        {(r.status === 'APPROVED_WAIVED' || r.status === 'APPROVED') && (
                          <Badge variant="active">{t('status_verified') || 'Đã Miễn Trừ / Duyệt'}</Badge>
                        )}
                        {r.allowancePaymentStatus === 'PENDING_FUNDS' && (
                          <Badge variant="pending">{t('overtime_pay_status_pending') || 'Chờ thanh toán'}</Badge>
                        )}
                        {r.allowancePaymentStatus === 'PAID' && (
                          <Badge variant="active">{t('overtime_pay_status_paid') || 'Đã chuyển tiền'}</Badge>
                        )}
                        {r.allowancePaymentStatus === 'RECONCILIATION_REQUIRED' && (
                          <Badge variant="rejected">{t('overtime_pay_status_reconciliation') || 'Cần đối soát'}</Badge>
                        )}
                        {r.status === 'PENALIZED' && (
                          <Badge variant="rejected">{t('overtime_status_penalized') || 'Đã Phạt Thợ'}</Badge>
                        )}
                        {r.status === 'CHARGED_CUSTOMER' && (
                          <Badge variant="info">{t('overtime_status_charged_customer') || 'Thu Phụ Phí Khách'}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {(r.status === 'PENDING_AGENCY_REVIEW' || r.status === 'PENDING') ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {r.policyType !== 'PENALTY' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={CheckCircle2}
                              onClick={() => openReview(r, 'APPROVE_ALLOWANCE')}
                              className="!bg-emerald-600 hover:!bg-emerald-700 text-white shadow-2xs font-medium"
                            >
                              {t('overtime_btn_approve_allowance') || 'Duyệt Thưởng Tăng Ca'}
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={CheckCircle2}
                              onClick={() => openReview(r, 'WAIVE_PENALTY')}
                            >
                              {t('overtime_btn_waive') || 'Duyệt Miễn Trừ'}
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            size="sm"
                            icon={XCircle}
                            onClick={() => openReview(r, 'DEDUCT_BY_RULE')}
                          >
                            {t('overtime_btn_penalty_reject') || 'Phạt / Từ Chối'}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          {r.adminNotes ? `${t('col_notes') || 'Ghi chú'}: ${r.adminNotes}` : '—'}
                        </span>
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
          <span className="font-bold text-slate-900 dark:text-white text-base">
            {reviewAction === 'APPROVE_ALLOWANCE'
              ? (t('overtime_modal_title_approve') || 'Xác Nhận Duyệt Thưởng Tăng Ca Cho Thợ')
              : reviewAction === 'WAIVE_PENALTY'
              ? (t('overtime_modal_title_waive') || 'Xác Nhận Duyệt Miễn Trừ Tăng Ca')
              : (t('overtime_modal_title_penalty') || 'Xác Nhận Chế Tài / Phạt Tăng Ca')}
          </span>
        }
        maxWidth="max-w-md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsReviewModalOpen(false)}
              disabled={isSaving}
            >
              {t('cancel')}
            </Button>
            <Button
              variant={reviewAction === 'DEDUCT_BY_RULE' ? 'danger' : 'primary'}
              onClick={handleConfirmReview}
              isLoading={isSaving}
              className={reviewAction === 'APPROVE_ALLOWANCE' ? '!bg-emerald-600 hover:!bg-emerald-700 text-white' : undefined}
            >
              {reviewAction === 'APPROVE_ALLOWANCE'
                ? (t('overtime_btn_approve_allowance') || 'Duyệt Thưởng Tăng Ca')
                : reviewAction === 'WAIVE_PENALTY'
                ? (t('overtime_btn_waive_penalty') || 'Xác Nhận Duyệt')
                : (t('overtime_btn_apply_penalty') || 'Áp Dụng Chế Tài')}
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
              {t('overtime_incurred_label')}: <strong className="text-slate-900 dark:text-white">+{selectedReport?.overtimeMinutes ?? selectedReport?.actualOvertimeMinutes} {t('unit_minutes') || 'phút'}</strong>
              {selectedReport?.ruleName && (
                <span className="ml-1 text-slate-500">({selectedReport.ruleName})</span>
              )}
            </p>
            <p className="text-slate-500 dark:text-slate-400 italic mt-1">"{selectedReport?.explanationText || selectedReport?.reason}"</p>
            {selectedReport?.proofImageUrl && (
              <div className="pt-2">
                <span className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                  {t('proof_image_from_staff') || 'Ảnh đối chứng từ thợ:'}
                </span>
                <div
                  className="relative group cursor-pointer inline-block rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                  onClick={() => setPreviewImageUrl(selectedReport.proofImageUrl)}
                  title={t('proof_document_view_full') || 'Bấm để xem ảnh lớn'}
                >
                  {isValidImageUrl(selectedReport.proofImageUrl) ? (
                    <img
                      src={selectedReport.proofImageUrl}
                      alt={t('overtime_proof_photo_title') || 'Ảnh đối chứng'}
                      className="max-h-40 rounded-lg object-cover group-hover:opacity-90 transition-opacity"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const el = document.getElementById('overtime-proof-fallback');
                        if (el) el.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <div
                    id="overtime-proof-fallback"
                    style={{ display: isValidImageUrl(selectedReport.proofImageUrl) ? 'none' : 'block' }}
                    className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 italic"
                  >
                    {t('overtime_proof_load_failed') || 'Không tải được ảnh đối chứng hoặc đường dẫn ảnh không hợp lệ.'}
                  </div>
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                    <Eye className="w-4 h-4" /> {t('proof_document_view_full') || 'Xem ảnh lớn'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {reviewAction === 'APPROVE_ALLOWANCE' && (
            <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <span>{t('overtime_allowance_label') || 'Trợ cấp tăng ca cho thợ:'}</span>
                {selectedReport?.penaltyType === 'PERCENT_COMMISSION' && selectedReport?.penaltyValue && (
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    +{selectedReport.penaltyValue}% {t('overtime_according_to_rule') || 'theo quy chế'}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                {t('overtime_estimated_by_rule') || 'Dự kiến theo quy tắc'}: <strong>{formatCurrency(selectedReport?.estimatedAllowanceAmount ?? 0)}</strong>. {t('overtime_leave_blank_auto') || 'Để trống để tính tự động khi duyệt.'}
              </p>
              <Input
                label={t('overtime_allowance_amount_label') || 'Số tiền trợ cấp thưởng tăng ca (VND)'}
                type="number"
                placeholder={`${t('overtime_auto_calc') || 'Tự động'}: ${formatCurrency(selectedReport?.estimatedAllowanceAmount ?? 0)}`}
                value={customAllowance}
                onChange={(e) => setCustomAllowance(e.target.value)}
              />
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed italic">
                {t('overtime_pay_helper_text') || '* Nếu ví Studio đủ tiền, hệ thống chuyển đủ khoản thưởng sang ví thợ. Nếu chưa đủ, khoản thưởng chờ thanh toán và được xử lý lại khi quyết toán hoặc khi thợ mở ví. Không trích một phần.'}
              </p>
            </div>
          )}

          <Textarea
            label={t('overtime_review_agency_notes')}
            placeholder={t('overtime_review_agency_notes_placeholder') || 'Nhập lý do hoặc căn cứ xét duyệt...'}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      {/* Modal Xác nhận Xóa Quy Tắc Quá Giờ */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setRuleToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title={t('overtime_delete_rule_title')}
        message={`${t('overtime_delete_rule_msg')}${
          ruleToDelete ? ` ("${ruleToDelete.ruleName}")` : ''
        }`}
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Auto-Dismiss Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          duration={3000}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Lightbox Preview Modal (Z-Index cao hơn Modal chính z-[100010] để không bị che khuất) */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-[100010] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImageUrl}
              onLoad={() => setFailedPreviewUrl(null)}
              onError={() => setFailedPreviewUrl(previewImageUrl)}
              alt={t('overtime_proof_photo_title') || 'Ảnh đối chứng'}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
            {failedPreviewUrl === previewImageUrl && (
              <p role="alert" className="bg-slate-900 text-white rounded-lg p-6 max-w-md text-center">
                {t('overtime_proof_load_failed') || 'Không tải được ảnh đối chứng. Ảnh có thể chưa được tải lên hoặc đường dẫn không còn hợp lệ.'}
              </p>
            )}
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3.5 -right-3.5 bg-white text-slate-800 hover:bg-slate-100 p-1.5 rounded-full shadow-lg border border-slate-200 transition-colors cursor-pointer"
              title={t('close') || 'Đóng'}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
