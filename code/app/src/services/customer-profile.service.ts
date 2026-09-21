import { apiClient } from './api';
import { ApiResponse, UserInfo } from './auth.service';
import { SavedAddress } from '@/schemas/customer-profile.schema';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SAVED_ADDRESSES_STORAGE_KEY = 'CUSTOMER_SAVED_ADDRESSES';

export interface UpdateCustomerProfileReq {
  fullName: string;
  email?: string;
  gender?: string;
}

export const customerProfileService = {
  /** Cập nhật thông tin tài khoản khách hàng trên backend */
  async updateProfile(data: UpdateCustomerProfileReq): Promise<UserInfo> {
    const res = await apiClient.put<ApiResponse<UserInfo>>('/users/profile', data);
    return res.data.data;
  },

  /** Upload ảnh đại diện lên Cloudinary (Dùng chung mọi Role) */
  async uploadAvatar(formData: FormData): Promise<UserInfo> {
    const res = await apiClient.post<ApiResponse<UserInfo>>('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  /** Lấy danh sách địa chỉ quen thuộc đã lưu trong thiết bị */
  async getSavedAddresses(): Promise<SavedAddress[]> {
    try {
      let json: string | null = null;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          json = localStorage.getItem(SAVED_ADDRESSES_STORAGE_KEY);
        }
      } else {
        json = await SecureStore.getItemAsync(SAVED_ADDRESSES_STORAGE_KEY);
      }

      if (!json) {
        return [
          {
            id: 'addr-default-1',
            label: 'Nhà riêng',
            addressLine: 'Chung cư Landmark 81, 720A Điện Biên Phủ, P.22, Bình Thạnh',
            latitude: 10.7951,
            longitude: 106.7218,
            isDefault: true,
          },
        ];
      }
      return JSON.parse(json);
    } catch {
      return [];
    }
  },

  /** Lưu danh sách địa chỉ quen thuộc */
  async saveAddresses(addresses: SavedAddress[]): Promise<void> {
    const json = JSON.stringify(addresses);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, json);
      }
    } else {
      await SecureStore.setItemAsync(SAVED_ADDRESSES_STORAGE_KEY, json);
    }
  },
};
