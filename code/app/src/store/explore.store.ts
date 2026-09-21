import { create } from 'zustand';
import { MasterCategory, MakeupStyle, taxonomyService } from '@/services/taxonomy.service';
import { PackageSummary, packageService } from '@/services/package.service';

interface ExploreState {
  keyword: string;
  selectedCategoryId: number | null;
  selectedStyleId: number | null;
  selectedRadiusKm: number | null; // 1, 3, 5, 10, null for all
  minPrice: number;
  maxPrice: number;
  userLocation: { latitude: number; longitude: number } | null;

  categories: MasterCategory[];
  styles: MakeupStyle[];
  packages: PackageSummary[];

  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  page: number;
  hasMore: boolean;

  setKeyword: (keyword: string) => void;
  setSelectedCategory: (categoryId: number | null) => void;
  setSelectedStyle: (styleId: number | null) => void;
  setSelectedRadius: (radius: number | null) => void;
  setPriceRange: (min: number, max: number) => void;
  setUserLocation: (loc: { latitude: number; longitude: number } | null) => void;

  initExplore: () => Promise<void>;
  fetchPackages: (reset?: boolean) => Promise<void>;
  resetFilters: () => void;
}

export const useExploreStore = create<ExploreState>((set, get) => ({
  keyword: '',
  selectedCategoryId: null,
  selectedStyleId: null,
  selectedRadiusKm: 5,
  minPrice: 200000,
  maxPrice: 5000000,
  userLocation: null,

  categories: [],
  styles: [],
  packages: [],

  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  page: 0,
  hasMore: true,

  setKeyword: (keyword) => set({ keyword }),
  setSelectedCategory: (categoryId) => {
    set({ selectedCategoryId: categoryId, page: 0 });
    get().fetchPackages(true);
  },
  setSelectedStyle: (styleId) => {
    set({ selectedStyleId: styleId, page: 0 });
    get().fetchPackages(true);
  },
  setSelectedRadius: (radius) => {
    set({ selectedRadiusKm: radius, page: 0 });
    get().fetchPackages(true);
  },
  setPriceRange: (min, max) => {
    set({ minPrice: min, maxPrice: max, page: 0 });
    get().fetchPackages(true);
  },
  setUserLocation: (loc) => set({ userLocation: loc }),

  initExplore: async () => {
    set({ isLoading: true });
    try {
      const [cats, styles] = await Promise.all([
        taxonomyService.getActiveCategories().catch(() => []),
        taxonomyService.getActiveStyles().catch(() => []),
      ]);
      set({ categories: cats, styles });
      await get().fetchPackages(true);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPackages: async (reset = false) => {
    const state = get();
    if (reset) {
      set({ page: 0, hasMore: true });
    } else {
      if (!state.hasMore || state.isLoadingMore) return;
      set({ isLoadingMore: true });
    }

    try {
      const currentPage = reset ? 0 : state.page;
      const data = await packageService.listPackages({
        categoryId: state.selectedCategoryId || undefined,
        availableOnly: true,
      });

      // Lọc theo keyword ở client nếu có
      let filtered = data;
      if (state.keyword.trim()) {
        const kw = state.keyword.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.packageName.toLowerCase().includes(kw) ||
            p.categoryName?.toLowerCase().includes(kw) ||
            p.muaName?.toLowerCase().includes(kw) ||
            p.styles?.some((s) => s.styleName.toLowerCase().includes(kw))
        );
      }

      // Lọc theo styleId nếu có
      if (state.selectedStyleId) {
        filtered = filtered.filter((p) =>
          p.styles?.some((s) => s.id === state.selectedStyleId || s.styleId === state.selectedStyleId)
        );
      }

      // Lọc theo khoảng giá
      filtered = filtered.filter(
        (p) => p.price >= state.minPrice && p.price <= state.maxPrice
      );

      if (reset) {
        set({ packages: filtered, page: currentPage, hasMore: false });
      } else {
        set({
          packages: [...state.packages, ...filtered],
          page: currentPage + 1,
          hasMore: false,
        });
      }
    } catch (err) {
      console.error('Lỗi khi fetch gói dịch vụ:', err);
    } finally {
      set({ isLoading: false, isRefreshing: false, isLoadingMore: false });
    }
  },

  resetFilters: () => {
    set({
      keyword: '',
      selectedCategoryId: null,
      selectedStyleId: null,
      selectedRadiusKm: 5,
      minPrice: 200000,
      maxPrice: 5000000,
      page: 0,
      hasMore: true,
    });
    get().fetchPackages(true);
  },
}));
