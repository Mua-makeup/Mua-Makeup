import React, { useState, useEffect, useMemo } from 'react';
import { Award, Search, Filter, AlertCircle, Eye } from 'lucide-react';
import { superAdminService } from '../../services/super-admin.service';
import { CERT_STATUS } from '../../constants/super-admin.constant';
import { Badge } from '../../components/base/Badge';
import { Button } from '../../components/base/Button';
import { DataTable } from '../../components/base/DataTable';
import { CertificateReviewModal } from '../../components/features/admin/CertificateReviewModal';
import { Toast } from '../../components/base/Toast';
import { formatDate } from '../../utils/formatters';
import { useI18nStore } from '../../store/useI18nStore';

export const MuaVerificationPage = () => {
  const { t } = useI18nStore();
  const [statusFilter, setStatusFilter] = useState(CERT_STATUS.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCert, setSelectedCert] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [certList, setCertList] = useState([]);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadCertificates = async () => {
    setIsLoading(true);
    setApiError('');
    try {
      const res = await superAdminService.getCertificates(
        statusFilter === CERT_STATUS.ALL ? null : statusFilter
      );
      const list = res?.data || res || [];
      const normalized = (Array.isArray(list) ? list : []).map((c) => ({
        ...c,
        status: c.status || (c.isVerified === true ? 'VERIFIED' : 'PENDING'),
      }));
      setCertList(normalized);
    } catch (err) {
      setApiError(err.message || t('error_api_connection'));
      setCertList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, [statusFilter]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return certList;
    const q = searchQuery.trim().toLowerCase();
    return certList.filter(
      (item) =>
        item.muaName?.toLowerCase().includes(q) ||
        item.phoneNumber?.includes(q) ||
        item.certName?.toLowerCase().includes(q)
    );
  }, [certList, searchQuery]);

  const handleVerifySuccess = ({ isVerified, message }) => {
    setToastMessage(message || (isVerified ? t('save_success') : t('update_success')));
    loadCertificates();
  };

  const columns = [
    {
      header: t('col_staff_name'),
      accessor: 'muaName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-white block">
            {row.muaName || `MUA #${row.muaId}`}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {t('staff_label')}: #{row.muaId}
          </span>
        </div>
      ),
    },
    {
      header: t('col_contact'),
      accessor: 'phoneNumber',
      render: (row) => (
        <div className="text-xs">
          <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
            {row.phoneNumber || 'N/A'}
          </p>
          <p className="text-slate-500 dark:text-slate-400">{row.email || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: t('col_cert_name'),
      accessor: 'certName',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {row.imageUrl ? (
            <a
              href={row.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="relative group w-10 h-10 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0"
              title={t('cert_view_original')}
            >
              <img
                src={row.imageUrl}
                alt={row.certName}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                <Eye className="w-3.5 h-3.5" />
              </div>
            </a>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 text-[10px]">
              No img
            </div>
          )}
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              {row.certName || 'Makeup Certificate'}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('col_experience')}: {row.experienceYears || '1+'} {t('unit_years')}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: t('col_uploaded_at'),
      accessor: 'uploadedAt',
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {row.uploadedAt ? formatDate(row.uploadedAt) : '—'}
        </span>
      ),
    },
    {
      header: t('status'),
      accessor: 'status',
      render: (row) => {
        if (row.status === 'VERIFIED' || row.isVerified === true) {
          return <Badge variant="active">{t('status_verified')}</Badge>;
        }
        if (row.status === 'REJECTED') {
          return <Badge variant="rejected">{t('status_rejected')}</Badge>;
        }
        return <Badge variant="pending">{t('status_pending')}</Badge>;
      },
    },
    {
      header: t('col_actions'),
      align: 'right',
      render: (row) => (
        <Button
          variant={
            row.status === 'PENDING' || (!row.status && !row.isVerified)
              ? 'primary'
              : 'secondary'
          }
          size="sm"
          onClick={() => setSelectedCert(row)}
        >
          {row.status === 'PENDING' || (!row.status && !row.isVerified)
            ? t('verify_action')
            : t('review_again')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Award className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('admin_credentials_title')}
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('admin_credentials_sub')}
        </p>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm">{t('error_system_notice')}:</p>
            <p className="mt-0.5 font-mono">{apiError}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadCertificates}>
            {t('retry')}
          </Button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
          >
            <option value={CERT_STATUS.ALL}>{t('admin_agency_filter_all')}</option>
            <option value={CERT_STATUS.PENDING}>{t('status_pending')}</option>
            <option value={CERT_STATUS.VERIFIED}>{t('status_verified')}</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        emptyMessage={t('no_data')}
      />

      {/* Review Modal */}
      <CertificateReviewModal
        isOpen={Boolean(selectedCert)}
        onClose={() => setSelectedCert(null)}
        certificate={selectedCert}
        onVerifySuccess={handleVerifySuccess}
        superAdminService={superAdminService}
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
