import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { UserAvatar } from '@/components/common/UserAvatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import { useExploreStore } from '@/store/explore.store';
import { useLocationStore } from '@/store/location.store';
import { agencyService, AgencyPublicProfile } from '@/services/agency.service';
import { muaProfileService, MuaPublicProfile } from '@/services/mua-profile.service';
import { SearchSuggestionsOverlay } from '@/components/customer/SearchSuggestionsOverlay';
import { AppBottomNavBar } from '@/components/common/AppBottomNavBar';
import { ExploreFilterModal } from '@/components/customer/ExploreFilterModal';
import { StudioServicesModal } from '@/components/customer/StudioServicesModal';

const getDistanceKm = (
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number | null => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // km
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ tab?: string; search?: string }>();
  const [providerTab, setProviderTab] = useState<'FREELANCE' | 'STUDIO'>(
    params.tab === 'STUDIO' ? 'STUDIO' : 'FREELANCE'
  );

  const { latitude, longitude } = useLocationStore();

  // Danh sách Thợ MUA Tự Do
  const [muaList, setMuaList] = useState<MuaPublicProfile[]>([]);
  const [isLoadingMuas, setIsLoadingMuas] = useState(false);
  const [isRefreshingMuas, setIsRefreshingMuas] = useState(false);

  // Danh sách Studio & Viện Cưới
  const [studios, setStudios] = useState<AgencyPublicProfile[]>([]);
  const [isLoadingStudios, setIsLoadingStudios] = useState(false);
  const [isRefreshingStudios, setIsRefreshingStudios] = useState(false);

  // Modal xem dịch vụ của Studio (sửa triệt để lỗi nhảy sang tab thợ tự do)
  const [selectedStudioForModal, setSelectedStudioForModal] =
    useState<AgencyPublicProfile | null>(null);
  const [isStudioModalVisible, setIsStudioModalVisible] = useState(false);

  // Store quản lý bộ lọc
  const {
    keyword,
    selectedCategoryId,
    selectedStyleId,
    selectedRadiusKm,
    minPrice,
    maxPrice,
    categories,
    styles: availableStyles,
    setKeyword,
    setSelectedCategory,
    setSelectedStyle,
    setSelectedRadius,
    setPriceRange,
    initExplore,
    resetFilters: storeResetFilters,
  } = useExploreStore();

  const [minRating, setMinRating] = useState<number | null>(null);

  const [headerHeight, setHeaderHeight] = useState(64);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // 100% Real API từ Spring Boot Backend
  const fetchMuas = useCallback(async () => {
    try {
      setIsLoadingMuas(true);
      const data = await muaProfileService.getPublicMuas({
        categoryId: selectedCategoryId && selectedCategoryId > 0 ? selectedCategoryId : undefined,
        limit: 50,
      });
      setMuaList(data);
    } catch (e) {
      console.warn('Lỗi tải danh sách thợ MUA tự do:', e);
    } finally {
      setIsLoadingMuas(false);
      setIsRefreshingMuas(false);
    }
  }, [selectedCategoryId]);

  const fetchStudios = useCallback(async () => {
    try {
      setIsLoadingStudios(true);
      const data = await agencyService.getPublicAgencies(50);
      setStudios(data);
    } catch (e) {
      console.warn('Lỗi tải danh sách studio:', e);
    } finally {
      setIsLoadingStudios(false);
      setIsRefreshingStudios(false);
    }
  }, []);

  useEffect(() => {
    initExplore();
    fetchStudios();
  }, [initExplore, fetchStudios]);

  useEffect(() => {
    fetchMuas();
  }, [fetchMuas, selectedCategoryId, selectedStyleId, selectedRadiusKm, keyword]);

  useFocusEffect(
    useCallback(() => {
      fetchMuas();
      fetchStudios();
    }, [fetchMuas, fetchStudios])
  );

  useEffect(() => {
    if (params.search && params.search.length > 0) {
      setKeyword(params.search);
    }
    if (params.tab === 'STUDIO') {
      setProviderTab('STUDIO');
    }
  }, [params.search, params.tab, setKeyword]);

  const handleSearchSubmit = () => {
    setIsSearchFocused(false);
    if (providerTab === 'FREELANCE') {
      fetchMuas();
    } else {
      fetchStudios();
    }
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
  };

  const handleResetAllFilters = () => {
    storeResetFilters();
    setMinRating(null);
  };

  // Tính số lượng bộ lọc đang hoạt động
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategoryId !== null) count++;
    if (selectedStyleId !== null) count++;
    if (selectedRadiusKm !== null) count++;
    if (minPrice > 200000 || maxPrice < 5000000) count++;
    if (minRating !== null) count++;
    return count;
  }, [selectedCategoryId, selectedStyleId, selectedRadiusKm, minPrice, maxPrice, minRating]);

  // Bộ lọc chuyên sâu cho danh sách Thợ MUA
  const filteredMuas = useMemo(() => {
    return muaList.filter((m) => {
      // 1. Lọc theo phong cách
      if (selectedStyleId && selectedStyleId > 0) {
        const hasStyle = m.styles?.some((s) => (s.id || s.styleId) === selectedStyleId);
        if (!hasStyle) return false;
      }

      // 2. Lọc theo bán kính GPS (chỉ lọc khi khách hàng chọn cụ thể bán kính)
      if (selectedRadiusKm && latitude && longitude && m.baseAddressLat && m.baseAddressLng) {
        const d = getDistanceKm(latitude, longitude, m.baseAddressLat, m.baseAddressLng);
        if (d != null && d > selectedRadiusKm) return false;
      }

      // 3. Lọc theo khoảng giá ngân sách
      const price = m.startingPrice || 350000;
      if (minPrice > 200000 && price < minPrice) return false;
      if (maxPrice < 5000000 && price > maxPrice) return false;

      // 4. Lọc theo đánh giá sao tối thiểu
      if (minRating != null) {
        const rating = m.ratingAverage != null ? Number(m.ratingAverage) : 5.0;
        if (rating < minRating) return false;
      }

      // 5. Tìm kiếm từ khóa (tên, bio, phong cách, địa chỉ)
      if (keyword.trim()) {
        const q = keyword.toLowerCase().trim();
        const matchName = m.fullName ? m.fullName.toLowerCase().includes(q) : false;
        const matchBio = m.bio ? m.bio.toLowerCase().includes(q) : false;
        const matchAddr = m.baseAddressText ? m.baseAddressText.toLowerCase().includes(q) : false;
        const matchStyle = m.styles?.some((s: any) => {
          const styleName =
            s?.styleName || s?.name || s?.style_name || (typeof s === 'string' ? s : '');
          return styleName ? String(styleName).toLowerCase().includes(q) : false;
        });
        if (!matchName && !matchBio && !matchAddr && !matchStyle) return false;
      }

      return true;
    });
  }, [muaList, selectedStyleId, selectedRadiusKm, latitude, longitude, minPrice, maxPrice, minRating, keyword]);

  // Bộ lọc chuyên sâu cho danh sách Studio & Viện Cưới
  const filteredStudios = useMemo(() => {
    return studios.filter((s) => {
      // 1. Lọc theo bán kính GPS
      if (selectedRadiusKm && latitude && longitude && s.latitude && s.longitude) {
        const d = getDistanceKm(latitude, longitude, s.latitude, s.longitude);
        if (d != null && d > selectedRadiusKm) return false;
      }

      // 2. Lọc theo sao tối thiểu
      if (minRating != null) {
        const rating = s.ratingAvg != null ? Number(s.ratingAvg) : 5.0;
        if (rating < minRating) return false;
      }

      // 3. Tìm kiếm từ khóa (tên studio, đường, quận, thành phố)
      if (keyword.trim()) {
        const q = keyword.toLowerCase().trim();
        const matchName = s.agencyName ? s.agencyName.toLowerCase().includes(q) : false;
        const matchStreet = s.addressStreet ? s.addressStreet.toLowerCase().includes(q) : false;
        const matchDistrict = s.district ? s.district.toLowerCase().includes(q) : false;
        const matchCity = s.city ? s.city.toLowerCase().includes(q) : false;
        if (!matchName && !matchStreet && !matchDistrict && !matchCity) return false;
      }

      return true;
    });
  }, [studios, selectedRadiusKm, latitude, longitude, minRating, keyword]);

  // Render từng thẻ Thợ MUA Tự Do
  const renderMuaItem = ({ item: mua }: { item: MuaPublicProfile }) => {
    const dist = getDistanceKm(latitude, longitude, mua.baseAddressLat, mua.baseAddressLng);
    const formattedPrice = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(mua.startingPrice || 350000);
    const hasVerifiedCert = mua.certificates?.some((c) => c.isVerified);
    const specialtyText =
      mua.styles && mua.styles.length > 0
        ? mua.styles.map((s) => s.styleName).slice(0, 2).join(' • ')
        : mua.bio || 'Chuyên viên make-up tự do';

    return (
      <TouchableOpacity
        key={`mua-${mua.muaId}`}
        style={styles.muaCard}
        onPress={() => {
          Haptics.selectionAsync();
          router.push({
            pathname: '/mua-detail/[id]',
            params: { id: mua.muaId.toString() },
          });
        }}
        activeOpacity={0.88}
      >
        <View style={styles.muaCardTop}>
          <UserAvatar
            uri={mua.avatarUrl}
            name={mua.fullName}
            size={56}
            style={{ marginRight: 12 }}
          />

          <View style={styles.muaInfoCol}>
            <View style={styles.muaNameRow}>
              <Text style={styles.muaName} numberOfLines={1}>
                {mua.fullName}
              </Text>
              {hasVerifiedCert && (
                <Ionicons name="checkmark-circle" size={16} color={BrandColors.primary} />
              )}
            </View>

            <Text style={styles.muaCategory} numberOfLines={1}>
              {specialtyText}
            </Text>

            <View style={styles.ratingAndDistRow}>
              <View style={styles.ratingBox}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {mua.ratingAverage != null ? Number(mua.ratingAverage).toFixed(1) : '5.0'}
                </Text>
                <Text style={styles.reviewsCount}>
                  ({mua.totalCompletedJobs != null && mua.totalCompletedJobs > 0
                    ? `${mua.totalCompletedJobs} ca`
                    : 'Mới'})
                </Text>
              </View>

              {dist != null ? (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <View style={styles.distBox}>
                    <Ionicons name="navigate-outline" size={12} color={BrandColors.slateMuted} />
                    <Text style={styles.distText}>
                      {dist < 0.1 ? '< 100m' : `${dist} km`}
                    </Text>
                  </View>
                </>
              ) : mua.baseAddressText ? (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <View style={styles.distBox}>
                    <Ionicons name="location-outline" size={12} color={BrandColors.slateMuted} />
                    <Text style={styles.distText} numberOfLines={1}>
                      {mua.baseAddressText.split(',')[0]}
                    </Text>
                  </View>
                </>
              ) : null}

              {mua.maxServiceRadiusKm != null && (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <View style={styles.distBox}>
                    <Ionicons name="radio-outline" size={12} color="#2563EB" />
                    <Text style={[styles.distText, { color: '#2563EB' }]}>
                      Nhận {mua.maxServiceRadiusKm}km
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* BADGES TAGS */}
        <View style={styles.badgesRow}>
          <View style={[styles.badgeItem, styles.badgeFreelance]}>
            <Ionicons name="sparkles" size={11} color="#BE185D" />
            <Text style={[styles.badgeItemText, styles.badgeFreelanceText]}>Thợ Tự Do</Text>
          </View>

          {hasVerifiedCert && (
            <View style={[styles.badgeItem, styles.badgeVerified]}>
              <Ionicons name="shield-checkmark" size={11} color="#059669" />
              <Text style={[styles.badgeItemText, styles.badgeVerifiedText]}>Đã xác thực</Text>
            </View>
          )}

          {mua.experienceYears != null && mua.experienceYears > 0 && (
            <View style={styles.badgeItem}>
              <Text style={styles.badgeItemText}>{mua.experienceYears} năm KN</Text>
            </View>
          )}

          <View style={styles.badgeItem}>
            <Text style={styles.badgeItemText}>
              {mua.isOnline ? '🟢 Đang trực tuyến' : '📅 Nhận hẹn trước'}
            </Text>
          </View>
        </View>

        {/* BOTTOM PRICE & ACTION */}
        <View style={styles.muaCardBottom}>
          <View>
            <Text style={styles.priceLabel}>Giá khởi điểm từ</Text>
            <Text style={styles.priceValue}>{formattedPrice}</Text>
          </View>

          <View style={styles.bookNowButton}>
            <Text style={styles.bookNowButtonText}>Đặt Lịch</Text>
            <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render từng thẻ Studio & Viện Cưới
  const renderStudioItem = ({ item }: { item: AgencyPublicProfile }) => {
    const dist = getDistanceKm(latitude, longitude, item.latitude, item.longitude);
    const fullAddress = [item.addressStreet, item.district, item.city].filter(Boolean).join(', ');

    const openStudioServices = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedStudioForModal(item);
      setIsStudioModalVisible(true);
    };

    return (
      <TouchableOpacity
        key={`agency-${item.id}`}
        style={styles.studioCard}
        onPress={openStudioServices}
        activeOpacity={0.88}
      >
        <View style={styles.studioCardTop}>
          {item.logoUrl ? (
            <Image
              source={{ uri: item.logoUrl }}
              style={styles.studioLogo}
              contentFit="cover"
            />
          ) : (
            <View style={styles.studioLogoFallback}>
              <Ionicons name="business" size={26} color={BrandColors.primary} />
            </View>
          )}

          <View style={styles.studioInfoCol}>
            <View style={styles.studioNameRow}>
              <Text style={styles.studioName} numberOfLines={1}>
                {item.agencyName}
              </Text>
              <Ionicons name="checkmark-circle" size={16} color="#2563EB" style={{ marginLeft: 4 }} />
            </View>

            <View style={styles.studioRatingAndDistRow}>
              <View style={styles.ratingBox}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {item.ratingAvg != null ? Number(item.ratingAvg).toFixed(1) : '5.0'}
                </Text>
              </View>

              {dist != null && (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <View style={styles.distBox}>
                    <Ionicons name="navigate-outline" size={12} color="#2563EB" />
                    <Text style={[styles.distText, { color: '#2563EB' }]}>{dist} km</Text>
                  </View>
                </>
              )}
            </View>

            {fullAddress ? (
              <View style={styles.studioAddressRow}>
                <Ionicons
                  name="location-outline"
                  size={13}
                  color={BrandColors.slateMuted}
                  style={{ marginTop: 1 }}
                />
                <Text style={styles.studioAddressText} numberOfLines={2}>
                  {fullAddress}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.studioCardBottom}>
          <View style={styles.studioTypeBadge}>
            <Ionicons name="business-outline" size={12} color="#7C3AED" />
            <Text style={styles.studioTypeBadgeText}>Cơ sở / Viện Áo Cưới</Text>
          </View>

          {/* NÚT XEM DỊCH VỤ STUDIO (MỞ TRỰC TIẾP BẢNG GIÁ STUDIO BẰNG REAL API, KHÔNG NHẢY SANG TAB MUA) */}
          <TouchableOpacity
            style={styles.exploreStudioBtn}
            onPress={openStudioServices}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles-outline" size={13} color="#FFFFFF" />
            <Text style={styles.exploreStudioBtnText}>Xem Dịch Vụ</Text>
            <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Xác định nhãn hiển thị cho thanh bộ lọc đang hoạt động
  const activeCategory = categories.find((c) => c.id === selectedCategoryId);
  const activeStyle = availableStyles.find((s) => s.id === selectedStyleId);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. HEADER TÌM KIẾM & ICON PHỄU LỌC */}
      <View
        style={styles.header}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={19} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm thợ, dịch vụ, phong cách, studio..."
            placeholderTextColor="#94A3B8"
            value={keyword}
            onChangeText={setKeyword}
            onFocus={() => setIsSearchFocused(true)}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => setKeyword('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {isSearchFocused ? (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setIsSearchFocused(false);
              Keyboard.dismiss();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Hủy</Text>
          </TouchableOpacity>
        ) : (
          /* NÚT ICON PHỄU BỘ LỌC TỐI ƯU CÓ BADGE SỐ LƯỢNG LỌC */
          <TouchableOpacity
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setIsFilterModalVisible(true);
            }}
            activeOpacity={0.75}
          >
            <Ionicons
              name="funnel-outline"
              size={18}
              color={activeFilterCount > 0 ? '#FFFFFF' : '#475569'}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadgeIndicator}>
                <Text style={styles.filterBadgeIndicatorText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* OVERLAY GỢI Ý KHI FOCUS Ô TÌM KIẾM */}
      <SearchSuggestionsOverlay
        visible={isSearchFocused}
        topOffset={headerHeight}
        keyword={keyword}
        categories={categories}
        styles={availableStyles}
        onSelectSuggestion={handleSelectSuggestion}
        onClose={() => {
          setIsSearchFocused(false);
          Keyboard.dismiss();
        }}
      />

      {/* 2. THANH CHUYỂN ĐỔI TAB: THỢ MUA TỰ DO vs STUDIO & VIỆN ÁO CƯỚI */}
      <View style={styles.segmentSwitchWrapper}>
        <View style={styles.segmentSwitchBox}>
          <TouchableOpacity
            style={[styles.segmentBtn, providerTab === 'FREELANCE' && styles.segmentBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setProviderTab('FREELANCE');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="sparkles"
              size={14}
              color={providerTab === 'FREELANCE' ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.segmentBtnText,
                providerTab === 'FREELANCE' && styles.segmentBtnTextActive,
              ]}
            >
              Thợ MUA Tự Do
            </Text>
            <View
              style={[
                styles.segmentBadge,
                providerTab === 'FREELANCE' && styles.segmentBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentBadgeText,
                  providerTab === 'FREELANCE' && styles.segmentBadgeTextActive,
                ]}
              >
                {filteredMuas.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, providerTab === 'STUDIO' && styles.segmentBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setProviderTab('STUDIO');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="business"
              size={14}
              color={providerTab === 'STUDIO' ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.segmentBtnText,
                providerTab === 'STUDIO' && styles.segmentBtnTextActive,
              ]}
            >
              Studio & Viện Cưới
            </Text>
            <View
              style={[
                styles.segmentBadge,
                providerTab === 'STUDIO' && styles.segmentBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentBadgeText,
                  providerTab === 'STUDIO' && styles.segmentBadgeTextActive,
                ]}
              >
                {filteredStudios.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. THANH TÓM TẮT BỘ LỌC ĐANG CHẠY (HIỂN THỊ TINH GỌN KHI CÓ BỘ LỌC ĐƯỢC CHỌN) */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersBar}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { key: 'RESET', label: `Xóa lọc (${activeFilterCount})`, isReset: true },
              ...(selectedCategoryId !== null && activeCategory
                ? [{ key: 'CAT', label: activeCategory.categoryName, onRemove: () => setSelectedCategory(null) }]
                : []),
              ...(selectedStyleId !== null && activeStyle
                ? [{ key: 'STYLE', label: activeStyle.styleName, onRemove: () => setSelectedStyle(null) }]
                : []),
              ...(selectedRadiusKm !== null
                ? [{ key: 'RADIUS', label: `< ${selectedRadiusKm}km`, onRemove: () => setSelectedRadius(null) }]
                : []),
              ...(minPrice > 200000 || maxPrice < 5000000
                ? [{ key: 'PRICE', label: 'Ngân sách', onRemove: () => setPriceRange(200000, 5000000) }]
                : []),
              ...(minRating !== null
                ? [{ key: 'RATING', label: `≥ ${minRating}★`, onRemove: () => setMinRating(null) }]
                : []),
            ]}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.activeFiltersContent}
            renderItem={({ item }) => {
              if (item.isReset) {
                return (
                  <TouchableOpacity
                    style={styles.resetActivePill}
                    onPress={handleResetAllFilters}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={14} color={BrandColors.primary} />
                    <Text style={styles.resetActivePillText}>{item.label}</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <View style={styles.activeTagChip}>
                  <Text style={styles.activeTagChipText} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <TouchableOpacity onPress={item.onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={13} color="#64748B" />
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* 4. NỘI DUNG CHÍNH THEO TAB */}
      {providerTab === 'FREELANCE' ? (
        isLoadingMuas && muaList.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách chuyên viên make-up tự do...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredMuas}
            keyExtractor={(item) => `mua-${item.muaId}`}
            renderItem={renderMuaItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshingMuas}
                onRefresh={() => {
                  setIsRefreshingMuas(true);
                  fetchMuas();
                }}
                colors={[BrandColors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="sparkles-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Chưa có chuyên viên nào phù hợp</Text>
                <Text style={styles.emptySubtitle}>
                  Thử nới rộng bán kính định vị GPS hoặc thiết lập lại bộ lọc để xem nhiều chuyên viên hơn.
                </Text>
                {activeFilterCount > 0 && (
                  <TouchableOpacity style={styles.resetBtn} onPress={handleResetAllFilters}>
                    <Text style={styles.resetBtnText}>Xóa bộ lọc hiện tại</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )
      ) : isLoadingStudios && studios.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách Studio & Viện Áo Cưới...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudios}
          keyExtractor={(item) => `agency-${item.id}`}
          renderItem={renderStudioItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshingStudios}
              onRefresh={() => {
                setIsRefreshingStudios(true);
                fetchStudios();
              }}
              colors={[BrandColors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Không tìm thấy Studio phù hợp</Text>
              <Text style={styles.emptySubtitle}>
                Thử tìm theo tên khác hoặc mở rộng bán kính GPS xung quanh bạn.
              </Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity style={styles.resetBtn} onPress={handleResetAllFilters}>
                  <Text style={styles.resetBtnText}>Xóa bộ lọc hiện tại</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* 5. MODAL BỘ LỌC TỐI ƯU VÀO ICON PHỄU (CÁC PHẦN TÁCH BIỆT XỔ XUỐNG VÀ ẨN KHI CHỌN) */}
      <ExploreFilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        categories={categories}
        makeupStyles={availableStyles}
        selectedCategoryId={selectedCategoryId}
        selectedStyleId={selectedStyleId}
        selectedRadiusKm={selectedRadiusKm}
        minPrice={minPrice}
        maxPrice={maxPrice}
        minRating={minRating}
        onSelectCategory={setSelectedCategory}
        onSelectStyle={setSelectedStyle}
        onSelectRadius={setSelectedRadius}
        onSelectPriceRange={setPriceRange}
        onSelectMinRating={setMinRating}
        onResetAll={handleResetAllFilters}
        resultCount={providerTab === 'FREELANCE' ? filteredMuas.length : filteredStudios.length}
      />

      {/* 6. MODAL XEM BẢNG GIÁ DỊCH VỤ STUDIO (100% REAL API TỪ SPRING BOOT) */}
      <StudioServicesModal
        visible={isStudioModalVisible}
        studio={selectedStudioForModal}
        distanceKm={
          selectedStudioForModal
            ? getDistanceKm(
                latitude,
                longitude,
                selectedStudioForModal.latitude,
                selectedStudioForModal.longitude
              )
            : null
        }
        onClose={() => {
          setIsStudioModalVisible(false);
          setSelectedStudioForModal(null);
        }}
      />

      {/* 7. BOTTOM NAVIGATION BAR */}
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
    backgroundColor: '#FFFFFF',
    zIndex: 100,
    elevation: 4,
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
  cancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  filterBadgeIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0F172A',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  filterBadgeIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  segmentSwitchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  segmentSwitchBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: BrandColors.primary,
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  segmentBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  segmentBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  segmentBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  segmentBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  segmentBadgeTextActive: {
    color: '#FFFFFF',
  },
  activeFiltersBar: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  activeFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  resetActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  resetActivePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  activeTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeTagChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
    maxWidth: 120,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 95,
    gap: 12,
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
    lineHeight: 19,
  },
  resetBtn: {
    marginTop: 16,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  muaCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  muaCardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  muaAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
  },
  muaAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE4E6',
  },
  muaAvatarInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  muaInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  muaNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  muaName: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.slateHeading,
  },
  muaCategory: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    marginTop: 2,
    marginBottom: 4,
  },
  ratingAndDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  reviewsCount: {
    fontSize: 11,
    color: BrandColors.slateMuted,
  },
  dotSeparator: {
    color: BrandColors.slateMuted,
    fontSize: 10,
  },
  distBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distText: {
    fontSize: 11.5,
    color: BrandColors.slateMuted,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  badgeItem: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeItemText: {
    fontSize: 10.5,
    color: BrandColors.slateBody,
    fontWeight: '500',
  },
  badgeFreelance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FCE7F3',
    borderColor: '#FBCFE8',
    borderWidth: 0.8,
  },
  badgeFreelanceText: {
    color: '#BE185D',
    fontWeight: '700',
  },
  badgeVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
  },
  badgeVerifiedText: {
    color: '#059669',
    fontWeight: '600',
  },
  muaCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceLabel: {
    fontSize: 11,
    color: BrandColors.slateMuted,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  bookNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  bookNowButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  studioCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  studioCardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  studioLogo: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  studioLogoFallback: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  studioNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  studioName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  studioRatingAndDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  studioAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  studioAddressText: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    flex: 1,
  },
  studioCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  studioTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  studioTypeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7C3AED',
  },
  exploreStudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  exploreStudioBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
