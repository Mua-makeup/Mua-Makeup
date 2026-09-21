import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Moon,
  CalendarHeart,
  Save,
  AlertCircle,
  Calculator,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { agencyService } from '../../../services/agency.service';
import { formatCurrency } from '../../../utils/formatters';
import { useI18nStore } from '../../../store/useI18nStore';

export const SurchargeConfigCard = ({ onSaveSuccess }) => {
  const { t, language } = useI18nStore();

  // Helper to translate default Vietnamese holiday names from backend when language is English
  const getLocalizedHolidayName = (name) => {
    if (!name || !name.trim()) return t('surcharge_holiday_default_label');
    if (language === 'en') {
      const lower = name.toLowerCase();
      if (lower.includes('tết nguyên đán') && (lower.includes('quốc khánh') || lower.includes('lễ quốc khánh'))) {
        return 'Lunar New Year & National Day';
      }
      if (lower.includes('tết nguyên đán') || lower.includes('tết âm lịch')) {
        return 'Lunar New Year';
      }
      if (lower.includes('quốc khánh')) {
        return 'National Day';
      }
      if (lower.includes('30/4') || lower.includes('1/5')) {
        return 'Reunification & Labor Day';
      }
      if (lower.includes('giáng sinh') || lower.includes('noel')) {
        return 'Christmas';
      }
      if (lower.includes('lễ tết') || lower.includes('phụ phí ngày lễ tết')) {
        return 'Public Holidays';
      }
    }
    return name;
  };

  // Active Sub-Tab: 'distance' | 'night' | 'holiday'
  const [activeSubTab, setActiveSubTab] = useState('distance');

  // 1. Phụ phí cự ly
  const [baseDistanceKm, setBaseDistanceKm] = useState(5);
  const [extraPricePerKm, setExtraPricePerKm] = useState(15000);
  const [maxDistanceKm, setMaxDistanceKm] = useState(30);

  // 2. Phụ phí đêm muộn / sáng sớm
  const [startNightHour, setStartNightHour] = useState('21:00');
  const [endEarlyHour, setEndEarlyHour] = useState('06:00');
  const [nightAmount, setNightAmount] = useState(150000);

  // 3. Phụ phí lễ tết
  const [holidayName, setHolidayName] = useState('');
  const [holidayPercentage, setHolidayPercentage] = useState(25);

  // Simulation test states for live calculator
  const [simDistanceKm, setSimDistanceKm] = useState(12);
  const [simTime, setSimTime] = useState('05:30');
  const [simOrderAmount, setSimOrderAmount] = useState(1000000);

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState(null);
  const [isNotVerified, setIsNotVerified] = useState(false);

  const loadSurcharges = async () => {
    setApiError(null);
    try {
      const res = await agencyService.getMySurcharges();
      const list = res?.data || res || [];
      if (Array.isArray(list)) {
        list.forEach((s) => {
          if (s.surchargeType === 'DISTANCE' || s.surchargeType === 'OUT_OF_RADIUS') {
            if (s.amount !== undefined) setExtraPricePerKm(s.amount);
            if (s.baseDistanceKm !== undefined) setBaseDistanceKm(s.baseDistanceKm);
            if (s.extraPricePerKm !== undefined) setExtraPricePerKm(s.extraPricePerKm);
            if (s.maxDistanceKm !== undefined) setMaxDistanceKm(s.maxDistanceKm);
          } else if (s.surchargeType === 'NIGHT' || s.surchargeType === 'EARLY_MORNING') {
            if (s.amount !== undefined) setNightAmount(s.amount);
            if (s.startHour) setStartNightHour(s.startHour);
            if (s.endHour) setEndEarlyHour(s.endHour);
          } else if (s.surchargeType === 'HOLIDAY') {
            if (s.surchargeName) setHolidayName(s.surchargeName);
            if (s.holidayName) setHolidayName(s.holidayName);
            if (s.amount !== undefined) setHolidayPercentage(s.amount);
            if (s.percentage !== undefined) setHolidayPercentage(s.percentage);
          }
        });
      }
      setIsNotVerified(false);
    } catch (err) {
      const errCode = err.response?.data?.errorCode;
      const errMsg = err.response?.data?.message || err.message || '';
      if (errCode === 'ERR_AGENCY_NOT_VERIFIED' || errMsg.toLowerCase().includes('not verified')) {
        setIsNotVerified(true);
        setApiError(null);
      } else {
        setIsNotVerified(false);
        setApiError(
          !err.response || err.code === 'ERR_NETWORK'
            ? t('error_api_connection')
            : errMsg
        );
      }
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
        surchargeName: t('surcharge_distance_name'),
        surchargeType: 'OUT_OF_RADIUS',
        amount: Number(extraPricePerKm) || 0,
        baseDistanceKm: Number(baseDistanceKm),
        extraPricePerKm: Number(extraPricePerKm),
        maxDistanceKm: Number(maxDistanceKm),
      });

      // Configure Night / Early Morning
      await agencyService.createSurcharge({
        surchargeName: t('surcharge_night_name'),
        surchargeType: 'EARLY_MORNING',
        amount: Number(nightAmount) || 0,
        startHour: startNightHour,
        endHour: endEarlyHour,
      });

      // Configure Holiday
      await agencyService.createSurcharge({
        surchargeName: holidayName?.trim() || t('surcharge_holiday_default_name'),
        surchargeType: 'HOLIDAY',
        amount: Number(holidayPercentage) || 0,
        holidayName: holidayName?.trim() || t('surcharge_holiday'),
        percentage: Number(holidayPercentage),
      });

      setSuccessMessage(t('save_success'));
      onSaveSuccess?.();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || t('error_general'));
    } finally {
      setIsLoading(false);
    }
  };

  // Helper calculation for Distance Simulation
  const numSimDistance = Number(simDistanceKm) || 0;
  const numBaseDistance = Number(baseDistanceKm) || 0;
  const numMaxDistance = Number(maxDistanceKm) || 0;
  const numExtraPrice = Number(extraPricePerKm) || 0;
  const isOverMaxDistance = numSimDistance > numMaxDistance;
  const simExtraKm = Math.max(0, numSimDistance - numBaseDistance);
  const simDistanceFee = isOverMaxDistance ? 0 : simExtraKm * numExtraPrice;

  // Helper calculation for Night Simulation
  const isTimeInNightWindow = (timeStr) => {
    if (!timeStr) return false;
    if (startNightHour > endEarlyHour) {
      return timeStr >= startNightHour || timeStr <= endEarlyHour;
    }
    return timeStr >= startNightHour && timeStr <= endEarlyHour;
  };
  const isSimNightActive = isTimeInNightWindow(simTime);
  const numNightAmount = Number(nightAmount) || 0;
  const simNightFee = isSimNightActive ? numNightAmount : 0;

  // Helper calculation for Holiday Simulation
  const numSimOrder = Number(simOrderAmount) || 0;
  const numHolidayPercent = Number(holidayPercentage) || 0;
  const simHolidayFee = (numSimOrder * numHolidayPercent) / 100;
  const simTotalHolidayAmount = numSimOrder + simHolidayFee;

  return (
    <div className="space-y-6">
      {/* Real API Error Alert */}
      {apiError && !isNotVerified && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold text-sm">
              {apiError.toLowerCase().includes('connect') || apiError.toLowerCase().includes('network')
                ? t('error_api_connection')
                : t('error_system_notice')}
            </strong>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400 font-mono">
              {apiError}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadSurcharges}>
              {t('retry')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setApiError(null)}>
              {t('close')}
            </Button>
          </div>
        </div>
      )}

      {/* Unverified Notice */}
      {isNotVerified && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center gap-3 text-amber-900 dark:text-amber-200 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span>{t('pending_verification_desc')}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-xl font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Modern Sub-Tab Switcher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Tab 1: Cự ly */}
        <button
          type="button"
          onClick={() => setActiveSubTab('distance')}
          className={`p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex items-start gap-3.5 ${
            activeSubTab === 'distance'
              ? 'bg-white dark:bg-slate-900 border-cyan-500 shadow-sm ring-2 ring-cyan-500/15'
              : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              activeSubTab === 'distance'
                ? 'bg-cyan-500 text-white shadow-xs'
                : 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/40'
            }`}
          >
            <Navigation className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('surcharge_distance')}
              </h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/60">
                {t('surcharge_free_badge')} {baseDistanceKm}km
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate font-medium">
              +{formatCurrency(extraPricePerKm)}{t('surcharge_per_extra_km')}
            </p>
          </div>
        </button>

        {/* Tab 2: Sáng sớm & Đêm */}
        <button
          type="button"
          onClick={() => setActiveSubTab('night')}
          className={`p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex items-start gap-3.5 ${
            activeSubTab === 'night'
              ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-sm ring-2 ring-indigo-500/15'
              : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              activeSubTab === 'night'
                ? 'bg-indigo-500 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40'
            }`}
          >
            <Moon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('surcharge_night')}
              </h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60">
                {startNightHour} - {endEarlyHour}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate font-medium">
              +{formatCurrency(nightAmount)}{t('surcharge_per_order')}
            </p>
          </div>
        </button>

        {/* Tab 3: Ngày Lễ Tết */}
        <button
          type="button"
          onClick={() => setActiveSubTab('holiday')}
          className={`p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex items-start gap-3.5 ${
            activeSubTab === 'holiday'
              ? 'bg-white dark:bg-slate-900 border-rose-500 shadow-sm ring-2 ring-rose-500/15'
              : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              activeSubTab === 'holiday'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40'
            }`}
          >
            <CalendarHeart className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {t('surcharge_holiday')}
              </h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60">
                +{holidayPercentage}%
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate font-medium">
              {getLocalizedHolidayName(holidayName)}
            </p>
          </div>
        </button>
      </div>

      {/* Main Focus Area: 2-Column Split (Settings Form + Live Interactive Simulation) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Settings (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          {activeSubTab === 'distance' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-100 dark:border-cyan-900/50">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('surcharge_distance')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('surcharge_distance_desc')}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label={t('surcharge_distance_free_limit')}
                  type="number"
                  min="0"
                  value={baseDistanceKm}
                  onChange={(e) => setBaseDistanceKm(e.target.value)}
                  helperText={t('surcharge_distance_free_limit_helper')}
                />
                <Input
                  label={t('surcharge_distance_unit_price')}
                  type="number"
                  min="1000"
                  step="1000"
                  value={extraPricePerKm}
                  onChange={(e) => setExtraPricePerKm(e.target.value)}
                  helperText={t('surcharge_distance_unit_price_helper')}
                />
                <Input
                  label={t('surcharge_distance_max_radius')}
                  type="number"
                  min="5"
                  max="100"
                  value={maxDistanceKm}
                  onChange={(e) => setMaxDistanceKm(e.target.value)}
                  helperText={t('surcharge_distance_max_radius_helper')}
                />
              </div>
            </div>
          )}

          {activeSubTab === 'night' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('surcharge_night')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('surcharge_night_desc')}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('surcharge_night_start')}
                    type="text"
                    placeholder="21:00"
                    value={startNightHour}
                    onChange={(e) => setStartNightHour(e.target.value)}
                    helperText={t('surcharge_night_start_helper')}
                  />
                  <Input
                    label={t('surcharge_night_end')}
                    type="text"
                    placeholder="06:00"
                    value={endEarlyHour}
                    onChange={(e) => setEndEarlyHour(e.target.value)}
                    helperText={t('surcharge_night_end_helper')}
                  />
                </div>
                <Input
                  label={t('surcharge_night_fixed_amount')}
                  type="number"
                  min="10000"
                  step="10000"
                  value={nightAmount}
                  onChange={(e) => setNightAmount(e.target.value)}
                  helperText={t('surcharge_night_fixed_amount_helper')}
                />
              </div>
            </div>
          )}

          {activeSubTab === 'holiday' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/50">
                  <CalendarHeart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('surcharge_holiday')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('surcharge_holiday_desc')}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label={t('surcharge_holiday_name')}
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  helperText={t('surcharge_holiday_name_helper')}
                />
                <Input
                  label={t('surcharge_holiday_rate')}
                  type="number"
                  min="0"
                  max="100"
                  value={holidayPercentage}
                  onChange={(e) => setHolidayPercentage(e.target.value)}
                  helperText={t('surcharge_holiday_rate_helper')}
                />
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>{t('surcharge_holiday_notice')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Live Simulation Box (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-slate-800/60 dark:to-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-5">
            {/* Header Simulation */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    {t('surcharge_sim_title')}
                  </h4>
                  <p className="text-[11px] text-slate-400">{t('surcharge_sim_sub')}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Sparkles className="w-3 h-3" /> {t('surcharge_sim_live')}
              </span>
            </div>

            {/* Simulation Tab 1: Distance */}
            {activeSubTab === 'distance' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('surcharge_sim_distance_label')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max={Math.max(40, Number(maxDistanceKm) + 10)}
                      value={simDistanceKm}
                      onChange={(e) => setSimDistanceKm(e.target.value)}
                      className="flex-1 accent-cyan-600 cursor-pointer"
                    />
                    <span className="w-14 text-center font-bold font-mono text-sm py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
                      {simDistanceKm} km
                    </span>
                  </div>
                </div>

                {/* Calculation Breakdown Card */}
                <div className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{t('surcharge_sim_free_dist')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {baseDistanceKm} km (0 đ)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{t('surcharge_sim_extra_dist')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {simExtraKm} km
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{t('surcharge_sim_extra_rate')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(extraPricePerKm)} / km
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {t('surcharge_sim_travel_fee')}
                    </span>
                    <span
                      className={`font-extrabold text-base ${
                        isOverMaxDistance
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-cyan-600 dark:text-cyan-400'
                      }`}
                    >
                      {isOverMaxDistance ? t('surcharge_sim_decline') : formatCurrency(simDistanceFee)}
                    </span>
                  </div>
                </div>

                {/* Status Notice */}
                {isOverMaxDistance ? (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
                    ⚠️ {t('surcharge_sim_over_radius_warning').replace('{max}', maxDistanceKm)}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    ✅ {t('surcharge_sim_within_radius_success').replace('{dist}', simDistanceKm).replace('{max}', maxDistanceKm)}
                  </div>
                )}
              </div>
            )}

            {/* Simulation Tab 2: Night & Early Morning */}
            {activeSubTab === 'night' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('surcharge_sim_night_time_label')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={simTime}
                      onChange={(e) => setSimTime(e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex items-center gap-1">
                      {['05:00', '10:00', '22:30'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSimTime(preset)}
                          className="px-2 py-1 text-xs rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer font-mono"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Calculation Breakdown Card */}
                <div className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{t('surcharge_sim_window')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white font-mono">
                      {startNightHour} {t('surcharge_sim_to')} {endEarlyHour}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{t('surcharge_sim_client_time')}</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      {simTime}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {t('surcharge_sim_night_fee')}
                    </span>
                    <span
                      className={`font-extrabold text-base ${
                        isSimNightActive
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isSimNightActive ? `+${formatCurrency(simNightFee)}` : '0 đ'}
                    </span>
                  </div>
                </div>

                {/* Status Notice */}
                {isSimNightActive ? (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span>{t('surcharge_sim_night_applied_notice')} +{formatCurrency(nightAmount)}</span>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {t('surcharge_sim_day_normal_notice')}
                  </div>
                )}
              </div>
            )}

            {/* Simulation Tab 3: Holiday */}
            {activeSubTab === 'holiday' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('surcharge_sim_holiday_order_label')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="100000"
                      min="100000"
                      value={simOrderAmount}
                      onChange={(e) => setSimOrderAmount(e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 w-full"
                    />
                  </div>
                </div>

                {/* Calculation Breakdown Card */}
                <div className="p-4 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{t('surcharge_sim_base_price')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(simOrderAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{t('surcharge_sim_holiday_rate')}</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      +{holidayPercentage}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{t('surcharge_sim_holiday_fee')}</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      +{formatCurrency(simHolidayFee)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {t('surcharge_sim_holiday_total')}
                    </span>
                    <span className="font-extrabold text-base text-rose-600 dark:text-rose-400">
                      {formatCurrency(simTotalHolidayAmount)}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
                  🎉 {t('surcharge_sim_holiday_invoice_prefix')}<em>&quot;{t('surcharge_sim_holiday_invoice_text')} {getLocalizedHolidayName(holidayName)} (+{holidayPercentage}%)&quot;</em>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-400 text-center">
            {t('surcharge_sim_reactive_footer')}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-slate-400">
          {t('surcharge_footer_system_note')}
        </p>
        <Button
          variant="primary"
          icon={Save}
          onClick={handleSaveAll}
          isLoading={isLoading}
        >
          {t('save')}
        </Button>
      </div>
    </div>
  );
};
