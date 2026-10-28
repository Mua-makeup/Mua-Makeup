const zone = 'Asia/Ho_Chi_Minh';

function parseTime(value?: string): Date | null {
  if (!value) return null;
  const normalized = value.trim().replace(/(\.\d{3})\d+/, '$1');
  // Legacy local date-times follow the API's Vietnam-time convention.
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)
    ? normalized : `${normalized}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clock(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date);
}

function day(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
}

export function formatBookingExecutionTime(booking: {
  startTime?: string; bookingDate?: string; estimatedDurationMinutes?: number;
  status?: string; startedAt?: string; completedAt?: string;
}) {
  const start = parseTime(booking.startedAt);
  const end = parseTime(booking.completedAt);
  const finished = ['COMPLETED', 'PAID_OUT'].includes(booking.status || '') || Boolean(end);
  if (start || end || finished) {
    const crossDay = start && end && day(start) !== day(end);
    const label = (date: Date | null) => date
      ? `${clock(date)}${crossDay ? ` ${day(date)}` : ''}` : '--:--';
    return {
      title: 'Bắt Đầu / Kết Thúc Thực Tế',
      timeRange: `${label(start)} - ${label(end)}`,
      subText: !start ? 'Chưa ghi nhận giờ bắt đầu'
        : !end ? 'Chưa ghi nhận giờ kết thúc' : `Hoàn thành lúc ${clock(end)} ${day(end)}`,
      isCompleted: Boolean(end),
    };
  }
  const scheduled = parseTime(`${booking.bookingDate || ''}T${booking.startTime || ''}`);
  const duration = booking.estimatedDurationMinutes;
  const estimatedEnd = scheduled && duration != null && duration > 0
    ? new Date(scheduled.getTime() + duration * 60000) : null;
  return {
    title: 'Thời Gian Dự Kiến',
    timeRange: scheduled
      ? `${clock(scheduled)} - ${estimatedEnd ? clock(estimatedEnd) + (day(scheduled) !== day(estimatedEnd) ? ` ${day(estimatedEnd)}` : '') : '--:--'}`
      : '--:-- - --:--',
    subText: 'Lịch hẹn dự kiến, chưa phải thời gian thực tế',
    isCompleted: false,
  };
}
