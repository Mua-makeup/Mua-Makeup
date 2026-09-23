import React, { useState, useEffect } from 'react';
import { Building2, Percent, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Input } from '../../base/Input';
import { Button } from '../../base/Button';
import { agencyService } from '../../../services/agency.service';
import { agencyProfileSchema, commissionRateSchema } from '../../../schemas/agency.schema';
import { useI18nStore } from '../../../store/useI18nStore';
import { useAuthStore } from '../../../store/useAuthStore';

const DEFAULT_COMMISSION_RATE = 30;

export const AgencyProfileCommissionModal = ({ isOpen, onClose, onUpdated }) => {
  const { t } = useI18nStore();
  const [agencyName, setAgencyName] = useState('');
  const [hotline, setHotline] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [commissionRate, setCommissionRate] = useState(DEFAULT_COMMISSION_RATE);

  const [profileErrors, setProfileErrors] = useState({});
  const [commissionError, setCommissionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setServerError('');
    setSuccessMessage('');
    setProfileErrors({});
    setCommissionError('');

    const fetchProfile = async () => {
      setIsLoading(true);
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
          setCommissionRate(p.commissionRateInternal ?? DEFAULT_COMMISSION_RATE);
        }
      } catch (err) {
        setServerError(err.response?.data?.message || err.message || t('error_api_connection'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [isOpen, t]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setProfileErrors({});
    setCommissionError('');
    setServerError('');
    setSuccessMessage('');

    const profilePayload = {
      agencyName: agencyName.trim(),
      hotline: hotline.trim(),
      addressStreet: addressStreet.trim(),
      district: addressDistrict.trim(),
      city: addressCity.trim(),
      addressDistrict: addressDistrict.trim(),
      addressCity: addressCity.trim(),
      logoUrl: logoUrl.trim() || undefined,
    };

    const profileVal = agencyProfileSchema.safeParse(profilePayload);
    const commVal = commissionRateSchema.safeParse({ commissionRate: Number(commissionRate) });

    let hasError = false;
    if (!profileVal.success) {
      const fieldErrors = {};
      profileVal.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0]] = err.message;
        }
      });
      setProfileErrors(fieldErrors);
      hasError = true;
    }

    if (!commVal.success) {
      setCommissionError(commVal.error.errors[0]?.message || t('agency_commission_invalid'));
      hasError = true;
    }

    if (hasError) return;

    setIsSubmitting(true);
    try {
      // 1. Update Profile
      const updateRes = await agencyService.updateProfile(profilePayload);
      const updatedProfile = updateRes?.data || updateRes;

      // 2. Update Commission Rate
      await agencyService.updateCommissionRate(Number(commissionRate));

      // Sync user logo into auth store if updated
      const u = useAuthStore.getState().user;
      if (u) {
        useAuthStore.getState().setUser({
          ...u,
          avatarUrl: logoUrl || updatedProfile?.logoUrl || u.avatarUrl,
        });
      }

      // Notify other components (Dashboard, TopRoleBanner) to refresh studio logo
      window.dispatchEvent(
        new CustomEvent('agency-profile-updated', {
          detail: {
            ...updatedProfile,
            logoUrl: logoUrl || updatedProfile?.logoUrl,
          },
        }),
      );

      setSuccessMessage(t('save_success') || 'Đã lưu thay đổi hồ sơ & hoa hồng thành công!');
      onUpdated?.(updatedProfile);

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('menu_agency_profile_commission') || 'Hồ Sơ & Hoa Hồng Studio'}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isLoading || isSubmitting}
            icon={Save}
          >
            {t('save')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{serverError}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Section 1: Studio Profile */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Building2 className="w-4 h-4 text-rose-500" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {t('agency_settings_contact_title') || 'Thông Tin Studio / Đại Lý'}
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('agency_settings_field_agency_name') || 'Tên Studio / Đại Lý'}
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder={t('agency_settings_field_agency_name_ph') || 'Nhập tên thương hiệu'}
              error={profileErrors.agencyName}
              required
            />
            <Input
              label={t('agency_settings_field_hotline') || 'Hotline Liên Hệ'}
              value={hotline}
              onChange={(e) => setHotline(e.target.value)}
              placeholder={t('agency_settings_field_hotline_ph') || '09xxxxxxxx'}
              error={profileErrors.hotline}
              required
            />
          </div>

          <Input
            label={t('agency_settings_field_street') || 'Địa Chỉ Số Nhà & Tên Đường'}
            value={addressStreet}
            onChange={(e) => setAddressStreet(e.target.value)}
            placeholder={t('agency_settings_field_street_ph') || 'Số 123 đường ABC'}
            error={profileErrors.addressStreet}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('agency_settings_field_district') || 'Quận / Huyện'}
              value={addressDistrict}
              onChange={(e) => setAddressDistrict(e.target.value)}
              placeholder={t('agency_settings_field_district_ph') || 'Quận 1, Hoàng Mai...'}
              error={profileErrors.district}
              required
            />
            <Input
              label={t('agency_settings_field_city') || 'Tỉnh / Thành Phố'}
              value={addressCity}
              onChange={(e) => setAddressCity(e.target.value)}
              placeholder={t('agency_settings_field_city_ph') || 'Hà Nội, TP. Hồ Chí Minh...'}
              error={profileErrors.city}
              required
            />
          </div>

          <Input
            label={t('agency_settings_field_logo') || 'Đường Dẫn Logo Studio (URL)'}
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder={t('agency_settings_field_logo_ph') || 'https://...'}
            error={profileErrors.logoUrl}
          />
        </div>

        {/* Section 2: Commission Rate Policy */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Percent className="w-4 h-4 text-rose-500" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {t('agency_detail_commission') || 'Tỷ Lệ Hoa Hồng Mặc Định'}
            </h4>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {t('agency_detail_commission')} (%)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {t('agency_commission_desc')}
                </p>
              </div>

              <div className="w-32 shrink-0">
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  error={commissionError}
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
