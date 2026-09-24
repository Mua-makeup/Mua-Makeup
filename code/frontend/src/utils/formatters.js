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
  if (amount === null || amount === undefined || isNaN(amount)) return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}
