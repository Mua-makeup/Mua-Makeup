import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Input } from '../../base/Input';
import { Button } from '../../base/Button';
import { agencyService } from '../../../services/agency.service';
import { agencyProfileSchema } from '../../../schemas/agency.schema';
import { useI18nStore } from '../../../store/useI18nStore';

export const AgencyContactInfoModal = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const { t } = useI18nStore();
  const [formData, setFormData] = useState({
    agencyName: '',
    hotline: '',
    addressStreet: '',
    district: '',
    city: 'Thành phố Hồ Chí Minh',
    logoUrl: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        agencyName: initialData.agencyName || '',
        hotline: initialData.hotline || '',
        addressStreet: initialData.addressStreet || '',
        district: initialData.district || '',
        city: initialData.city || 'Thành phố Hồ Chí Minh',
        logoUrl: initialData.logoUrl || '',
      });
    }
    setFormErrors({});
    setApiError('');
  }, [initialData, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const geocodeAddress = async (addressQuery) => {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(addressQuery)}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        const geom = data.features[0].geometry || {};
        const lng = Number(geom.coordinates?.[0]);
        const lat = Number(geom.coordinates?.[1]);
        if (lat && lng) {
          return { latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) };
        }
      }
    } catch {
      // Ignore geocode error and keep existing coordinates
    }
    return null;
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFormErrors({});
    setApiError('');

    setIsSubmitting(true);
    try {
      // Check if address was updated
      const newAddr = [formData.addressStreet, formData.district, formData.city].filter(Boolean).join(', ');
      const oldAddr = [initialData?.addressStreet, initialData?.district, initialData?.city].filter(Boolean).join(', ');

      let targetLat = initialData?.latitude;
      let targetLng = initialData?.longitude;

      if (newAddr && newAddr !== oldAddr) {
        const coords = await geocodeAddress(newAddr);
        if (coords) {
          targetLat = coords.latitude;
          targetLng = coords.longitude;
        }
      }

      const fullPayload = {
        ...initialData,
        agencyName: (formData.agencyName || '').trim(),
        hotline: (formData.hotline || '').trim(),
        addressStreet: (formData.addressStreet || '').trim(),
        district: (formData.district || '').trim(),
        city: (formData.city || '').trim(),
        logoUrl: formData.logoUrl ? formData.logoUrl.trim() : undefined,
        latitude: targetLat,
        longitude: targetLng,
      };

      const validation = agencyProfileSchema.safeParse(fullPayload);
      if (!validation.success) {
        const errors = {};
        validation.error.errors.forEach((err) => {
          const path = err.path[0];
          errors[path] = err.message;
        });
        setFormErrors(errors);
        setIsSubmitting(false);
        return;
      }

      const res = await agencyService.updateProfile(fullPayload);
      const updated = res.data || res;
      onSuccess?.(updated);
      onClose();
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('agency_settings_contact_title') || 'Thông Tin Địa Chỉ & Liên Hệ'}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            icon={Save}
          >
            {t('agency_settings_btn_save') || 'Lưu Thay Đổi'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs">
            {apiError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t('agency_settings_field_agency_name')}
            value={formData.agencyName}
            onChange={(e) => handleInputChange('agencyName', e.target.value)}
            placeholder={t('agency_settings_field_agency_name_ph')}
            error={formErrors.agencyName}
            required
          />

          <Input
            label={t('agency_settings_field_hotline')}
            value={formData.hotline}
            onChange={(e) => handleInputChange('hotline', e.target.value)}
            placeholder={t('agency_settings_field_hotline_ph')}
            error={formErrors.hotline}
            required
          />
        </div>

        <Input
          label={t('agency_settings_field_street')}
          value={formData.addressStreet}
          onChange={(e) => handleInputChange('addressStreet', e.target.value)}
          placeholder={t('agency_settings_field_street_ph')}
          error={formErrors.addressStreet}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t('agency_settings_field_district')}
            value={formData.district}
            onChange={(e) => handleInputChange('district', e.target.value)}
            placeholder={t('agency_settings_field_district_ph')}
            error={formErrors.district}
            required
          />

          <Input
            label={t('agency_settings_field_city')}
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            placeholder={t('agency_settings_field_city_ph')}
            error={formErrors.city}
            required
          />
        </div>

        <Input
          label={t('agency_settings_field_logo')}
          value={formData.logoUrl}
          onChange={(e) => handleInputChange('logoUrl', e.target.value)}
          placeholder={t('agency_settings_field_logo_ph')}
          error={formErrors.logoUrl}
        />
      </form>
    </Modal>
  );
};
