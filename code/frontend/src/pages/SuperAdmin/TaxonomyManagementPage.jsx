import React, { useEffect, useState, useCallback } from 'react';
import { Layers, Sparkles, AlertTriangle, Plus, Edit2 } from 'lucide-react';
import { superAdminService } from '../../services/super-admin.service';
import { TAXONOMY_TABS } from '../../constants/super-admin.constant';
import { Button } from '../../components/base/Button';
import { DataTable } from '../../components/base/DataTable';
import { useI18nStore } from '../../store/useI18nStore';
import { CategoryModal } from '../../components/features/admin/CategoryModal';
import { StyleModal } from '../../components/features/admin/StyleModal';
import { Toast } from '../../components/base/Toast';
import { getSavedPageSize, savePageSize } from '../../utils/pagination.util';

export const TaxonomyManagementPage = () => {
  const { t } = useI18nStore();
  const [activeTab, setActiveTab] = useState(TAXONOMY_TABS.CATEGORIES);
  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Modals state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Pagination state
  const [categoryPage, setCategoryPage] = useState(0);
  const [categoryPageSize, setCategoryPageSize] = useState(getSavedPageSize(10));

  const [stylePage, setStylePage] = useState(0);
  const [stylePageSize, setStylePageSize] = useState(getSavedPageSize(10));

  const loadTaxonomy = useCallback(async () => {
    setIsLoading(true);
    setApiError('');
    try {
      const [catRes, styleRes] = await Promise.all([
        superAdminService.getAllMasterCategories(),
        superAdminService.getAllMakeupStyles(),
      ]);
      setCategories(catRes?.data || catRes || []);
      setStyles(styleRes?.data || styleRes || []);
    } catch (err) {
      setApiError(err.message || t('error_api_connection'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTaxonomy();
  }, [loadTaxonomy]);

  const handleOpenCreateCategory = () => {
    setSelectedCategory(null);
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat) => {
    setSelectedCategory(cat);
    setCategoryModalOpen(true);
  };

  const handleOpenCreateStyle = () => {
    setSelectedStyle(null);
    setStyleModalOpen(true);
  };

  const handleOpenEditStyle = (style) => {
    setSelectedStyle(style);
    setStyleModalOpen(true);
  };

  const handleModalSuccess = (msg) => {
    loadTaxonomy();
    if (msg) {
      setToastMessage(msg);
    }
  };

  const handleToggleCategoryStatus = async (cat) => {
    const nextStatus = cat.isActive === false ? true : false;
    setTogglingId(`cat-${cat.id}`);
    try {
      const res = await superAdminService.toggleCategoryStatus(cat.id, nextStatus);
      setCategories((prev) =>
        prev.map((item) =>
          item.id === cat.id ? { ...item, isActive: nextStatus } : item
        )
      );
      setToastMessage(
        res?.message || (
          nextStatus
            ? `${t('col_category')} "${cat.categoryName}": ${t('status_active')}`
            : `${t('col_category')} "${cat.categoryName}": ${t('status_paused')}`
        )
      );
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleStyleStatus = async (style) => {
    const nextStatus = style.isActive === false ? true : false;
    setTogglingId(`style-${style.id}`);
    try {
      const res = await superAdminService.toggleStyleStatus(style.id, nextStatus);
      setStyles((prev) =>
        prev.map((item) =>
          item.id === style.id ? { ...item, isActive: nextStatus } : item
        )
      );
      setToastMessage(
        res?.message || (
          nextStatus
            ? `${t('col_styles')} "${style.styleName}": ${t('status_active')}`
            : `${t('col_styles')} "${style.styleName}": ${t('status_paused')}`
        )
      );
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setTogglingId(null);
    }
  };

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
      header: 'Mô Tả',
      accessor: 'description',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 max-w-md block truncate">
          {row.description || '—'}
        </span>
      ),
    },
    {
      header: 'Thứ Tự',
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
      render: (row) => {
        const isChecked = row.isActive !== false;
        const isToggling = togglingId === `cat-${row.id}`;
        return (
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isChecked}
              disabled={isToggling}
              onChange={() => handleToggleCategoryStatus(row)}
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
      render: (row) => (
        <button
          onClick={() => handleOpenEditCategory(row)}
          className="p-1.5 rounded-lg text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
          title={t('btn_edit')}
        >
          <Edit2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const styleColumns = [
    {
      header: 'Code',
      accessor: 'styleCode',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
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
      header: 'Mô Tả',
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
      render: (row) => {
        const isChecked = row.isActive !== false;
        const isToggling = togglingId === `style-${row.id}`;
        return (
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isChecked}
              disabled={isToggling}
              onChange={() => handleToggleStyleStatus(row)}
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
      render: (row) => (
        <button
          onClick={() => handleOpenEditStyle(row)}
          className="p-1.5 rounded-lg text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
          title={t('btn_edit')}
        >
          <Edit2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('admin_taxonomy_title')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('admin_taxonomy_sub')}
          </p>
        </div>

        <div className="w-full sm:w-auto">
          {activeTab === TAXONOMY_TABS.CATEGORIES ? (
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={handleOpenCreateCategory}
              className="w-full sm:w-auto"
            >
              {t('btn_add_category')}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={handleOpenCreateStyle}
              className="w-full sm:w-auto"
            >
              {t('btn_add_style')}
            </Button>
          )}
        </div>
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
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none pb-0.5">
        <button
          onClick={() => setActiveTab(TAXONOMY_TABS.CATEGORIES)}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
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
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
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
            data={categories.slice(categoryPage * categoryPageSize, (categoryPage + 1) * categoryPageSize)}
            isLoading={isLoading}
            emptyMessage={t('no_data')}
            pagination={{
              page: categoryPage,
              size: categoryPageSize,
              totalElements: categories.length,
              totalPages: Math.max(Math.ceil(categories.length / categoryPageSize), 1),
              onPageChange: (newPage1Indexed) => setCategoryPage(newPage1Indexed - 1),
              onPageSizeChange: (newSize) => {
                savePageSize(newSize);
                setCategoryPageSize(newSize);
                setCategoryPage(0);
              },
            }}
          />
        </div>
      )}

      {activeTab === TAXONOMY_TABS.STYLES && (
        <div className="space-y-4">
          <DataTable
            columns={styleColumns}
            data={styles.slice(stylePage * stylePageSize, (stylePage + 1) * stylePageSize)}
            isLoading={isLoading}
            emptyMessage={t('no_data')}
            pagination={{
              page: stylePage,
              size: stylePageSize,
              totalElements: styles.length,
              totalPages: Math.max(Math.ceil(styles.length / stylePageSize), 1),
              onPageChange: (newPage1Indexed) => setStylePage(newPage1Indexed - 1),
              onPageSizeChange: (newSize) => {
                savePageSize(newSize);
                setStylePageSize(newSize);
                setStylePage(0);
              },
            }}
          />
        </div>
      )}

      {/* Category Modal */}
      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        category={selectedCategory}
        onSuccess={handleModalSuccess}
      />

      {/* Style Modal */}
      <StyleModal
        isOpen={styleModalOpen}
        onClose={() => setStyleModalOpen(false)}
        styleItem={selectedStyle}
        onSuccess={handleModalSuccess}
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
