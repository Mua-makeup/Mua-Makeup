export const STAFF_STATUS = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  SUSPENDED: 'SUSPENDED',
  REJECTED: 'REJECTED',
};

export const SURCHARGE_TYPES = {
  DISTANCE: 'OUT_OF_RADIUS',
  OUT_OF_RADIUS: 'OUT_OF_RADIUS',
  NIGHT: 'EARLY_MORNING',
  EARLY_MORNING: 'EARLY_MORNING',
  HOLIDAY: 'HOLIDAY',
  CUSTOM: 'CUSTOM',
};

export const PACKAGE_ITEM_TYPES = {
  COMPONENT: 'COMPONENT',
  ADD_ON: 'ADD_ON',
};

export const SHIFT_DAYS = [
  { value: 2, key: 'MONDAY', label: 'Thứ Hai', shortLabel: 'T2' },
  { value: 3, key: 'TUESDAY', label: 'Thứ Ba', shortLabel: 'T3' },
  { value: 4, key: 'WEDNESDAY', label: 'Thứ Tư', shortLabel: 'T4' },
  { value: 5, key: 'THURSDAY', label: 'Thứ Năm', shortLabel: 'T5' },
  { value: 6, key: 'FRIDAY', label: 'Thứ Sáu', shortLabel: 'T6' },
  { value: 7, key: 'SATURDAY', label: 'Thứ Bảy', shortLabel: 'T7' },
  { value: 1, key: 'SUNDAY', label: 'Chủ Nhật', shortLabel: 'CN' },
];

export const OVERTIME_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};
