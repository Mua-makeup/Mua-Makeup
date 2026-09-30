import { apiClient } from './api';

export interface BookingDepositStatus {
  depositId: number;
  bookingId: number;
  bookingCode: string;
  totalAmount: number;
  requiredDepositAmount: number;
  paidAmount?: number;
  depositStatus: 'UNPAID' | 'PENDING' | 'PAID' | 'EXPIRED' | 'REFUND_PENDING' | 'REFUNDED';
  pricingVersion?: string;
  expiresAt: string;
  paidAt?: string;
  currentPaymentCode?: string;
  currentPaymentUrl?: string;
  currentQrCodeUrl?: string;
  currentPaymentExpiresAt?: string;
  currentGatewayCode?: string;
  currentApplicationStatus?: string;
}

export interface DepositCheckoutResult {
  paymentCode: string;
  gatewayCode: string;
  checkoutUrl: string;
  paymentUrl?: string;
  qrCodeUrl?: string;
  deepLink?: string;
  amount: number;
  currency?: string;
  expiresAt: string;
}

export interface CreateDepositIntentPayload {
  gatewayCode: 'MOMO' | 'VNPAY';
  pricingVersion?: string;
}

export interface FreelancerBookingDepositItem {
  bookingId: number;
  bookingCode: string;
  customerName: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface FreelancerWalletInfo {
  walletId: number;
  userId: number;
  availableBalance: number;
  frozenBalance: number;
  bookingDepositsHeld: number;
  currency: string;
  heldDeposits: FreelancerBookingDepositItem[];
}

export interface CashReceiptStatus {
  receiptId: number;
  bookingId: number;
  invoiceVersion: string;
  expectedAmount: number;
  customerConfirmed: boolean;
  customerConfirmedAt?: string;
  freelancerConfirmed: boolean;
  freelancerConfirmedAt?: string;
  status: string;
  settlementTriggered: boolean;
}

export const depositService = {
  /**
   * Tạo / lấy lại checkout URL để thanh toán cọc qua MoMo hoặc VNPay
   */
  async createDepositIntent(
    bookingId: number,
    payload: CreateDepositIntentPayload,
    idempotencyKey?: string
  ): Promise<DepositCheckoutResult> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post(
      `/customer/bookings/${bookingId}/deposit-intents`,
      payload,
      { headers }
    );
    const data = res.data?.data;
    if (data) {
      if (!data.checkoutUrl && data.paymentUrl) {
        data.checkoutUrl = data.paymentUrl;
      }
      if (!data.paymentUrl && data.checkoutUrl) {
        data.paymentUrl = data.checkoutUrl;
      }
    }
    return data;
  },

  /**
   * Lấy trạng thái nghĩa vụ cọc hiện thời từ database
   */
  async getDepositStatus(bookingId: number): Promise<BookingDepositStatus> {
    const res = await apiClient.get(`/customer/bookings/${bookingId}/deposit`);
    return res.data?.data;
  },

  /**
   * Đồng bộ / kiểm tra giao dịch thanh toán cọc thành công
   */
  async syncDepositPayment(bookingId: number): Promise<BookingDepositStatus> {
    const res = await apiClient.post(`/customer/bookings/${bookingId}/deposit/sync-payment`);
    return res.data?.data;
  },

  /**
   * Khách hàng xác nhận đã trả tiền mặt trực tiếp cho thợ
   */
  async confirmCustomerCashPayment(
    bookingId: number,
    invoiceVersion: string = 'v1',
    idempotencyKey?: string
  ): Promise<CashReceiptStatus> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post(
      `/customer/bookings/${bookingId}/cash-payment-confirmation`,
      { invoiceVersion },
      { headers }
    );
    return res.data?.data;
  },

  /**
   * Thợ tự do xác nhận đã nhận đủ tiền mặt từ khách
   */
  async confirmFreelancerCashReceipt(
    bookingId: number,
    invoiceVersion: string = 'v1',
    idempotencyKey?: string
  ): Promise<CashReceiptStatus> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post(
      `/freelancer/bookings/${bookingId}/cash-receipt-confirmation`,
      { invoiceVersion },
      { headers }
    );
    return res.data?.data;
  },

  /**
   * Lấy thông tin ví thợ tự do (số dư, cọc đang giữ, danh sách cọc theo booking)
   */
  async getFreelancerWallet(): Promise<FreelancerWalletInfo> {
    const res = await apiClient.get('/freelancer/wallet');
    return res.data?.data;
  },
};
