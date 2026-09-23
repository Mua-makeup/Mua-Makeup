import React from 'react';
import { useI18nStore } from '../../../store/useI18nStore';
import { Clock, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const TimeSlotGrid = ({ slots = [], selectedSlot, onSelectSlot, isLoading = false }) => {
  const { t } = useI18nStore();

  if (isLoading) {
    return (
      <div className="py-8 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium">{t('loading')}</span>
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="p-6 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-sm">
        {t('no_data')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {t('field_select_time_slot')}
        </label>
        <span className="text-[11px] text-slate-400">90 {t('unit_minutes')}/ca</span>
      </div>

      {/* Grid danh sách các ca trong ngày */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {slots.map((slot, index) => {
          const isSelected = selectedSlot?.slotStartTime === slot.slotStartTime;
          const isAvailable = slot.isAvailable;
          const isBuffer = slot.isBufferBlocked;

          return (
            <button
              key={`${slot.slotStartTime}-${index}`}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && onSelectSlot(slot)}
              className={`relative px-3 py-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-br from-amber-500/20 to-rose-500/20 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/10 scale-[1.02]'
                  : isAvailable
                  ? 'bg-slate-900/60 border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 text-slate-200 cursor-pointer'
                  : isBuffer
                  ? 'bg-amber-950/20 border-amber-900/40 text-amber-400/60 cursor-not-allowed opacity-75'
                  : 'bg-slate-900/20 border-slate-850 text-slate-600 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold tracking-tight">
                  {slot.slotStartTime?.substring(0, 5)} - {slot.slotEndTime?.substring(0, 5)}
                </span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
              </div>

              {/* Nhãn trạng thái */}
              <div className="text-[10px] font-medium flex items-center gap-1 mt-1">
                {isAvailable ? (
                  <span className="text-emerald-400/90">{t('status_slot_available')}</span>
                ) : isBuffer ? (
                  <span className="text-amber-400/80 flex items-center gap-0.5">
                    <AlertCircle className="w-2.5 h-2.5" />
                    {t('status_slot_buffer_blocked')}
                  </span>
                ) : (
                  <span className="text-rose-400/70 flex items-center gap-0.5">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    {t('status_slot_booked')}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Chú giải ý nghĩa các màu sắc */}
      <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{t('slot_legend_available')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>{t('slot_legend_booked')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>{t('slot_legend_buffer')}</span>
        </div>
      </div>
    </div>
  );
};
