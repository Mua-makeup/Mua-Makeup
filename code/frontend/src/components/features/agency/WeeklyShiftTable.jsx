import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, Trash2, Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { Select } from '../../base/Select';
import { agencyService } from '../../../services/agency.service';
import { SHIFT_DAYS } from '../../../constants/agency.constant';
import { useShiftConflict } from '../../../hooks/useShiftConflict';
import { shiftSchema } from '../../../schemas/agency.schema';
import { useI18nStore } from '../../../store/useI18nStore';

export const WeeklyShiftTable = () => {
  const { t } = useI18nStore();
  const [shifts, setShifts] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Form states
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedDay, setSelectedDay] = useState('MONDAY');
  const [shiftName, setShiftName] = useState('Ca Sáng');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');

  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load staff & shifts
  const loadData = async () => {
    setApiError(null);
    try {
      const [shiftRes, staffRes] = await Promise.allSettled([
        agencyService.getWeeklyShiftMatrix(),
        agencyService.getStaffList('ACTIVE'),
      ]);

      if (shiftRes.status === 'fulfilled') {
        const matrixData = shiftRes.value?.data?.shifts || shiftRes.value?.data || shiftRes.value || [];
        setShifts(Array.isArray(matrixData) ? matrixData : []);
      } else {
        setApiError(shiftRes.reason?.message || t('error_api_connection'));
        setShifts([]);
      }

      if (staffRes.status === 'fulfilled') {
        const sList =
          staffRes.value?.data?.content ||
          staffRes.value?.data ||
          staffRes.value?.content ||
          staffRes.value ||
          [];
        setStaffList(Array.isArray(sList) ? sList : []);
      } else {
        setStaffList([]);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time Shift Conflict Hook
  const { hasConflict, conflictMessage } = useShiftConflict(shifts, {
    staffId: Number(selectedStaffId),
    dayOfWeek: selectedDay,
    shiftName,
    startTime,
    endTime,
  });

  const handleCreateShift = async (e) => {
    e.preventDefault();
    setFormError('');

    if (hasConflict) {
      setFormError(conflictMessage || 'Khung giờ bị trùng lặp với ca trực khác!');
      return;
    }

    const payload = {
      staffId: Number(selectedStaffId),
      dayOfWeek: selectedDay,
      shiftName: shiftName.trim(),
      startTime,
      endTime,
    };

    const validation = shiftSchema.safeParse(payload);
    if (!validation.success) {
      setFormError(validation.error.errors[0]?.message || 'Dữ liệu không hợp lệ');
      return;
    }

    setIsLoading(true);
    try {
      const res = await agencyService.createShift(payload);
      const created = res.data || res;
      setShifts((prev) => [
        ...prev,
        {
          ...created,
          staffName:
            staffList.find((s) => s.id === Number(selectedStaffId))?.fullName ||
            `Thợ #${selectedStaffId}`,
        },
      ]);
      setIsAddModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Lỗi khi tạo ca trực, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    try {
      await agencyService.deleteShift(shiftId);
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    } catch {
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    }
  };

  const openAddForDay = (day) => {
    setSelectedDay(day);
    if (staffList.length > 0) setSelectedStaffId(String(staffList[0].id));
    setFormError('');
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Real API Error Alert */}
      {apiError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold text-sm">
              {t('error_api_connection')}
            </strong>
            <p className="mt-0.5 text-slate-600 dark:text-slate-400 font-mono">
              {apiError}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Thử Lại
          </Button>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Ma Trận Ca Trực 7 Ngày Trong Tuần
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Phân bổ lịch làm việc của thợ theo ngày, tích hợp thuật toán tự động ngăn chặn trùng giờ
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            if (staffList.length > 0) setSelectedStaffId(String(staffList[0].id));
            setIsAddModalOpen(true);
          }}
        >
          Phân Ca Mới
        </Button>
      </div>

      {/* Weekly Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {SHIFT_DAYS.map((d) => {
          const dayShifts = shifts.filter((s) => s.dayOfWeek === d.value);

          return (
            <div
              key={d.value}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col justify-between min-h-[300px] transition-colors"
            >
              {/* Day Header */}
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {d.shortLabel}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      {d.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {dayShifts.length}
                  </span>
                </div>

                {/* Shift Cards inside Day */}
                <div className="space-y-2">
                  {dayShifts.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-[11px] italic">
                      Chưa có ca trực
                    </div>
                  ) : (
                    dayShifts.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-xl border border-rose-100 dark:border-rose-950/60 bg-rose-50/40 dark:bg-rose-950/20 text-xs relative group hover:border-rose-300 dark:hover:border-rose-800 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-slate-900 dark:text-white block truncate">
                            {s.staffName || `Thợ #${s.staffId}`}
                          </span>
                          <button
                            onClick={() => handleDeleteShift(s.id)}
                            className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                            title="Xóa ca này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                          {s.shiftName}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-rose-700 dark:text-rose-400 font-bold">
                          <Clock className="w-3 h-3" />
                          <span>
                            {s.startTime} - {s.endTime}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Add Button */}
              <button
                onClick={() => openAddForDay(d.value)}
                className="mt-3 w-full py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 text-xs font-medium transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm Ca</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal Phân Ca & Chặn Trùng Giờ */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <CalendarDays className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <span>Phân Ca Làm Việc & Kiểm Tra Xung Đột</span>
          </div>
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateShift} className="space-y-4">
          {/* Conflict Alert Banner */}
          {hasConflict && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Cảnh Báo Xung Đột Ca Trực:</strong>
                <span>{conflictMessage}</span>
              </div>
            </div>
          )}

          {formError && !hasConflict && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg">
              {formError}
            </div>
          )}

          <Select
            label="Chọn Thợ Make-up"
            required
            options={staffList.map((s) => ({
              value: String(s.id),
              label: s.fullName || `Thợ #${s.id}`,
            }))}
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
          />

          <Select
            label="Ngày Trong Tuần"
            required
            options={SHIFT_DAYS}
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          />

          <Input
            label="Tên Ca Làm Việc"
            required
            placeholder="VD: Ca Sáng, Ca Chiều, Tiệc Đêm..."
            value={shiftName}
            onChange={(e) => setShiftName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Giờ Bắt Đầu"
              type="text"
              placeholder="08:00"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              helperText="Định dạng HH:mm"
            />

            <Input
              label="Giờ Kết Thúc"
              type="text"
              placeholder="12:00"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              helperText="Định dạng HH:mm"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={hasConflict || !selectedStaffId}
              isLoading={isLoading}
            >
              Lưu Ca Trực
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
