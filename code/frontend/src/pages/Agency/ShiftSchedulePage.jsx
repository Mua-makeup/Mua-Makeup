import React from 'react';
import { CalendarDays } from 'lucide-react';
import { WeeklyShiftTable } from '../../components/features/agency/WeeklyShiftTable';

export const ShiftSchedulePage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Lịch Trực & Ma Trận Xếp Ca Tuần
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Hệ thống ma trận 7 ngày với thuật toán kiểm soát thời gian thực, tự động ngăn chặn tình trạng một thợ bị xếp trùng giờ nhiều ca
        </p>
      </div>

      {/* Matrix Table */}
      <WeeklyShiftTable />
    </div>
  );
};
