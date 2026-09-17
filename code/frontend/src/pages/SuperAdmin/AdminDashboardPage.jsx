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
} from 'lucide-react';
import { superAdminService } from '../../services/super-admin.service';
import { Badge } from '../../components/base/Badge';
import { Button } from '../../components/base/Button';
import { CertificateReviewModal } from '../../components/features/admin/CertificateReviewModal';
import { Toast } from '../../components/base/Toast';
import { useI18nStore } from '../../store/useI18nStore';

export const AdminDashboardPage = () => {
  const { t } = useI18nStore();
  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [pendingMuas, setPendingMuas] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [apiError, setApiError] = useState('');
  const [selectedCert, setSelectedCert] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setApiError('');
      try {
        const [catRes, styleRes, certRes, agencyRes] = await Promise.all([
          superAdminService.getMasterCategories().catch(() => ({ data: [] })),
          superAdminService.getMakeupStyles().catch(() => ({ data: [] })),
          superAdminService.getCertificates().catch(() => ({ data: [] })),
          superAdminService.getAgencies().catch(() => ({ data: [] })),
        ]);
        setCategories(catRes?.data || catRes || []);
        setStyles(styleRes?.data || styleRes || []);
        const cList = certRes?.data || certRes || [];
        const normalized = (Array.isArray(cList) ? cList : []).map((c) => ({
          ...c,
          status: c.status || (c.isVerified === true ? 'VERIFIED' : 'PENDING'),
        }));
        setPendingMuas(normalized);
        const aList = agencyRes?.data || agencyRes || [];
        setAgencies(Array.isArray(aList) ? aList : []);
      } catch (err) {
        setApiError(
          err.message ||
            'Không thể kết nối đến Spring Boot Core API (Port 8080). Vui lòng kiểm tra backend server.'
        );
      }
    };
    fetchData();
  }, []);

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
        ? `Đã phê duyệt chứng chỉ cho MUA #${muaId} thành công!`
        : `Đã từ chối hồ sơ MUA #${muaId}.`
    );
  };

  const pendingCount = pendingMuas.filter(
    (m) => m.status === 'PENDING' || (!m.status && !m.isVerified)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('admin_overview_title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('admin_overview_sub')}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            <p className="font-bold text-sm">Không thể kết nối máy chủ:</p>
            <p className="mt-0.5 font-mono">{apiError}</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Chứng chỉ chờ duyệt */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('kpi_pending_certs')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{pendingCount}</p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Chờ thẩm định</span>
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
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('kpi_active_studios')}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {agencies.length}
              </p>
              <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                <span>{agencies.filter((a) => a.isVerified).length} đã duyệt</span>
                <span>•</span>
                <span className="group-hover:underline">Xem tất cả →</span>
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
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
              {apiError ? 'Mất Kết Nối' : 'Hoạt Động Tốt'}
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
              Hồ Sơ Chứng Chỉ MUA Cần Thẩm Định
            </h2>
          </div>
          <Link
            to="/admin/muas/credentials"
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
          >
            <span>Xem toàn bộ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {pendingMuas.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Hiện tại không có hồ sơ chứng chỉ nào đang chờ thẩm định trong cơ sở dữ liệu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                <tr>
                  <th className="px-6 py-3">Thợ Make-up</th>
                  <th className="px-6 py-3">Chứng chỉ nộp</th>
                  <th className="px-6 py-3">Kinh nghiệm</th>
                  <th className="px-6 py-3">Trạng thái</th>
                  <th className="px-6 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {pendingMuas.map((mua) => (
                  <tr key={mua.muaId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {mua.muaName}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {mua.phoneNumber} • {mua.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {mua.certName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {mua.experienceYears} năm
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {mua.status === 'VERIFIED' || mua.isVerified === true ? (
                        <Badge variant="active">Đã xác thực</Badge>
                      ) : mua.status === 'REJECTED' ? (
                        <Badge variant="rejected">Từ chối</Badge>
                      ) : (
                        <Badge variant="pending">Chờ thẩm định</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant={
                          mua.status === 'PENDING' || (!mua.status && !mua.isVerified)
                            ? 'primary'
                            : 'secondary'
                        }
                        size="sm"
                        onClick={() => setSelectedCert(mua)}
                      >
                        {mua.status === 'PENDING' || (!mua.status && !mua.isVerified)
                          ? t('verify_action')
                          : t('review_again')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
