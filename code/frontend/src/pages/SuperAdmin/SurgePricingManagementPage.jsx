import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  Zap,
  Clock,
  ShieldAlert,
  Sliders,
  Scale,
} from 'lucide-react';
import { Button } from '../../components/base/Button';
import { Toast } from '../../components/base/Toast';
import { ConfirmDialog } from '../../components/base/ConfirmDialog';
import { DataTable } from '../../components/base/DataTable';
import { SurgeRuleModal } from '../../components/features/admin/SurgeRuleModal';
import { superAdminService } from '../../services/super-admin.service';
import { useI18nStore } from '../../store/useI18nStore';
import { getSavedPageSize, savePageSize } from '../../utils/pagination.util';

export const SurgePricingManagementPage = () => {
  const { t } = useI18nStore();
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isH3SurgeEnabled, setIsH3SurgeEnabled] = useState(true);
  const [isTogglingH3, setIsTogglingH3] = useState(false);

  // Pagination State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(getSavedPageSize(10));

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingRuleId, setTogglingRuleId] = useState(null);

  // Delete Confirm Dialog State
  const [deleteRuleTarget, setDeleteRuleTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);

  const fetchSurgeData = async () => {
    setIsLoading(true);
    try {
      const [rulesRes, h3Res] = await Promise.all([
        superAdminService.getSurgeRules(),
        superAdminService.getH3SurgeStatus(),
      ]);

      const rulesData = rulesRes.data || rulesRes;
      setRules(Array.isArray(rulesData) ? rulesData : []);

      const h3Data = h3Res.data || h3Res;
      if (h3Data && typeof h3Data.isH3SurgeEnabled === 'boolean') {
        setIsH3SurgeEnabled(h3Data.isH3SurgeEnabled);
      }
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.response?.data?.message || t('error_general'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSurgeData();
  }, []);

  // Handle Toggle H3 Realtime Surge
  const handleToggleH3 = async (newVal) => {
    setIsTogglingH3(true);
    try {
      const res = await superAdminService.toggleH3Surge(newVal);
      const data = res.data || res;
      setIsH3SurgeEnabled(data.isH3SurgeEnabled);
      setToastMessage({
        type: 'success',
        text: newVal ? t('surge_h3_toggle_btn_active') : t('surge_h3_toggle_btn_paused'),
      });
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.response?.data?.message || t('error_general'),
      });
    } finally {
      setIsTogglingH3(false);
    }
  };

  // Handle Direct Toggle Rule Status
  const handleToggleRuleStatus = async (rule) => {
    const nextStatus = !rule.isActive;
    setTogglingRuleId(rule.id);
    try {
      const res = await superAdminService.toggleSurgeRuleStatus(rule.id, nextStatus);
      setRules((prev) =>
        prev.map((item) =>
          item.id === rule.id ? { ...item, isActive: nextStatus } : item
        )
      );
      setToastMessage({
        type: 'success',
        text: res?.message || (
          nextStatus
            ? `${rule.ruleName}: ${t('surge_rule_status_active')}`
            : `${rule.ruleName}: ${t('surge_rule_status_inactive')}`
        ),
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

  // Handle Save / Update Rule
  const handleSaveRule = async (payload) => {
    setIsSubmitting(true);
    try {
      if (editingRule) {
        await superAdminService.updateSurgeRule(editingRule.id, payload);
      } else {
        await superAdminService.createSurgeRule(payload);
      }
      setIsModalOpen(false);
      setEditingRule(null);
      await fetchSurgeData();
      setToastMessage({
        type: 'success',
        text: t('save'),
      });
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.response?.data?.message || t('error_general'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Rule
  const handleDeleteRule = async () => {
    if (!deleteRuleTarget) return;
    setIsDeleting(true);
    try {
      const deleteFn = superAdminService.deleteSurgeRule || superAdminService.deleteRule;
      await deleteFn(deleteRuleTarget.id);
      setDeleteRuleTarget(null);
      setToastMessage({
        type: 'success',
        text: t('surge_delete_success'),
      });
      await fetchSurgeData();
    } catch (err) {
      console.error('[SurgePricing] Failed to delete surge rule:', err);
      const errorText =
        err.response?.data?.message ||
        (typeof err.data === 'string' ? err.data : null) ||
        err.message ||
        t('error_general');
      setToastMessage({
        type: 'error',
        text: errorText,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const activeRulesCount = rules.filter((r) => r.isActive).length;
  const uniqueZones = new Set(rules.map((r) => r.zoneCode || 'ALL')).size;
  const avgMultiplier = rules.length
    ? (
        rules.reduce((acc, r) => acc + (parseFloat(r.surgeMultiplier) || 1.0), 0) / rules.length
      ).toFixed(2)
    : '1.00';

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('surge_pricing_title')}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t('surge_pricing_sub')}
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingRule(null);
            setIsModalOpen(true);
          }}
          icon={Plus}
          className="shadow-md shadow-rose-500/20 shrink-0 w-full sm:w-auto"
        >
          {t('surge_rule_btn_add')}
        </Button>
      </div>

      {/* Toast Notification (Auto dismiss after 3s) */}
      <Toast
        message={toastMessage?.text}
        type={toastMessage?.type || 'success'}
        onClose={() => setToastMessage(null)}
        duration={3000}
      />

      {/* MASTER SWITCH: UBER H3 REALTIME SURGE ENGINE CARD */}
      <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-rose-950 text-slate-900 dark:text-white rounded-2xl p-4 sm:p-6 shadow-xs dark:shadow-xl border border-slate-200 dark:border-slate-700/50 relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-500/30 shrink-0 transition-colors">
                <Zap className="w-4 h-4" />
              </div>
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t('surge_h3_card_title')}
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">
                {t('surge_h3_card_badge')}
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('surge_h3_card_desc')}
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-4 bg-slate-50 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700/60 p-3 rounded-xl shrink-0 w-full md:w-auto transition-colors">
            <div className="text-right">
              <span className="block text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                {t('col_status')}
              </span>
              <span
                className={`text-xs font-bold ${
                  isH3SurgeEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-400'
                }`}
              >
                {isH3SurgeEnabled
                  ? t('surge_h3_status_active')
                  : t('surge_h3_status_paused')}
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isH3SurgeEnabled}
                disabled={isTogglingH3}
                onChange={(e) => handleToggleH3(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* KPI STATS METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t('surge_kpi_total_rules')}
            </span>
            <Sliders className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
            {rules.length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {t('surge_kpi_active_rules')}
            </span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
            {activeRulesCount}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t('surge_kpi_zones')}
            </span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
            {uniqueZones}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-500 font-medium">
              {t('surge_kpi_avg_multiplier')}
            </span>
            <TrendingUp className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1.5">
            {avgMultiplier}x
          </p>
        </div>
      </div>

      {/* RULES LIST TABLE */}
      <DataTable
        columns={[
          {
            header: t('surge_rule_col_name'),
            accessor: 'ruleName',
            render: (rule) => (
              <span className="font-medium text-slate-900 dark:text-white">
                {rule.ruleName}
              </span>
            ),
          },
          {
            header: t('surge_rule_col_zone'),
            accessor: 'zoneCode',
            render: (rule) => (
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {rule.zoneCode || 'ALL'}
              </span>
            ),
          },
          {
            header: t('surge_rule_col_time'),
            accessor: 'time',
            render: (rule) => (
              <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                {rule.startTime?.substring(0, 5)} - {rule.endTime?.substring(0, 5)}
              </span>
            ),
          },
          {
            header: t('surge_rule_col_days'),
            accessor: 'applicableDaysOfWeek',
            render: (rule) => (
              <span className="text-xs text-slate-500 max-w-[200px] truncate block">
                {rule.applicableDaysOfWeek || t('tab_all')}
              </span>
            ),
          },
          {
            header: t('surge_rule_col_multiplier'),
            accessor: 'surgeMultiplier',
            render: (rule) => (
              <span className="inline-flex items-center font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
                {Number(rule.surgeMultiplier).toFixed(2)}x
              </span>
            ),
          },
          {
            header: t('surge_rule_col_demand_ratio'),
            accessor: 'minDemandRatio',
            render: (rule) => (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <Scale className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                  &ge; {Number(rule.minDemandRatio || 1).toFixed(1)}x
                </span>
              </div>
            ),
          },
          {
            header: t('surge_rule_col_status'),
            accessor: 'isActive',
            render: (rule) => {
              const isChecked = !!rule.isActive;
              const isToggling = togglingRuleId === rule.id;
              return (
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isToggling}
                    onChange={() => handleToggleRuleStatus(rule)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 shadow-xs"></div>
                </label>
              );
            },
          },
          {
            header: t('actions'),
            align: 'right',
            render: (rule) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRule(rule);
                    setIsModalOpen(true);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                  title={t('btn_edit')}
                >
                  <Edit2 className="w-4 h-4 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteRuleTarget(rule)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title={t('delete')}
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                </button>
              </div>
            ),
          },
        ]}
        data={rules.slice(page * pageSize, (page + 1) * pageSize)}
        isLoading={isLoading}
        emptyMessage={t('surge_rule_empty_title')}
        pagination={{
          page,
          size: pageSize,
          totalElements: rules.length,
          totalPages: Math.max(Math.ceil(rules.length / pageSize), 1),
          onPageChange: (newPage1Indexed) => setPage(newPage1Indexed - 1),
          onPageSizeChange: (newSize) => {
            savePageSize(newSize);
            setPageSize(newSize);
            setPage(0);
          },
        }}
      />

      {/* ADD / EDIT SURGE RULE MODAL */}
      <SurgeRuleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRule(null);
        }}
        onSubmit={handleSaveRule}
        initialData={editingRule}
        isLoading={isSubmitting}
      />

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteRuleTarget}
        onClose={() => setDeleteRuleTarget(null)}
        onConfirm={handleDeleteRule}
        title={t('surge_delete_title')}
        message={t('surge_delete_msg').replace('{name}', deleteRuleTarget?.ruleName || '')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        isDangerous={true}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
