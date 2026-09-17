import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Package,
  Star,
  Percent,
  QrCode,
  Plus,
  CalendarDays,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { Button } from '../../components/base/Button';
import { StaffInvitationModal } from '../../components/features/agency/StaffInvitationModal';
import { PackageFormModal } from '../../components/features/agency/PackageFormModal';
import { formatCurrency } from '../../utils/formatters';
import { useI18nStore } from '../../store/useI18nStore';

export const AgencyDashboardPage = () => {
  const { t } = useI18nStore();
  const [profile, setProfile] = useState(null);
  const [staffCount, setStaffCount] = useState(0);
  const [packages, setPackages] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      const [profileRes, packageRes, staffRes] = await Promise.allSettled([
        agencyService.getMyProfile(),
        agencyService.getMyPackages(),
        agencyService.getStaffList('ACTIVE'),
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value?.data || profileRes.value);
      } else {
        setApiError(profileRes.reason?.message || t('error_api_connection'));
      }

      if (packageRes.status === 'fulfilled') {
        const list = packageRes.value?.data || packageRes.value || [];
        setPackages(Array.isArray(list) ? list : []);
      }

      if (staffRes.status === 'fulfilled') {
        const sList =
          staffRes.value?.data?.content ||
          staffRes.value?.data ||
          staffRes.value?.content ||
          staffRes.value ||
          [];
        if (Array.isArray(sList)) setStaffCount(sList.length);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Real API Error Alert (Zero Mock Data) */}
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
          <Button variant="secondary" size="sm" onClick={loadDashboardData}>
            Thử Lại
          </Button>
        </div>
      )}

      {/* Top Banner Studio */}
      <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold text-xl">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {profile?.agencyName || 'Studio Make-up Chuyên Nghiệp'}
              </h1>
              {profile?.status && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {profile.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Hotline: <span className="font-mono text-slate-300">{profile?.hotline || 'Chưa cập nhật'}</span> • Địa chỉ: {profile?.addressStreet ? `${profile.addressStreet}, ${profile.addressDistrict || ''}, ${profile.addressCity || ''}` : 'Chưa cập nhật địa chỉ'}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            icon={QrCode}
            onClick={() => setIsInviteModalOpen(true)}
          >
            {t('btn_recruit_qr')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={() => setIsPackageModalOpen(true)}
          >
            {t('btn_create_package')}
          </Button>
          <Link to="/agency/shifts">
            <Button variant="secondary" size="sm" icon={CalendarDays}>
              {t('btn_weekly_shifts')}
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Nhân sự */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('agency_staff_count')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : staffCount}
            </p>
            <Link
              to="/agency/staff"
              className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>Quản lý thợ & tuyển dụng</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Gói Dịch Vụ */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('agency_packages_count')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : packages.length}
            </p>
            <Link
              to="/agency/packages"
              className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>Quản lý gói & Add-ons</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/50">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Hoa hồng mặc định */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('agency_commission_default')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : `${profile?.commissionRateInternal ?? 0}%`}
            </p>
            <Link
              to="/agency/profile"
              className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>Thay đổi chính sách</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Đánh giá trung bình */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('agency_rating_avg')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <span>{profile?.ratingAvg ?? '5.0'}</span>
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {profile?.totalReviews ? `Từ ${profile.totalReviews} lượt khách hàng` : 'Đang cập nhật đánh giá'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/50">
            <Star className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Package Quick View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Gói Dịch Vụ Mở Bán Của Studio
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Khách hàng có thể tìm kiếm và đặt lịch thợ của Studio qua các gói này
            </p>
          </div>
          <Link
            to="/agency/packages"
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700"
          >
            <span>Quản lý chi tiết</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-xs text-slate-400 dark:text-slate-500">
              Studio chưa có gói dịch vụ nào trong cơ sở dữ liệu. Hãy bấm "Tạo Gói Mới" ở góc phải để thêm dịch vụ.
            </div>
          ) : (
            packages.slice(0, 3).map((pkg) => (
              <div
                key={pkg.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/50 hover:shadow-xs transition-all bg-white dark:bg-slate-900/70"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white block truncate">
                    {pkg.packageName}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    Đang Nhận Đơn
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                  {pkg.description || 'Gói make-up tiêu chuẩn chuyên nghiệp của Studio'}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                    {formatCurrency(pkg.price)}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 font-mono">
                    {pkg.durationMinutes || 60} phút
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <StaffInvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onStaffAdded={() => setStaffCount((prev) => prev + 1)}
      />

      <PackageFormModal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        onSuccess={() => {
          agencyService.getMyPackages().then((res) => {
            const list = res?.data || res || [];
            setPackages(Array.isArray(list) ? list : []);
          });
        }}
      />
    </div>
  );
};
