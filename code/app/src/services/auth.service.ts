import { apiClient } from './api';

export interface MuaRegisterDetails {
  bio?: string;
  experienceYears?: number;
  maxServiceRadiusKm?: number;
}

export interface RegisterReq {
  phoneNumber: string;
  email: string;
  password: string;
  fullName: string;
  gender?: string;
  accountType: 'CUSTOMER' | 'FREELANCER_MUA';
  muaDetails?: MuaRegisterDetails;
}

export interface LoginReq {
  loginIdentifier: string;
  password: string;
}

export interface UserInfo {
  id: number;
  fullName: string;
  phoneNumber: string;
  email: string;
  avatarUrl?: string;
  gender?: string;
  isVerified: boolean;
  agencyId?: number | null;
  muaId?: number | null;
  language: string;
  roles: string[];
  permissions: string[];
}

export interface AuthRes {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userInfo: UserInfo;
}

export interface UserRegisterRes {
  id: number;
  fullName: string;
  phoneNumber: string;
  email: string;
  accountType: string;
  muaCode?: string | null;
  agencyCode?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export const authService = {
  /**
   * Đăng nhập người dùng bằng SĐT/Email + Mật khẩu
   */
  async login(credentials: LoginReq): Promise<AuthRes> {
    const response = await apiClient.post<ApiResponse<AuthRes>>('/auth/login', credentials);
    return response.data.data;
  },

  /**
   * Đăng ký tài khoản mới (Khách hàng hoặc Thợ MUA Onboarding)
   */
  async register(data: RegisterReq): Promise<UserRegisterRes> {
    const response = await apiClient.post<ApiResponse<UserRegisterRes>>('/auth/register', data);
    return response.data.data;
  },

  /**
   * Lấy thông tin tài khoản hiện tại từ Access Token
   */
  async getCurrentUser(): Promise<UserInfo> {
    const response = await apiClient.get<ApiResponse<UserInfo>>('/auth/me');
    return response.data.data;
  },

  /**
   * Đăng xuất và đưa token vào Redis Blacklist
   */
  async logout(refreshToken?: string | null): Promise<void> {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch (e) {
      console.warn('Lỗi thu hồi token tại backend:', e);
    }
  },

  /**
   * Cập nhật cài đặt ngôn ngữ (vi hoặc en)
   */
  async updateLanguage(language: 'vi' | 'en'): Promise<UserInfo> {
    const response = await apiClient.put<ApiResponse<UserInfo>>('/auth/language', { language });
    return response.data.data;
  },
};
