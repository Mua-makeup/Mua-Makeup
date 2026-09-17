import React, { useEffect, useState } from 'react';
import { Layers, Sparkles, AlertTriangle } from 'lucide-react';
import { superAdminService } from '../../services/super-admin.service';
import { TAXONOMY_TABS } from '../../constants/super-admin.constant';
import { Badge } from '../../components/base/Badge';
import { DataTable } from '../../components/base/DataTable';
import { useI18nStore } from '../../store/useI18nStore';

export const TaxonomyManagementPage = () => {
  const { t } = useI18nStore();
  const [activeTab, setActiveTab] = useState(TAXONOMY_TABS.CATEGORIES);
  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTaxonomy = async () => {
      setIsLoading(true);
      setApiError('');
      try {
        const [catRes, styleRes] = await Promise.all([
          superAdminService.getMasterCategories(),
          superAdminService.getMakeupStyles(),
        ]);
        setCategories(catRes?.data || catRes || []);
        setStyles(styleRes?.data || styleRes || []);
      } catch (err) {
        setApiError(
          err.message ||
            'Không thể kết nối hoặc tải Taxonomy từ catalog_schema. Vui lòng kiểm tra backend server.'
        );
      } finally {
        setIsLoading(false);
      }
    };
    loadTaxonomy();
  }, []);

  const categoryColumns = [
    {
      header: 'Code',
      accessor: 'categoryCode',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
          {row.categoryCode}
        </span>
      ),
    },
    {
      header: t('col_category'),
      accessor: 'categoryName',
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-white text-sm">{row.categoryName}</span>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 max-w-md block truncate">
          {row.description || '—'}
        </span>
      ),
    },
    {
      header: 'Order',
      accessor: 'sortOrder',
      align: 'center',
      render: (row) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold">
          #{row.sortOrder || 1}
        </span>
      ),
    },
    {
      header: t('status'),
      accessor: 'isActive',
      render: (row) =>
        row.isActive !== false ? (
          <Badge variant="active">{t('status_active')}</Badge>
        ) : (
          <Badge variant="inactive">{t('status_paused')}</Badge>
        ),
    },
  ];

  const styleColumns = [
    {
      header: 'Code',
      accessor: 'styleCode',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded border border-rose-200 dark:border-rose-800">
          {row.styleCode}
        </span>
      ),
    },
    {
      header: t('col_styles'),
      accessor: 'styleName',
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-white text-sm">{row.styleName}</span>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 max-w-md block truncate">
          {row.description || '—'}
        </span>
      ),
    },
    {
      header: t('status'),
      accessor: 'isActive',
      render: (row) =>
        row.isActive !== false ? (
          <Badge variant="active">{t('status_active')}</Badge>
        ) : (
          <Badge variant="inactive">{t('status_paused')}</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Layers className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('admin_taxonomy_title')}
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('admin_taxonomy_sub')}
        </p>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm">{t('error_system_notice')}:</p>
            <p className="mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab(TAXONOMY_TABS.CATEGORIES)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === TAXONOMY_TABS.CATEGORIES
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t('col_category')} ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab(TAXONOMY_TABS.STYLES)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === TAXONOMY_TABS.STYLES
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('col_styles')} ({styles.length})</span>
        </button>
      </div>

      {/* Tables based on active tab */}
      {activeTab === TAXONOMY_TABS.CATEGORIES && (
        <div className="space-y-4">
          <DataTable
            columns={categoryColumns}
            data={categories}
            isLoading={isLoading}
            emptyMessage={t('no_data')}
          />
        </div>
      )}

      {activeTab === TAXONOMY_TABS.STYLES && (
        <div className="space-y-4">
          <DataTable
            columns={styleColumns}
            data={styles}
            isLoading={isLoading}
            emptyMessage={t('no_data')}
          />
        </div>
      )}
    </div>
  );
};
