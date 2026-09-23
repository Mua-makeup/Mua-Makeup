import { apiClient } from './api';
import { PreviewInvoicePayload } from '@/schemas/pricing-preview.schema';

export interface DistanceMatrixRes {
  distanceKm: number;
  durationMinutes: number;
  isCached?: boolean;
  routingProvider: string;
}

export interface PackageInfo {
  packageId: number;
  packageName: string;
  basePrice: number;
}

export interface AddOnItem {
  itemId: number;
  name: string;
  price: number;
}

export interface DistanceInfo {
  distanceKm: number;
  freeRadiusKm: number;
  excessDistanceKm: number;
  pricePerKm: number;
  distanceFee: number;
  estimatedTravelMinutes: number;
  routingProvider: string;
}

export interface SurgePricingInfo {
  isSurgeApplied: boolean;
  multiplier: number;
  surgeReason?: string;
  surgeAmount: number;
  surgeType?: string;
}

export interface DiscountInfo {
  voucherCode: string;
  discountAmount: number;
  description?: string;
}

export interface FinancialSummary {
  totalAmount: number;
  depositRatio: number;
  depositRequiredAmount: number;
  remainingPayableAmount: number;
  currency: string;
}

export interface InvoicePreviewRes {
  packageInfo: PackageInfo;
  addOns: AddOnItem[];
  serviceSubtotal: number;
  distanceInfo: DistanceInfo;
  surgePricing: SurgePricingInfo;
  totalSurchargesAmount: number;
  discount?: DiscountInfo;
  financialSummary: FinancialSummary;
}

export const pricingService = {
  /**
   * Gọi Goong Maps Backend để đo khoảng cách và thời gian di chuyển giữa 2 điểm tọa độ
   */
  async calculateDistance(
    originLat: number,
    originLng: number,
    destinationLat: number,
    destinationLng: number
  ): Promise<DistanceMatrixRes> {
    const response = await apiClient.post('/pricing/calculate-distance', {
      originLatitude: originLat,
      originLongitude: originLng,
      destinationLatitude: destinationLat,
      destinationLongitude: destinationLng,
    });
    return response.data.data;
  },

  /**
   * Tính toán trước hóa đơn và cước phí động cho đơn đặt lịch
   */
  async previewInvoice(payload: PreviewInvoicePayload): Promise<InvoicePreviewRes> {
    const response = await apiClient.post('/pricing/preview-invoice', payload);
    return response.data.data;
  },
};
