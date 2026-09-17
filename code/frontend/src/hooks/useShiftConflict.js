import { useMemo } from 'react';

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export const useShiftConflict = (existingShifts = [], newShift = null) => {
  return useMemo(() => {
    if (
      !newShift ||
      !newShift.staffId ||
      !newShift.dayOfWeek ||
      !newShift.startTime ||
      !newShift.endTime
    ) {
      return { hasConflict: false, conflictingShift: null, conflictMessage: null };
    }

    const newStart = timeToMinutes(newShift.startTime);
    const newEnd = timeToMinutes(newShift.endTime);

    if (newEnd <= newStart) {
      return {
        hasConflict: true,
        conflictingShift: null,
        conflictMessage: 'Giờ kết thúc phải lớn hơn giờ bắt đầu',
      };
    }

    // Lọc các ca làm việc của cùng thợ trong cùng ngày
    const staffDayShifts = existingShifts.filter(
      (s) =>
        Number(s.staffId) === Number(newShift.staffId) &&
        s.dayOfWeek === newShift.dayOfWeek &&
        (!newShift.id || s.id !== newShift.id)
    );

    for (const shift of staffDayShifts) {
      const sStart = timeToMinutes(shift.startTime);
      const sEnd = timeToMinutes(shift.endTime);

      // Công thức trùng lặp khoảng thời gian: start1 < end2 && end1 > start2
      if (newStart < sEnd && newEnd > sStart) {
        return {
          hasConflict: true,
          conflictingShift: shift,
          conflictMessage: `Trùng giờ với ca "${shift.shiftName || 'Ca trực'}" (${shift.startTime} - ${shift.endTime}) của thợ này!`,
        };
      }
    }

    return { hasConflict: false, conflictingShift: null, conflictMessage: null };
  }, [existingShifts, newShift]);
};
