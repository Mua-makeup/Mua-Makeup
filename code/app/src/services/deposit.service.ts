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

export interface FreelancerTransactionItem {
  id: number;
  entryType: 'CREDIT' | 'DEBIT' | string;
  amount: number;
  balanceAfter: number;
  referenceType: string;
  referenceId?: number;
  description?: string;
  bookingCode?: string;
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
  recentTransactions?: FreelancerTransactionItem[];
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
   * Tạo / lấy lại checkout URL để thanh toán 70% còn lại qua MoMo hoặc VNPay
   */
  async syncFinalPayment(bookingId: number): Promise<void> {
    await apiClient.post(`/customer/bookings/${bookingId}/final-payment/sync`);
  },

  async createFinalPaymentIntent(
    bookingId: number,
    payload: CreateDepositIntentPayload | 'MOMO' | 'VNPAY',
    idempotencyKey?: string
  ): Promise<DepositCheckoutResult> {
    const body = typeof payload === 'string' ? { gatewayCode: payload } : payload;
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post(
      `/customer/bookings/${bookingId}/final-payment-intents`,
      body,
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
   * Khách hàng xác nhận đã trả tiền mặt trực tiếp cho thợ
   */
  async confirmCustomerCashPayment(
    bookingId: number,
    invoiceVersion: string = 'v1',
    idempotencyKey?: string
  ): Promise<CashReceiptStatus> {
    const finalKey =
      idempotencyKey ||
      `cash_cust_${bookingId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const headers: Record<string, string> = {
      'Idempotency-Key': finalKey,
    };
    const res = await apiClient.post(
      `/customer/bookings/${bookingId}/cash-confirmation`,
      { invoiceVersion, idempotencyKey: finalKey },
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
    const finalKey =
      idempotencyKey ||
      `cash_fl_${bookingId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const headers: Record<string, string> = {
      'Idempotency-Key': finalKey,
    };
    const res = await apiClient.post(
      `/freelancer/bookings/${bookingId}/cash-confirmation`,
      { invoiceVersion, idempotencyKey: finalKey },
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

  /**
   * Lấy thông tin ví cá nhân của khách hàng (số dư khả dụng, lịch sử biến động/hoàn cọc)
   */
  async getCustomerWallet(): Promise<CustomerWalletInfo> {
    const res = await apiClient.get('/customer/wallet');
    return res.data?.data;
  },
};

export interface CustomerWalletTransaction {
  id: number;
  entryType: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  referenceType: string;
  referenceId: number;
  description: string;
  holdStatus?: 'ACTIVE' | 'CONSUMED' | 'REFUNDED' | 'COMPENSATED_TO_MUA' | 'FORFEITED' | string;
  bookingCode?: string;
  createdAt: string;
}

export interface CustomerWalletInfo {
  walletId: number;
  availableBalance: number;
  frozenBalance: number;
  currency: string;
  recentTransactions: CustomerWalletTransaction[];
}

