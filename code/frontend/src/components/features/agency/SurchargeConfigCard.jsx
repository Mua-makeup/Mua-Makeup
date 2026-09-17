import React, { useState, useEffect } from 'react';
import { Navigation, Moon, CalendarHeart, Save, AlertCircle } from 'lucide-react';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { agencyService } from '../../../services/agency.service';
import { useI18nStore } from '../../../store/useI18nStore';

export const SurchargeConfigCard = ({ onSaveSuccess }) => {
  const { t } = useI18nStore();
  // 1. Phụ phí cự ly
  const [baseDistanceKm, setBaseDistanceKm] = useState(5);
  const [extraPricePerKm, setExtraPricePerKm] = useState(15000);
  const [maxDistanceKm, setMaxDistanceKm] = useState(30);

  // 2. Phụ phí đêm muộn / sáng sớm
  const [startNightHour, setStartNightHour] = useState('21:00');
  const [endEarlyHour, setEndEarlyHour] = useState('06:00');
  const [nightAmount, setNightAmount] = useState(150000);

  // 3. Phụ phí lễ tết
  const [holidayName, setHolidayName] = useState('Tết Nguyên Đán & Lễ Quốc Khánh');
  const [holidayPercentage, setHolidayPercentage] = useState(25);

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState(null);

  const loadSurcharges = async () => {
    setApiError(null);
    try {
      const res = await agencyService.getMySurcharges();
      const list = res?.data || res || [];
      if (Array.isArray(list)) {
        list.forEach((s) => {
          if (s.surchargeType === 'DISTANCE') {
            if (s.baseDistanceKm !== undefined) setBaseDistanceKm(s.baseDistanceKm);
            if (s.extraPricePerKm !== undefined) setExtraPricePerKm(s.extraPricePerKm);
            if (s.maxDistanceKm !== undefined) setMaxDistanceKm(s.maxDistanceKm);
          } else if (s.surchargeType === 'NIGHT') {
            if (s.startHour) setStartNightHour(s.startHour);
            if (s.endHour) setEndEarlyHour(s.endHour);
            if (s.amount) setNightAmount(s.amount);
          } else if (s.surchargeType === 'HOLIDAY') {
            if (s.holidayName) setHolidayName(s.holidayName);
            if (s.percentage) setHolidayPercentage(s.percentage);
          }
        });
      }
    } catch (err) {
      setApiError(err.message || t('error_api_connection'));
    }
  };

  useEffect(() => {
    loadSurcharges();
  }, []);

  const handleSaveAll = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Configure Distance
      await agencyService.createSurcharge({
        surchargeType: 'DISTANCE',
        baseDistanceKm: Number(baseDistanceKm),
        extraPricePerKm: Number(extraPricePerKm),
        maxDistanceKm: Number(maxDistanceKm),
      });

      // Configure Night
      await agencyService.createSurcharge({
        surchargeType: 'NIGHT',
        startHour: startNightHour,
        endHour: endEarlyHour,
        amount: Number(nightAmount),
      });

      // Configure Holiday
      await agencyService.createSurcharge({
        surchargeType: 'HOLIDAY',
        holidayName,
        percentage: Number(holidayPercentage),
      });

      setSuccessMessage('Đã lưu cấu hình bảng phụ phí Studio thành công!');
      onSaveSuccess?.();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu phụ phí, vui lòng kiểm tra lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Real API Error Alert */}
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
          <Button variant="secondary" size="sm" onClick={loadSurcharges}>
            Thử Lại
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl font-medium">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Cự ly Di chuyển */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-100 dark:border-cyan-900/50">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Phụ Phí Cự Ly Di Chuyển</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Tính theo km vượt ngoài bán kính</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Input
              label="Khoảng cách miễn phí tối đa (km)"
              type="number"
              min="0"
              value={baseDistanceKm}
              onChange={(e) => setBaseDistanceKm(e.target.value)}
              helperText="VD: Dưới 5km miễn phí di chuyển"
            />
            <Input
              label="Đơn giá mỗi km vượt (VNĐ/km)"
              type="number"
              min="1000"
              step="1000"
              value={extraPricePerKm}
              onChange={(e) => setExtraPricePerKm(e.target.value)}
              helperText="VD: 15.000 đ cho mỗi km vượt ngoài 5km"
            />
            <Input
              label="Bán kính phục vụ tối đa (km)"
              type="number"
              min="5"
              max="100"
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(e.target.value)}
              helperText="Không nhận đơn vượt quá cự ly này"
            />
          </div>
        </div>

        {/* Card 2: Khung Giờ Đặc Biệt */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Phụ Phí Đêm Muộn / Sáng Sớm</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Áp dụng cho các ca làm việc đặc thù</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Input
              label="Bắt đầu tính đêm muộn"
              type="text"
              placeholder="21:00"
              value={startNightHour}
              onChange={(e) => setStartNightHour(e.target.value)}
              helperText="Định dạng HH:mm (VD: 21:00)"
            />
            <Input
              label="Kết thúc sáng sớm"
              type="text"
              placeholder="06:00"
              value={endEarlyHour}
              onChange={(e) => setEndEarlyHour(e.target.value)}
              helperText="Định dạng HH:mm (VD: 06:00)"
            />
            <Input
              label="Mức phụ thu cố định (VNĐ)"
              type="number"
              min="10000"
              step="10000"
              value={nightAmount}
              onChange={(e) => setNightAmount(e.target.value)}
              helperText="Cộng trực tiếp vào tổng bill khi khách đặt giờ này"
            />
          </div>
        </div>

        {/* Card 3: Ngày Lễ Tết */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/50">
              <CalendarHeart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Phụ Phí Ngày Nghỉ Lễ / Tết</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Bù đắp công thợ trực ngày lễ cao điểm</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Input
              label="Tên dịp lễ / Ghi chú"
              type="text"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              helperText="Tết Âm lịch, 30/4 - 1/5, 2/9, Noel..."
            />
            <Input
              label="Tỷ lệ phụ thu (%)"
              type="number"
              min="0"
              max="100"
              value={holidayPercentage}
              onChange={(e) => setHolidayPercentage(e.target.value)}
              helperText="Tính theo % giá trị đơn hàng (VD: 25%)"
            />
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400">
              Hệ thống tự động cộng phụ phí khi khách đặt lịch hẹn vào các ngày trong danh mục lễ tết.
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          icon={Save}
          onClick={handleSaveAll}
          isLoading={isLoading}
        >
          Lưu Tất Cả Cấu Hình Phụ Phí
        </Button>
      </div>
    </div>
  );
};
