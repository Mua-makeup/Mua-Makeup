import React, { useState } from 'react';
import { Eye, EyeOff, Building2, User, ShieldAlert, Sparkles } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Input } from '../../base/Input';
import { Button } from '../../base/Button';
import { superAdminService } from '../../../services/super-admin.service';
import { useI18nStore } from '../../../store/useI18nStore';

const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!._-]).{8,50}$/;
const PHONE_REGEX = /^(0|84)(3|5|7|8|9)[0-9]{8}$/;

export const CreateAgencyModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useI18nStore();

  const [formData, setFormData] = useState({
    // Studio details
    agencyName: '',
    hotline: '',
    addressStreet: '',
    district: '',
    city: 'Hà Nội',
    commissionRateInternal: 15,
    // Owner personal details
    ownerFullName: '',
    ownerPhone: '',
    ownerEmail: '',
    ownerGender: 'FEMALE',
    ownerPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const resetForm = () => {
    setFormData({
      agencyName: '',
      hotline: '',
      addressStreet: '',
      district: '',
      city: 'Hà Nội',
      commissionRateInternal: 15,
      ownerFullName: '',
      ownerPhone: '',
      ownerEmail: '',
      ownerGender: 'FEMALE',
      ownerPassword: '',
    });
    setShowPassword(false);
    setErrors({});
    setApiError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    const errs = {};

    // Validate Owner Personal Details
    if (!formData.ownerFullName.trim()) {
      errs.ownerFullName = 'Vui lòng nhập họ và tên chủ cơ sở';
    } else if (formData.ownerFullName.trim().length < 2 || formData.ownerFullName.trim().length > 100) {
      errs.ownerFullName = 'Họ tên từ 2 đến 100 ký tự';
    }

    if (!formData.ownerPhone.trim()) {
      errs.ownerPhone = 'Vui lòng nhập số điện thoại chủ cơ sở';
    } else if (!PHONE_REGEX.test(formData.ownerPhone.trim())) {
      errs.ownerPhone = 'Số điện thoại không hợp lệ (VD: 0912345678)';
    }

    if (!formData.ownerEmail.trim()) {
      errs.ownerEmail = 'Vui lòng nhập email chủ cơ sở';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail.trim())) {
      errs.ownerEmail = 'Định dạng email không hợp lệ';
    }

    if (!formData.ownerPassword) {
      errs.ownerPassword = 'Vui lòng nhập mật khẩu tài khoản';
    } else if (!PASSWORD_REGEX.test(formData.ownerPassword)) {
      errs.ownerPassword = t('password_hint') || 'Mật khẩu 8-50 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt';
    }

    // Validate Agency Details
    if (!formData.agencyName.trim()) {
      errs.agencyName = 'Vui lòng nhập tên studio';
    }

    if (!formData.hotline.trim()) {
      errs.hotline = 'Vui lòng nhập hotline studio';
    }

    if (!formData.addressStreet.trim()) {
      errs.addressStreet = 'Vui lòng nhập địa chỉ chi tiết';
    }

    if (!formData.district.trim()) {
      errs.district = 'Vui lòng nhập quận / huyện';
    }

    if (!formData.city.trim()) {
      errs.city = 'Vui lòng nhập tỉnh / thành phố';
    }

    const commRate = Number(formData.commissionRateInternal);
    if (isNaN(commRate) || commRate < 0 || commRate > 100) {
      errs.commissionRateInternal = 'Tỷ lệ hoa hồng từ 0% đến 100%';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setApiError('');

    try {
      const payload = {
        agencyName: formData.agencyName.trim(),
        hotline: formData.hotline.trim(),
        addressStreet: formData.addressStreet.trim(),
        district: formData.district.trim(),
        city: formData.city.trim(),
        commissionRateInternal: Number(formData.commissionRateInternal) || 15,
        ownerFullName: formData.ownerFullName.trim(),
        ownerPhone: formData.ownerPhone.trim(),
        ownerEmail: formData.ownerEmail.trim(),
        ownerGender: formData.ownerGender,
        ownerPassword: formData.ownerPassword,
      };

      await superAdminService.createAgency(payload);
      onSuccess?.(t('msg_create_agency_success') || 'Khởi tạo cơ sở Studio và tài khoản chủ sở hữu thành công!');
      handleClose();
    } catch (err) {
      setApiError(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('modal_create_agency_title')}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button variant="primary" icon={Building2} onClick={handleSubmit} isLoading={isSubmitting}>
            {t('btn_create')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {apiError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* SECTION 1: Studio Owner Details */}
        <div className="space-y-3.5 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
            <User className="w-4 h-4 text-rose-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {t('owner_info_section')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Full Name */}
            <Input
              label={t('field_full_name')}
              placeholder="VD: Trần Thị Mai"
              value={formData.ownerFullName}
              onChange={(e) => setFormData({ ...formData, ownerFullName: e.target.value })}
              error={errors.ownerFullName}
              required
            />

            {/* Phone */}
            <Input
              label={t('field_phone_number')}
              placeholder="0987654321"
              value={formData.ownerPhone}
              onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
              error={errors.ownerPhone}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Email */}
            <Input
              label={t('field_email')}
              type="email"
              placeholder="mai.studio@gmail.com"
              value={formData.ownerEmail}
              onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
              error={errors.ownerEmail}
              required
            />

            {/* Gender */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('field_gender')} <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.ownerGender}
                onChange={(e) => setFormData({ ...formData, ownerGender: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-900 dark:text-white"
              >
                <option value="FEMALE">{t('gender_female')}</option>
                <option value="MALE">{t('gender_male')}</option>
                <option value="OTHER">{t('gender_other')}</option>
              </select>
            </div>
          </div>

          {/* Owner Password */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('field_password')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.ownerPassword}
                onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                className={`w-full pl-3 pr-10 py-2 text-xs bg-white dark:bg-slate-900 border ${
                  errors.ownerPassword
                    ? 'border-rose-500 dark:border-rose-500'
                    : 'border-slate-200 dark:border-slate-700'
                } rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-900 dark:text-white transition-all`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.ownerPassword ? (
              <p className="text-[11px] text-rose-500 font-medium">{errors.ownerPassword}</p>
            ) : (
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('password_hint')}</p>
            )}
          </div>
        </div>

        {/* SECTION 2: Studio Agency Details */}
        <div className="space-y-3.5 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
            <Building2 className="w-4 h-4 text-rose-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {t('agency_info_section')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Agency Name */}
            <Input
              label={t('field_agency_name')}
              placeholder="VD: Glamour Bridal Makeup Studio"
              value={formData.agencyName}
              onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
              error={errors.agencyName}
              required
            />

            {/* Hotline */}
            <Input
              label={t('field_hotline')}
              placeholder="02438889999"
              value={formData.hotline}
              onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
              error={errors.hotline}
              required
            />
          </div>

          {/* Address Street */}
          <Input
            label={t('field_address')}
            placeholder="VD: Số 123 Đường Bà Triệu"
            value={formData.addressStreet}
            onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
            error={errors.addressStreet}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* District */}
            <Input
              label={t('field_district')}
              placeholder="VD: Quận Hai Bà Trưng"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              error={errors.district}
              required
            />

            {/* City */}
            <Input
              label={t('field_city')}
              placeholder="VD: Hà Nội"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              error={errors.city}
              required
            />

            {/* Commission Rate */}
            <Input
              label={t('field_commission_rate')}
              type="number"
              min="0"
              max="100"
              value={formData.commissionRateInternal}
              onChange={(e) => setFormData({ ...formData, commissionRateInternal: e.target.value })}
              error={errors.commissionRateInternal}
              helperText={t('field_commission_hint')}
              required
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
