import { getVietnamParts } from './date';

function parseServerTime(value?: string): Date | null {
  if (!value) return null;
  let normalized = value.trim().replace(/(\.\d{3})\d+/, '$1');
  if (normalized.includes(' ') && !normalized.includes('T')) {
    normalized = normalized.replace(' ', 'T');
  }
  if (normalized.includes('T')) {
    const timePart = normalized.split('T')[1];
    if (!timePart.endsWith('Z') && !timePart.includes('+') && !timePart.includes('-')) {
      normalized += 'Z';
    }
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseScheduledLocalTime(value?: string): Date | null {
  if (!value) return null;
  const normalized = value.trim().replace(/(\.\d{3})\d+/, '$1');
  // Scheduled local date-times follow the API's Vietnam-time convention (UTC+7).
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)
    ? normalized : `${normalized}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clock(date: Date): string {
  const parts = getVietnamParts(date);
  return parts ? parts.time : '--:--';
}

function day(date: Date): string {
  const parts = getVietnamParts(date);
  return parts ? parts.date : '—';
}

export function formatBookingExecutionTime(booking: {
  startTime?: string;
  bookingDate?: string;
  estimatedDurationMinutes?: number;
  status?: string;
  startedAt?: string;
  completedAt?: string;
}) {
  const start = parseServerTime(booking.startedAt);
  const end = parseServerTime(booking.completedAt);
  const finished = ['COMPLETED', 'PAID_OUT'].includes(booking.status || '') || Boolean(end);

  const scheduled = parseScheduledLocalTime(
    booking.bookingDate && booking.startTime
      ? `${booking.bookingDate}T${booking.startTime}`
      : undefined
  );
  const duration = booking.estimatedDurationMinutes;
  const estimatedEnd = scheduled && duration != null && duration > 0
    ? new Date(scheduled.getTime() + duration * 60000) : null;

  if (start || end || finished) {
    const crossDay = start && end && day(start) !== day(end);
    const label = (date: Date | null) => date
      ? `${clock(date)}${crossDay ? ` ${day(date)}` : ''}` : '--:--';
    return {
      startTime: start ? clock(start) : '--:--',
      startDate: start ? day(start) : '—',
      endTime: end ? clock(end) : '--:--',
      endDate: end ? day(end) : '—',
      isEstimated: false,
      title: 'Bắt Đầu / Kết Thúc Thực Tế',
      timeRange: `${label(start)} - ${label(end)}`,
      subText: !start ? 'Chưa ghi nhận giờ bắt đầu'
        : !end ? 'Chưa ghi nhận giờ kết thúc' : `Hoàn thành lúc ${clock(end)} ${day(end)}`,
      isCompleted: Boolean(end || finished),
      scheduledStartTime: scheduled ? clock(scheduled) : (booking.startTime ? booking.startTime.slice(0, 5) : '--:--'),
      scheduledStartDate: scheduled ? day(scheduled) : (booking.bookingDate || '—'),
      scheduledEndTime: estimatedEnd ? clock(estimatedEnd) : '--:--',
      hasScheduledTime: Boolean(booking.startTime),
    };
  }

  return {
    startTime: scheduled ? clock(scheduled) : (booking.startTime ? booking.startTime.slice(0, 5) : '--:--'),
    startDate: scheduled ? day(scheduled) : (booking.bookingDate || '—'),
    endTime: estimatedEnd ? clock(estimatedEnd) : '--:--',
    endDate: estimatedEnd ? day(estimatedEnd) : '—',
    isEstimated: true,
    title: 'Thời Gian Dự Kiến',
    timeRange: scheduled
      ? `${clock(scheduled)} - ${estimatedEnd ? clock(estimatedEnd) + (day(scheduled) !== day(estimatedEnd) ? ` ${day(estimatedEnd)}` : '') : '--:--'}`
      : '--:-- - --:--',
    subText: 'Lịch hẹn dự kiến, chưa phải thời gian thực tế',
    isCompleted: false,
    scheduledStartTime: scheduled ? clock(scheduled) : (booking.startTime ? booking.startTime.slice(0, 5) : '--:--'),
    scheduledStartDate: scheduled ? day(scheduled) : (booking.bookingDate || '—'),
    scheduledEndTime: estimatedEnd ? clock(estimatedEnd) : '--:--',
    hasScheduledTime: Boolean(booking.startTime),
  };
}
