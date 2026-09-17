export function formatDate(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('vi-VN').format(new Date(date));
}

export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}
