import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Camera,
  Save,
  AlertCircle,
  CheckCircle2,
  Shield,
  Mail,
  Phone,
  Loader2,
} from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Input } from '../../base/Input';
import { Button } from '../../base/Button';
import { userService } from '../../../services/user.service';
import { userProfileSchema } from '../../../schemas/auth.schema';
import { useI18nStore } from '../../../store/useI18nStore';
import { useAuthStore } from '../../../store/useAuthStore';

const MAX_AVATAR_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export const AdminProfileModal = ({ isOpen, onClose, onUpdated }) => {
  const { t } = useI18nStore();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('MALE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setServerError('');
    setSuccessMessage('');
    setErrors({});
    setAvatarPreview(null);

    const currentUser = useAuthStore.getState().user || {};
    setFullName(currentUser.fullName || '');
    setEmail(currentUser.email || '');
    setGender(currentUser.gender || 'MALE');
    setPhoneNumber(currentUser.phoneNumber || '');
    setAvatarUrl(currentUser.avatarUrl || '');

    // Refresh fresh profile data from backend once on modal open
    userService
      .getCurrentUser()
      .then((res) => {
        const u = res?.data || res;
        if (u) {
          setFullName(u.fullName || '');
          setEmail(u.email || '');
          setGender(u.gender || 'MALE');
          setPhoneNumber(u.phoneNumber || '');
          setAvatarUrl(u.avatarUrl || '');
          useAuthStore.getState().setUser(u);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setServerError('Ảnh không được vượt quá 20MB.');
      return;
    }

    // Validate mime type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setServerError('Định dạng ảnh không hợp lệ. Vui lòng chọn JPG, PNG hoặc WEBP.');
      return;
    }

    setServerError('');
    setSuccessMessage('');

    // Preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    // Upload directly to backend
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await userService.uploadAvatar(formData);
      const updatedUser = res?.data || res;

      if (updatedUser?.avatarUrl) {
        setAvatarUrl(updatedUser.avatarUrl);
        setAvatarPreview(null);
        setUser(updatedUser);
        onUpdated?.(updatedUser);
      }
      setSuccessMessage(t('admin_profile_upload_success') || 'Đã tải lên ảnh đại diện thành công!');
    } catch (err) {
      setAvatarPreview(null);
      setServerError(
        err.response?.data?.message || err.message || t('error_general'),
      );
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setServerError('');
    setSuccessMessage('');
    setErrors({});

    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      gender,
    };

    const validation = userProfileSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0];
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await userService.updateProfile(payload);
      const updatedUser = res?.data || res;

      if (updatedUser) {
        setUser(updatedUser);
        onUpdated?.(updatedUser);
      }

      setSuccessMessage(
        t('admin_profile_update_success') || 'Cập nhật thông tin quản trị viên thành công!',
      );

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setServerError(
        err.response?.data?.message || err.message || t('error_general'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayAvatar = avatarPreview || avatarUrl || authUser?.avatarUrl;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('admin_profile_modal_title') || 'Hồ Sơ Quản Trị Viên'}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting || isUploadingAvatar}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting || isUploadingAvatar}
            icon={Save}
          >
            {t('save')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notifications */}
        {serverError && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-medium">{serverError}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-start gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-medium">{successMessage}</p>
          </div>
        )}

        {/* Avatar Upload Section */}
        <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="relative group shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-rose-400 dark:border-rose-500 shadow-md bg-white dark:bg-slate-800 flex items-center justify-center">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={fullName || 'Admin'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              )}
            </div>

            {/* Camera Overlay Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 rounded-full bg-slate-950/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              title={t('admin_profile_upload_avatar') || 'Tải ảnh đại diện'}
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileSelect}
              className="hidden"
            />
          </div>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>
                {isUploadingAvatar
                  ? t('admin_profile_uploading') || 'Đang tải ảnh...'
                  : t('admin_profile_upload_avatar') || 'Tải ảnh đại diện'}
              </span>
            </button>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {t('admin_profile_avatar_hint') || 'Hỗ trợ JPG, PNG, WEBP (tối đa 20MB).'}
            </p>
          </div>
        </div>

        {/* Section 1: Personal Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <User className="w-4 h-4 text-rose-500" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {t('admin_profile_personal_info') || 'THÔNG TIN CÁ NHÂN'}
            </h4>
          </div>

          <Input
            label={t('col_user_name') || 'Họ và Tên'}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="VD: Quản Trị Viên Hệ Thống"
            error={errors.fullName}
            required
          />

          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@makeup.vn"
            icon={Mail}
            error={errors.email}
            required
          />

          {/* Gender Select */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('field_gender') || 'Giới Tính'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'MALE', label: t('gender_male') || 'Nam' },
                { value: 'FEMALE', label: t('gender_female') || 'Nữ' },
                { value: 'OTHER', label: t('gender_other') || 'Khác' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setGender(item.value)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                    gender === item.value
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Readonly: Phone Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('admin_profile_phone_readonly') || 'Số điện thoại đăng nhập (Cố định)'}
            </label>
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 text-xs font-mono">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{phoneNumber || 'N/A'}</span>
            </div>
          </div>

          {/* Readonly: Role Badge */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('admin_profile_role_readonly') || 'Phân quyền tài khoản'}
            </label>
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
              <Shield className="w-4 h-4 text-rose-500" />
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {t('role_super_admin') || 'Quản Trị Viên Toàn Sàn'}
              </span>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
