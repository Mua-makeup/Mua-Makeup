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
import { useAuthStore } from '../../store/useAuthStore';

export const AgencyDashboardPage = () => {
  const { t } = useI18nStore();
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState(null);
  const [staffCount, setStaffCount] = useState(0);
  const [packages, setPackages] = useState([]);
  const [packageTotalCount, setPackageTotalCount] = useState(0);
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logoLoadError, setLogoLoadError] = useState(false);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      const [profileRes, packageRes, staffRes] = await Promise.allSettled([
        agencyService.getMyProfile(),
        agencyService.getMyPackages({ page: 0, size: 50 }),
        agencyService.getStaffList('ACTIVE'),
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value?.data || profileRes.value);
      } else {
        setApiError(profileRes.reason?.message || t('error_api_connection'));
      }

      if (packageRes.status === 'fulfilled') {
        const pData = packageRes.value?.data || packageRes.value || {};
        const list = Array.isArray(pData)
          ? pData
          : (Array.isArray(pData.content) ? pData.content : []);
        const total = Array.isArray(pData)
          ? pData.length
          : (pData.totalElements ?? pData.total_elements ?? list.length);
        setPackages(list);
        setPackageTotalCount(total);
      }

      if (staffRes.status === 'fulfilled') {
        const sData = staffRes.value?.data || staffRes.value || {};
        const sList = Array.isArray(sData)
          ? sData
          : (Array.isArray(sData.content) ? sData.content : []);
        const total = Array.isArray(sData)
          ? sData.length
          : (sData.totalElements ?? sData.total_elements ?? sList.length);
        setStaffCount(total);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const handleProfileUpdated = (e) => {
      const updated = e.detail;
      if (updated) {
        setProfile((prev) => (prev ? { ...prev, ...updated } : updated));
        setLogoLoadError(false);
      } else {
        loadDashboardData();
      }
    };

    window.addEventListener('agency-profile-updated', handleProfileUpdated);
    return () => window.removeEventListener('agency-profile-updated', handleProfileUpdated);
  }, []);

  const studioLogo = (!logoLoadError && (profile?.logoUrl || user?.avatarUrl)) || null;

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
            {t('retry')}
          </Button>
        </div>
      )}

      {/* Unverified Agency Notice */}
      {profile && !profile.isVerified && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm">{t('agency_unverified_banner_title')}</p>
            <p className="mt-1 leading-relaxed">
              {t('agency_unverified_banner_desc')}
            </p>
          </div>
        </div>
      )}

      {/* Top Banner Studio */}
      <div className="p-4 sm:p-6 bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:to-indigo-950 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6 transition-colors w-full">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          {studioLogo ? (
            <img
              src={studioLogo}
              alt={profile?.agencyName || 'Studio Agency'}
              onError={() => setLogoLoadError(true)}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-rose-200 dark:border-rose-500/40 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xl shrink-0 transition-colors">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                {profile?.agencyName || 'Studio Agency'}
              </h1>
              {profile?.isVerified ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 shrink-0">
                  {t('agency_status_verified')}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 shrink-0">
                  {t('agency_status_pending')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
              Hotline: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{profile?.hotline || 'N/A'}</span> • {profile?.addressStreet ? `${profile.addressStreet}, ${profile.district || ''}, ${profile.city || ''}` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap items-center justify-start md:justify-end gap-2.5 shrink-0 md:ml-auto w-full md:w-auto [&>*]:w-full sm:[&>*]:w-auto">
          <Button
            variant="primary"
            size="sm"
            icon={QrCode}
            disabled={!profile?.isVerified}
            onClick={() => setIsInviteModalOpen(true)}
            className="w-full sm:w-auto"
          >
            {t('btn_recruit_qr')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Plus}
            disabled={!profile?.isVerified}
            onClick={() => setIsPackageModalOpen(true)}
            className="w-full sm:w-auto"
          >
            {t('btn_create_package')}
          </Button>
          {profile?.isVerified ? (
            <Link to="/agency/shifts" className="w-full sm:w-auto">
              <Button variant="secondary" size="sm" icon={CalendarDays} className="w-full sm:w-auto">
                {t('btn_weekly_shifts')}
              </Button>
            </Link>
          ) : (
            <Button variant="secondary" size="sm" icon={CalendarDays} disabled className="w-full sm:w-auto">
              {t('btn_weekly_shifts')}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Nhân sự */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('agency_staff_count')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : staffCount}
            </p>
            <Link
              to="/agency/staff"
              className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>{t('nav_agency_staff')}</span>
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
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('agency_packages_count')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : (packageTotalCount || packages.length)}
            </p>
            <Link
              to="/agency/packages"
              className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>{t('nav_agency_packages')}</span>
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
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('agency_commission_default')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : `${profile?.commissionRateInternal ?? 0}%`}
            </p>
            <Link
              to="/agency/profile"
              className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>{t('nav_agency_profile')}</span>
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
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('agency_rating_avg')}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <span>
                {profile?.ratingAvg && Number(profile.ratingAvg) > 0
                  ? Number(profile.ratingAvg).toFixed(1)
                  : 'N/A'}
              </span>
              <Star className={`w-5 h-5 ${profile?.ratingAvg && Number(profile.ratingAvg) > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {profile?.totalReviews ? `${t('agency_reviews_count_prefix')} ${profile.totalReviews} ${t('agency_reviews_count_suffix')}` : t('agency_reviews_updating')}
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
              {t('agency_packages_preview_title')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('agency_packages_preview_desc')}
            </p>
          </div>
          <Link
            to="/agency/packages"
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700"
          >
            <span>{t('view_all')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-xs text-slate-400 dark:text-slate-500">
              {t('agency_packages_preview_empty')}
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
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      pkg.isAvailable !== false
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {pkg.isAvailable !== false ? t('status_active') : t('status_paused')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                  {pkg.description || t('agency_package_default_desc')}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                    {formatCurrency(pkg.price)}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 font-mono">
                    {pkg.durationMinutes ?? pkg.estimatedDurationMinutes ?? 60} {t('unit_minutes')}
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
          loadDashboardData();
        }}
      />
    </div>
  );
};
