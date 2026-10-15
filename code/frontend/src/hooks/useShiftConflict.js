import { useMemo } from 'react';

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const DAY_NAMES = {
  1: { full: 'Chủ Nhật', short: 'CN' },
  2: { full: 'Thứ Hai', short: 'T2' },
  3: { full: 'Thứ Ba', short: 'T3' },
  4: { full: 'Thứ Tư', short: 'T4' },
  5: { full: 'Thứ Năm', short: 'T5' },
  6: { full: 'Thứ Sáu', short: 'T6' },
  7: { full: 'Thứ Bảy', short: 'T7' },
};

export const useShiftConflict = (existingShifts = [], newShift = null) => {
  return useMemo(() => {
    if (
      !newShift ||
      !newShift.staffId ||
      (!newShift.days?.length && !newShift.dayOfWeek) ||
      !newShift.startTime ||
      !newShift.endTime
    ) {
      return { hasConflict: false, conflictingShift: null, conflictMessage: null, conflictingDayValues: [] };
    }

    const newStart = timeToMinutes(newShift.startTime);
    const newEnd = timeToMinutes(newShift.endTime);

    if (newEnd <= newStart) {
      return {
        hasConflict: true,
        conflictingShift: null,
        conflictMessage: 'Giờ kết thúc phải lớn hơn giờ bắt đầu',
        conflictingDayValues: [],
      };
    }

    const targetDays = Array.isArray(newShift.days) && newShift.days.length > 0
      ? newShift.days.map(Number)
      : (newShift.dayOfWeek ? [Number(newShift.dayOfWeek)] : []);

    const conflicts = [];

    for (const dayVal of targetDays) {
      // Lọc các ca làm việc của cùng thợ trong ngày này
      const staffDayShifts = existingShifts.filter(
        (s) =>
          Number(s.staffId) === Number(newShift.staffId) &&
          Number(s.dayOfWeek) === dayVal &&
          (!newShift.id || s.id !== newShift.id)
      );

      for (const shift of staffDayShifts) {
        const sStart = timeToMinutes(shift.startTime);
        const sEnd = timeToMinutes(shift.endTime);

        // Công thức trùng lặp khoảng thời gian: start1 < end2 && end1 > start2
        if (newStart < sEnd && newEnd > sStart) {
          // Tính nhãn ngày: ví dụ "Thứ Năm (15/10)"
          let dateLabel = '';
          if (shift.workDate && typeof shift.workDate === 'string') {
            const parts = shift.workDate.split('T')[0].split('-');
            if (parts.length === 3) {
              dateLabel = ` (${parts[2]}/${parts[1]})`;
            }
          } else if (Array.isArray(newShift.weekDays)) {
            const idx = dayVal === 1 ? 6 : dayVal - 2;
            const dateObj = newShift.weekDays[idx];
            if (dateObj instanceof Date && !isNaN(dateObj)) {
              const day = String(dateObj.getDate()).padStart(2, '0');
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              dateLabel = ` (${day}/${month})`;
            }
          }

          const dayName = DAY_NAMES[dayVal]?.full || `Thứ ${dayVal}`;
          const fullDayStr = `${dayName}${dateLabel}`;
          const cleanStart = shift.startTime ? shift.startTime.substring(0, 5) : '';
          const cleanEnd = shift.endTime ? shift.endTime.substring(0, 5) : '';
          const timeRange = cleanStart && cleanEnd ? `${cleanStart} - ${cleanEnd}` : (shift.startTime || '');

          conflicts.push({
            dayVal,
            fullDayStr,
            shiftName: shift.shiftName || 'Ca trực',
            timeRange,
            shift,
          });
          break; // Đã tìm thấy ca trùng của ngày này
        }
      }
    }

    if (conflicts.length === 0) {
      return { hasConflict: false, conflictingShift: null, conflictMessage: null, conflictingDayValues: [] };
    }

    let conflictMessage = '';
    if (conflicts.length === 1) {
      const c = conflicts[0];
      conflictMessage = `Trùng giờ vào ${c.fullDayStr} với ca "${c.shiftName}" (${c.timeRange}) của thợ này!`;
    } else {
      const daysSummary = conflicts.map((c) => c.fullDayStr).join(', ');
      conflictMessage = `Trùng giờ vào các ngày [${daysSummary}] với ca đã phân của thợ này!`;
    }

    return {
      hasConflict: true,
      conflictingShift: conflicts[0].shift,
      conflictMessage,
      conflictingDayValues: conflicts.map((c) => c.dayVal),
    };
  }, [existingShifts, newShift]);
};

