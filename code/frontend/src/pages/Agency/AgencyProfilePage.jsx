import React, { useState, useEffect } from 'react';
import { Building2, Percent, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { agencyService } from '../../services/agency.service';
import { Input } from '../../components/base/Input';
import { Button } from '../../components/base/Button';
import { agencyProfileSchema, commissionRateSchema } from '../../schemas/agency.schema';
import { useI18nStore } from '../../store/useI18nStore';

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
        setAddressDistrict(p.addressDistrict || '');
        setAddressCity(p.addressCity || '');
        setLogoUrl(p.logoUrl || '');
        setCommissionRate(p.commissionRateInternal ?? 30);
      }
    } catch (err) {
      setServerError(err.message || t('error_api_connection'));
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
      await agencyService.updateProfile(payload);
      setSuccessMessage('Đã cập nhật hồ sơ Studio thành công!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setServerError(err.message || 'Không thể cập nhật hồ sơ Studio');
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
      setCommissionError(validation.error.errors[0]?.message || 'Tỷ lệ hoa hồng không hợp lệ');
      return;
    }

    setIsLoadingCommission(true);
    try {
      await agencyService.updateDefaultCommission(Number(commissionRate));
      setSuccessMessage('Đã cập nhật tỷ lệ hoa hồng mặc định của Studio thành công!');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setServerError(err.message || 'Không thể cập nhật tỷ lệ hoa hồng');
    } finally {
      setIsLoadingCommission(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Real API Error Alert */}
      {serverError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold text-sm">
              {t('error_api_connection')}
            </strong>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400 font-mono">
              {serverError}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadProfile}>
            Thử Lại
          </Button>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Hồ Sơ Studio & Chính Sách Hoa Hồng
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Cập nhật thông tin nhận diện thương hiệu, địa chỉ cơ sở và tỷ lệ hoa hồng áp dụng cho toàn bộ thợ Studio
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
            Thông Tin Phòng Trang Điểm / Studio
          </h2>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Tên Studio / Đại Lý"
                required
                placeholder="VD: Glamour Beauty Studio"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                error={profileErrors.agencyName}
              />

              <Input
                label="Hotline Liên Hệ"
                required
                placeholder="0912345678"
                value={hotline}
                onChange={(e) => setHotline(e.target.value)}
                error={profileErrors.hotline}
              />
            </div>

            <Input
              label="Địa Chỉ Số Nhà & Tên Đường"
              required
              placeholder="VD: 128 Nguyễn Huệ, Phường Bến Nghé"
              value={addressStreet}
              onChange={(e) => setAddressStreet(e.target.value)}
              error={profileErrors.addressStreet}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Quận / Huyện"
                required
                placeholder="Quận 1"
                value={addressDistrict}
                onChange={(e) => setAddressDistrict(e.target.value)}
                error={profileErrors.addressDistrict}
              />

              <Input
                label="Tỉnh / Thành Phố"
                required
                placeholder="Hồ Chí Minh"
                value={addressCity}
                onChange={(e) => setAddressCity(e.target.value)}
                error={profileErrors.addressCity}
              />
            </div>

            <Input
              label="Đường Dẫn Logo Studio (URL)"
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
                Lưu Thay Đổi Hồ Sơ
              </Button>
            </div>
          </form>
        </div>

        {/* Cột Chính sách hoa hồng Studio */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Hoa Hồng Mặc Định</h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tỷ lệ % doanh thu Studio giữ lại từ các đơn hàng hoàn thành (quy định từ 0% đến 60%). Phần còn lại tự động giải ngân vào ví thợ.
            </p>

            <form onSubmit={handleUpdateCommission} className="space-y-4">
              <Input
                label="Tỷ lệ hoa hồng Studio (%)"
                type="number"
                min="0"
                max="60"
                step="0.5"
                required
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                error={commissionError}
                helperText="Mặc định áp dụng cho tất cả thợ chưa có thỏa thuận riêng"
              />

              <Button
                type="submit"
                variant="secondary"
                className="w-full"
                icon={Save}
                isLoading={isLoadingCommission}
              >
                Cập Nhật Tỷ Lệ Hoa Hồng
              </Button>
            </form>
          </div>

          <div className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <p className="font-bold text-slate-800 dark:text-slate-200">Lưu ý nghiệp vụ:</p>
            <p>
              • Bạn có thể đàm phán tỷ lệ hoa hồng riêng biệt cho từng thợ tại mục <strong>Quản Lý Thợ</strong>.
            </p>
            <p>
              • Khi đơn hàng hoàn thành, hệ thống sẽ tự động hạch toán vào Ví Studio và Ví Thợ thông qua Sổ cái kế toán đúp (Double-Entry Ledger).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
