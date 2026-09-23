import React, { useEffect, useState } from 'react';
import {
  Building2,
  TrendingUp,
  Save,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Compass,
  Eye,
} from 'lucide-react';
import { Button } from '../../components/base/Button';
import { Toast } from '../../components/base/Toast';
import { LocationMapPicker } from '../../components/features/agency/LocationMapPicker';
import { AgencyStudioDetailModal } from '../../components/features/agency/AgencyStudioDetailModal';
import { agencyService } from '../../services/agency.service';
import { useI18nStore } from '../../store/useI18nStore';

export const AgencySettingsPage = () => {
  const { t } = useI18nStore();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingSurge, setIsTogglingSurge] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    agencyName: '',
    hotline: '',
    addressStreet: '',
    district: '',
    city: 'Thành phố Hồ Chí Minh',
    logoUrl: '',
    latitude: 10.776889,
    longitude: 106.700806,
    isSurgeEnabled: true,
  });

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await agencyService.getMyProfile();
      const data = res.data || res;
      setProfile(data);

      setFormData({
        agencyName: data.agencyName || '',
        hotline: data.hotline || '',
        addressStreet: data.addressStreet || '',
        district: data.district || '',
        city: data.city || 'Thành phố Hồ Chí Minh',
        logoUrl: data.logoUrl || '',
        latitude: data.latitude ? Number(data.latitude) : 10.776889,
        longitude: data.longitude ? Number(data.longitude) : 106.700806,
        isSurgeEnabled: data.isSurgeEnabled !== undefined ? data.isSurgeEnabled : true,
      });
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.response?.data?.message || t('error_general'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleMapLocationChange = (loc) => {
    setFormData((prev) => ({
      ...prev,
      latitude: loc.latitude !== undefined ? loc.latitude : prev.latitude,
      longitude: loc.longitude !== undefined ? loc.longitude : prev.longitude,
      addressStreet: loc.addressStreet || prev.addressStreet,
      district: loc.district || prev.district,
      city: loc.city || prev.city,
    }));
  };

  // Instant Auto-Save Toggle for H3 Surge Pricing Policy
  const handleInstantToggleSurge = async (checked) => {
    setIsTogglingSurge(true);
    setFormData((prev) => ({ ...prev, isSurgeEnabled: checked }));

    try {
      const payload = {
        agencyName: (formData.agencyName || profile?.agencyName || 'Studio').trim(),
        hotline: (formData.hotline || profile?.hotline || '0900000000').trim(),
        addressStreet: (formData.addressStreet || profile?.addressStreet || 'Street Address').trim(),
        district: (formData.district || profile?.district || 'Quận 1').trim(),
        city: (formData.city || profile?.city || 'Thành phố Hồ Chí Minh').trim(),
        logoUrl: formData.logoUrl ? formData.logoUrl.trim() : undefined,
        latitude: formData.latitude,
        longitude: formData.longitude,
        isSurgeEnabled: checked,
      };

      const res = await agencyService.updateProfile(payload);
      const updated = res.data || res;
      setProfile(updated);

      setToastMessage({
        type: 'success',
        text: checked
          ? t('agency_settings_surge_instant_on')
          : t('agency_settings_surge_instant_off'),
      });
    } catch (err) {
      setFormData((prev) => ({ ...prev, isSurgeEnabled: !checked }));
      setToastMessage({
        type: 'error',
        text: err.response?.data?.message || t('error_general'),
      });
    } finally {
      setIsTogglingSurge(false);
    }
  };

  // Save Coordinates and Map Location
  const handleSaveMapLocation = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        agencyName: (formData.agencyName || profile?.agencyName || 'Studio').trim(),
        hotline: (formData.hotline || profile?.hotline || '0900000000').trim(),
        addressStreet: (formData.addressStreet || profile?.addressStreet || 'Street Address').trim(),
        district: (formData.district || profile?.district || 'Quận 1').trim(),
        city: (formData.city || profile?.city || 'Thành phố Hồ Chí Minh').trim(),
        logoUrl: formData.logoUrl ? formData.logoUrl.trim() : undefined,
        latitude: formData.latitude,
        longitude: formData.longitude,
        isSurgeEnabled: formData.isSurgeEnabled,
      };

      const res = await agencyService.updateProfile(payload);
      const updated = res.data || res;
      setProfile(updated);

      setToastMessage({
        type: 'success',
        text: t('agency_settings_save_success'),
      });
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.response?.data?.message || t('error_general'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-2">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          {profile?.logoUrl ? (
            <img
              src={profile.logoUrl}
              alt="Studio Logo"
              className="w-10 h-10 rounded-xl object-cover border border-rose-200 dark:border-rose-800 shadow-md shadow-rose-500/20 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('agency_settings_title')}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t('agency_settings_sub')}
            </p>
          </div>
        </div>

        {/* Verification Status Pill */}
        {profile?.isVerified ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold self-start md:self-auto shrink-0">
            <ShieldCheck className="w-4 h-4" />
            <span>{t('agency_settings_verified_badge')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold self-start md:self-auto shrink-0">
            <AlertCircle className="w-4 h-4" />
            <span>{t('agency_settings_pending_badge')}</span>
          </div>
        )}
      </div>

      {/* Toast Notification (Auto dismiss after 3s) */}
      <Toast
        message={toastMessage?.text}
        type={toastMessage?.type || 'success'}
        onClose={() => setToastMessage(null)}
        duration={3000}
      />

      {/* SECTION 1: SURGE PRICING POLICY (INSTANT AUTO-SAVE TOGGLE) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                <span>{t('agency_settings_surge_title')}</span>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {t('agency_settings_surge_badge')}
                </span>
              </h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {t('agency_settings_surge_desc')}
              </p>
            </div>
          </div>

          {/* Instant Toggle Switch with API Spinner */}
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            {isTogglingSurge ? (
              <div className="flex items-center gap-1.5 text-xs text-rose-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('loading')}</span>
              </div>
            ) : (
              <span className="text-xs font-semibold">
                {formData.isSurgeEnabled ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {t('agency_settings_surge_enabled')}
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {t('agency_settings_surge_disabled')}
                  </span>
                )}
              </span>
            )}

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isSurgeEnabled}
                disabled={isTogglingSurge}
                onChange={(e) => handleInstantToggleSurge(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 2: MAP RADAR LOCATION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-rose-500 shrink-0" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('agency_settings_map_title')}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">
              {t('agency_settings_map_coords')}: {formData.latitude?.toFixed(5)}, {formData.longitude?.toFixed(5)}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Eye}
              onClick={() => setIsDetailModalOpen(true)}
              className="shadow-xs text-xs py-1 px-3 h-8 shrink-0"
            >
              <span>{t('btn_detail') || 'Chi Tiết'}</span>
            </Button>
          </div>
        </div>

        {/* Location Map Picker */}
        <LocationMapPicker
          latitude={formData.latitude}
          longitude={formData.longitude}
          addressStreet={formData.addressStreet}
          district={formData.district}
          city={formData.city}
          onChange={handleMapLocationChange}
        />

        {/* Save Map Location Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('agency_settings_map_desc')}
          </p>
          <Button
            type="button"
            size="md"
            variant="primary"
            icon={Save}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            onClick={handleSaveMapLocation}
            className="w-full sm:w-auto px-6 shadow-md shadow-rose-500/20 shrink-0"
          >
            {t('agency_settings_btn_save') || 'Lưu Vị Trí Bản Đồ'}
          </Button>
        </div>
      </div>

      {/* Modal Studio Read-Only Detail */}
      <AgencyStudioDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        data={{
          ...profile,
          ...formData,
        }}
      />
    </div>
  );
};
