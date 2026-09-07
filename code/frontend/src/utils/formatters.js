export function formatDate(date) {
  return new Intl.DateTimeFormat('vi-VN').format(new Date(date));
}
