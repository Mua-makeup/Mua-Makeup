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
  Keyboard,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import { useExploreStore } from '@/store/explore.store';
import { useLocationStore } from '@/store/location.store';
import { agencyService, AgencyPublicProfile } from '@/services/agency.service';
import { muaProfileService, MuaPublicProfile } from '@/services/mua-profile.service';
import { CategoryFilterBar } from '@/components/customer/CategoryFilterBar';
import { SearchSuggestionsOverlay } from '@/components/customer/SearchSuggestionsOverlay';
import { ServicePackageCard } from '@/components/customer/ServicePackageCard';
import { AppBottomNavBar } from '@/components/common/AppBottomNavBar';
import { PackageSummary } from '@/services/package.service';

const RADIUS_OPTIONS = [
  { label: 'Tất cả', value: null },
  { label: '1 km', value: 1 },
  { label: '3 km', value: 3 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
];

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
  const [muaList, setMuaList] = useState<MuaPublicProfile[]>([]);
  const [isLoadingMuas, setIsLoadingMuas] = useState(false);
  const [isRefreshingMuas, setIsRefreshingMuas] = useState(false);

  const [studios, setStudios] = useState<AgencyPublicProfile[]>([]);
  const [isLoadingStudios, setIsLoadingStudios] = useState(false);
  const [isRefreshingStudios, setIsRefreshingStudios] = useState(false);

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
    resetFilters,
  } = useExploreStore();

  const [headerHeight, setHeaderHeight] = useState(64);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [tempRadius, setTempRadius] = useState<number | null>(selectedRadiusKm);
  const [tempMinPrice, setTempMinPrice] = useState(minPrice);
  const [tempMaxPrice, setTempMaxPrice] = useState(maxPrice);

  const fetchMuas = async () => {
    try {
      setIsLoadingMuas(true);
      const data = await muaProfileService.getPublicMuas({
        categoryId: selectedCategoryId && selectedCategoryId > 0 ? selectedCategoryId : undefined,
        limit: 50,
      });
      setMuaList(data);
    } catch (e) {
      console.warn('Failed to load public MUAs:', e);
    } finally {
      setIsLoadingMuas(false);
      setIsRefreshingMuas(false);
    }
  };

  const fetchStudios = async () => {
    try {
      setIsLoadingStudios(true);
      const data = await agencyService.getPublicAgencies(50);
      setStudios(data);
    } catch (e) {
      console.warn('Failed to load studios:', e);
    } finally {
      setIsLoadingStudios(false);
      setIsRefreshingStudios(false);
    }
  };

  useEffect(() => {
    initExplore();
    fetchStudios();
  }, [initExplore]);

  useEffect(() => {
    fetchMuas();
  }, [selectedCategoryId, selectedStyleId, selectedRadiusKm, keyword]);

  useFocusEffect(
    React.useCallback(() => {
      fetchMuas();
      fetchStudios();
    }, [selectedCategoryId, selectedStyleId, selectedRadiusKm, keyword])
  );

  useEffect(() => {
    if (params.search && params.search.length > 0) {
      setKeyword(params.search);
    }
    if (params.tab === 'STUDIO') {
      setProviderTab('STUDIO');
    }
  }, [params.search, params.tab]);

  const handleSearchSubmit = () => {
    setIsSearchFocused(false);
    if (providerTab === 'FREELANCE') {
      fetchMuas();
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

  const handleApplyFilters = () => {
    setSelectedRadius(tempRadius);
    setPriceRange(tempMinPrice, tempMaxPrice);
    setIsFilterModalVisible(false);
  };

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
        key={mua.muaId}
        style={styles.muaCard}
        onPress={() => {
          router.push({
            pathname: '/mua-detail/[id]',
            params: { id: mua.muaId.toString() },
          });
        }}
        activeOpacity={0.88}
      >
        {/* Avatar + Info */}
        <View style={styles.muaCardTop}>
          {mua.avatarUrl ? (
            <Image source={{ uri: mua.avatarUrl }} style={styles.muaAvatar} />
          ) : (
            <View style={[styles.muaAvatar, styles.muaAvatarFallback]}>
              <Text style={styles.muaAvatarInitial}>
                {mua.fullName ? mua.fullName.charAt(0).toUpperCase() : 'M'}
              </Text>
            </View>
          )}
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
                  ({mua.totalCompletedJobs != null && mua.totalCompletedJobs > 0 ? `${mua.totalCompletedJobs} ca` : 'Mới'})
                </Text>
              </View>
              {dist != null ? (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <View style={styles.distBox}>
                    <Ionicons name="navigate-outline" size={12} color={BrandColors.slateMuted} />
                    <Text style={styles.distText}>{dist < 0.1 ? '< 100m' : `${dist} km`}</Text>
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
                    <Text style={[styles.distText, { color: '#2563EB' }]}>Nhận {mua.maxServiceRadiusKm}km</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Badges tags: Phân loại rõ ràng THỢ TỰ DO */}
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
          {mua.styles?.slice(0, 1).map((s) => (
            <View key={`style-${s.id || s.styleId}`} style={styles.badgeItem}>
              <Text style={styles.badgeItemText}>{s.styleName}</Text>
            </View>
          ))}
        </View>

        {/* Bottom Price & Action */}
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

  const filteredMuas = muaList.filter((m) => {
    if (selectedStyleId && selectedStyleId > 0) {
      const hasStyle = m.styles?.some((s) => (s.id || s.styleId) === selectedStyleId);
      if (!hasStyle) return false;
    }
    if (selectedRadiusKm && latitude && longitude && m.baseAddressLat && m.baseAddressLng) {
      const d = getDistanceKm(latitude, longitude, m.baseAddressLat, m.baseAddressLng);
      if (d != null && d > selectedRadiusKm) return false;
    }
    if (m.maxServiceRadiusKm != null && latitude && longitude && m.baseAddressLat && m.baseAddressLng) {
      const d = getDistanceKm(latitude, longitude, m.baseAddressLat, m.baseAddressLng);
      if (d != null && d > m.maxServiceRadiusKm) return false;
    }
    if (keyword.trim()) {
      const q = keyword.toLowerCase().trim();
      const matchName = m.fullName ? m.fullName.toLowerCase().includes(q) : false;
      const matchBio = m.bio ? m.bio.toLowerCase().includes(q) : false;
      const matchStyle = m.styles?.some((s: any) => {
        const styleName = s?.styleName || s?.name || s?.style_name || (typeof s === 'string' ? s : '');
        return styleName ? String(styleName).toLowerCase().includes(q) : false;
      });
      if (!matchName && !matchBio && !matchStyle) return false;
    }
    return true;
  });

  const filteredStudios = studios.filter((s) => {
    if (!keyword.trim()) return true;
    const q = keyword.toLowerCase().trim();
    return (
      (s.agencyName ? s.agencyName.toLowerCase().includes(q) : false) ||
      (s.addressStreet ? s.addressStreet.toLowerCase().includes(q) : false) ||
      (s.district ? s.district.toLowerCase().includes(q) : false) ||
      (s.city ? s.city.toLowerCase().includes(q) : false)
    );
  });

  const renderStudioItem = ({ item }: { item: AgencyPublicProfile }) => {
    const dist = getDistanceKm(latitude, longitude, item.latitude, item.longitude);
    const fullAddress = [item.addressStreet, item.district, item.city].filter(Boolean).join(', ');

    return (
      <View style={styles.studioCard}>
        <View style={styles.studioCardTop}>
          {item.logoUrl ? (
            <Image source={{ uri: item.logoUrl }} style={styles.studioLogo} />
          ) : (
            <View style={styles.studioLogoFallback}>
              <Ionicons name="business" size={24} color={BrandColors.primary} />
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
                    <Ionicons name="navigate-outline" size={12} color={BrandColors.slateMuted} />
                    <Text style={styles.distText}>{dist} km</Text>
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

          <TouchableOpacity
            style={styles.exploreStudioBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setProviderTab('FREELANCE');
              setKeyword(item.agencyName);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.exploreStudioBtnText}>Xem Dịch Vụ</Text>
            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* HEADER TÌM KIẾM */}
      <View
        style={styles.header}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
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
              }}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* KHI ĐANG FOCUS TÌM KIẾM: HIỆN NÚT HỦY RÕ RÀNG / KHI KHÔNG FOCUS: HIỆN NÚT BỘ LỌC */}
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
        )}
      </View>

      {/* OVERLAY GỢI Ý KHI NHẤN VÀO TÌM KIẾM (5 LOẠI HÌNH MAKEUP CHUẨN DB + PHONG CÁCH) */}
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

      {/* THANH CHUYỂN ĐỔI: THỢ MUA TỰ DO vs STUDIO & VIỆN ÁO CƯỚI */}
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

      {/* NỘI DUNG THEO TAB ĐƯỢC CHỌN */}
      {providerTab === 'FREELANCE' ? (
        <>
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

          {/* DANH SÁCH CHUYÊN VIÊN TRANG ĐIỂM TỰ DO (DỮ LIỆU THỰC TẾ BACKEND) */}
          {isLoadingMuas && muaList.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
              <Text style={styles.loadingText}>Đang tải danh sách chuyên viên make-up tự do...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredMuas}
              keyExtractor={(item) => `mua-${item.muaId}`}
              renderItem={renderMuaItem}
              contentContainerStyle={styles.muaListContent}
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
                    Thử thay đổi danh mục hoặc nới rộng bán kính tìm kiếm GPS của bạn.
                  </Text>
                  <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                    <Text style={styles.resetBtnText}>Đặt lại bộ lọc</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </>
      ) : (
        /* TAB 2: STUDIO & VIỆN ÁO CƯỚI */
        isLoadingStudios && studios.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách Studio & Viện Áo Cưới...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredStudios}
            keyExtractor={(item) => `agency-${item.id}`}
            renderItem={renderStudioItem}
            contentContainerStyle={styles.studioListContent}
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
                  Thử tìm kiếm theo tên khác hoặc kiểm tra lại kết nối mạng.
                </Text>
              </View>
            }
          />
        )
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
                  setTempRadius(null);
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
    backgroundColor: '#FFFFFF',
    zIndex: 100,
    elevation: 6,
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
  segmentSwitchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
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
  studioListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
    gap: 12,
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
    gap: 4,
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
  muaListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
    gap: 14,
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
  reviewsCount: {
    fontSize: 11,
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
});
