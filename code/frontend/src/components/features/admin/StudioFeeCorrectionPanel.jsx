import React, { useState } from 'react';
import { superAdminService } from '../../../services/super-admin.service';
import { useI18nStore } from '../../../store/useI18nStore';

export const StudioFeeCorrectionPanel = ({ bookingId }) => {
  const { t, language } = useI18nStore();
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const money = (value) => Number(value).toLocaleString('vi-VN') + ' ₫';

  const run = async (apply = false) => {
    setBusy(true);
    setError('');
    try {
      const result = apply
        ? await superAdminService.correctStudioFee(bookingId, plan.oldFee)
        : await superAdminService.previewStudioFee(bookingId);
      setPlan(result?.data || result);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || t('studio_fee_reconcile_error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/60 p-4 space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
          {t('studio_fee_reconcile_title')}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => run()}
          className="underline text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 disabled:opacity-50 cursor-pointer font-medium text-xs transition-colors"
        >
          {t('studio_fee_check_recorded')}
        </button>
      </div>

      {plan && (
        <div className="space-y-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
          <p className="text-xs text-slate-700 dark:text-slate-300">
            {t('studio_fee_recorded')}: <span className="font-mono font-bold">{money(plan.oldFee)}</span> · {t('studio_fee_correct')}: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{money(plan.correctFee)}</span>
          </p>
          {plan.applicable ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {t('studio_fee_recovery_notice', { amount: money(plan.recoveryAmount) })}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(true)}
                className="rounded-lg bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors shadow-2xs"
              >
                {t('studio_fee_confirm_adjustment', { amount: money(plan.recoveryAmount) })}
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              {t('studio_fee_no_adjustment')}
            </p>
          )}
        </div>
      )}

      {error && <p role="alert" className="text-red-700 dark:text-red-400 text-xs font-medium">{error}</p>}
    </section>
  );
};
