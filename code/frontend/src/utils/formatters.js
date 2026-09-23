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
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(date);
  }
}

export function formatDateTime(date, includeSeconds = false) {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    if (includeSeconds) {
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
    }
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return String(date);
  }
}

export function formatBookingDateTime(startTime, bookingDate) {
  if (!bookingDate) return startTime || '';
  const formattedDate = formatDate(bookingDate);
  if (!startTime) return formattedDate;
  const formattedTime = startTime.length > 5 ? startTime.substring(0, 5) : startTime;
  return `${formattedTime} ${formattedDate}`;
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}
