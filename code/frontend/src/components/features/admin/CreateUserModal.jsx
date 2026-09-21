import React, { useState } from 'react';
import { Eye, EyeOff, UserPlus, ShieldAlert, Sparkles, Info } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Input } from '../../base/Input';
import { Textarea } from '../../base/Textarea';
import { Button } from '../../base/Button';
import { superAdminService } from '../../../services/super-admin.service';
import { useI18nStore } from '../../../store/useI18nStore';

const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!._-]).{8,50}$/;
const PHONE_REGEX = /^(0|84)(3|5|7|8|9)[0-9]{8}$/;

export const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useI18nStore();

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    gender: 'FEMALE',
    password: '',
    role: 'ROLE_CUSTOMER',
    // Mua profile fields (dùng khi là ROLE_FREELANCE_MUA)
    experienceYears: 1,
    maxServiceRadiusKm: 15,
    bio: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const resetForm = () => {
    setFormData({
      fullName: '',
      phoneNumber: '',
      email: '',
      gender: 'FEMALE',
      password: '',
      role: 'ROLE_CUSTOMER',
      experienceYears: 1,
      maxServiceRadiusKm: 15,
      bio: '',
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
    if (!formData.fullName.trim()) {
      errs.fullName = t('field_required') || 'Vui lòng nhập họ và tên';
    } else if (formData.fullName.trim().length < 2 || formData.fullName.trim().length > 100) {
      errs.fullName = 'Họ tên từ 2 đến 100 ký tự';
    }

    if (!formData.phoneNumber.trim()) {
      errs.phoneNumber = t('field_required') || 'Vui lòng nhập số điện thoại';
    } else if (!PHONE_REGEX.test(formData.phoneNumber.trim())) {
      errs.phoneNumber = 'Số điện thoại không hợp lệ (VD: 0912345678)';
    }

    if (!formData.email.trim()) {
      errs.email = t('field_required') || 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Định dạng email không hợp lệ';
    }

    if (!formData.password) {
      errs.password = t('field_required') || 'Vui lòng nhập mật khẩu';
    } else if (!PASSWORD_REGEX.test(formData.password)) {
      errs.password = t('password_hint') || 'Mật khẩu 8-50 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt';
    }

    // Validate MUA Profile fields when role is ROLE_FREELANCE_MUA
    if (formData.role === 'ROLE_FREELANCE_MUA') {
      const exp = Number(formData.experienceYears);
      if (formData.experienceYears === '' || isNaN(exp) || exp < 0) {
        errs.experienceYears = 'Số năm kinh nghiệm phải >= 0';
      }

      const radius = Number(formData.maxServiceRadiusKm);
      if (formData.maxServiceRadiusKm === '' || isNaN(radius) || radius < 1 || radius > 100) {
        errs.maxServiceRadiusKm = 'Bán kính phục vụ từ 1 đến 100 km';
      }
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
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim(),
        gender: formData.gender,
        password: formData.password,
        role: formData.role,
      };

      if (formData.role === 'ROLE_FREELANCE_MUA') {
        payload.experienceYears = Number(formData.experienceYears);
        payload.maxServiceRadiusKm = Number(formData.maxServiceRadiusKm);
        payload.bio = formData.bio?.trim() || null;
      }

      await superAdminService.createUser(payload);
      onSuccess?.(t('msg_create_user_success') || 'Tạo tài khoản người dùng thành công!');
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
      title={t('modal_create_user_title')}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button variant="primary" icon={UserPlus} onClick={handleSubmit} isLoading={isSubmitting}>
            {t('btn_create')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {apiError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Full Name */}
        <Input
          label={t('field_full_name')}
          placeholder="VD: Nguyễn Văn A"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          error={errors.fullName}
          required
        />

        {/* Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t('field_phone_number')}
            placeholder="0912345678"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            error={errors.phoneNumber}
            required
          />

          <Input
            label={t('field_email')}
            type="email"
            placeholder="example@makeup.vn"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            required
          />
        </div>

        {/* Gender & Role */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('field_gender')} <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-900 dark:text-white"
            >
              <option value="FEMALE">{t('gender_female')}</option>
              <option value="MALE">{t('gender_male')}</option>
              <option value="OTHER">{t('gender_other')}</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('field_role')} <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-900 dark:text-white font-medium"
            >
              <option value="ROLE_CUSTOMER">{t('role_customer_label')}</option>
              <option value="ROLE_FREELANCE_MUA">{t('role_freelancer_label')}</option>
            </select>
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('field_password')} <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`w-full pl-3 pr-10 py-2 text-xs bg-white dark:bg-slate-900 border ${
                errors.password
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
          {errors.password ? (
            <p className="text-[11px] text-rose-500 font-medium">{errors.password}</p>
          ) : (
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('password_hint')}</p>
          )}
        </div>

        {/* MUA Profile Section (When role is ROLE_FREELANCE_MUA) */}
        {formData.role === 'ROLE_FREELANCE_MUA' && (
          <div className="space-y-3.5 p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 pb-2 border-b border-rose-200/60 dark:border-rose-900/40">
              <Sparkles className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-rose-950 dark:text-rose-200">
                {t('mua_profile_section')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('field_experience_years')}
                type="number"
                min="0"
                placeholder="VD: 3"
                value={formData.experienceYears}
                onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                error={errors.experienceYears}
                required
              />

              <Input
                label={t('field_service_radius')}
                type="number"
                min="1"
                max="100"
                placeholder="VD: 15"
                value={formData.maxServiceRadiusKm}
                onChange={(e) => setFormData({ ...formData, maxServiceRadiusKm: e.target.value })}
                error={errors.maxServiceRadiusKm}
                required
              />
            </div>

            <Textarea
              label={t('field_bio')}
              placeholder="Nhập tiểu sử, phong cách thế mạnh và giới thiệu kinh nghiệm..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={2}
            />

            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>
                Đánh giá (Rating) và Tổng số đơn hoàn thành (Completed Jobs) sẽ được hệ thống tự động tính toán dựa trên đánh giá của khách hàng và ca phục vụ thực tế. Hồ sơ mới sẽ hiển thị <strong>N/A</strong>.
              </span>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
