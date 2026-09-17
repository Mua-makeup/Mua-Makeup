import React, { useState } from 'react';
import { DollarSign, Clock, Navigation } from 'lucide-react';
import { SurchargeConfigCard } from '../../components/features/agency/SurchargeConfigCard';
import { OvertimeConfigCard } from '../../components/features/agency/OvertimeConfigCard';

export const SurchargeConfigPage = () => {
  const [activeTab, setActiveTab] = useState('surcharges');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Thiết Lập Bảng Phụ Phí Studio & Tăng Ca
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Cấu hình các loại phí phụ trội: Cự ly km di chuyển, khung giờ đặc biệt, ngày lễ tết và duyệt báo cáo làm thêm giờ
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('surcharges')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'surcharges'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Bảng Phụ Phí Cơ Bản (Cự Ly, Giờ Đêm, Lễ Tết)</span>
        </button>

        <button
          onClick={() => setActiveTab('overtime')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'overtime'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Quy Tắc Tăng Ca & Duyệt Đơn Overtime</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'surcharges' && <SurchargeConfigCard />}
      {activeTab === 'overtime' && <OvertimeConfigCard />}
    </div>
  );
};
