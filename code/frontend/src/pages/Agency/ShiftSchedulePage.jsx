import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WeeklyShiftTable } from '../../components/features/agency/WeeklyShiftTable';
import { StaffLeaveRequestManagement } from '../../components/features/agency/StaffLeaveRequestManagement';
import { agencyService } from '../../services/agency.service';
import { useI18nStore } from '../../store/useI18nStore';

export const ShiftSchedulePage = () => {
  const { t } = useI18nStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(
    tabParam === 'leave-requests' ? 'LEAVE_REQUESTS' : 'SCHEDULE'
  );
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [shiftRefreshKey, setShiftRefreshKey] = useState(0);

  // Đồng bộ tab khi URL thay đổi (ví dụ bấm từ thông báo chuông)
  useEffect(() => {
    if (tabParam === 'leave-requests') {
      setActiveTab('LEAVE_REQUESTS');
    } else if (tabParam === 'schedule') {
      setActiveTab('SCHEDULE');
    }
  }, [tabParam]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams(tabKey === 'LEAVE_REQUESTS' ? { tab: 'leave-requests' } : {});
  };

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await agencyService.getPendingLeaveRequestsCount();
      const count = res.data?.data?.pendingCount ?? res.data?.pendingCount ?? 0;
      setPendingLeaveCount(Number(count) || 0);
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount, activeTab]);

  // Lắng nghe sự kiện STOMP realtime khi có đơn xin nghỉ mới gửi đến
  useEffect(() => {
    const handleRealtimeLeaveRequest = () => {
      fetchPendingCount();
    };
    window.addEventListener('agency:leave-request', handleRealtimeLeaveRequest);
    return () => {
      window.removeEventListener('agency:leave-request', handleRealtimeLeaveRequest);
    };
  }, [fetchPendingCount]);

  const handleLeaveApproved = () => {
    setShiftRefreshKey((prev) => prev + 1);
    fetchPendingCount();
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('shifts_title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('shifts_sub')}
          </p>
        </div>

        {/* Thanh Chuyển Tab Tối Giản */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => handleTabChange('SCHEDULE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'SCHEDULE'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Thời khóa biểu ca trực
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('LEAVE_REQUESTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'LEAVE_REQUESTS'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Đơn xin nghỉ ca</span>
            {pendingLeaveCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                {pendingLeaveCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Nội dung Tab */}
      {activeTab === 'SCHEDULE' ? (
        <WeeklyShiftTable key={shiftRefreshKey} />
      ) : (
        <StaffLeaveRequestManagement onLeaveApproved={handleLeaveApproved} />
      )}
    </div>
  );
};
