
export interface VietnamDateParts {
  hours: string;
  minutes: string;
  seconds: string;
  day: string;
  month: string;
  year: number;
  time: string;
  date: string;
  dateTime: string;
}

/**
 * Trích xuất các thành phần ngày giờ Việt Nam (UTC+7) từ chuỗi datetime / epoch / Date
 */
export function getVietnamParts(value: string | Date | number | null | undefined): VietnamDateParts | null {
  if (!value) return null;
  let d: Date;
  if (value instanceof Date) {
    d = value;
  } else if (typeof value === 'number') {
    d = new Date(value);
  } else {
    let clean = String(value).trim().replace(/(\.\d{3})\d+/, '$1');
    if (clean.includes(' ') && !clean.includes('T')) {
      clean = clean.replace(' ', 'T');
    }
    // Server lưu UTC, nếu có T mà chưa có Z hoặc offset (+/-), thêm Z để chuẩn hóa thành UTC
    if (clean.includes('T')) {
      const timePart = clean.split('T')[1];
      if (!timePart.endsWith('Z') && !timePart.includes('+') && !timePart.includes('-')) {
        clean += 'Z';
      }
    }
    d = new Date(clean);
  }
  if (isNaN(d.getTime())) return null;

  // Epoch millis UTC + 7 tiếng (Vietnam UTC+7)
  const vnEpoch = d.getTime() + 7 * 60 * 60 * 1000;
  const vn = new Date(vnEpoch);

  const hours = String(vn.getUTCHours()).padStart(2, '0');
  const minutes = String(vn.getUTCMinutes()).padStart(2, '0');
  const seconds = String(vn.getUTCSeconds()).padStart(2, '0');
  const day = String(vn.getUTCDate()).padStart(2, '0');
  const month = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const year = vn.getUTCFullYear();

  return {
    hours,
    minutes,
    seconds,
    day,
    month,
    year,
    time: `${hours}:${minutes}`,
    date: `${day}/${month}/${year}`,
    dateTime: `${hours}:${minutes} ${day}/${month}/${year}`,
  };
}

/**
 * Chuyển ISO string (từ Backend) sang giờ Việt Nam hh:mm
 * Ví dụ: "2026-09-29T04:30:00Z" → "11:30"
 */
export function formatTimeVN(isoString: string | null | undefined): string {
  if (!isoString) return '--:--';
  const clean = isoString.trim();
  // Nếu là chuỗi giờ HH:mm hoặc HH:mm:ss thuần túy
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(clean)) {
    return clean.slice(0, 5);
  }
  const parts = getVietnamParts(clean);
  return parts ? parts.time : '--:--';
}

/**
 * Format hiển thị lịch hẹn của thợ:
 * - Nếu là hôm nay: "13:30 (Hôm nay)"
 * - Nếu là ngày khác: "13:30 30/09/2026"
 */
export function formatBookingSchedule(
  bookingDate: string | null | undefined,
  startTime: string | null | undefined
): string {
  const timeStr = startTime ? startTime.slice(0, 5) : 'Trong ngày';
  if (!bookingDate) return timeStr;

  if (isTodayVN(bookingDate)) {
    return `${timeStr} (Hôm nay)`;
  }
  return `${timeStr} ${formatDateVN(bookingDate)}`;
}

/**
 * Chuyển ISO string sang ngày giờ đầy đủ Việt Nam dạng hh:mm dd/MM/yyyy
 * Ví dụ: "2026-10-07T20:52:07Z" → "03:52 08/10/2026" (hoặc "2026-10-29T03:57:00Z" → "10:57 29/10/2026")
 */
export function formatDateTimeVN(isoString: string | null | undefined): string {
  if (!isoString) return '--';
  const clean = isoString.trim();

  // 1. Nếu đã đúng định dạng "HH:mm dd/MM/yyyy"
  if (/^\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }

  // 2. Nếu dạng "HH:mm - dd/MM/yyyy"
  const dashFormatted = clean.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}\/\d{2}\/\d{4})$/);
  if (dashFormatted) {
    return `${dashFormatted[1]} ${dashFormatted[2]}`;
  }

  // 3. Nếu dạng "HH:mm YYYY-MM-DD"
  const timeDateMatch = clean.match(/^(\d{2}:\d{2}(?::\d{2})?)\s+(\d{4})-(\d{2})-(\d{2})$/);
  if (timeDateMatch) {
    const time = timeDateMatch[1].slice(0, 5);
    return `${time} ${timeDateMatch[4]}/${timeDateMatch[3]}/${timeDateMatch[2]}`;
  }

  // 4. Nếu dạng "YYYY-MM-DD" thuần túy
  const dateOnlyMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[3]}/${dateOnlyMatch[2]}/${dateOnlyMatch[1]}`;
  }

  const parts = getVietnamParts(clean);
  return parts ? parts.dateTime : isoString;
}

/**
 * Chuyển ISO string sang ngày ngắn gọn theo giờ VN
 * Ví dụ: "2026-09-29T04:30:00Z" → "29/09/2026"
 */
export function formatDateVN(isoString: string | null | undefined): string {
  if (!isoString) return '--';
  const clean = isoString.trim();
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const parts = getVietnamParts(clean);
  return parts ? parts.date : '--';
}

export function formatDateDDMMYYYY(dateStr: string | null | undefined): string {
  return formatDateVN(dateStr);
}

/**
 * Lấy ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD
 * Ví dụ: "2026-10-29"
 */
export function getTodayVN(): string {
  const parts = getVietnamParts(new Date());
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Kiểm tra ISO date string có phải hôm nay theo giờ VN không
 */
export function isTodayVN(isoString: string | null | undefined): boolean {
  if (!isoString) return false;
  const clean = isoString.trim();
  const today = getTodayVN();
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}` === today;
  }
  const parts = getVietnamParts(clean);
  if (!parts) return false;
  return `${parts.year}-${parts.month}-${parts.day}` === today;
}

/**
 * Format ETA (Estimated Time of Arrival) theo chuẩn quy định hệ thống:
 * - distanceRemainingMeters <= 25 hoặc etaMinutes === 0  → "Thợ đã tới nơi"
 * - etaMinutes === null/undefined                        → "Đang tính toán..."
 * - etaMinutes >= 60                                     → "X giờ Y phút"
 * - etaMinutes > 0 && < 60                               → "Khoảng X phút"
 */
export function formatEtaText(
  etaMinutes: number | null | undefined,
  distanceRemainingMeters: number | null | undefined
): string {
  const dist = distanceRemainingMeters ?? 0;
  // Đã tới nơi (distance <= 25m hoặc eta = 0)
  if (dist > 0 && dist <= 25) return 'Thợ đã tới nơi';
  if (etaMinutes === 0) return 'Thợ đã tới nơi';

  // Chưa có dữ liệu
  if (etaMinutes === null || etaMinutes === undefined) return 'Đang tính toán...';

  const mins = Math.round(etaMinutes);
  if (mins <= 0) return 'Thợ đã tới nơi';
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    if (remaining === 0) return `${hours} giờ`;
    return `${hours} giờ ${remaining} phút`;
  }
  return `Khoảng ${mins} phút`;
}

/**
 * Format khoảng cách m → hiển thị ngắn gọn
 * - <= 25m  → "Tại điểm hẹn (< 25m)"
 * - < 1000m → "XXX m"
 * - >= 1000m → "X.X km"
 */
export function formatDistanceText(distanceMeters: number | null | undefined): string {
  const dist = distanceMeters ?? 0;
  if (dist <= 0) return '--';
  if (dist <= 25) return 'Tại điểm hẹn (< 25m)';
  if (dist < 1000) return `${Math.round(dist)} m`;
  return `${(dist / 1000).toFixed(1)} km`;
}

/**
 * Tính Hybrid ETA mượt mà dựa trên Goong base route + GPS delta realtime.
 * Tránh bị "nhảy số" khi xe dừng đèn đỏ hoặc kẹt xe ngắn.
 *
 * @param baseDurationSeconds   - Thời gian tuyến Goong ban đầu (giây)
 * @param baseDistanceMeters    - Khoảng cách tuyến Goong ban đầu (mét)
 * @param currentDistanceMeters - Khoảng cách hiện tại từ GPS/Backend (mét)
 * @param backendEtaMinutes     - Fallback ETA từ Backend nếu chưa có Goong
 */
export function computeHybridEta(
  baseDurationSeconds: number | null,
  baseDistanceMeters: number | null,
  currentDistanceMeters: number | null | undefined,
  backendEtaMinutes: number | null | undefined
): number | null {
  const dist = currentDistanceMeters ?? null;

  // Đã tới nơi
  if (dist !== null && dist <= 25) return 0;

  // Có Goong route → tính tỷ lệ còn lại dựa vào khoảng cách
  if (
    baseDurationSeconds != null && baseDurationSeconds > 0 &&
    baseDistanceMeters != null && baseDistanceMeters > 0 &&
    dist != null && dist > 0
  ) {
    const ratio = Math.min(1, dist / baseDistanceMeters);
    const remaining = Math.ceil((baseDurationSeconds * ratio) / 60);
    return Math.max(0, remaining);
  }

  // Fallback về Backend ETA
  if (backendEtaMinutes !== null && backendEtaMinutes !== undefined) {
    return Math.max(0, Math.round(backendEtaMinutes));
  }

  return null;
}

/**
 * Lấy config badge trạng thái di chuyển từ streamMode
 */
export function getStreamModeBadge(
  streamMode: 'APPROACHING' | 'MOVING' | 'STOPPED' | null | undefined,
  isAtLocation: boolean
): { text: string; color: string; bg: string } {
  if (isAtLocation) {
    return { text: 'Tại điểm hẹn', color: '#34D399', bg: 'rgba(16, 185, 129, 0.22)' };
  }
  switch (streamMode) {
    case 'APPROACHING':
      return { text: 'Sắp tới nơi', color: '#34D399', bg: 'rgba(16, 185, 129, 0.22)' };
    case 'STOPPED':
      return { text: 'Tạm dừng đèn', color: '#FBBF24', bg: 'rgba(245, 158, 11, 0.22)' };
    case 'MOVING':
    default:
      return { text: 'Đang di chuyển', color: '#60A5FA', bg: 'rgba(37, 99, 235, 0.22)' };
  }
}
