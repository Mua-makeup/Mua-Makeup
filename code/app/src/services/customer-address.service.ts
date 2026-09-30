import { apiClient } from './api';
import { ApiResponse } from './auth.service';

export interface CustomerAddressItem {
  id: number;
  label: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  recipientName?: string;
  recipientPhone?: string;
  isDefault: boolean;
  createdAt?: string;
}

export interface SaveCustomerAddressPayload {
  label: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  recipientName?: string;
  recipientPhone?: string;
  isDefault?: boolean;
}

export const customerAddressService = {
  /**
   * Lấy danh sách địa chỉ đã lưu của khách hàng
   */
  async getSavedAddresses(): Promise<CustomerAddressItem[]> {
    const res = await apiClient.get<ApiResponse<CustomerAddressItem[]>>('/customer/addresses');
    const data = res.data?.data;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Thêm mới địa chỉ trang điểm
   */
  async createAddress(payload: SaveCustomerAddressPayload): Promise<CustomerAddressItem> {
    const res = await apiClient.post<ApiResponse<CustomerAddressItem>>('/customer/addresses', payload);
    return res.data.data;
  },

  /**
   * Cập nhật địa chỉ đã lưu
   */
  async updateAddress(id: number, payload: SaveCustomerAddressPayload): Promise<CustomerAddressItem> {
    const res = await apiClient.put<ApiResponse<CustomerAddressItem>>(`/customer/addresses/${id}`, payload);
    return res.data.data;
  },

  /**
   * Xóa địa chỉ đã lưu
   */
  async deleteAddress(id: number): Promise<void> {
    await apiClient.delete(`/customer/addresses/${id}`);
  },

  /**
   * Đặt địa chỉ làm mặc định
   */
  async setDefaultAddress(id: number): Promise<CustomerAddressItem> {
    const res = await apiClient.patch<ApiResponse<CustomerAddressItem>>(`/customer/addresses/${id}/default`);
    return res.data.data;
  },
};
