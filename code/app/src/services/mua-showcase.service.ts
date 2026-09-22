import { Platform } from 'react-native';
import { apiClient } from './api';
import { ApiResponse } from './auth.service';
import { PageResponse, PortfolioShowcase } from './mua-profile.service';

export interface CreateShowcasePayload {
  packageId: number;
  styleId?: number;
  title: string;
  description?: string;
  isFeatured?: boolean;
  coverImageUri: string;
  coverImageName?: string;
  additionalImageUris?: string[];
}

export interface UpdateShowcaseReq {
  title?: string;
  description?: string;
  styleId?: number;
}

export const muaShowcaseService = {
  /** Lấy danh sách toàn bộ tác phẩm trong Portfolio của Thợ đang đăng nhập */
  async getMyPortfolios(page: number = 0, size: number = 20): Promise<PageResponse<PortfolioShowcase>> {
    const res = await apiClient.get<ApiResponse<PageResponse<PortfolioShowcase>>>(
      '/muas/my-profile/portfolios',
      {
        params: { page, size },
      }
    );
    return res.data?.data || { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, isLast: true };
  },

  /** Tải lên tác phẩm mới kèm ảnh chính diện và các góc chụp chi tiết qua FormData */
  async createPortfolioShowcase(payload: CreateShowcasePayload): Promise<PortfolioShowcase> {
    const formData = new FormData();

    formData.append('title', payload.title.trim());
    if (payload.packageId) {
      formData.append('package_id', payload.packageId.toString());
      formData.append('packageId', payload.packageId.toString());
    }
    if (payload.styleId) {
      formData.append('style_id', payload.styleId.toString());
      formData.append('styleId', payload.styleId.toString());
    }
    if (payload.description) {
      formData.append('description', payload.description.trim());
    }
    if (payload.isFeatured !== undefined) {
      formData.append('is_featured', payload.isFeatured.toString());
      formData.append('isFeatured', payload.isFeatured.toString());
    }

const resolveFileMeta = (uri: string, customName?: string, defaultPrefix: string = 'image') => {
  let ext = 'jpg';
  if (customName && customName.includes('.')) {
    const candidate = customName.split('.').pop()?.toLowerCase();
    if (candidate && ['jpg', 'jpeg', 'png', 'webp'].includes(candidate)) {
      ext = candidate === 'jpeg' ? 'jpg' : candidate;
    }
  } else if (uri && uri.includes('.')) {
    const candidate = uri.split('.').pop()?.split('?')[0]?.split('#')[0]?.toLowerCase();
    if (candidate && ['jpg', 'jpeg', 'png', 'webp'].includes(candidate)) {
      ext = candidate === 'jpeg' ? 'jpg' : candidate;
    }
  }
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const name = customName && customName.includes('.') ? customName : `${defaultPrefix}_${Date.now()}.${ext}`;
  return { ext, mimeType, name };
};

    // Xử lý ảnh chính diện (bắt buộc) - Hỗ trợ cả Web (Blob) và Mobile Native (URI Object)
    const coverMeta = resolveFileMeta(payload.coverImageUri, payload.coverImageName, 'showcase_cover');
    const isWeb = Platform.OS === 'web' || payload.coverImageUri.startsWith('blob:') || payload.coverImageUri.startsWith('data:');

    if (isWeb) {
      const resp = await fetch(payload.coverImageUri);
      const blob = await resp.blob();
      formData.append('image_file', blob, coverMeta.name);
      formData.append('file', blob, coverMeta.name);
    } else {
      const mainFileObj = {
        uri: payload.coverImageUri,
        name: coverMeta.name,
        type: coverMeta.mimeType,
      };
      // @ts-ignore: React Native FormData file object format
      formData.append('image_file', mainFileObj);
      // @ts-ignore
      formData.append('file', mainFileObj);
    }

    // Dãy ảnh góc chụp chi tiết (nếu có)
    if (payload.additionalImageUris && payload.additionalImageUris.length > 0) {
      for (let idx = 0; idx < payload.additionalImageUris.length; idx++) {
        const addUri = payload.additionalImageUris[idx];
        const addMeta = resolveFileMeta(addUri, undefined, `showcase_angle_${idx + 1}`);

        if (Platform.OS === 'web' || addUri.startsWith('blob:') || addUri.startsWith('data:')) {
          const resp = await fetch(addUri);
          const blob = await resp.blob();
          formData.append('additional_files', blob, addMeta.name);
        } else {
          const addFileObj = {
            uri: addUri,
            name: addMeta.name,
            type: addMeta.mimeType,
          };
          // @ts-ignore: React Native FormData file object format
          formData.append('additional_files', addFileObj);
        }
      }
    }

    const res = await apiClient.post<ApiResponse<PortfolioShowcase>>(
      '/muas/my-profile/portfolios',
      formData
    );
    return res.data.data;
  },

  /** Cập nhật thông tin tiêu đề, mô tả hoặc phong cách của tác phẩm */
  async updatePortfolioShowcase(id: number, req: UpdateShowcaseReq): Promise<PortfolioShowcase> {
    const res = await apiClient.put<ApiResponse<PortfolioShowcase>>(
      `/muas/my-profile/portfolios/${id}`,
      req
    );
    return res.data.data;
  },

  /** Ghim / Bỏ ghim tác phẩm làm ảnh nổi bật */
  async toggleFeatured(id: number, isFeatured: boolean): Promise<PortfolioShowcase> {
    const res = await apiClient.patch<ApiResponse<PortfolioShowcase>>(
      `/muas/my-profile/portfolios/${id}/featured`,
      { isFeatured }
    );
    return res.data.data;
  },

  /** Ẩn / Hiện tác phẩm đối với khách hàng */
  async toggleVisibility(id: number, isVisible: boolean): Promise<PortfolioShowcase> {
    const res = await apiClient.patch<ApiResponse<PortfolioShowcase>>(
      `/muas/my-profile/portfolios/${id}/visibility`,
      { isVisible }
    );
    return res.data.data;
  },

  /** Xóa tác phẩm khỏi gói dịch vụ */
  async deletePortfolioShowcase(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(`/muas/my-profile/portfolios/${id}`);
  },
};
