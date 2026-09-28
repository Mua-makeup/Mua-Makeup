import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  Pencil,
  Clock,
  AlertTriangle,
  AlertCircle,
  Sun,
  CloudSun,
  Moon,
  Users,
  Filter,
  Sparkles,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { Modal } from '../../base/Modal';
import { ConfirmDialog } from '../../base/ConfirmDialog';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { Select } from '../../base/Select';
import { Toast } from '../../base/Toast';
import { agencyService } from '../../../services/agency.service';
import { SHIFT_DAYS } from '../../../constants/agency.constant';
import { useShiftConflict } from '../../../hooks/useShiftConflict';
import { shiftSchema } from '../../../schemas/agency.schema';
import { useI18nStore } from '../../../store/useI18nStore';

// Định nghĩa 3 buổi trong ngày
const SHIFT_PERIODS = [
  {
    id: 'MORNING',
    timeRange: '06:00 - 12:00',
    icon: Sun,
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    accentBorder: 'border-l-amber-500',
    cardBorder: 'border-amber-100 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700',
    cardBg: 'bg-amber-50/30 dark:bg-amber-950/15',
    timeColor: 'text-amber-800 dark:text-amber-300',
  },
  {
    id: 'AFTERNOON',
    timeRange: '12:00 - 18:00',
    icon: CloudSun,
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    accentBorder: 'border-l-rose-500',
    cardBorder: 'border-rose-100 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-700',
    cardBg: 'bg-rose-50/30 dark:bg-rose-950/15',
    timeColor: 'text-rose-800 dark:text-rose-300',
  },
  {
    id: 'EVENING',
    timeRange: '18:00 - 23:00',
    icon: Moon,
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
    accentBorder: 'border-l-indigo-500',
    cardBorder: 'border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700',
    cardBg: 'bg-indigo-50/30 dark:bg-indigo-950/15',
    timeColor: 'text-indigo-800 dark:text-indigo-300',
  },
];

// Kiểm tra ca trực có giao thoa (overlap) với khoảng thời gian của buổi không
const isShiftInPeriod = (shift, periodId) => {
  if (!shift?.startTime || !shift?.endTime) return false;

  const parseMinutes = (tStr) => {
    if (!tStr) return 0;
    const parts = tStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  };

  const shiftStart = parseMinutes(shift.startTime);
  const shiftEnd = parseMinutes(shift.endTime);

  let periodStart = 6 * 60; // 06:00
  let periodEnd = 12 * 60; // 12:00

  if (periodId === 'AFTERNOON') {
    periodStart = 12 * 60; // 12:00
    periodEnd = 18 * 60; // 18:00
  } else if (periodId === 'EVENING') {
    periodStart = 18 * 60; // 18:00
    periodEnd = 24 * 60; // 24:00
  }

  return Math.max(shiftStart, periodStart) < Math.min(shiftEnd, periodEnd);
};

// Phân loại ca vào buổi dựa theo giờ bắt đầu
const getPeriodId = (startTime) => {
  if (!startTime) return 'MORNING';
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour < 12) return 'MORNING';
  if (hour < 18) return 'AFTERNOON';
  return 'EVENING';
};

export const WeeklyShiftTable = () => {
  const { t } = useI18nStore();
  const [shifts, setShifts] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [filterStaffId, setFilterStaffId] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [isNotVerified, setIsNotVerified] = useState(false);

  // Phân ca / sửa ca modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [formError, setFormError] = useState('');

  // Xóa ca modal alert state
  const [deletingShift, setDeletingShift] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag & drop state
  const [draggedShift, setDraggedShift] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null); // { periodId, dayValue }
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Form fields
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedDays, setSelectedDays] = useState([2]); // Mảng các ngày trong tuần (2: T2, ...)
  const [shiftName, setShiftName] = useState(t('preset_morning'));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');

  // Quản lý tuần làm việc (Week Navigation)
  const [currentWeekBase, setCurrentWeekBase] = useState(() => new Date());

  // Tính 7 ngày của tuần được chọn (Thứ 2 = index 0 đến Chủ Nhật = index 6)
  const weekDays = useMemo(() => {
    const current = new Date(currentWeekBase);
    const day = current.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
    const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentWeekBase]);

  // Map day value từ backend (2: T2, 3: T3, ..., 7: T7, 1: CN) sang Date tương ứng
  const getDayDate = (dayValue) => {
    const val = Number(dayValue);
    const idx = val === 1 ? 6 : val - 2;
    return weekDays[idx] || new Date();
  };

  const formatDateShort = (d) => {
    const dateNum = String(d.getDate()).padStart(2, '0');
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    return `${dateNum}/${monthNum}`;
  };

  const isDateToday = (d) => {
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const formatDateFull = (d) => {
    if (!d) return '';
    const dateNum = String(d.getDate()).padStart(2, '0');
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const yearNum = d.getFullYear();
    return `${dateNum}/${monthNum}/${yearNum}`;
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekBase);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekBase(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekBase);
    next.setDate(next.getDate() + 7);
    setCurrentWeekBase(next);
  };

  const handleThisWeek = () => {
    setCurrentWeekBase(new Date());
  };

  const formatToIsoDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load shift matrix and staff
  const loadData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const startDate = formatToIsoDate(weekDays[0]);
      const endDate = formatToIsoDate(weekDays[6]);

      const [shiftRes, staffRes] = await Promise.allSettled([
        agencyService.getWeeklyShiftMatrix({ startDate, endDate }),
        agencyService.getStaffList('ACTIVE'),
      ]);

      let unverifiedDetected = false;

      if (shiftRes.status === 'fulfilled') {
        const raw = shiftRes.value?.data || shiftRes.value;
        let list = [];
        if (Array.isArray(raw?.days)) {
          list = raw.days.flatMap((d) => d.shifts || []);
        } else if (Array.isArray(raw?.shifts)) {
          list = raw.shifts;
        } else if (Array.isArray(raw)) {
          list = raw;
        }
        setShifts(list);
      } else {
        const sReason = shiftRes.reason;
        const errCode = sReason?.response?.data?.errorCode;
        const errMsg = sReason?.response?.data?.message || sReason?.message || '';
        if (errCode === 'ERR_AGENCY_NOT_VERIFIED' || errMsg.toLowerCase().includes('not verified')) {
          unverifiedDetected = true;
        } else {
          setApiError(
            !sReason?.response || sReason?.code === 'ERR_NETWORK'
              ? t('error_api_connection')
              : errMsg
          );
        }
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
        const stReason = staffRes.reason;
        const errCode = stReason?.response?.data?.errorCode;
        const errMsg = stReason?.response?.data?.message || '';
        if (errCode === 'ERR_AGENCY_NOT_VERIFIED' || errMsg.toLowerCase().includes('not verified')) {
          unverifiedDetected = true;
        }
        setStaffList([]);
      }

      setIsNotVerified(unverifiedDetected);
      if (unverifiedDetected) {
        setApiError(null);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWeekBase]);

  // Danh sách ca sau khi lọc theo thợ
  const filteredShifts = useMemo(() => {
    if (filterStaffId === 'ALL') return shifts;
    return shifts.filter((s) => String(s.staffId) === String(filterStaffId));
  }, [shifts, filterStaffId]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const morningCount = shifts.filter((s) => isShiftInPeriod(s, 'MORNING')).length;
    const afternoonCount = shifts.filter((s) => isShiftInPeriod(s, 'AFTERNOON')).length;
    const eveningCount = shifts.filter((s) => isShiftInPeriod(s, 'EVENING')).length;
    const uniqueStaffCount = new Set(shifts.map((s) => s.staffId)).size;
    return {
      total: shifts.length,
      morning: morningCount,
      afternoon: afternoonCount,
      evening: eveningCount,
      uniqueStaff: uniqueStaffCount,
    };
  }, [shifts]);

  // Real-time Shift Conflict Hook
  const { hasConflict, conflictMessage } = useShiftConflict(shifts, {
    id: editingShift?.id,
    staffId: Number(selectedStaffId),
    dayOfWeek: Number(selectedDays[0] || 2),
    shiftName,
    startTime,
    endTime,
  });

  const getDayInfo = (dayKey) => {
    const map = {
      MONDAY: { label: t('day_monday'), shortLabel: t('day_short_t2') },
      TUESDAY: { label: t('day_tuesday'), shortLabel: t('day_short_t3') },
      WEDNESDAY: { label: t('day_wednesday'), shortLabel: t('day_short_t4') },
      THURSDAY: { label: t('day_thursday'), shortLabel: t('day_short_t5') },
      FRIDAY: { label: t('day_friday'), shortLabel: t('day_short_t6') },
      SATURDAY: { label: t('day_saturday'), shortLabel: t('day_short_t7') },
      SUNDAY: { label: t('day_sunday'), shortLabel: t('day_short_cn') },
    };
    return map[dayKey] || { label: dayKey, shortLabel: dayKey };
  };

  // Tính thời lượng làm việc hiển thị
  const durationText = useMemo(() => {
    if (!startTime || !endTime) return '';
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const totalMinutes = eH * 60 + eM - (sH * 60 + sM);
    if (totalMinutes <= 0) return 'Invalid';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  }, [startTime, endTime]);

  const handleApplyPreset = (preset) => {
    setShiftName(preset.shiftName);
    setStartTime(preset.startTime);
    setEndTime(preset.endTime);
  };

  const handleToggleDay = (dayVal) => {
    if (editingShift) {
      setSelectedDays([dayVal]);
      return;
    }
    setSelectedDays((prev) => {
      if (prev.includes(dayVal)) {
        if (prev.length <= 1) return prev;
        return prev.filter((d) => d !== dayVal);
      }
      return [...prev, dayVal].sort((a, b) => a - b);
    });
  };

  const handleSelectWeekdays = () => {
    if (editingShift) return;
    setSelectedDays([2, 3, 4, 5, 6]);
  };

  const handleSelectFullWeek = () => {
    if (editingShift) return;
    setSelectedDays([2, 3, 4, 5, 6, 7, 1]);
  };

  const handleStartEditShift = (shift) => {
    setEditingShift(shift);
    setSelectedStaffId(String(shift.staffId));
    setSelectedDays([Number(shift.dayOfWeek)]);
    setShiftName(shift.shiftName || t('preset_morning'));
    setStartTime(shift.startTime ? shift.startTime.substring(0, 5) : '08:00');
    setEndTime(shift.endTime ? shift.endTime.substring(0, 5) : '12:00');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSaveShift = async (e) => {
    e.preventDefault();
    setFormError('');

    if (hasConflict) {
      setFormError(conflictMessage || t('conflict_error_default'));
      return;
    }

    if (!selectedStaffId) {
      setFormError(t('field_choose_staff'));
      return;
    }

    const cleanStart = (startTime || '').trim();
    const cleanEnd = (endTime || '').trim();
    const fmtStartTime = cleanStart.length === 5 ? `${cleanStart}:00` : cleanStart;
    const fmtEndTime = cleanEnd.length === 5 ? `${cleanEnd}:00` : cleanEnd;

    setIsLoading(true);
    try {
      if (editingShift) {
        const targetDay = selectedDays[0] || Number(editingShift.dayOfWeek);
        const targetDateObj = getDayDate(targetDay);
        const targetWorkDate = formatToIsoDate(targetDateObj);

        const payload = {
          staffId: Number(selectedStaffId),
          dayOfWeek: Number(targetDay),
          workDate: targetWorkDate,
          shiftName: shiftName.trim(),
          startTime: fmtStartTime,
          endTime: fmtEndTime,
          isRecurring: false,
        };

        const validation = shiftSchema.safeParse(payload);
        if (!validation.success) {
          setFormError(validation.error.errors[0]?.message || t('error_general'));
          setIsLoading(false);
          return;
        }

        const res = await agencyService.updateShift(editingShift.id, payload);
        const updated = res.data || res;
        setShifts((prev) =>
          prev.map((s) =>
            s.id === editingShift.id
              ? {
                  ...s,
                  ...updated,
                  dayOfWeek: Number(targetDay),
                  workDate: targetWorkDate,
                  startTime: fmtStartTime,
                  endTime: fmtEndTime,
                  shiftName: payload.shiftName,
                  staffName:
                    staffList.find((st) => st.id === Number(selectedStaffId))?.fullName ||
                    s.staffName,
                }
              : s
          )
        );
        setToastMessage(t('shift_updated_success'));
        setToastType('success');
        setIsAddModalOpen(false);
        setEditingShift(null);
      } else {
        // Create mode: allow multiple days
        const promises = selectedDays.map(async (dayVal) => {
          const targetDateObj = getDayDate(dayVal);
          const targetWorkDate = formatToIsoDate(targetDateObj);
          const payload = {
            staffId: Number(selectedStaffId),
            dayOfWeek: Number(dayVal),
            workDate: targetWorkDate,
            shiftName: shiftName.trim(),
            startTime: fmtStartTime,
            endTime: fmtEndTime,
            isRecurring: false,
          };

          const validation = shiftSchema.safeParse(payload);
          if (!validation.success) {
            throw new Error(validation.error.errors[0]?.message || t('error_general'));
          }

          const res = await agencyService.createShift(payload);
          const created = res.data || res;
          return {
            ...created,
            dayOfWeek: Number(dayVal),
            workDate: targetWorkDate,
            startTime: fmtStartTime,
            endTime: fmtEndTime,
            shiftName: payload.shiftName,
            staffName:
              staffList.find((s) => s.id === Number(selectedStaffId))?.fullName ||
              `${t('staff_label')} #${selectedStaffId}`,
          };
        });

        const results = await Promise.allSettled(promises);
        const newShifts = results
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value);

        if (newShifts.length > 0) {
          setShifts((prev) => [...prev, ...newShifts]);
          setToastMessage(t('shift_created_success') || 'Phân ca thành công!');
          setToastType('success');
          setIsAddModalOpen(false);
        }

        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length > 0) {
          const firstErr = failed[0].reason?.response?.data?.message || failed[0].reason?.message;
          setFormError(firstErr || t('shift_save_error'));
        }
      }
    } catch (err) {
      setFormError(
        err.response?.data?.message || err.message || t('shift_save_error')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDeleteShift = async () => {
    if (!deletingShift) return;
    setIsDeleting(true);
    try {
      await agencyService.deleteShift(deletingShift.id);
      setShifts((prev) => prev.filter((s) => s.id !== deletingShift.id));
      setDeletingShift(null);
    } catch {
      setShifts((prev) => prev.filter((s) => s.id !== deletingShift.id));
      setDeletingShift(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const openAddForDayAndPeriod = (dayValue, periodId) => {
    setEditingShift(null);
    setSelectedDays([Number(dayValue)]);
    if (staffList.length > 0) setSelectedStaffId(String(staffList[0].id));

    if (periodId === 'MORNING') {
      setShiftName(t('preset_morning'));
      setStartTime('08:00');
      setEndTime('12:00');
    } else if (periodId === 'AFTERNOON') {
      setShiftName(t('preset_afternoon'));
      setStartTime('13:00');
      setEndTime('17:00');
    } else if (periodId === 'EVENING') {
      setShiftName(t('preset_overtime'));
      setStartTime('18:00');
      setEndTime('21:30');
    }

    setFormError('');
    setIsAddModalOpen(true);
  };

  // Drag and Drop event handlers
  const handleDragStart = (e, shift) => {
    setDraggedShift(shift);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(shift.id));
  };

  const handleDragEnd = () => {
    setDraggedShift(null);
    setDragOverCell(null);
  };

  const handleDragOver = (e, periodId, dayValue) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverCell || dragOverCell.periodId !== periodId || dragOverCell.dayValue !== dayValue) {
      setDragOverCell({ periodId, dayValue });
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverCell(null);
    }
  };

  const handleDropOnCell = async (targetPeriodId, targetDayValue) => {
    setDragOverCell(null);
    if (!draggedShift) return;

    const targetDay = Number(targetDayValue);
    const currentPeriod = getPeriodId(draggedShift.startTime);
    const isSameDay = Number(draggedShift.dayOfWeek) === targetDay;
    const isSamePeriod = currentPeriod === targetPeriodId;

    if (isSameDay && isSamePeriod) {
      setDraggedShift(null);
      return;
    }

    // Determine new times based on target period
    let newStartTime = draggedShift.startTime;
    let newEndTime = draggedShift.endTime;
    let newShiftName = draggedShift.shiftName;

    if (!isSamePeriod) {
      if (targetPeriodId === 'MORNING') {
        newStartTime = '08:00';
        newEndTime = '12:00';
        newShiftName = t('preset_morning');
      } else if (targetPeriodId === 'AFTERNOON') {
        newStartTime = '13:00';
        newEndTime = '17:00';
        newShiftName = t('preset_afternoon');
      } else if (targetPeriodId === 'EVENING') {
        newStartTime = '18:00';
        newEndTime = '21:30';
        newShiftName = t('preset_overtime');
      }
    }

    // Client-side conflict check before calling API
    const parseMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    const newStartM = parseMinutes(newStartTime);
    const newEndM = parseMinutes(newEndTime);

    const hasOverlap = shifts.some((s) => {
      if (s.id === draggedShift.id) return false;
      if (String(s.staffId) !== String(draggedShift.staffId)) return false;
      if (Number(s.dayOfWeek) !== targetDay) return false;
      const sStart = parseMinutes(s.startTime);
      const sEnd = parseMinutes(s.endTime);
      return sStart < newEndM && sEnd > newStartM;
    });

    if (hasOverlap) {
      setToastType('error');
      setToastMessage(t('shift_drag_conflict_error'));
      setDraggedShift(null);
      return;
    }

    const targetDateObj = getDayDate(targetDay);
    const targetWorkDate = formatToIsoDate(targetDateObj);

    // Optimistic UI update
    const previousShifts = [...shifts];
    setShifts((prev) =>
      prev.map((s) =>
        s.id === draggedShift.id
          ? {
              ...s,
              dayOfWeek: targetDay,
              workDate: targetWorkDate,
              startTime: newStartTime,
              endTime: newEndTime,
              shiftName: newShiftName,
            }
          : s
      )
    );

    try {
      await agencyService.updateShift(draggedShift.id, {
        staffId: draggedShift.staffId,
        dayOfWeek: targetDay,
        workDate: targetWorkDate,
        shiftName: newShiftName,
        startTime: newStartTime,
        endTime: newEndTime,
        isRecurring: false,
      });
      setToastType('success');
      setToastMessage(t('shift_drag_success'));
    } catch (err) {
      // Rollback on error
      setShifts(previousShifts);
      setToastType('error');
      setToastMessage(
        err.response?.data?.message || err.message || t('shift_drag_conflict_error')
      );
    } finally {
      setDraggedShift(null);
    }
  };

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
            <p className="mt-0.5 text-slate-600 dark:text-slate-400 font-mono">{apiError}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadData}>
              {t('retry')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setApiError(null)}>
              {t('close')}
            </Button>
          </div>
        </div>
      )}

      {/* Main Content: Pending Verification Notice vs Shift Schedule Board */}
      {isNotVerified ? (
        <AgencyPendingVerificationNotice
          featureName={t('shifts_title')}
          onRefresh={loadData}
          isLoading={isLoading}
        />
      ) : (
        <>
          {/* KPI Stats & Quick Filter Header */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t('kpi_total_shifts')}</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {stats.total} <span className="text-xs font-normal text-slate-400">{t('shifts_unit')}</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">{t('kpi_morning')}</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {stats.morning} <span className="text-xs font-normal text-slate-400">{t('shifts_unit')}</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/40 rounded-2xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <CloudSun className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400">{t('kpi_afternoon')}</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {stats.afternoon} <span className="text-xs font-normal text-slate-400">{t('shifts_unit')}</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/40 rounded-2xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-400">{t('kpi_evening')}</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {stats.evening} <span className="text-xs font-normal text-slate-400">{t('shifts_unit')}</span>
            </p>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t('kpi_active_staff_shifts')}</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {stats.uniqueStaff} / {staffList.length}
            </p>
          </div>
        </div>
      </div>

      {/* Week Navigator Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-rose-50/50 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border border-rose-200/60 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono tracking-wide">
                {formatDateShort(weekDays[0])} – {formatDateShort(weekDays[6])}/{currentWeekBase.getFullYear()}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                {t('shift_week_schedule_note')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap w-full sm:w-auto">
          {/* Bộ chọn lịch trực tiếp */}
          <div className="relative flex items-center gap-2 bg-white dark:bg-slate-800 border border-rose-300/80 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-2xs hover:border-rose-500 transition-all focus-within:ring-2 focus-within:ring-rose-500/20 cursor-pointer group">
            <CalendarDays className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 hidden md:inline">
              {t('shift_select_date_label')}:
            </span>
            <span className="text-xs font-extrabold text-rose-700 dark:text-rose-300 tracking-wide font-mono">
              {formatDateFull(currentWeekBase)}
            </span>
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 group-hover:text-rose-600 transition-colors" />
            <input
              type="date"
              value={formatToIsoDate(currentWeekBase)}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split('-').map(Number);
                  setCurrentWeekBase(new Date(y, m - 1, d));
                }
              }}
              onClick={(e) => {
                try {
                  if (typeof e.target.showPicker === 'function') {
                    e.target.showPicker();
                  }
                } catch {
                  // Fallback to browser default
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title={t('shift_pick_date_title')}
            />
          </div>

          {/* Nút trở về Tuần Này */}
          <button
            type="button"
            onClick={handleThisWeek}
            className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-bold text-rose-700 dark:text-rose-300 transition-colors shadow-2xs cursor-pointer"
          >
            {t('shift_nav_this_week')}
          </button>

          {/* Nút lùi / tiến tuần gọn gàng */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
              title={t('shift_nav_prev_week')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
              title={t('shift_nav_next_week')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Bar & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">{t('filter_by_staff')}</span>
          <select
            value={filterStaffId}
            onChange={(e) => setFilterStaffId(e.target.value)}
            className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-rose-500 w-full sm:w-auto"
          >
            <option value="ALL">{t('filter_all_staff')} ({staffList.length})</option>
            {staffList.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.fullName || `${t('staff_label')} #${s.id}`}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            setEditingShift(null);
            setSelectedDays([2]);
            if (staffList.length > 0) setSelectedStaffId(String(staffList[0].id));
            setShiftName(t('preset_morning'));
            setStartTime('08:00');
            setEndTime('12:00');
            setFormError('');
            setIsAddModalOpen(true);
          }}
          className="shadow-sm w-full sm:w-auto"
        >
          {t('btn_new_shift')}
        </Button>
      </div>

      {/* Hướng Dẫn Kéo Thả Ca Trực */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-2xl text-xs text-rose-700 dark:text-rose-300">
        <Sparkles className="w-4 h-4 text-rose-500 shrink-0" />
        <span>{t('shift_drag_instruction')}</span>
      </div>

      {/* Thời Khóa Biểu 7 Ngày Chia Theo Buổi (Sáng - Chiều - Tối) */}
      <div className="space-y-4">
        {SHIFT_PERIODS.map((period) => {
          const PeriodIcon = period.icon;
          const periodName =
            period.id === 'MORNING'
              ? t('period_morning')
              : period.id === 'AFTERNOON'
              ? t('period_afternoon')
              : t('period_evening');

          return (
            <div
              key={period.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors"
            >
              {/* Header của Buổi */}
              <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border ${period.badgeBg}`}
                  >
                    <PeriodIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {periodName}
                    </span>
                    <span className="ml-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      ({period.timeRange})
                    </span>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {
                    filteredShifts.filter((s) => isShiftInPeriod(s, period.id)).length
                  }{' '}
                  {t('shifts_unit')}
                </span>
              </div>

              {/* 7 Cột Ngày tương ứng với Buổi này */}
              <div className="overflow-x-auto scrollbar-none">
                <div className="grid grid-cols-7 min-w-[780px] xl:min-w-0 divide-x divide-slate-100 dark:divide-slate-800 min-h-[140px]">
                {SHIFT_DAYS.map((d) => {
                  const dayInfo = getDayInfo(d.key);
                  const dateObj = getDayDate(d.value);
                  const dateIsoStr = formatToIsoDate(dateObj);

                  const dayShifts = filteredShifts.filter((s) => {
                    const isSameDow = Number(s.dayOfWeek) === Number(d.value);
                    const isSamePeriod = isShiftInPeriod(s, period.id);
                    if (!isSameDow || !isSamePeriod) return false;

                    // Nếu ca có workDate: Phải khớp chính xác ngày của cột trong tuần đó
                    if (s.workDate) {
                      return s.workDate === dateIsoStr;
                    }
                    // Nếu ca định kỳ không có ngày: chỉ hiển thị khi isRecurring = true
                    return s.isRecurring !== false;
                  });

                  const isCellDragOver =
                    dragOverCell?.periodId === period.id &&
                    Number(dragOverCell?.dayValue) === Number(d.value);

                  return (
                    <div
                      key={`${period.id}-${d.value}`}
                      onDragOver={(e) => handleDragOver(e, period.id, d.value)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDropOnCell(period.id, d.value);
                      }}
                      className={`p-2.5 flex flex-col justify-between transition-all duration-200 ${
                        isCellDragOver
                          ? 'bg-rose-50/90 dark:bg-rose-950/50 ring-2 ring-rose-500/80 ring-inset rounded-xl shadow-inner'
                          : 'hover:bg-slate-50/40 dark:hover:bg-slate-800/20'
                      }`}
                    >
                      {/* Tiêu đề thứ cho từng cột */}
                      {(() => {
                        const dateObj = getDayDate(d.value);
                        const isDayToday = isDateToday(dateObj);
                        return (
                          <div className={`flex items-center justify-between pb-1.5 mb-1.5 border-b ${
                            isDayToday 
                              ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 -mx-1 px-1 rounded-t-lg'
                              : 'border-slate-100 dark:border-slate-800/60'
                          }`}>
                            <div className="flex items-center gap-1 min-w-0">
                              <span className={`text-[11px] font-bold truncate ${
                                isDayToday 
                                  ? 'text-rose-600 dark:text-rose-400 font-extrabold' 
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}>
                                {dayInfo.shortLabel} ({formatDateShort(dateObj)})
                              </span>
                              {isDayToday && (
                                <span className="text-[8px] font-black px-1 py-0.5 rounded bg-gradient-to-r from-rose-500 to-pink-500 text-white shrink-0 tracking-tight leading-none">
                                  {t('badge_today')}
                                </span>
                              )}
                            </div>
                            {dayShifts.length > 0 && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                                isDayToday
                                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}>
                                {dayShifts.length}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Danh sách ca trực trong buổi */}
                      <div className="space-y-2 flex-1">
                        {dayShifts.length === 0 ? (
                          <div
                            className={`h-14 flex items-center justify-center text-[11px] italic transition-all rounded-lg ${
                              isCellDragOver
                                ? 'text-rose-600 dark:text-rose-400 font-bold border-2 border-dashed border-rose-400 dark:border-rose-600 bg-white/80 dark:bg-slate-800/80'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          >
                            {isCellDragOver ? t('shift_drop_hint') : t('empty_shifts_slot')}
                          </div>
                        ) : (
                          dayShifts.map((s) => {
                            const isThisDragging = draggedShift?.id === s.id;
                            return (
                              <div
                                key={s.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, s)}
                                onDragEnd={handleDragEnd}
                                className={`p-2 rounded-xl border ${period.cardBorder} ${period.cardBg} text-xs relative group transition-all shadow-2xs cursor-grab active:cursor-grabbing hover:shadow-md select-none ${
                                  isThisDragging
                                    ? 'opacity-30 scale-95 border-dashed border-rose-400'
                                    : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 shrink-0" />
                                    <span className="font-bold text-slate-900 dark:text-white truncate block">
                                      {s.staffName || `${t('staff_label')} #${s.staffId}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEditShift(s);
                                      }}
                                      className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/40 active:scale-90"
                                      title={t('btn_edit_shift')}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingShift(s);
                                      }}
                                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-90"
                                      title={t('delete')}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate mt-0.5 pl-4.5">
                                  {s.shiftName}
                                </p>

                                <div
                                  className={`mt-1 flex items-center gap-1 text-[10px] font-mono font-bold ${period.timeColor} pl-4.5`}
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {s.startTime} - {s.endTime}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Nút thêm ca nhanh tại buổi của ngày đó */}
                      <button
                        onClick={() => openAddForDayAndPeriod(d.value, period.id)}
                        className="mt-2 w-full py-1 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50/20 text-[10px] font-medium transition-colors flex items-center justify-center gap-1"
                        title={`${t('btn_add_shift')} ${periodName} (${dayInfo.label})`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{t('btn_add_shift')}</span>
                      </button>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Modal Phân Ca & Chặn Trùng Giờ (Đã Tối Ưu Toàn Diện) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <CalendarDays className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <span>{editingShift ? t('modal_shift_edit_title') : t('modal_shift_title')}</span>
          </div>
        }
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveShift} className="space-y-4">
          {/* Conflict Alert Banner */}
          {hasConflict && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">{t('conflict_warning_title')}</strong>
                <span>{conflictMessage}</span>
              </div>
            </div>
          )}

          {formError && !hasConflict && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg">
              {formError}
            </div>
          )}

          {/* Chọn Thợ */}
          <Select
            label={t('field_choose_staff')}
            required
            options={staffList.map((s) => ({
              value: String(s.id),
              label: s.fullName || `${t('staff_label')} #${s.id}`,
            }))}
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
          />

          {/* Chọn Ngày Trong Tuần Dạng Tag/Pill Trực Quan */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('field_day_of_week')} <span className="text-rose-600">*</span>
              </label>
              {!editingShift && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectWeekdays}
                    className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 cursor-pointer"
                  >
                    {t('btn_select_all_weekdays')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectFullWeek}
                    className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 cursor-pointer"
                  >
                    {t('btn_select_full_week')}
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {SHIFT_DAYS.map((d) => {
                const dayInfo = getDayInfo(d.key);
                const isSelected = selectedDays.includes(Number(d.value));
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => handleToggleDay(Number(d.value))}
                    className={`py-2 px-1 rounded-xl text-center border transition-all active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm font-bold scale-[1.02] ring-2 ring-rose-500/30'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 font-medium text-xs'
                    }`}
                  >
                    <div className="text-xs font-bold">{dayInfo.shortLabel}</div>
                    <div className="text-[9px] opacity-80 truncate">{dayInfo.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chọn Nhanh Ca Mẫu (Presets) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
              {t('shifts_title')} (Presets):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: t('preset_morning'),
                  shiftName: t('preset_morning'),
                  startTime: '08:00',
                  endTime: '12:00',
                  icon: Sun,
                  color: 'hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-amber-950/30',
                },
                {
                  label: t('preset_afternoon'),
                  shiftName: t('preset_afternoon'),
                  startTime: '13:00',
                  endTime: '17:00',
                  icon: CloudSun,
                  color: 'hover:border-rose-400 hover:bg-rose-50/40 dark:hover:bg-rose-950/30',
                },
                {
                  label: t('preset_overtime'),
                  shiftName: t('preset_overtime'),
                  startTime: '18:00',
                  endTime: '21:30',
                  icon: Moon,
                  color: 'hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30',
                },
                {
                  label: t('preset_full_day'),
                  shiftName: t('preset_full_day'),
                  startTime: '08:00',
                  endTime: '17:00',
                  icon: Sparkles,
                  color: 'hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30',
                },
              ].map((preset) => {
                const PresetIcon = preset.icon;
                const isSelectedPreset =
                  shiftName === preset.shiftName &&
                  startTime === preset.startTime &&
                  endTime === preset.endTime;

                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-2 rounded-xl border text-left transition-all active:scale-95 cursor-pointer flex items-center gap-2 ${
                      isSelectedPreset
                        ? 'border-rose-600 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20 shadow-xs font-semibold'
                        : `border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 ${preset.color}`
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shadow-2xs ${
                        isSelectedPreset
                          ? 'bg-rose-600 text-white'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <PresetIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate leading-tight">
                        {preset.label}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        {preset.startTime} - {preset.endTime}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tên ca làm việc (Chỉ đọc để tránh gõ sai) */}
          <Input
            label={t('field_shift_name')}
            required
            readOnly
            placeholder={t('shift_field_name_placeholder')}
            value={shiftName}
            className="bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed select-none text-slate-700 dark:text-slate-300 font-medium"
            helperText={t('shift_name_readonly_hint')}
          />

          {/* Khung giờ & thời lượng */}
          <div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('field_start_time')}
                type="text"
                placeholder="08:00"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                helperText="HH:mm"
              />

              <Input
                label={t('field_end_time')}
                type="text"
                placeholder="12:00"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                helperText="HH:mm"
              />
            </div>

            {durationText && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>{t('duration_label')} <strong className="text-slate-800 dark:text-slate-200">{durationText}</strong></span>
              </div>
            )}
          </div>

          <div className="pt-3 grid grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)} disabled={isLoading} className="col-span-1 w-full">
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={hasConflict || !selectedStaffId || selectedDays.length === 0}
              isLoading={isLoading}
              className="col-span-2 w-full"
            >
              {editingShift ? t('btn_update_shift') : t('btn_save_shift')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Cảnh Báo Xóa Ca Làm Việc */}
      <ConfirmDialog
        isOpen={!!deletingShift}
        onClose={() => setDeletingShift(null)}
        onConfirm={handleConfirmDeleteShift}
        title={t('modal_delete_shift_title')}
        message={
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('modal_delete_shift_desc')}
            </p>
            {deletingShift && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 text-slate-700 dark:text-slate-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">{t('field_choose_staff')}:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{deletingShift.staffName || `${t('staff_label')} #${deletingShift.staffId}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">{t('field_shift_name')}:</span>
                  <span className="font-medium">{deletingShift.shiftName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">{t('duration_label')}:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{deletingShift.startTime} - {deletingShift.endTime}</span>
                </div>
              </div>
            )}
          </div>
        }
        confirmText={t('btn_confirm_delete')}
        cancelText={t('cancel')}
        isDangerous={true}
        isLoading={isDeleting}
      />

      {/* Global Notification Toast */}
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage('')}
      />
    </div>
  );
};
