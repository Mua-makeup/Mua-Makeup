import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Search, Edit2, Trash2, ListPlus, AlertCircle } from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { Button } from '../../components/base/Button';
import { Badge } from '../../components/base/Badge';
import { DataTable } from '../../components/base/DataTable';
import { ConfirmDialog } from '../../components/base/ConfirmDialog';
import { Toast } from '../../components/base/Toast';
import { PackageFormModal } from '../../components/features/agency/PackageFormModal';
import { PackageItemManager } from '../../components/features/agency/PackageItemManager';
import { AgencyPendingVerificationNotice } from '../../components/features/agency/AgencyPendingVerificationNotice';
import { formatCurrency } from '../../utils/formatters';
import { useI18nStore } from '../../store/useI18nStore';

export const ServicePackageListPage = () => {
  const { t } = useI18nStore();
  const [packages, setPackages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [isNotVerified, setIsNotVerified] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [managingPackage, setManagingPackage] = useState(null);
  const [deletingPackage, setDeletingPackage] = useState(null);

  const [toastMessage, setToastMessage] = useState('');

  const loadPackages = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await agencyService.getMyPackages();
      const list = res?.data || res || [];
      setPackages(Array.isArray(list) ? list : []);
      setIsNotVerified(false);
    } catch (err) {
      const errCode = err.response?.data?.errorCode;
      const errMsg = err.response?.data?.message || err.message || '';
      if (errCode === 'ERR_AGENCY_NOT_VERIFIED' || errMsg.toLowerCase().includes('not verified')) {
        setIsNotVerified(true);
        setApiError(null);
      } else {
        setIsNotVerified(false);
        setApiError(
          !err.response || err.code === 'ERR_NETWORK'
            ? t('error_api_connection')
            : errMsg
        );
      }
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleToggleAvailability = async (pkg) => {
    const newStatus = !pkg.isAvailable;
    try {
      const res = await agencyService.togglePackageAvailability(pkg.id, newStatus);
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, isAvailable: newStatus } : p))
      );
      setToastMessage(res?.message || t('update_success'));
    } catch (err) {
      setToastMessage(err.message || t('error_general'));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPackage) return;
    try {
      const res = await agencyService.deletePackage(deletingPackage.id);
      setPackages((prev) => prev.filter((p) => p.id !== deletingPackage.id));
      setToastMessage(res?.message || t('delete_success'));
      setDeletingPackage(null);
    } catch (err) {
      setToastMessage(err.message || t('error_general'));
    }
  };

  const filteredPackages = useMemo(() => {
    if (!searchQuery.trim()) return packages;
    const q = searchQuery.toLowerCase();
    return packages.filter(
      (p) =>
        p.packageName?.toLowerCase().includes(q) ||
        p.categoryName?.toLowerCase().includes(q) ||
        p.category?.categoryName?.toLowerCase().includes(q)
    );
  }, [packages, searchQuery]);

  const columns = [
    {
      header: t('col_package_name'),
      accessor: 'packageName',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-white text-sm">
            {row.packageName}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
            {row.description || '—'}
          </span>
        </div>
      ),
    },
    {
      header: t('col_category'),
      accessor: 'categoryName',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
          {row.categoryName || row.category?.categoryName || '—'}
        </span>
      ),
    },
    {
      header: t('col_base_price'),
      accessor: 'price',
      render: (row) => (
        <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
          {formatCurrency(row.price)}
        </span>
      ),
    },
    {
      header: t('col_duration'),
      accessor: 'durationMinutes',
      render: (row) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
          {row.durationMinutes ?? row.estimatedDurationMinutes ?? 60} {t('unit_minutes')}
        </span>
      ),
    },
    {
      header: t('col_status'),
      accessor: 'isAvailable',
      render: (row) => (
        <button
          onClick={() => handleToggleAvailability(row)}
          className="focus:outline-none"
        >
          {row.isAvailable !== false ? (
            <Badge variant="active">{t('status_active')}</Badge>
          ) : (
            <Badge variant="inactive">{t('status_paused')}</Badge>
          )}
        </button>
      ),
    },
    {
      header: t('col_actions'),
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            icon={ListPlus}
            onClick={() => setManagingPackage(row)}
          >
            Add-ons
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Edit2}
            onClick={() => {
              setEditingPackage(row);
              setIsFormOpen(true);
            }}
          >
            {t('btn_edit')}
          </Button>
          <button
            onClick={() => setDeletingPackage(row)}
            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

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
            <Button variant="secondary" size="sm" onClick={loadPackages}>
              {t('retry')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setApiError(null)}>
              {t('close')}
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('packages_management_title')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('packages_management_sub')}
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          disabled={isNotVerified}
          title={isNotVerified ? t('pending_tooltip_package') : undefined}
          onClick={() => {
            if (isNotVerified) return;
            setEditingPackage(null);
            setIsFormOpen(true);
          }}
        >
          {t('btn_create_package')}
        </Button>
      </div>

      {/* Main Content: Pending Notice vs Data Table */}
      {isNotVerified ? (
        <AgencyPendingVerificationNotice
          featureName={t('packages_management_title')}
          onRefresh={loadPackages}
          isLoading={isLoading}
        />
      ) : (
        <>
          {/* Search Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('search_packages_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t('total_packages')} <strong className="text-slate-800 dark:text-slate-200">{filteredPackages.length}</strong> {t('packages_count_suffix')}
            </span>
          </div>

          {/* Data Table */}
          <DataTable
            columns={columns}
            data={filteredPackages}
            isLoading={isLoading}
            emptyMessage={t('empty_packages_msg')}
          />
        </>
      )}

      {/* Package Form Modal (Add/Edit) */}
      <PackageFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editingPackage={editingPackage}
        onSuccess={loadPackages}
      />

      {/* Package Item Manager Modal */}
      <PackageItemManager
        isOpen={Boolean(managingPackage)}
        onClose={() => setManagingPackage(null)}
        pkg={managingPackage}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingPackage)}
        onClose={() => setDeletingPackage(null)}
        onConfirm={handleConfirmDelete}
        title={t('confirm_delete_package_title')}
        message={t('confirm_delete_package_msg')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        isDangerous
      />

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type="success"
        onClose={() => setToastMessage('')}
      />
    </div>
  );
};
