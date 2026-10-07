/**
 * date.ts — Chuẩn múi giờ UTC+7 (Việt Nam) cho toàn bộ Mobile App
 *
 * Vấn đề gốc rễ: `new Date()` trả về giờ UTC của thiết bị (hoặc giờ Server).
 * Nếu Server trả về ISO string dạng "2026-09-29T04:00:00Z" (UTC) mà không kèm
 * offset +07:00, thì `new Date(isoString).getHours()` sẽ cho ra giờ UTC = sai.
 *
 * Giải pháp: Luôn hiển thị giờ theo múi giờ Asia/Ho_Chi_Minh (UTC+7) thông qua
 * Intl.DateTimeFormat với timeZone: 'Asia/Ho_Chi_Minh'.
 */

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VN_LOCALE = 'vi-VN';

/**
 * Chuyển ISO string (từ Backend) sang giờ Việt Nam hh:mm
 * Ví dụ: "2026-09-29T04:30:00Z" → "11:30"
 */
export function formatTimeVN(isoString: string | null | undefined): string {
  if (!isoString) return '--:--';
  // Nếu là chuỗi giờ HH:mm hoặc HH:mm:ss thuần túy
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(isoString.trim())) {
    return isoString.trim().slice(0, 5);
  }
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.slice(0, 5);
    return new Intl.DateTimeFormat(VN_LOCALE, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: VN_TIMEZONE,
    }).format(d);
  } catch {
    return '--:--';
  }
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
 * Ví dụ: "2026-10-07T20:52:07" → "20:52 07/10/2026"
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

  // 4. Nếu dạng ISO chuẩn Backend Việt Nam "YYYY-MM-DDTHH:mm:ss" hoặc "YYYY-MM-DD HH:mm:ss" (không có offset)
  const isoLocalMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (isoLocalMatch) {
    return `${isoLocalMatch[4]} ${isoLocalMatch[3]}/${isoLocalMatch[2]}/${isoLocalMatch[1]}`;
  }

  // 5. Nếu dạng "YYYY-MM-DD" thuần túy
  const dateOnlyMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[3]}/${dateOnlyMatch[2]}/${dateOnlyMatch[1]}`;
  }

  try {
    // Truncate microseconds (e.g. .543349+07:00 -> .543+07:00) so JS Date parser never fails
    const cleanStr = clean.replace(/(\.\d{3})\d+/, '$1');
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return isoString;
    const time = new Intl.DateTimeFormat(VN_LOCALE, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: VN_TIMEZONE,
    }).format(d);
    const date = new Intl.DateTimeFormat(VN_LOCALE, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: VN_TIMEZONE,
    }).format(d);
    return `${time} ${date}`;
  } catch {
    return isoString;
  }
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
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat(VN_LOCALE, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: VN_TIMEZONE,
    }).format(d);
  } catch {
    return '--';
  }
}

export function formatDateDDMMYYYY(dateStr: string | null | undefined): string {
  return formatDateVN(dateStr);
}

/**
 * Lấy ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD
 * Ví dụ: "2026-09-29" (kể cả khi local device đang ở timezone khác)
 */
export function getTodayVN(): string {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: VN_TIMEZONE,
  }).format(now); // format: "2026-09-29"
}

/**
 * Kiểm tra ISO date string có phải hôm nay theo giờ VN không
 */
export function isTodayVN(isoString: string | null | undefined): boolean {
  if (!isoString) return false;
  try {
    const inputDay = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: VN_TIMEZONE,
    }).format(new Date(isoString));
    return inputDay === getTodayVN();
  } catch {
    return false;
  }
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
