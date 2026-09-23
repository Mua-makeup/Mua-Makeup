import React from 'react';
import {
  Building2,
  Phone,
  MapPin,
  Compass,
  Percent,
  TrendingUp,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../../base/Modal';
import { useI18nStore } from '../../../store/useI18nStore';

export const AgencyStudioDetailModal = ({ isOpen, onClose, data }) => {
  const { t } = useI18nStore();

  const fullAddress = [data?.addressStreet, data?.district, data?.city]
    .filter(Boolean)
    .join(', ') || t('agency_address_not_set');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <span>{t('agency_detail_modal_title') || 'Thông Tin Chi Tiết Cơ Sở & Studio'}</span>
        </div>
      }
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Read-only Advisory Banner */}
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p className="leading-relaxed">
            {t('agency_detail_readonly_notice') ||
              'Chế độ chỉ xem. Để chỉnh sửa thông tin Studio hoặc tỷ lệ hoa hồng, vui lòng mở menu tài khoản ở góc trên bên phải.'}
          </p>
        </div>

        {/* Studio Branding Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center shrink-0">
            {data?.logoUrl ? (
              <img
                src={data.logoUrl}
                alt={data.agencyName}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-8 h-8 text-rose-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                {data?.agencyName || 'Studio Agency'}
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                {t('agency_detail_status_active')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono">{data?.hotline || t('agency_detail_not_updated')}</span>
            </div>
          </div>
        </div>

        {/* Detail Attributes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Address */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1 sm:col-span-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>{t('agency_settings_field_street')}</span>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white pl-5">
              {fullAddress}
            </p>
          </div>

          {/* GPS Coordinates */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Compass className="w-3.5 h-3.5 text-blue-500" />
              <span>{t('agency_detail_coords')}</span>
            </div>
            <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 pl-5">
              {data?.latitude ? Number(data.latitude).toFixed(5) : '0.00000'},{' '}
              {data?.longitude ? Number(data.longitude).toFixed(5) : '0.00000'}
            </p>
          </div>

          {/* Commission Rate */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Percent className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('agency_detail_commission')}</span>
            </div>
            <p className="text-sm font-bold text-rose-600 dark:text-rose-400 pl-5">
              {data?.commissionRateInternal ?? 20}%
            </p>
          </div>

          {/* Surge Pricing Policy */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1 sm:col-span-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('agency_detail_surge_title')}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 pl-5">
              {data?.isSurgeEnabled !== false
                ? t('agency_detail_surge_enabled')
                : t('agency_detail_surge_disabled')}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
