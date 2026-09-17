import React, { useState, useEffect, useMemo } from 'react';
import { Award, Search, Filter, AlertTriangle } from 'lucide-react';
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
  const [muaList, setMuaList] = useState([]);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setApiError('');
    setIsLoading(false);
  }, []);

  const filteredData = useMemo(() => {
    return muaList.filter((item) => {
      const matchStatus =
        statusFilter === CERT_STATUS.ALL || item.status === statusFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        item.muaName?.toLowerCase().includes(query) ||
        item.phoneNumber?.includes(query) ||
        item.certName?.toLowerCase().includes(query);
      return matchStatus && matchQuery;
    });
  }, [muaList, statusFilter, searchQuery]);

  const handleVerifySuccess = ({ muaId, isVerified, notes }) => {
    setMuaList((prev) =>
      prev.map((m) =>
        m.muaId === muaId
          ? {
              ...m,
              status: isVerified ? 'VERIFIED' : 'REJECTED',
              notes: notes || m.notes,
            }
          : m
      )
    );
    setToastMessage(
      isVerified
        ? `Đã phê duyệt chứng chỉ cho MUA #${muaId} thành công!`
        : `Đã từ chối hồ sơ MUA #${muaId}.`
    );
  };

  const columns = [
    {
      header: 'Thợ Make-up',
      accessor: 'muaName',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-white block">
            {row.muaName || `MUA #${row.muaId}`}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            ID: {row.muaId}
          </span>
        </div>
      ),
    },
    {
      header: 'Liên Hệ',
      accessor: 'phoneNumber',
      render: (row) => (
        <div className="text-xs">
          <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
            {row.phoneNumber || 'Chưa cập nhật'}
          </p>
          <p className="text-slate-500 dark:text-slate-400">{row.email || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Tên Chứng Chỉ',
      accessor: 'certName',
      render: (row) => (
        <div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
            {row.certName || 'Chứng chỉ hành nghề'}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Kinh nghiệm: {row.experienceYears || '1+'} năm
          </span>
        </div>
      ),
    },
    {
      header: 'Ngày Nộp',
      accessor: 'submittedAt',
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {row.submittedAt ? formatDate(row.submittedAt) : 'Mới nộp'}
        </span>
      ),
    },
    {
      header: t('status'),
      accessor: 'status',
      render: (row) => {
        if (row.status === 'PENDING')
          return <Badge variant="pending">Chờ Thẩm Định</Badge>;
        if (row.status === 'VERIFIED')
          return <Badge variant="active">Đã Xác Thực</Badge>;
        return <Badge variant="rejected">Đã Từ Chối</Badge>;
      },
    },
    {
      header: t('actions'),
      align: 'right',
      render: (row) => (
        <Button
          variant={row.status === 'PENDING' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setSelectedCert(row)}
        >
          {row.status === 'PENDING' ? t('verify_action') : t('review_again')}
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
            {t('nav_admin_credentials')}
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Dữ liệu nạp trực tiếp từ CSDL mua_schema.mua_profiles (mảng certificates)
        </p>
      </div>

      {apiError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Lỗi Kết Nối CSDL:</p>
            <p className="mt-0.5">{apiError}</p>
          </div>
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
            <option value={CERT_STATUS.ALL}>Tất Cả Trạng Thái</option>
            <option value={CERT_STATUS.PENDING}>Chờ Thẩm Định</option>
            <option value={CERT_STATUS.VERIFIED}>Đã Xác Thực</option>
            <option value={CERT_STATUS.REJECTED}>Đã Từ Chối</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        emptyMessage="Hiện tại chưa có chứng chỉ MUA nào được lưu trong cơ sở dữ liệu."
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
