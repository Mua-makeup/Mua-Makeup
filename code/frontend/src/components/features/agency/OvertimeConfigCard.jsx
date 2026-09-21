import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Badge,
} from 'lucide-react';
import { Button } from '../../base/Button';
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

export const OvertimeConfigCard = () => {
  const { t } = useI18nStore();

  // Rules State
  const [rules, setRules] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleName, setRuleName] = useState('Quy chế làm thêm giờ tiêu chuẩn');
  const [minOvertimeMinutes, setMinOvertimeMinutes] = useState(15);
  const [maxOvertimeMinutes, setMaxOvertimeMinutes] = useState(240);
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
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

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

  const penaltyTypeOptions = [
    { value: 'FIXED_AMOUNT', label: t('overtime_penalty_type_fixed') },
    { value: 'PERCENT_COMMISSION', label: t('overtime_penalty_type_percent') },
    { value: 'WARNING_ONLY', label: t('overtime_penalty_type_warning') },
  ];

  const handleOpenEdit = (rule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.ruleName || '');
    setMinOvertimeMinutes(rule.minOvertimeMinutes ?? 15);
    setMaxOvertimeMinutes(rule.maxOvertimeMinutes ?? '');
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
      setRules((prev) =>
        prev.map((item) =>
          item.id === rule.id ? { ...item, isActive: nextStatus } : item
        )
      );
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
      const rulesRes = await agencyService.getOvertimeRules();
      const updatedList = rulesRes?.data || rulesRes || [];
      setRules(Array.isArray(updatedList) ? updatedList : []);
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

      const rulesRes = await agencyService.getOvertimeRules();
      const updatedList = rulesRes?.data || rulesRes || [];
      setRules(Array.isArray(updatedList) ? updatedList : []);
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
    setIsReviewModalOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!selectedReport) return;
    setIsSaving(true);
    try {
      await agencyService.reviewOvertimeReport(selectedReport.id, {
        status: reviewAction,
        reviewNote: reviewNote.trim() || undefined,
      });
      setIsReviewModalOpen(false);
      setToastMessage({
        text: t('update_success'),
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
    if (rule.penaltyType === 'PERCENT_COMMISSION') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 shadow-2xs">
          -{rule.penaltyValue}% {t('col_staff_commission')}
        </span>
      );
    }
    if (rule.penaltyType === 'FIXED_AMOUNT') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 shadow-2xs">
          {formatCurrency(rule.penaltyValue)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 shadow-2xs">
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
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/50 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
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
            <div className="flex items-center justify-center py-10 text-slate-400 text-xs gap-2">
              <Clock className="w-4 h-4 animate-spin text-rose-500" />
              <span>{t('loading')}</span>
            </div>
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
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-5 py-3.5">{t('overtime_rule_name')}</th>
                    <th className="px-5 py-3.5">{t('overtime_threshold_label')}</th>
                    <th className="px-5 py-3.5">{t('overtime_penalty_label')}</th>
                    <th className="px-5 py-3.5">{t('status')}</th>
                    <th className="px-5 py-3.5 text-right">{t('col_actions')}</th>
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
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50/90 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/50 w-fit shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-mono font-bold">
                              ≥ {r.minOvertimeMinutes} {t('unit_minutes')}
                            </span>
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
                      <td className="px-5 py-3.5">
                        {renderPenaltyDisplay(r)}
                      </td>

                      {/* Trạng thái Toggle Switch */}
                      <td className="px-5 py-3.5">
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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/50 shadow-2xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  {editingRuleId ? t('overtime_form_title_edit') : t('overtime_form_title_create')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                {t('overtime_modal_sub')}
              </p>
            </div>
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
              placeholder="VD: 240"
              value={maxOvertimeMinutes}
              onChange={(e) => setMaxOvertimeMinutes(e.target.value)}
              helperText={t('overtime_max_minutes_helper')}
              error={fieldErrors.maxOvertimeMinutes}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hình thức chế tài */}
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

            {/* Mức phạt / Trừ hoa hồng */}
            <Input
              label={
                penaltyType === 'PERCENT_COMMISSION'
                  ? `${t('overtime_penalty_value')} (%)`
                  : `${t('overtime_penalty_value')} (VNĐ)`
              }
              type="number"
              min="0"
              max={penaltyType === 'PERCENT_COMMISSION' ? '100' : undefined}
              step={penaltyType === 'PERCENT_COMMISSION' ? '1' : '10000'}
              disabled={penaltyType === 'WARNING_ONLY'}
              required={penaltyType !== 'WARNING_ONLY'}
              value={penaltyValue}
              onChange={(e) => setPenaltyValue(e.target.value)}
              helperText={
                penaltyType === 'PERCENT_COMMISSION'
                  ? t('overtime_penalty_value_helper_percent')
                  : penaltyType === 'WARNING_ONLY'
                  ? t('overtime_penalty_type_warning')
                  : t('overtime_penalty_value_helper_fixed')
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
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300">
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
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {r.staffName || `${t('staff_label')} #${r.staffId}`}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Staff ID: {r.staffId}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 block">
                        {t('booking_label')} #{r.bookingId}
                      </span>
                      <span className="text-slate-400 font-mono">{formatDateTime(r.createdAt)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        +{r.actualOvertimeMinutes} {t('unit_minutes')}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {formatCurrency(r.calculatedAmount)}
                      </span>
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
              disabled={isSaving}
            >
              {t('cancel')}
            </Button>
            <Button
              variant={reviewAction === 'APPROVED' ? 'primary' : 'danger'}
              onClick={handleConfirmReview}
              isLoading={isSaving}
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
    </div>
  );
};
