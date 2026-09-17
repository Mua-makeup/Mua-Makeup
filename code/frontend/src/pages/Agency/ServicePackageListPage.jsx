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
import { formatCurrency } from '../../utils/formatters';
import { useI18nStore } from '../../store/useI18nStore';

export const ServicePackageListPage = () => {
  const { t } = useI18nStore();
  const [packages, setPackages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

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
    } catch (err) {
      setApiError(err.message || t('error_api_connection'));
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
      await agencyService.togglePackageAvailability(pkg.id, newStatus);
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, isAvailable: newStatus } : p))
      );
      setToastMessage(
        newStatus
          ? `Đã bật nhận đơn cho gói "${pkg.packageName}"`
          : `Đã tạm dừng nhận đơn cho gói "${pkg.packageName}"`
      );
    } catch (err) {
      setToastMessage(err.message || 'Lỗi khi cập nhật trạng thái gói');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPackage) return;
    try {
      await agencyService.deletePackage(deletingPackage.id);
      setPackages((prev) => prev.filter((p) => p.id !== deletingPackage.id));
      setToastMessage(`Đã xóa gói "${deletingPackage.packageName}" thành công.`);
      setDeletingPackage(null);
    } catch (err) {
      setToastMessage(err.message || 'Lỗi khi xóa gói dịch vụ');
    }
  };

  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) =>
        p.packageName?.toLowerCase().includes(q) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q))
    );
  }, [packages, searchQuery]);

  const columns = [
    {
      header: 'Tên Gói Dịch Vụ',
      accessor: 'packageName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-white block">{row.packageName}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 max-w-xs block truncate">
            {row.description || 'Không có mô tả'}
          </span>
        </div>
      ),
    },
    {
      header: 'Danh Mục Gốc',
      accessor: 'categoryName',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
          {row.categoryName || row.category?.categoryName || 'Mặc định'}
        </span>
      ),
    },
    {
      header: 'Giá Niêm Yết',
      accessor: 'price',
      render: (row) => (
        <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
          {formatCurrency(row.price)}
        </span>
      ),
    },
    {
      header: 'Thời Lượng',
      accessor: 'durationMinutes',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-medium">
          {row.durationMinutes || 60} phút
        </span>
      ),
    },
    {
      header: 'Nhận Đơn',
      accessor: 'isAvailable',
      render: (row) => (
        <button
          onClick={() => handleToggleAvailability(row)}
          className="focus:outline-none"
          title="Nhấn để bật/tắt nhận đơn"
        >
          {row.isAvailable !== false ? (
            <Badge variant="active">Đang Bán</Badge>
          ) : (
            <Badge variant="inactive">Tạm Tắt</Badge>
          )}
        </button>
      ),
    },
    {
      header: 'Thao Tác',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            icon={ListPlus}
            onClick={() => setManagingPackage(row)}
            title="Quản lý các bước quy trình & Add-ons"
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
            title="Sửa thông tin gói"
          >
            Sửa
          </Button>
          <button
            onClick={() => setDeletingPackage(row)}
            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            title="Xóa gói"
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
      {apiError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold text-sm">
              {t('error_api_connection')}
            </strong>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400 font-mono">
              {apiError}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadPackages}>
            Thử Lại
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Quản Lý Gói Dịch Vụ & Add-ons
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Thiết lập danh mục dịch vụ Studio mở bán cho khách hàng, cấu hình các bước quy trình và dịch vụ cộng thêm
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setEditingPackage(null);
            setIsFormOpen(true);
          }}
        >
          Thêm Gói Mới
        </Button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên gói dịch vụ hoặc danh mục..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all"
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Tổng số: <strong className="text-slate-800 dark:text-slate-200">{filteredPackages.length}</strong> gói
        </span>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredPackages}
        isLoading={isLoading}
        emptyMessage="Chưa có gói dịch vụ nào trong cơ sở dữ liệu. Hãy bấm 'Thêm Gói Mới' để bắt đầu."
      />

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
        title="Xóa Gói Dịch Vụ"
        message={`Bạn có chắc chắn muốn xóa gói "${deletingPackage?.packageName}" khỏi Studio? Hành động này không thể hoàn tác.`}
        confirmText="Xác Nhận Xóa"
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
