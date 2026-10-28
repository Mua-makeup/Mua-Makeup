import React, { useState, useEffect } from 'react';
import { Percent, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, Info } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { superAdminService } from '../../../services/super-admin.service';
import { updatePlatformFeeSchema } from '../../../schemas/super-admin.schema';
import { parseApiError } from '../../../utils/error';
import { useI18nStore } from '../../../store/useI18nStore';

export const PlatformFeeModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useI18nStore();
  const [feePercent, setFeePercent] = useState('15');
  const [currentFee, setCurrentFee] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const formatCurrency = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      fetchCurrentFee();
    }
  }, [isOpen]);

  const fetchCurrentFee = async () => {
    setIsLoading(true);
    try {
      const res = await superAdminService.getPlatformFee();
      const data = res?.data || res;
      if (data) {
        const percent = data.feePercent ?? (data.feeRate ? data.feeRate * 100 : 15);
        setCurrentFee(Number(percent));
        setFeePercent(String(percent));
      }
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Zod validation
    const validation = updatePlatformFeeSchema.safeParse({ feePercent });
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      setError(firstIssue?.message || 'Giá trị phí sàn không hợp lệ');
      return;
    }

    const numericPercent = validation.data.feePercent;
    const feeRate = numericPercent / 100;

    setIsSubmitting(true);
    try {
      const res = await superAdminService.updatePlatformFee(feeRate);
      const data = res?.data || res;
      const updatedPercent = data?.feePercent ?? numericPercent;
      setCurrentFee(updatedPercent);
      setSuccessMsg(t('admin.platform_fee_updated') || 'Cập nhật phí sàn thành công!');
      if (onSuccess) {
        onSuccess(updatedPercent);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedPercent = Number(feePercent) || 0;
  const sampleTotal = 1000000;
  const sampleFee = Math.round((sampleTotal * parsedPercent) / 100);
  const sampleNet = sampleTotal - sampleFee;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Cấu Hình Phí Sàn Nền Tảng</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Áp dụng thống nhất cho toàn bộ Studio Agency & Thợ Tự Do (Freelancer)
            </p>
          </div>
        </div>
      }
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('btn_cancel') || 'Hủy'}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isLoading || isSubmitting}
          >
            {t('btn_save_changes') || 'Lưu Cấu Hình'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Policy Notice Box */}
        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <p className="font-bold text-sm">Chính sách Phí Sàn Toàn Nền Tảng</p>
            <p className="leading-relaxed">
              Hệ thống áp dụng <strong>1 mức phí sàn duy nhất</strong> đồng bộ cho cả đơn Studio và đơn Thợ tự do.
              Mọi thay đổi có hiệu lực ngay lập tức theo thời gian thực (Realtime) trên Redis cho toàn bộ đơn đặt lịch và quyết toán mới.
            </p>
          </div>
        </div>

        {/* Current Fee Badge */}
        {currentFee !== null && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Mức phí sàn đang áp dụng hiện tại:
            </span>
            <span className="text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-900">
              {currentFee}%
            </span>
          </div>
        )}

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Tỷ lệ Phí Sàn Mới (%) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={feePercent}
                onChange={(e) => {
                  setFeePercent(e.target.value);
                  setError('');
                  setSuccessMsg('');
                }}
                disabled={isLoading || isSubmitting}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-base font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 pr-12 transition-colors"
                placeholder="Ví dụ: 15"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base pointer-events-none">
                %
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Nhập giá trị từ 0% đến 100% (Ví dụ: 15 cho 15%, 20 cho 20%)
            </p>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Chọn nhanh:</span>
            {[10, 12, 15, 18, 20].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setFeePercent(String(preset))}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  Number(feePercent) === preset
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>

          {/* Realtime Simulation / Preview */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Mô Phỏng Phân Bổ Doanh Thu (Đơn mẫu {formatCurrency(sampleTotal)})</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 dark:text-slate-400">Phí Sàn ({parsedPercent}%)</div>
                <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  -{formatCurrency(sampleFee)}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 dark:text-slate-400">Thực nhận Đối tác ({100 - parsedPercent}%)</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(sampleNet)}
                </div>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
};

