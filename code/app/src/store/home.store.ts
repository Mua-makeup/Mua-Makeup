import { create } from 'zustand';
import { taxonomyService, MasterCategory } from '@/services/taxonomy.service';
import { muaProfileService, MuaPublicProfile } from '@/services/mua-profile.service';
import { agencyService, AgencyPublicProfile } from '@/services/agency.service';

interface HomeState {
  categories: MasterCategory[];
  featuredMuas: MuaPublicProfile[];
  featuredStudios: AgencyPublicProfile[];
  isLoading: boolean;
  hasLoaded: boolean;

  fetchExploreData: (force?: boolean) => Promise<void>;
}

export const useHomeStore = create<HomeState>((set, get) => ({
  categories: [],
  featuredMuas: [],
  featuredStudios: [],
  isLoading: false,
  hasLoaded: false,

  fetchExploreData: async (force = false) => {
    if (get().isLoading) return;
    if (!force && get().hasLoaded && get().featuredMuas.length > 0) return;

    set({ isLoading: true });
    try {
      const [cats, muas, studios] = await Promise.all([
        taxonomyService.getActiveCategories().catch(() => []),
        muaProfileService.getPublicMuas({ limit: 8 }).catch(() => []),
        agencyService.getPublicAgencies(6).catch(() => []),
      ]);
      set({
        categories: cats || [],
        featuredMuas: muas || [],
        featuredStudios: studios || [],
        hasLoaded: true,
      });
    } catch (err) {
      console.warn('Lỗi tải dữ liệu khám phá trang chủ:', err);
    } finally {
      set({ isLoading: false });
    }
  },
}));
