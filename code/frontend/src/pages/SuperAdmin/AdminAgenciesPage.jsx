import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  MapPin,
  Phone,
  Mail,
  User,
  Star,
  Percent,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Plus,
} from 'lucide-react';
import { superAdminService } from '../../services/super-admin.service';
import { Badge } from '../../components/base/Badge';
import { Button } from '../../components/base/Button';
import { Modal } from '../../components/base/Modal';
import { ConfirmDialog } from '../../components/base/ConfirmDialog';
import { Toast } from '../../components/base/Toast';
import { DataTable } from '../../components/base/DataTable';
import { CreateAgencyModal } from '../../components/features/admin/CreateAgencyModal';
import { formatDate } from '../../utils/formatters';
import { useI18nStore } from '../../store/useI18nStore';
import { getSavedPageSize, savePageSize } from '../../utils/pagination.util';

const formatRating = (val) => {
  if (val == null || Number(val) <= 0) return 'N/A';
  const num = Number(val);
  return Number.isInteger(num) ? num : num.toFixed(1);
};

export const AdminAgenciesPage = () => {
  const { t } = useI18nStore();
  const [agencies, setAgencies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'VERIFIED' | 'PENDING'
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [confirmRevokeTarget, setConfirmRevokeTarget] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isCreateAgencyOpen, setIsCreateAgencyOpen] = useState(false);

  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: getSavedPageSize(10),
    totalElements: 0,
    totalPages: 1,
  });

  const fetchAgencies = async (page = 0, size = getSavedPageSize(pageInfo.size)) => {
    setIsLoading(true);
    setApiError('');
    try {
      const res = await superAdminService.getAgencies({
        page,
        size,
        search: searchQuery.trim() || undefined,
        isVerified: statusFilter === 'ALL' ? undefined : statusFilter === 'VERIFIED',
      });
      const data = res?.data || res || {};
      if (Array.isArray(data)) {
        setAgencies(data);
        setPageInfo({ page: 0, size: data.length, totalElements: data.length, totalPages: 1 });
      } else {
        const total = data.totalElements ?? data.total_elements ?? (data.content?.length || 0);
        const pSize = data.size ?? size ?? 10;
        const totalP = data.totalPages ?? data.total_pages ?? Math.max(Math.ceil(total / pSize), 1);
        setAgencies(data.content || []);
        setPageInfo({
          page: data.page ?? page,
          size: pSize,
          totalElements: total,
          totalPages: totalP,
        });
      }
    } catch (err) {
      setApiError(err.message || t('error_api_connection'));
      setAgencies([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencies(0);
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAgencies(0);
  };

  const handleToggleVerify = async (agency, targetStatus) => {
    setActionLoadingId(agency.id);
    try {
      const res = await superAdminService.verifyAgency(agency.id, targetStatus);
      setToastMessage(res?.message || (targetStatus ? t('save_success') : t('update_success')));
      setAgencies((prev) =>
        prev.map((a) => (a.id === agency.id ? { ...a, isVerified: targetStatus } : a))
      );
      if (selectedAgency && selectedAgency.id === agency.id) {
        setSelectedAgency((prev) => ({ ...prev, isVerified: targetStatus }));
      }
    } catch (err) {
      setToastMessage(err.message || t('error_general'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRequestVerify = (agency, targetStatus) => {
    if (!targetStatus) {
      setConfirmRevokeTarget(agency);
    } else {
      handleToggleVerify(agency, true);
    }
  };

  const columns = [
    {
      header: t('col_studio_agency'),
      accessor: 'agencyName',
      render: (agency) => (
        <div className="flex items-center gap-3">
          {agency.logoUrl ? (
            <img
              src={agency.logoUrl}
              alt={agency.agencyName}
              className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900 flex-shrink-0 font-bold text-xs">
              {agency.agencyName?.charAt(0) || 'S'}
            </div>
          )}
          <div>
            <span className="font-bold text-slate-900 dark:text-white block text-xs">
              {agency.agencyName}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {agency.agencyCode || `#AG-${agency.id}`}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: t('col_owner'),
      accessor: 'ownerName',
      render: (agency) => (
        <div className="text-xs space-y-0.5">
          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
            {agency.ownerName || t('not_updated')}
          </span>
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            <Phone className="w-3 h-3" />
            <span>{agency.hotline || agency.ownerPhone || 'N/A'}</span>
          </div>
        </div>
      ),
    },
    {
      header: t('col_region'),
      accessor: 'city',
      render: (agency) => (
        <div className="text-xs">
          <span className="font-medium text-slate-800 dark:text-slate-200 block">
            {agency.city || t('nationwide')}
          </span>
          <span className="text-[11px] text-slate-400">
            {agency.district || agency.addressStreet || t('unlocated')}
          </span>
        </div>
      ),
    },
    {
      header: t('col_commission'),
      accessor: 'commissionRateInternal',
      render: (agency) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400">
          <Percent className="w-3 h-3" />
          {agency.commissionRateInternal != null
            ? `${Number(agency.commissionRateInternal)}%`
            : '30%'}
        </span>
      ),
    },
    {
      header: t('col_rating'),
      accessor: 'ratingAvg',
      render: (agency) => {
        const r = formatRating(agency.ratingAvg);
        return (
          <div className="flex items-center gap-1 text-xs font-bold">
            {r === 'N/A' ? (
              <span className="text-slate-400 dark:text-slate-500 font-normal">N/A</span>
            ) : (
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{r}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: t('status'),
      accessor: 'isVerified',
      render: (agency) =>
        agency.isVerified ? (
          <Badge variant="active">{t('status_verified')}</Badge>
        ) : (
          <Badge variant="pending">{t('status_pending')}</Badge>
        ),
    },
    {
      header: t('actions'),
      accessor: 'id',
      align: 'right',
      render: (agency) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setSelectedAgency(agency)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title={t('btn_view_details')}
          >
            <Eye className="w-4 h-4" />
          </button>
          {agency.isVerified ? (
            <button
              onClick={() => handleRequestVerify(agency, false)}
              disabled={actionLoadingId === agency.id}
              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
              title={t('action_reject')}
            >
              <XCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => handleRequestVerify(agency, true)}
              disabled={actionLoadingId === agency.id}
              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
              title={t('action_approve')}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header (Stats pills removed as requested) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('admin_agencies_title')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('admin_agencies_sub')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateAgencyOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t('btn_add_agency') || 'Thêm Studio Mới'}</span>
          </button>

          <button
            onClick={() => fetchAgencies(0)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{t('reload') || 'Tải Lại'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {apiError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm">{t('error_system_notice')}:</p>
            <p className="mt-0.5 font-mono">{apiError}</p>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
          />
        </form>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('admin_agency_filter_all')}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('VERIFIED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'VERIFIED'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('status_verified')}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === 'PENDING'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('status_pending')}
          </button>
        </div>
      </div>

      {/* Main Table with Unified DataTable Component */}
      <DataTable
        columns={columns}
        data={agencies}
        isLoading={isLoading}
        emptyMessage={searchQuery ? t('admin_agency_empty_search') : t('admin_agency_empty_list')}
        pagination={{
          page: pageInfo.page,
          size: pageInfo.size,
          totalElements: pageInfo.totalElements,
          totalPages: pageInfo.totalPages,
          onPageChange: (newPage1Indexed) => fetchAgencies(newPage1Indexed - 1, pageInfo.size),
          onPageSizeChange: (newSize) => {
            savePageSize(newSize);
            setPageInfo((prev) => ({ ...prev, size: newSize, page: 0 }));
            fetchAgencies(0, newSize);
          },
        }}
      />

      {/* Studio Detail Modal */}
      {selectedAgency && (
        <Modal
          isOpen={Boolean(selectedAgency)}
          onClose={() => setSelectedAgency(null)}
          title={
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Building2 className="w-5 h-5 text-rose-600" />
              <span>{t('agency_detail_title')}: {selectedAgency.agencyName}</span>
            </div>
          }
          maxWidth="max-w-4xl"
          minHeight="min-h-[65vh]"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant={selectedAgency.isVerified ? 'danger' : 'success'}
                icon={selectedAgency.isVerified ? XCircle : CheckCircle2}
                isLoading={actionLoadingId === selectedAgency.id}
                onClick={() =>
                  handleRequestVerify(selectedAgency, !selectedAgency.isVerified)
                }
              >
                {selectedAgency.isVerified
                  ? t('admin_agency_btn_revoke')
                  : t('admin_agency_btn_verify')}
              </Button>
              <Button variant="secondary" onClick={() => setSelectedAgency(null)}>
                {t('close')}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Studio Header Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-4">
              {selectedAgency.logoUrl ? (
                <img
                  src={selectedAgency.logoUrl}
                  alt={selectedAgency.agencyName}
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xl">
                  {selectedAgency.agencyName?.charAt(0) || 'S'}
                </div>
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedAgency.agencyName}
                  </h3>
                  {selectedAgency.isVerified ? (
                    <Badge variant="active">{t('status_verified')}</Badge>
                  ) : (
                    <Badge variant="pending">{t('pending_verification_badge')}</Badge>
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-mono">
                  ID: {selectedAgency.agencyCode || `#AG-${selectedAgency.id}`}
                </p>
                <div className="flex items-center gap-1 font-semibold pt-1 text-xs">
                  {formatRating(selectedAgency.ratingAvg) === 'N/A' ? (
                    <span className="text-slate-400 dark:text-slate-500">N/A (Chưa có đánh giá)</span>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{formatRating(selectedAgency.ratingAvg)} / 5</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[11px] uppercase font-bold text-slate-400 block">
                  {t('portal_agency_admin')}
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedAgency.ownerName || 'N/A'}</span>
                </p>
                <p className="text-slate-500 font-mono flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedAgency.ownerEmail || 'N/A'}</span>
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[11px] uppercase font-bold text-slate-400 block">
                  {t('field_hotline')}
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{selectedAgency.hotline || selectedAgency.ownerPhone || 'N/A'}</span>
                </p>
                <p className="text-slate-500 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('agency_commission_default')}: <strong>{Number(selectedAgency.commissionRateInternal || 30)}%</strong></span>
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 sm:col-span-2">
                <span className="text-[11px] uppercase font-bold text-slate-400 block">
                  {t('field_street')}
                </span>
                <p className="font-medium text-slate-800 dark:text-slate-200 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>
                    {[selectedAgency.addressStreet, selectedAgency.district, selectedAgency.city]
                      .filter(Boolean)
                      .join(', ') || t('not_updated')}
                  </span>
                </p>
                {selectedAgency.latitude && selectedAgency.longitude && (
                  <p className="text-slate-400 font-mono text-[11px] pl-5">
                    {t('gps_coordinates')}: {selectedAgency.latitude}, {selectedAgency.longitude}
                  </p>
                )}
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 sm:col-span-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('joined_date')}:</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {selectedAgency.createdAt ? formatDate(selectedAgency.createdAt) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast */}
      <Toast
        message={toastMessage}
        type="success"
        onClose={() => setToastMessage('')}
      />

      {/* Confirm Revoke Verification Dialog */}
      <ConfirmDialog
        isOpen={Boolean(confirmRevokeTarget)}
        onClose={() => setConfirmRevokeTarget(null)}
        onConfirm={() => {
          const target = confirmRevokeTarget;
          setConfirmRevokeTarget(null);
          handleToggleVerify(target, false);
        }}
        isLoading={actionLoadingId === confirmRevokeTarget?.id}
        title={t('confirm_revoke_agency_title')}
        message={`${t('confirm_revoke_agency_msg')} (${confirmRevokeTarget?.agencyName})`}
        confirmText={t('action_reject')}
        variant="danger"
      />

      {/* Create Agency Modal */}
      <CreateAgencyModal
        isOpen={isCreateAgencyOpen}
        onClose={() => setIsCreateAgencyOpen(false)}
        onSuccess={(msg) => {
          setToastMessage(msg);
          fetchAgencies(0);
        }}
      />
    </div>
  );
};
