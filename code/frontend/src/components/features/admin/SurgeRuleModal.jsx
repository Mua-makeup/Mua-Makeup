import React, { useEffect, useState } from 'react';
import { Modal } from '../../base/Modal';
import { Input } from '../../base/Input';
import { Button } from '../../base/Button';
import { surgeRuleSchema } from '../../../schemas/super-admin.schema';
import { useI18nStore } from '../../../store/useI18nStore';
import { Save } from 'lucide-react';

const DAYS_OF_WEEK = [
  { key: 'MONDAY', label: 'T2' },
  { key: 'TUESDAY', label: 'T3' },
  { key: 'WEDNESDAY', label: 'T4' },
  { key: 'THURSDAY', label: 'T5' },
  { key: 'FRIDAY', label: 'T6' },
  { key: 'SATURDAY', label: 'T7' },
  { key: 'SUNDAY', label: 'CN' },
];

export const SurgeRuleModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
}) => {
  const { t } = useI18nStore();
  const [formData, setFormData] = useState({
    ruleName: '',
    zoneCode: 'ALL',
    startTime: '05:00',
    endTime: '07:00',
    applicableDaysOfWeek: ['SATURDAY', 'SUNDAY'],
    surgeMultiplier: 1.2,
    minDemandRatio: 1.0,
    isActive: true,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      let days = [];
      if (initialData.applicableDaysOfWeek) {
        days = initialData.applicableDaysOfWeek.split(',').map((d) => d.trim()).filter(Boolean);
      }
      setFormData({
        ruleName: initialData.ruleName || '',
        zoneCode: initialData.zoneCode || 'ALL',
        startTime: initialData.startTime ? initialData.startTime.substring(0, 5) : '05:00',
        endTime: initialData.endTime ? initialData.endTime.substring(0, 5) : '07:00',
        applicableDaysOfWeek: days,
        surgeMultiplier: initialData.surgeMultiplier ? Number(initialData.surgeMultiplier) : 1.2,
        minDemandRatio: initialData.minDemandRatio ? Number(initialData.minDemandRatio) : 1.0,
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    } else {
      setFormData({
        ruleName: '',
        zoneCode: 'ALL',
        startTime: '05:00',
        endTime: '07:00',
        applicableDaysOfWeek: ['SATURDAY', 'SUNDAY'],
        surgeMultiplier: 1.2,
        minDemandRatio: 1.0,
        isActive: true,
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const toggleDay = (dayKey) => {
    setFormData((prev) => {
      const exists = prev.applicableDaysOfWeek.includes(dayKey);
      const updated = exists
        ? prev.applicableDaysOfWeek.filter((d) => d !== dayKey)
        : [...prev.applicableDaysOfWeek, dayKey];
      return { ...prev, applicableDaysOfWeek: updated };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    const payloadToValidate = {
      ...formData,
      surgeMultiplier: Number(formData.surgeMultiplier),
      minDemandRatio: Number(formData.minDemandRatio),
      applicableDaysOfWeek: formData.applicableDaysOfWeek.join(','),
    };

    const validation = surgeRuleSchema.safeParse(payloadToValidate);
    if (!validation.success) {
      const errMap = {};
      validation.error.errors.forEach((err) => {
        errMap[err.path[0]] = err.message;
      });
      setErrors(errMap);
      return;
    }

    // Format startTime & endTime to HH:mm:ss for backend LocalTime
    const submitPayload = {
      ruleName: formData.ruleName.trim(),
      zoneCode: formData.zoneCode.trim() || 'ALL',
      startTime: formData.startTime.length === 5 ? `${formData.startTime}:00` : formData.startTime,
      endTime: formData.endTime.length === 5 ? `${formData.endTime}:00` : formData.endTime,
      applicableDaysOfWeek: formData.applicableDaysOfWeek.join(','),
      surgeMultiplier: Number(formData.surgeMultiplier),
      minDemandRatio: Number(formData.minDemandRatio),
      isActive: formData.isActive,
    };

    onSubmit(submitPayload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? t('surge_modal_edit_title') : t('surge_modal_create_title')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rule Name */}
        <Input
          label={t('surge_modal_field_name')}
          value={formData.ruleName}
          onChange={(e) => setFormData((prev) => ({ ...prev, ruleName: e.target.value }))}
          placeholder={t('surge_modal_field_name_ph')}
          error={errors.ruleName}
          required
        />

        {/* Zone Code */}
        <Input
          label={t('surge_modal_field_zone')}
          value={formData.zoneCode}
          onChange={(e) => setFormData((prev) => ({ ...prev, zoneCode: e.target.value }))}
          placeholder={t('surge_modal_field_zone_ph')}
          error={errors.zoneCode}
        />

        {/* Start Time & End Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="time"
            label={t('surge_modal_field_start_time')}
            value={formData.startTime}
            onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
            error={errors.startTime}
            required
          />
          <Input
            type="time"
            label={t('surge_modal_field_end_time')}
            value={formData.endTime}
            onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
            error={errors.endTime}
            required
          />
        </div>

        {/* Days of Week Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {t('surge_modal_field_days')}
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((d) => {
              const isSelected = formData.applicableDaysOfWeek.includes(d.key);
              return (
                <button
                  type="button"
                  key={d.key}
                  onClick={() => toggleDay(d.key)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-500/20 scale-105'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-300'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Surge Multiplier Slider & Value */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {t('surge_modal_field_multiplier')}
            </span>
            <span className="font-bold text-rose-600 dark:text-rose-400 text-base">
              {Number(formData.surgeMultiplier).toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="1.5"
            step="0.05"
            value={formData.surgeMultiplier}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, surgeMultiplier: parseFloat(e.target.value) }))
            }
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <p className="text-[11px] text-slate-400">
            {t('surge_modal_multiplier_help')}
          </p>
          {errors.surgeMultiplier && (
            <p className="text-xs text-rose-500">{errors.surgeMultiplier}</p>
          )}
        </div>

        {/* Min Demand Ratio */}
        <Input
          type="number"
          step="0.1"
          min="0.5"
          max="5.0"
          label={t('surge_modal_field_min_demand')}
          value={formData.minDemandRatio}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, minDemandRatio: parseFloat(e.target.value) || 1.0 }))
          }
          error={errors.minDemandRatio}
        />

        {/* Active Toggle */}
        <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t('surge_modal_field_active')}
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            icon={Save}
            isLoading={isLoading}
            disabled={isLoading}
            className="px-6"
          >
            {t('surge_modal_btn_submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
