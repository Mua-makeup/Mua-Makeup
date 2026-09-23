import React, { useEffect, useState } from 'react';
import { Users, Search, RefreshCw, Lock, Unlock, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { superAdminService } from '../../services/super-admin.service';
import { useI18nStore } from '../../store/useI18nStore';
import { Badge } from '../../components/base/Badge';
import { DataTable } from '../../components/base/DataTable';
import { ConfirmDialog } from '../../components/base/ConfirmDialog';
import { CreateUserModal } from '../../components/features/admin/CreateUserModal';
import { getSavedPageSize, savePageSize } from '../../utils/pagination.util';
import { formatDate } from '../../utils/formatters';

export const AdminUsersPage = () => {
  const { t } = useI18nStore();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');

  // Confirm dialog state for locking/unlocking
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: getSavedPageSize(10),
    totalElements: 0,
    totalPages: 1,
  });

  const fetchUsers = async (page = 0, size = getSavedPageSize(pageInfo.size)) => {
    setIsLoading(true);
    setApiError('');
    try {
      const res = await superAdminService.getUsers({
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        keyword: keyword.trim() || undefined,
        page,
        size,
      });
      const data = res?.data || res || {};
      if (Array.isArray(data)) {
        setUsers(data);
        setPageInfo({ page: 0, size: data.length, totalElements: data.length, totalPages: 1 });
      } else {
        const total = data.totalElements ?? data.total_elements ?? (data.content?.length || 0);
        const pSize = data.size ?? size ?? 10;
        const totalP = data.totalPages ?? data.total_pages ?? Math.max(Math.ceil(total / pSize), 1);
        setUsers(data.content || []);
        setPageInfo({
          page: data.page ?? page,
          size: pSize,
          totalElements: total,
          totalPages: totalP,
        });
      }
    } catch (err) {
      setApiError(err.message || t('error_api_connection'));
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(0);
  }, [roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(0);
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const newActive = !selectedUser.isActive;
      await superAdminService.updateUserStatus(selectedUser.id, newActive);
      setToastMessage(newActive ? t('user_activated_success') : t('user_deactivated_success'));
      setIsConfirmOpen(false);
      setSelectedUser(null);
      fetchUsers();
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      setApiError(err.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ROLE_SUPER_ADMIN':
        return <Badge variant="purple">{t('role_super_admin')}</Badge>;
      case 'ROLE_AGENCY_ADMIN':
        return <Badge variant="amber">{t('role_agency_admin')}</Badge>;
      case 'ROLE_AGENCY_STAFF':
        return <Badge variant="blue">{t('role_agency_staff')}</Badge>;
      case 'ROLE_FREELANCE_MUA':
        return <Badge variant="brand">{t('role_freelancer')}</Badge>;
      case 'ROLE_CUSTOMER':
        return <Badge variant="teal">{t('role_customer')}</Badge>;
      default:
        return <Badge variant="neutral">{role}</Badge>;
    }
  };

  const columns = [
    {
      header: t('col_user'),
      accessor: 'fullName',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white font-black text-xs flex-shrink-0 shadow-xs">
            {row.avatarUrl ? (
              <img src={row.avatarUrl} alt={row.fullName} className="w-full h-full rounded-full object-cover" />
            ) : (
              (row.fullName || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div className="truncate">
            <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">
              {row.fullName || '—'}
            </span>
            <span className="text-[11px] text-slate-400 truncate">{row.email || 'N/A'}</span>
          </div>
        </div>
      ),
    },
    {
      header: t('col_phone'),
      accessor: 'phoneNumber',
      render: (row) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          {row.phoneNumber || 'N/A'}
        </span>
      ),
    },
    {
      header: t('col_role'),
      accessor: 'role',
      render: (row) => getRoleBadge(row.role),
    },
    {
      header: t('status'),
      accessor: 'isActive',
      render: (row) => (
        <Badge variant={row.isActive ? 'active' : 'rejected'}>
          {row.isActive ? t('status_active') : t('status_locked')}
        </Badge>
      ),
    },
    {
      header: t('col_created_at'),
      accessor: 'createdAt',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.createdAt ? formatDate(row.createdAt) : 'N/A'}
        </span>
      ),
    },
    {
      header: t('actions'),
      accessor: 'id',
      render: (row) => (
        <button
          onClick={() => {
            setSelectedUser(row);
            setIsConfirmOpen(true);
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            row.isActive
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60'
              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60'
          }`}
        >
          {row.isActive ? (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>{t('btn_deactivate')}</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5" />
              <span>{t('btn_activate')}</span>
            </>
          )}
        </button>
      ),
    },
  ];

  const roleTabs = [
    { key: 'ALL', label: t('tab_all') },
    { key: 'ROLE_CUSTOMER', label: t('role_customer') },
    { key: 'ROLE_FREELANCE_MUA', label: t('role_freelancer') },
    { key: 'ROLE_AGENCY_ADMIN', label: t('role_agency_admin') },
    { key: 'ROLE_AGENCY_STAFF', label: t('role_agency_staff') },
    { key: 'ROLE_SUPER_ADMIN', label: t('role_super_admin') },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-rose-600" />
            <span>{t('nav_admin_users')}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('admin_users_sub')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('btn_add_user') || 'Thêm Người Dùng'}</span>
          </button>

          <button
            onClick={fetchUsers}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{t('reload') || 'Tải Lại'}</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Notice */}
      {apiError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {roleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRoleFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === tab.key
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Keyword Search */}
        <form onSubmit={handleSearch} className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search_user_placeholder') || 'Tên, SĐT, email...'}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </form>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-slate-800 shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          emptyMessage={t('no_users_found') || 'Không tìm thấy người dùng nào phù hợp'}
          pagination={{
            page: pageInfo.page,
            size: pageInfo.size,
            totalElements: pageInfo.totalElements,
            totalPages: pageInfo.totalPages,
            onPageChange: (newPage1Indexed) => fetchUsers(newPage1Indexed - 1, pageInfo.size),
            onPageSizeChange: (newSize) => {
              savePageSize(newSize);
              setPageInfo((prev) => ({ ...prev, size: newSize, page: 0 }));
              fetchUsers(0, newSize);
            },
          }}
        />
      </div>

      {/* Confirm Lock / Unlock Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleToggleStatus}
        isLoading={isSubmitting}
        title={selectedUser?.isActive ? 'Xác Nhận Khóa Tài Khoản' : 'Xác Nhận Mở Khóa Tài Khoản'}
        message={
          selectedUser?.isActive
            ? `Bạn có chắc chắn muốn khóa tài khoản của "${selectedUser?.fullName || selectedUser?.phoneNumber}"? Người dùng này sẽ không thể đăng nhập vào hệ thống.`
            : `Bạn có chắc chắn muốn kích hoạt lại tài khoản cho "${selectedUser?.fullName || selectedUser?.phoneNumber}"?`
        }
        confirmText={selectedUser?.isActive ? 'Khóa Tài Khoản' : 'Mở Khóa'}
        variant={selectedUser?.isActive ? 'danger' : 'primary'}
      />

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(msg) => {
          setToastMessage(msg);
          fetchUsers(0);
          setTimeout(() => setToastMessage(''), 4000);
        }}
      />
    </div>
  );
};
