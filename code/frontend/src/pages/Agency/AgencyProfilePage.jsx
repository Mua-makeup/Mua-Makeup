import React, { useState, useEffect } from 'react';
import { Building2, Percent, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { Input } from '../../components/base/Input';
import { Button } from '../../components/base/Button';
import { agencyProfileSchema, commissionRateSchema } from '../../schemas/agency.schema';
import { useI18nStore } from '../../store/useI18nStore';
import { useAuthStore } from '../../store/useAuthStore';

export const AgencyProfilePage = () => {
  const { t } = useI18nStore();
  const [agencyName, setAgencyName] = useState('');
  const [hotline, setHotline] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [commissionRate, setCommissionRate] = useState(30);

  const [profileErrors, setProfileErrors] = useState({});
  const [commissionError, setCommissionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [serverError, setServerError] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingCommission, setIsLoadingCommission] = useState(false);

  const loadProfile = async () => {
    setServerError('');
    try {
      const res = await agencyService.getMyProfile();
      const p = res?.data || res;
      if (p) {
        setAgencyName(p.agencyName || '');
        setHotline(p.hotline || '');
        setAddressStreet(p.addressStreet || '');
        setAddressDistrict(p.district || p.addressDistrict || '');
        setAddressCity(p.city || p.addressCity || '');
        setLogoUrl(p.logoUrl || '');
        setCommissionRate(p.commissionRateInternal ?? 30);
        if (p.logoUrl) {
          const u = useAuthStore.getState().user;
          if (u && u.avatarUrl !== p.logoUrl) {
            useAuthStore.getState().setUser({ ...u, avatarUrl: p.logoUrl });
          }
        }
      }
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || t('error_api_connection'));
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileErrors({});
    setServerError('');
    setSuccessMessage('');

    const payload = {
      agencyName: agencyName.trim(),
      hotline: hotline.trim(),
      addressStreet: addressStreet.trim(),
      district: addressDistrict.trim(),
      city: addressCity.trim(),
      addressDistrict: addressDistrict.trim(),
      addressCity: addressCity.trim(),
      logoUrl: logoUrl.trim() || undefined,
    };

    const validation = agencyProfileSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors = {};
      validation.error.errors.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });
      setProfileErrors(fieldErrors);
      return;
    }

    setIsLoadingProfile(true);
    try {
      const res = await agencyService.updateProfile(payload);
      if (payload.logoUrl) {
        const u = useAuthStore.getState().user;
        if (u) {
          useAuthStore.getState().setUser({ ...u, avatarUrl: payload.logoUrl });
        }
      }
      setSuccessMessage(res?.message || t('save_success'));
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setServerError(err.message || t('error_general'));
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleUpdateCommission = async (e) => {
    e.preventDefault();
    setCommissionError('');
    setSuccessMessage('');

    const validation = commissionRateSchema.safeParse({
      commissionRate: Number(commissionRate),
    });
    if (!validation.success) {
      setCommissionError(validation.error.errors[0]?.message || t('error_general'));
      return;
    }

    setIsLoadingCommission(true);
    try {
      const res = await agencyService.updateDefaultCommission(Number(commissionRate));
      setSuccessMessage(res?.message || t('save_success'));
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setCommissionError(err.message || t('error_general'));
    } finally {
      setIsLoadingCommission(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* API / Server Error Alert */}
      {serverError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold text-sm">
              {serverError.toLowerCase().includes('connect') || serverError.toLowerCase().includes('network')
                ? t('error_api_connection')
                : t('error_system_notice')}
            </strong>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400 font-mono">
              {serverError}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadProfile}>
              {t('reload')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setServerError('')}>
              {t('close')}
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('agency_profile_title')}
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('agency_profile_sub')}
        </p>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Hồ sơ Studio */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            {t('studio_info_title')}
          </h2>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('field_studio_name')}
                required
                placeholder="VD: Glamour Beauty Studio"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                error={profileErrors.agencyName}
              />

              <Input
                label={t('field_hotline')}
                required
                placeholder="0912345678"
                value={hotline}
                onChange={(e) => setHotline(e.target.value)}
                error={profileErrors.hotline}
              />
            </div>

            <Input
              label={t('field_street')}
              required
              placeholder="VD: 128 Nguyễn Huệ, Phường Bến Nghé"
              value={addressStreet}
              onChange={(e) => setAddressStreet(e.target.value)}
              error={profileErrors.addressStreet}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('field_district')}
                required
                placeholder="Quận 1"
                value={addressDistrict}
                onChange={(e) => setAddressDistrict(e.target.value)}
                error={profileErrors.addressDistrict}
              />

              <Input
                label={t('field_city')}
                required
                placeholder="Hồ Chí Minh"
                value={addressCity}
                onChange={(e) => setAddressCity(e.target.value)}
                error={profileErrors.addressCity}
              />
            </div>

            <Input
              label={t('field_logo_url')}
              type="url"
              placeholder="https://..."
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              error={profileErrors.logoUrl}
            />

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                icon={Save}
                isLoading={isLoadingProfile}
              >
                {t('btn_save_profile')}
              </Button>
            </div>
          </form>
        </div>

        {/* Cột Chính sách hoa hồng Studio */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('commission_default_title')}</h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('commission_default_desc')}
            </p>

            <form onSubmit={handleUpdateCommission} className="space-y-4">
              <Input
                label={t('commission_label')}
                type="number"
                min="0"
                max="60"
                step="0.5"
                required
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                error={commissionError}
                helperText={t('commission_helper')}
              />

              <Button
                type="submit"
                variant="secondary"
                className="w-full"
                icon={Save}
                isLoading={isLoadingCommission}
              >
                {t('btn_save_commission')}
              </Button>
            </form>
          </div>

          <div className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <p className="font-bold text-slate-800 dark:text-slate-200">{t('business_notes_title')}</p>
            <p>
              {t('business_note_1')}
            </p>
            <p>
              {t('business_note_2')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
