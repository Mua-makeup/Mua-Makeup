import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Building2,
  Activity,
  ArrowRight,
  Clock,
  Layers,
  AlertTriangle,
  Shield,
  Eye,
} from 'lucide-react';
import { superAdminService } from '../../services/super-admin.service';
import { Badge } from '../../components/base/Badge';
import { Button } from '../../components/base/Button';
import { DataTable } from '../../components/base/DataTable';
import { CertificateReviewModal } from '../../components/features/admin/CertificateReviewModal';
import { Toast } from '../../components/base/Toast';
import { useI18nStore } from '../../store/useI18nStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getSavedPageSize, savePageSize } from '../../utils/pagination.util';

export const AdminDashboardPage = () => {
  const { t } = useI18nStore();
  const user = useAuthStore((state) => state.user);
  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [pendingMuas, setPendingMuas] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [apiError, setApiError] = useState('');
  const [selectedCert, setSelectedCert] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const [certPage, setCertPage] = useState(0);
  const [certPageSize, setCertPageSize] = useState(getSavedPageSize(10));

  useEffect(() => {
    const fetchData = async () => {
      setApiError('');
      try {
        const [catRes, styleRes, certRes, agencyRes] = await Promise.all([
          superAdminService.getMasterCategories().catch(() => ({ data: [] })),
          superAdminService.getMakeupStyles().catch(() => ({ data: [] })),
          superAdminService.getCertificates({ size: 100 }).catch(() => ({ data: [] })),
          superAdminService.getAgencies({ size: 100 }).catch(() => ({ data: [] })),
        ]);
        setCategories(catRes?.data || catRes || []);
        setStyles(styleRes?.data || styleRes || []);

        const cData = certRes?.data || certRes;
        const cList = cData?.content || (Array.isArray(cData) ? cData : []);
        const normalized = cList.map((c) => ({
          ...c,
          status: c.status || (c.isVerified === true ? 'VERIFIED' : 'PENDING'),
        }));
        setPendingMuas(normalized);

        const aData = agencyRes?.data || agencyRes;
        const aList = aData?.content || (Array.isArray(aData) ? aData : []);
        setAgencies(aList);
      } catch (err) {
        setApiError(err.message || t('error_api_connection'));
      }
    };
    fetchData();
  }, [t]);

  const handleVerifySuccess = ({ muaId, certIndex, isVerified, status }) => {
    setPendingMuas((prev) =>
      prev.map((m) =>
        m.muaId === muaId && (certIndex == null || m.certIndex === certIndex)
          ? {
              ...m,
              isVerified,
              status: status || (isVerified ? 'VERIFIED' : 'REJECTED'),
            }
          : m
      )
    );
    setToastMessage(
      isVerified
        ? `${t('admin_cert_approved_toast')} (#${muaId})`
        : `${t('admin_cert_rejected_toast')} (#${muaId})`
    );
  };

  const pendingCount = pendingMuas.filter(
    (m) => m.status === 'PENDING' || (!m.status && !m.isVerified)
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Admin */}
      <div className="p-6 bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:to-indigo-950 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors w-full">
        <div className="flex items-center gap-4 min-w-0">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Admin Avatar"
              className="w-14 h-14 rounded-2xl object-cover border border-rose-200 dark:border-rose-500/40 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xl shrink-0 transition-colors">
              <Shield className="w-7 h-7" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {t('admin_overview_title')}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 shrink-0">
                {t('role_super_admin')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('admin_overview_sub')}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-start md:justify-end gap-2.5 shrink-0 md:ml-auto">
          <Link to="/admin/agencies">
            <Button variant="secondary" size="sm" icon={Building2}>
              {t('nav_admin_agencies')} ({agencies.length})
            </Button>
          </Link>
          <Link to="/admin/muas/credentials">
            <Button variant="primary" size="sm" icon={Award}>
              {t('nav_admin_credentials')} ({pendingCount})
            </Button>
          </Link>
          <Link to="/admin/taxonomy">
            <Button variant="secondary" size="sm" icon={Layers}>
              {t('nav_admin_taxonomy')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Real API Error Alert if Backend is down */}
      {apiError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm">{t('error_system_notice')}:</p>
            <p className="mt-0.5 font-mono">{apiError}</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Chứng chỉ chờ duyệt */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('kpi_pending_certs')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{pendingCount}</p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{t('status_pending')}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Studio hoạt động */}
        <Link to="/admin/agencies" className="block group">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-all group-hover:border-indigo-400 dark:group-hover:border-indigo-600">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t('kpi_active_studios')}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {agencies.length}
              </p>
              <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                <span>{agencies.filter((a) => a.isVerified).length} {t('status_verified')}</span>
                <span>•</span>
                <span className="group-hover:underline">{t('view_all')} →</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </Link>

        {/* Card 3: Danh mục & Phong cách */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('kpi_taxonomy')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {categories.length} / {styles.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Trạng thái Hệ thống Core API */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('kpi_system_health')}
            </p>
            <p
              className={`mt-1 text-lg font-bold flex items-center gap-1.5 ${
                apiError ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  apiError ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'
                }`}
              ></span>
              {apiError ? t('system_offline') : t('system_online')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Queue Bằng cấp cần thẩm định */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('admin_cert_queue_title')}
            </h2>
          </div>
          <Link
            to="/admin/muas/credentials"
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
          >
            <span>{t('view_all')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable
          columns={[
            {
              header: t('col_staff_name'),
              accessor: 'muaName',
              render: (mua) => (
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {mua.muaName}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {mua.phoneNumber} {mua.email ? `• ${mua.email}` : ''}
                  </span>
                </div>
              ),
            },
            {
              header: t('col_cert_name'),
              accessor: 'certName',
              render: (mua) => (
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {mua.certName}
                </span>
              ),
            },
            {
              header: t('col_experience'),
              accessor: 'experienceYears',
              render: (mua) => (
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {mua.experienceYears} {t('unit_years')}
                </span>
              ),
            },
            {
              header: t('status'),
              accessor: 'status',
              render: (mua) =>
                mua.status === 'VERIFIED' || mua.isVerified === true ? (
                  <Badge variant="active">{t('status_verified')}</Badge>
                ) : mua.status === 'REJECTED' ? (
                  <Badge variant="rejected">{t('status_rejected')}</Badge>
                ) : (
                  <Badge variant="pending">{t('status_pending')}</Badge>
                ),
            },
            {
              header: t('actions'),
              align: 'right',
              render: (mua) => (
                <button
                  onClick={() => setSelectedCert(mua)}
                  className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 transition-colors cursor-pointer"
                  title={
                    mua.status === 'PENDING' || (!mua.status && !mua.isVerified)
                      ? t('verify_action')
                      : t('review_again')
                  }
                >
                  <Eye className="w-4 h-4" />
                </button>
              ),
            },
          ]}
          data={pendingMuas.slice(certPage * certPageSize, (certPage + 1) * certPageSize)}
          isLoading={false}
          emptyMessage={t('admin_cert_queue_empty')}
          pagination={{
            page: certPage,
            size: certPageSize,
            totalElements: pendingMuas.length,
            totalPages: Math.max(Math.ceil(pendingMuas.length / certPageSize), 1),
            onPageChange: (newPage1Indexed) => setCertPage(newPage1Indexed - 1),
            onPageSizeChange: (newSize) => {
              savePageSize(newSize);
              setCertPageSize(newSize);
              setCertPage(0);
            },
          }}
        />
      </div>

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
