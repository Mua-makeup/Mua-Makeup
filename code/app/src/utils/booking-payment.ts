/** Shared invoice/payment-history presentation for freelance and studio bookings. */
export function getBookingPaymentPresentation(input: {
  isPaidOut: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  isDisputed: boolean;
  isDisputeRefunded: boolean;
  isDisputeCompensated: boolean;
  isDepositRefunded: boolean;
  isDepositPaid: boolean;
  isSplit5050: boolean;
  remainingAmount: number;
}) {
  const resolved = input.isDisputeRefunded || input.isDisputeCompensated;
  const waived = resolved || input.isCancelled;
  const paid = input.isPaidOut && !waived;
  const color = waived ? '#64748B' : paid ? '#059669' : '#D97706';
  return {
    waived,
    paid,
    color,
    backgroundColor: paid ? '#D1FAE5' : waived ? '#F1F5F9' : '#FEF3C7',
    badge: resolved ? 'Đã Giải Quyết Khiếu Nại'
      : input.isCancelled ? 'Đã Hủy'
      : input.isDisputed ? 'Đang Giải Quyết Khiếu Nại'
      : paid ? 'Đã Quyết Toán'
      : input.isCompleted ? 'Chờ Thu 70%'
      : !input.isDepositPaid ? 'Chờ Đặt Cọc' : 'Đang Thực Hiện',
    remainingAmount: waived ? 0 : input.remainingAmount,
    remainingLabel: waived ? 'Miễn Thu' : paid ? 'Đã Quyết Toán'
      : input.isDisputed ? 'Tạm Dừng Quyết Toán' : 'Chờ Thanh Toán',
    remainingDescription: resolved ? 'Đã giải quyết khiếu nại — Miễn thanh toán khoản còn lại 70%'
      : input.isCancelled ? 'Đơn đã hủy — Miễn thanh toán khoản còn lại'
      : input.isDisputed ? 'Đang chờ kết quả khiếu nại để xác định khoản quyết toán'
      : paid ? 'Đã thanh toán và quyết toán hoàn tất'
      : 'Thu tiền mặt trực tiếp hoặc thanh toán trực tuyến',
    depositLabel: input.isDisputeRefunded
      ? input.isSplit5050 ? 'Hòa Giải 50/50' : 'Đã Hoàn Cọc Khiếu Nại'
      : input.isDisputeCompensated ? 'Đã Bồi Thường'
      : input.isDepositRefunded ? 'Đã Hoàn Cọc 100%'
      : input.isCancelled ? 'Miễn Cọc'
      : input.isDisputed ? 'Tạm Giữ Khiếu Nại'
      : paid ? 'Đã Giải Ngân'
      : input.isDepositPaid ? 'Đã Bảo Chứng' : 'Chờ Đặt Cọc',
  };
}
