import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { useExploreStore } from '@/store/explore.store';
import { CategoryFilterBar } from '@/components/customer/CategoryFilterBar';
import { SearchSuggestionsOverlay } from '@/components/customer/SearchSuggestionsOverlay';
import { ServicePackageCard } from '@/components/customer/ServicePackageCard';
import { AppBottomNavBar } from '@/components/common/AppBottomNavBar';
import { PackageSummary } from '@/services/package.service';

const RADIUS_OPTIONS = [
  { label: '1 km', value: 1 },
  { label: '3 km', value: 3 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: 'Tất cả', value: null },
];

export default function ExploreScreen() {
  const {
    keyword,
    selectedCategoryId,
    selectedStyleId,
    selectedRadiusKm,
    minPrice,
    maxPrice,
    categories,
    styles: availableStyles,
    packages,
    isLoading,
    isRefreshing,
    setKeyword,
    setSelectedCategory,
    setSelectedStyle,
    setSelectedRadius,
    setPriceRange,
    initExplore,
    fetchPackages,
    resetFilters,
  } = useExploreStore();

  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [tempRadius, setTempRadius] = useState<number | null>(selectedRadiusKm);
  const [tempMinPrice, setTempMinPrice] = useState(minPrice);
  const [tempMaxPrice, setTempMaxPrice] = useState(maxPrice);

  useEffect(() => {
    initExplore();
  }, [initExplore]);

  const handleSearchSubmit = () => {
    setIsSearchFocused(false);
    fetchPackages(true);
  };

  const handleSelectSuggestion = (
    suggestionText: string,
    categoryId?: number | null,
    styleId?: number | null
  ) => {
    setIsSearchFocused(false);
    setKeyword(suggestionText);
    if (categoryId !== undefined) {
      setSelectedCategory(categoryId);
    }
    if (styleId !== undefined) {
      setSelectedStyle(styleId);
    }
    fetchPackages(true);
  };

  const handleApplyFilters = () => {
    setSelectedRadius(tempRadius);
    setPriceRange(tempMinPrice, tempMaxPrice);
    setIsFilterModalVisible(false);
  };

  const handleCardPress = (item: PackageSummary) => {
    // Ưu tiên muaId, fallback id
    const targetId = item.muaId || item.id || 1;
    router.push({
      pathname: '/mua-detail/[id]',
      params: { id: targetId.toString() },
    });
  };

  const renderItem = ({ item }: { item: PackageSummary }) => (
    <ServicePackageCard item={item} onPress={() => handleCardPress(item)} />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* HEADER TÌM KIẾM */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={BrandColors.slateHeading} />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm thợ, dịch vụ, phong cách..."
            placeholderTextColor="#94A3B8"
            value={keyword}
            onChangeText={setKeyword}
            onFocus={() => setIsSearchFocused(true)}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {keyword.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setKeyword('');
                fetchPackages(true);
              }}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* NÚT BỘ LỌC TỔNG HỢP GỌN GÀNG */}
        <TouchableOpacity
          style={[
            styles.filterBtn,
            (selectedRadiusKm !== null || minPrice > 200000 || selectedCategoryId !== null || selectedStyleId !== null) &&
              styles.filterBtnActive,
          ]}
          onPress={() => {
            setTempRadius(selectedRadiusKm);
            setTempMinPrice(minPrice);
            setTempMaxPrice(maxPrice);
            setIsFilterModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="options-outline"
            size={19}
            color={
              selectedRadiusKm !== null || minPrice > 200000 || selectedCategoryId !== null || selectedStyleId !== null
                ? '#FFFFFF'
                : '#475569'
            }
          />
        </TouchableOpacity>
      </View>

      {/* OVERLAY GỢI Ý KHI NHẤN VÀO TÌM KIẾM (5 LOẠI HÌNH MAKEUP CHUẨN DB + PHONG CÁCH) */}
      <SearchSuggestionsOverlay
        visible={isSearchFocused}
        keyword={keyword}
        categories={categories}
        styles={availableStyles}
        onSelectSuggestion={handleSelectSuggestion}
        onClose={() => setIsSearchFocused(false)}
      />

      {/* THANH LỌC THÔNG MINH 1 HÀNG DUY NHẤT (SMART QUICK-FILTER) */}
      <CategoryFilterBar
        categories={categories}
        makeupStyles={availableStyles}
        selectedCategoryId={selectedCategoryId}
        selectedStyleId={selectedStyleId}
        selectedRadiusKm={selectedRadiusKm}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onSelectCategory={setSelectedCategory}
        onSelectStyle={setSelectedStyle}
        onSelectRadius={setSelectedRadius}
        onSelectPriceRange={setPriceRange}
        onResetAll={resetFilters}
      />

      {/* DANH SÁCH GÓI DỊCH VỤ */}
      {isLoading && packages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang quét các gói làm đẹp xung quanh bạn...</Text>
        </View>
      ) : (
        <FlatList
          data={packages}
          keyExtractor={(item) => `pkg-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchPackages(true)}
              colors={[BrandColors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Không tìm thấy gói dịch vụ phù hợp</Text>
              <Text style={styles.emptySubtitle}>
                Thử thay đổi danh mục hoặc nới rộng bán kính tìm kiếm GPS của bạn.
              </Text>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Đặt lại bộ lọc</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* MODAL BỘ LỌC GPS & KHOẢNG GIÁ */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bộ Lọc Nâng Cao</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* BÁN KÍNH GPS */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Bán kính GPS xung quanh</Text>
              <View style={styles.radiusRow}>
                {RADIUS_OPTIONS.map((opt) => {
                  const isSelected = tempRadius === opt.value;
                  return (
                    <TouchableOpacity
                      key={`rad-${opt.label}`}
                      style={[styles.radiusChip, isSelected && styles.radiusChipActive]}
                      onPress={() => setTempRadius(opt.value)}
                    >
                      <Text
                        style={[
                          styles.radiusChipText,
                          isSelected && styles.radiusChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* KHOẢNG GIÁ */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Khoảng giá ngân sách</Text>
              <View style={styles.priceChipsRow}>
                {[
                  { label: 'Dưới 500k', min: 200000, max: 500000 },
                  { label: '500k - 1.5tr', min: 500000, max: 1500000 },
                  { label: '1.5tr - 3tr', min: 1500000, max: 3000000 },
                  { label: 'Trên 3tr (VIP)', min: 3000000, max: 10000000 },
                ].map((p, idx) => {
                  const isMatch = tempMinPrice === p.min && tempMaxPrice === p.max;
                  return (
                    <TouchableOpacity
                      key={`p-range-${idx}`}
                      style={[styles.priceChip, isMatch && styles.priceChipActive]}
                      onPress={() => {
                        setTempMinPrice(p.min);
                        setTempMaxPrice(p.max);
                      }}
                    >
                      <Text
                        style={[
                          styles.priceChipText,
                          isMatch && styles.priceChipTextActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={() => {
                  setTempRadius(5);
                  setTempMinPrice(200000);
                  setTempMaxPrice(5000000);
                }}
              >
                <Text style={styles.modalResetText}>Mặc định</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={handleApplyFilters}
              >
                <Text style={styles.modalApplyText}>Áp dụng bộ lọc</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG (BOTTOM NAVIGATION BAR) */}
      <AppBottomNavBar activeTab="explore" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  filterBtn: {
    width: 42,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterBtnActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  backBtn: {
    width: 36,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 85,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: 16,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  filterSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  radiusChipActive: {
    backgroundColor: BrandColors.primary,
  },
  radiusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  radiusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  priceChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceChipActive: {
    backgroundColor: '#FFF1F2',
    borderColor: BrandColors.primary,
  },
  priceChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  priceChipTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalResetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modalApplyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
  },
  modalApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
