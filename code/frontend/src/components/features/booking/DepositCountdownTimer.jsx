import React, { useState, useEffect } from 'react';
import { useI18nStore } from '../../../store/useI18nStore';
import { Clock, AlertTriangle, CreditCard } from 'lucide-react';


export const DepositCountdownTimer = ({
  depositExpiredAt,
  depositAmount,
  bookingCode,
  onConfirmDeposit,
  onExpired,
  isConfirming = false,
}) => {
  const { t } = useI18nStore();
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!depositExpiredAt) return;

    const targetTime = new Date(depositExpiredAt).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.floor((targetTime - now) / 1000);

      if (diff <= 0) {
        setTimeLeftSeconds(0);
        setIsExpired(true);
        if (onExpired) onExpired();
      } else {
        setTimeLeftSeconds(diff);
        setIsExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [depositExpiredAt, onExpired]);

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Tổng thời gian giữ chỗ 15 phút = 900 giây để tính progress bar
  const totalHoldSeconds = 15 * 60;
  const progressPercent = Math.max(0, Math.min(100, (timeLeftSeconds / totalHoldSeconds) * 100));

  const formatCurrency = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  return (
    <div className="rounded-2xl p-5 border bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-amber-500/30 shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header thông tin mã đơn */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Mã Đơn Đặt Hẹn
            </span>
            <h4 className="text-sm font-bold text-amber-300 font-mono tracking-wide">
              {bookingCode || 'BK-SCHED-...'}
            </h4>
          </div>

          {/* Badge đếm ngược */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-bold transition-colors ${
              isExpired
                ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                : timeLeftSeconds < 180
                ? 'bg-rose-950/30 border-rose-700 text-rose-300 animate-pulse'
                : 'bg-amber-950/30 border-amber-700/60 text-amber-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isExpired ? '00:00' : formattedTime}</span>
          </div>
        </div>

        {/* Thanh tiến trình thời gian giữ chỗ */}
        <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isExpired
                ? 'bg-rose-600 w-0'
                : timeLeftSeconds < 180
                ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                : 'bg-gradient-to-r from-amber-400 to-rose-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Cảnh báo hoặc thông báo hết hạn */}
        {isExpired ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t('msg_deposit_expired')}</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-amber-300/90 text-xs">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>{t('msg_deposit_countdown_warning')}</span>
          </div>
        )}

        {/* Chi tiết tiền cọc */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">{t('field_deposit_amount')}</span>
          <span className="text-base font-bold text-amber-400">
            {formatCurrency(depositAmount)}
          </span>
        </div>

        {/* Nút hành động thanh toán cọc */}
        <button
          type="button"
          disabled={isExpired || isConfirming}
          onClick={onConfirmDeposit}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg ${
            isExpired
              ? 'bg-slate-850 text-slate-500 border border-slate-800 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          {isConfirming
            ? t('loading')
            : isExpired
            ? t('msg_deposit_expired')
            : t('btn_pay_deposit')}
        </button>
      </div>
    </div>
  );
};
