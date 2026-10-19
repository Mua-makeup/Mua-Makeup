import React, { useState, useEffect, useMemo } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Search,
  Star,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { Button } from '../../components/base/Button';
import { ConfirmDialog } from '../../components/base/ConfirmDialog';
import { Toast } from '../../components/base/Toast';
import { AgencyPortfolioModal } from '../../components/features/agency/AgencyPortfolioModal';
import { AgencyPortfolioDetailModal } from '../../components/features/agency/AgencyPortfolioDetailModal';
import { useI18nStore } from '../../store/useI18nStore';

export const AgencyPortfolioPage = () => {
  const { t } = useI18nStore();
  const [portfolios, setPortfolios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPackageId, setFilterPackageId] = useState('ALL');

  // Modal & Dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const loadPortfolios = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await agencyService.getMyPortfolios({ page: 0, size: 50 });
      const data = res?.data || res || {};
      const list = Array.isArray(data) ? data : (data.content || []);
      setPortfolios(list);
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || t('error_general'));
      setPortfolios([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, []);

  const handleToggleFeatured = async (item) => {
    const newStatus = !item.isFeatured;
    setTogglingId(item.id);
    try {
      await agencyService.togglePortfolioFeatured(item.id, newStatus);
      setPortfolios((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, isFeatured: newStatus } : p))
      );
      setToastMessage(
        newStatus ? 'Đã ghim tác phẩm lên đầu danh sách!' : 'Đã bỏ ghim tác phẩm.'
      );
    } catch (err) {
      setToastMessage(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleVisibility = async (item) => {
    const newStatus = !item.isVisible;
    setTogglingId(item.id);
    try {
      await agencyService.togglePortfolioVisibility(item.id, newStatus);
      setPortfolios((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? { ...p, isVisible: newStatus, isFeatured: newStatus ? p.isFeatured : false }
            : p
        )
      );
      setToastMessage(
        newStatus ? 'Tác phẩm đang được hiển thị công khai.' : 'Đã ẩn tác phẩm khỏi danh mục công khai.'
      );
    } catch (err) {
      setToastMessage(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      await agencyService.deletePortfolio(deletingItem.id);
      setPortfolios((prev) => prev.filter((p) => p.id !== deletingItem.id));
      setToastMessage(t('delete_success'));
      setDeletingItem(null);
    } catch (err) {
      setToastMessage(err.response?.data?.message || err.message || t('error_general'));
    }
  };

  // Danh sách packages duy nhất xuất hiện trong portfolio
  const packageFilterOptions = useMemo(() => {
    const map = new Map();
    portfolios.forEach((p) => {
      if (p.packageId && p.packageName) {
        map.set(p.packageId, p.packageName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [portfolios]);

  // Bộ lọc tìm kiếm
  const filteredPortfolios = useMemo(() => {
    return portfolios.filter((item) => {
      const matchQuery =
        !searchQuery.trim() ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.packageName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.styleName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchPackage =
        filterPackageId === 'ALL' || String(item.packageId) === String(filterPackageId);

      return matchQuery && matchPackage;
    });
  }, [portfolios, searchQuery, filterPackageId]);

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage('')}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <span>{t('agency_portfolio_title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('agency_portfolio_subtitle')}
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="shrink-0 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{t('agency_portfolio_btn_add')}</span>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        {packageFilterOptions.length > 0 && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={filterPackageId}
              onChange={(e) => setFilterPackageId(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="ALL">Tất cả gói dịch vụ ({portfolios.length})</option>
              {packageFilterOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* API Error Notification */}
      {apiError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={loadPortfolios}>
            {t('retry')}
          </Button>
        </div>
      )}

      {/* Grid of Portfolio Showcases */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-700/60"
            />
          ))}
        </div>
      ) : filteredPortfolios.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-500 mb-4">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
            {t('agency_portfolio_empty')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Hãy tải lên các hình ảnh tác phẩm thực tế đầu tiên để khách hàng có thể chiêm ngưỡng tay nghề của Studio trên ứng dụng.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>{t('agency_portfolio_btn_add')}</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredPortfolios.map((item) => {
            const photoUrl = item.imageUrl || item.thumbnailUrl;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col group"
              >
                {/* Image & Badges - Click to view lightbox */}
                <div
                  className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer"
                  onClick={() => setViewingItem(item)}
                  title="Nhấn để xem chi tiết ảnh và các góc chụp"
                >
                  <img
                    src={photoUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                  {/* Featured Star Badge */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFeatured(item);
                    }}
                    disabled={togglingId === item.id}
                    title={item.isFeatured ? 'Bỏ ghim tiêu biểu' : 'Ghim tiêu biểu'}
                    className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md transition-colors ${
                      item.isFeatured
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                        : 'bg-black/40 text-white/80 hover:bg-black/60'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${item.isFeatured ? 'fill-white' : ''}`} />
                  </button>

                  {/* Visibility Tag */}
                  <span
                    className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md ${
                      item.isVisible
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-slate-800/90 text-slate-300'
                    }`}
                  >
                    {item.isVisible ? 'Hiển thị' : 'Đã ẩn'}
                  </span>

                  {/* Additional Images Count Badge */}
                  {item.additionalImages?.length > 0 && (
                    <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-600/90 text-white backdrop-blur-md shadow-sm flex items-center gap-1">
                      <span>+{item.additionalImages.length} ảnh phụ</span>
                    </span>
                  )}
                </div>

                {/* Content - Click to view detail */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div
                    className="cursor-pointer"
                    onClick={() => setViewingItem(item)}
                  >
                    <h4
                      className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title={item.title}
                    >
                      {item.title}
                    </h4>

                    {item.description && (
                      <p
                        className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2"
                        title={item.description}
                      >
                        {item.description}
                      </p>
                    )}

                    {/* Metadata Pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {item.packageName && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 line-clamp-1">
                          {item.packageName}
                        </span>
                      )}

                      {item.styleName && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {item.styleName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVisibility(item);
                      }}
                      disabled={togglingId === item.id}
                      className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                      {item.isVisible ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Ẩn</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500">Bật</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                        title={t('edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form Thêm / Sửa Showcase */}
      <AgencyPortfolioModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
        onSuccess={() => {
          loadPortfolios();
          setToastMessage(t('save_success'));
        }}
      />

      {/* Modal Xem Chi Tiết Tác Phẩm & Toàn Bộ Ảnh Đi Kèm */}
      <AgencyPortfolioDetailModal
        isOpen={Boolean(viewingItem)}
        onClose={() => setViewingItem(null)}
        item={viewingItem}
        onEdit={(item) => {
          setEditingItem(item);
          setIsModalOpen(true);
        }}
      />

      {/* Dialog Xác Nhận Xóa */}
      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title={t('agency_portfolio_confirm_delete_title')}
        message={t('agency_portfolio_confirm_delete_msg')}
      />
    </div>
  );
};
