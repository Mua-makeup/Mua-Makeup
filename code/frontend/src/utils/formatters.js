/**
 * Makeup Booking Platform - Time & Currency Formatters
 * Chuẩn hóa thời gian theo Múi giờ Việt Nam (Asia/Ho_Chi_Minh - GMT+7)
 */

export function parseToVietnamDate(date) {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
  if (typeof date === 'number') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return null;

    // Nếu chỉ có định dạng ngày YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, day] = trimmed.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, day, 0, 0, 0));
    }

    // Nếu là dạng ISO datetime (chứa T hoặc space)
    // Server lưu UTC, nếu chưa có Z hoặc offset (+/-) ở phần time, thêm Z để chuẩn hóa thành UTC
    let isoString = trimmed;
    if (isoString.includes(' ') && !isoString.includes('T')) {
      isoString = isoString.replace(' ', 'T');
    }
    if (isoString.includes('T')) {
      const timePart = isoString.split('T')[1];
      if (!timePart.endsWith('Z') && !timePart.includes('+') && !timePart.includes('-')) {
        isoString += 'Z';
      }
    }

    const d = new Date(isoString);
    if (!isNaN(d.getTime())) return d;
    const fallback = new Date(trimmed);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
  return null;
}

export function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-');
      return `${day}/${month}/${year}`;
    }
  }
  try {
    const d = parseToVietnamDate(date);
    if (!d) return String(date);

    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    const map = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    return `${map.day}/${map.month}/${map.year}`;
  } catch {
    return String(date);
  }
}

export function formatDateTime(date, includeSeconds = false) {
  if (!date) return '';
  try {
    const d = parseToVietnamDate(date);
    if (!d) return String(date);

    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const map = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }

    if (includeSeconds) {
      return `${map.hour}:${map.minute}:${map.second} ${map.day}/${map.month}/${map.year}`;
    }
    return `${map.hour}:${map.minute} ${map.day}/${map.month}/${map.year}`;
  } catch {
    return String(date);
  }
}

export function formatBookingDateTime(arg1, arg2) {
  if (!arg1 && !arg2) return '';

  let datePart = null;
  let timePart = null;

  const isDate = (val) => {
    if (!val) return false;
    if (val instanceof Date) return true;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return /^\d{4}-\d{2}-\d{2}/.test(trimmed) || /^\d{2}\/\d{2}\/\d{4}/.test(trimmed);
    }
    return false;
  };

  const isTime = (val) => {
    if (!val) return false;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return /^\d{1,2}:\d{2}/.test(trimmed);
    }
    return false;
  };

  if (isDate(arg1) && isTime(arg2)) {
    datePart = arg1;
    timePart = arg2;
  } else if (isTime(arg1) && isDate(arg2)) {
    timePart = arg1;
    datePart = arg2;
  } else if (isDate(arg1)) {
    datePart = arg1;
    timePart = arg2;
  } else if (isDate(arg2)) {
    datePart = arg2;
    timePart = arg1;
  } else {
    timePart = arg1;
    datePart = arg2;
  }

  const formattedDate = datePart ? formatDate(datePart) : '';
  if (!timePart) return formattedDate;

  const formattedTime = typeof timePart === 'string' && timePart.length > 5
    ? timePart.substring(0, 5)
    : String(timePart);

  if (!formattedDate) return formattedTime;
  return `${formattedTime} ${formattedDate}`;
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}
