import { create } from 'zustand';
import {
  MuaPublicProfile,
  PortfolioShowcase,
  muaProfileService,
} from '@/services/mua-profile.service';
import { PackageDetail, packageService } from '@/services/package.service';

interface MuaDetailState {
  muaProfile: MuaPublicProfile | null;
  packages: PackageDetail[];
  selectedPackage: PackageDetail | null;
  showcases: PortfolioShowcase[];

  isLoading: boolean;
  isLoadingShowcases: boolean;
  error: string | null;

  fetchMuaDetails: (muaId: number) => Promise<void>;
  selectPackage: (pkg: PackageDetail) => Promise<void>;
  resetDetail: () => void;
}

export const useMuaDetailStore = create<MuaDetailState>((set, get) => ({
  muaProfile: null,
  packages: [],
  selectedPackage: null,
  showcases: [],

  isLoading: false,
  isLoadingShowcases: false,
  error: null,

  fetchMuaDetails: async (muaId: number) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Fetch thông tin thợ MUA và danh sách các gói dịch vụ
      const [profile, packageSummaries] = await Promise.all([
        muaProfileService.getPublicProfile(muaId),
        packageService.listPackages({ muaId, availableOnly: false }),
      ]);

      // 2. Lấy chi tiết các gói để có items bước thực hiện
      const detailedPackages = await Promise.all(
        packageSummaries.map((p) =>
          packageService.getPackageById(p.id).catch(() => p as PackageDetail)
        )
      );

      const firstPkg = detailedPackages[0] || null;

      set({
        muaProfile: profile,
        packages: detailedPackages,
        selectedPackage: firstPkg,
      });

      // 3. Nếu có gói đầu tiên, tự động tải danh sách ảnh mẫu thực tế gắn với gói đó
      if (firstPkg) {
        await get().selectPackage(firstPkg);
      }
    } catch (err: any) {
      console.error('Lỗi khi fetch hồ sơ thợ:', err);
      set({ error: err.message || 'Không thể tải thông tin thợ trang điểm' });
    } finally {
      set({ isLoading: false });
    }
  },

  selectPackage: async (pkg: PackageDetail) => {
    set({ selectedPackage: pkg, isLoadingShowcases: true });
    const profile = get().muaProfile;
    if (!profile) {
      set({ isLoadingShowcases: false });
      return;
    }

    try {
      // Gọi API lấy các bức ảnh mẫu tác phẩm đã làm được gắn riêng theo packageId
      const res = await muaProfileService.getPublicPortfolios(profile.muaId, {
        package_id: pkg.id,
      });

      // Lấy danh sách ảnh mẫu gắn đúng với gói dịch vụ này
      // Nếu gói chưa có ảnh -> showcases rỗng để hiển thị Empty State rõ ràng
      const items = (res.content || []).filter(
        (it) => it.packageId !== undefined && it.packageId !== null && Number(it.packageId) === Number(pkg.id)
      );

      set({ showcases: items });
    } catch (err) {
      console.error('Lỗi khi fetch ảnh mẫu dịch vụ:', err);
      set({ showcases: [] });
    } finally {
      set({ isLoadingShowcases: false });
    }
  },

  resetDetail: () => {
    set({
      muaProfile: null,
      packages: [],
      selectedPackage: null,
      showcases: [],
      isLoading: false,
      isLoadingShowcases: false,
      error: null,
    });
  },
}));
