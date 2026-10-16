import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { reviewService, ReviewItem } from '@/services/review.service';
import { BrandColors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const REVIEW_PHOTO_SIZE = Math.floor((SCREEN_WIDTH - 28 - 8) / 2);

type FilterType = 'ALL' | 'WITH_IMAGES' | 5 | 4 | 3 | 2 | 1;

export default function StudioReviewsScreen() {
  const params = useLocalSearchParams();
  const studioId = Number(params.id);
  const studioName = (params.studioName as string | undefined) || 'Studio & Viện Cưới';

  // State đánh giá & phân trang
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [allFetchedReviews, setAllFetchedReviews] = useState<ReviewItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Bộ lọc
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Modals dropdown & Lightbox
  const [isStarModalVisible, setIsStarModalVisible] = useState(false);
  const [isServiceModalVisible, setIsServiceModalVisible] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Tải danh sách đánh giá từ API
  const fetchReviews = useCallback(
    async (pageIndex: number, isAppend = false) => {
      if (!studioId) return;
      try {
        if (!isAppend) setIsLoadingList(true);
        else setIsLoadingMore(true);

        const res = await reviewService.getReviewsForAgency(studioId, pageIndex, 10);
        if (res) {
          const list = res.content || [];
          if (isAppend) {
            setAllFetchedReviews((prev) => [...prev, ...list]);
          } else {
            setAllFetchedReviews(list);
          }
          setPage(res.number ?? pageIndex);
          setTotalPages(res.totalPages || 0);
          setTotalElements(res.totalElements || list.length);
        }
      } catch (err) {
        console.warn('[StudioReviewsScreen] Lỗi tải đánh giá studio:', err);
      } finally {
        setIsLoadingList(false);
        setIsLoadingMore(false);
      }
    },
    [studioId]
  );

  useEffect(() => {
    fetchReviews(0);
  }, [fetchReviews]);

  // Pull to refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReviews(0);
    setRefreshing(false);
  };

  // Tải trang tiếp theo
  const handleLoadMore = () => {
    if (isLoadingMore || isLoadingList) return;
    if (page + 1 < totalPages) {
      fetchReviews(page + 1, true);
    }
  };

  // Tính toán tổng hợp điểm số & bộ lọc
  const summary = useMemo(() => {
    const total = totalElements || allFetchedReviews.length;
    const countWithImages = allFetchedReviews.filter((r) => r.imageUrls && r.imageUrls.length > 0).length;
    const avg =
      allFetchedReviews.length > 0
        ? allFetchedReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / allFetchedReviews.length
        : 5.0;

    // Danh sách các dịch vụ xuất hiện trong đánh giá
    const serviceSet = new Set<string>();
    allFetchedReviews.forEach((r) => {
      const name = r.packageName || r.categoryName || r.styleName;
      if (name) serviceSet.add(name);
    });

    return {
      total,
      countWithImages,
      ratingAvg: avg,
      services: Array.from(serviceSet),
    };
  }, [allFetchedReviews, totalElements]);

  // Lọc danh sách review hiển thị theo bộ lọc đang chọn
  const filteredReviews = useMemo(() => {
    return allFetchedReviews.filter((rev) => {
      if (selectedFilter === 'WITH_IMAGES') {
        if (!rev.imageUrls || rev.imageUrls.length === 0) return false;
      } else if (typeof selectedFilter === 'number') {
        if (rev.rating !== selectedFilter) return false;
      }

      if (selectedService !== null) {
        const revService = rev.packageName || rev.categoryName || rev.styleName;
        if (revService !== selectedService) return false;
      }

      return true;
    });
  }, [allFetchedReviews, selectedFilter, selectedService]);

  // Chọn sao từ dropdown
  const handleSelectStarRating = (star: number | null) => {
    Haptics.selectionAsync();
    setIsStarModalVisible(false);
    setSelectedFilter(star === null ? 'ALL' : (star as FilterType));
  };

  // Chọn dịch vụ từ dropdown
  const handleSelectService = (srv: string | null) => {
    Haptics.selectionAsync();
    setIsServiceModalVisible(false);
    setSelectedService(srv);
  };

  const renderStars = (rating: number, size = 13) => {
    return (
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Ionicons
            key={s}
            name={s <= rating ? 'star' : 'star-outline'}
            size={size}
            color={s <= rating ? BrandColors.warning : '#E2E8F0'}
          />
        ))}
      </View>
    );
  };

  const maskCustomerName = (name?: string) => {
    if (!name) return 'Khách hàng';
    const trimmed = name.trim();
    if (trimmed.length <= 2) return trimmed.charAt(0) + '***';
    const first = trimmed.charAt(0);
    const last = trimmed.charAt(trimmed.length - 1);
    return `${first}***${last}`;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${mins}`;
    } catch {
      return '';
    }
  };

  const ratingScore = summary.ratingAvg.toFixed(1);
  const isStarActive = typeof selectedFilter === 'number';
  const isServiceActive = selectedService !== null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* 1. TOP BAR CHUẨN ĐỒNG BỘ ỨNG DỤNG */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={BrandColors.slateHeading} />
        </TouchableOpacity>

        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle} numberOfLines={1}>
            Đánh Giá Dịch Vụ
          </Text>
          <Text style={styles.navSubtitle} numberOfLines={1}>
            {studioName}
          </Text>
        </View>

        <View style={{ width: 28 }} />
      </View>

      {/* 2. MAIN REVIEWS FEED (CHUẨN ẢNH 2 NHƯ TRANG MUA) */}
      <FlatList
        data={filteredReviews}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[BrandColors.primary]} />
        }
        ListHeaderComponent={
          <>
            {/* 2.1. OVERVIEW RATING SCORE BANNER */}
            <View style={styles.scoreOverviewCard}>
              <View style={styles.scoreLeft}>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreBig}>{ratingScore}</Text>
                  <Text style={styles.scoreMax}>/5</Text>
                </View>
                <View style={styles.starsRow}>
                  {renderStars(Math.round(summary.ratingAvg), 15)}
                </View>
              </View>

              <View style={styles.scoreDivider} />

              <View style={styles.scoreRight}>
                <View style={styles.satisfactionRow}>
                  <Ionicons name="business" size={14} color="#2563EB" />
                  <Text style={[styles.satisfactionText, { color: '#2563EB' }]}>
                    Cơ sở Studio Tiêu Chuẩn
                  </Text>
                </View>
                <Text style={styles.totalReviewsSub}>
                  <Text style={styles.totalBold}>{summary.total}</Text> lượt đánh giá được xác thực
                </Text>
              </View>
            </View>

            {/* 2.2. BỘ LỌC ĐÁNH GIÁ 4 NÚT TRÊN 1 HÀNG (FLEX: 1 CÂN ĐỐI TẤT CẢ MÀN HÌNH) */}
            <View style={styles.filterSection}>
              <View style={styles.filterRowFour}>
                {/* 1. Chip: Tất cả */}
                <TouchableOpacity
                  style={[
                    styles.shopeeFilterChipFour,
                    selectedFilter === 'ALL' && !isServiceActive && styles.shopeeFilterChipActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedFilter('ALL');
                    setSelectedService(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipMainText,
                      selectedFilter === 'ALL' && !isServiceActive && styles.chipMainTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    Tất cả
                  </Text>
                  <Text
                    style={[
                      styles.chipCountSub,
                      selectedFilter === 'ALL' && !isServiceActive && styles.chipCountSubActive,
                    ]}
                    numberOfLines={1}
                  >
                    ({summary.total})
                  </Text>
                </TouchableOpacity>

                {/* 2. Chip: Có ảnh */}
                <TouchableOpacity
                  style={[
                    styles.shopeeFilterChipFour,
                    selectedFilter === 'WITH_IMAGES' && styles.shopeeFilterChipActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedFilter('WITH_IMAGES');
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipMainText,
                      selectedFilter === 'WITH_IMAGES' && styles.chipMainTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    Có ảnh
                  </Text>
                  <Text
                    style={[
                      styles.chipCountSub,
                      selectedFilter === 'WITH_IMAGES' && styles.chipCountSubActive,
                    ]}
                    numberOfLines={1}
                  >
                    ({summary.countWithImages})
                  </Text>
                </TouchableOpacity>

                {/* 3. Dropdown Chip: Sao ★ ˅ */}
                <TouchableOpacity
                  style={[
                    styles.shopeeFilterChipFour,
                    isStarActive && styles.shopeeFilterChipActive,
                  ]}
                  onPress={() => setIsStarModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text
                      style={[
                        styles.chipMainText,
                        isStarActive && styles.chipMainTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {isStarActive ? `${selectedFilter}★` : 'Sao'}
                    </Text>
                    {!isStarActive && (
                      <Ionicons name="star" size={10} color={BrandColors.warning} />
                    )}
                    <Ionicons
                      name="chevron-down"
                      size={10}
                      color={isStarActive ? BrandColors.primary : '#64748B'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.chipCountSub,
                      isStarActive && styles.chipCountSubActive,
                    ]}
                    numberOfLines={1}
                  >
                    {isStarActive ? 'Đã chọn' : '(Tất cả)'}
                  </Text>
                </TouchableOpacity>

                {/* 4. Dropdown Chip: Dịch vụ ˅ */}
                <TouchableOpacity
                  style={[
                    styles.shopeeFilterChipFour,
                    isServiceActive && styles.shopeeFilterChipActive,
                  ]}
                  onPress={() => setIsServiceModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text
                      style={[
                        styles.chipMainText,
                        isServiceActive && styles.chipMainTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      Dịch vụ
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={10}
                      color={isServiceActive ? BrandColors.primary : '#64748B'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.chipCountSub,
                      isServiceActive && styles.chipCountSubActive,
                    ]}
                    numberOfLines={1}
                  >
                    {isServiceActive ? 'Đã lọc' : '(Tất cả)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tag phân loại đang lọc (hiển thị trọn vẹn tên gói dịch vụ và nút hủy 1 chạm) */}
              {(isServiceActive || isStarActive) && (
                <View style={styles.activeFilterPillsRow}>
                  {isServiceActive && (
                    <View style={styles.activePill}>
                      <Ionicons name="pricetag" size={11} color={BrandColors.primary} />
                      <Text style={styles.activePillText} numberOfLines={1}>
                        {selectedService}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleSelectService(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={15} color={BrandColors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                  {isStarActive && (
                    <View style={styles.activePill}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text style={styles.activePillText}>{selectedFilter} sao</Text>
                      <TouchableOpacity
                        onPress={() => handleSelectStarRating(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={15} color={BrandColors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            {isLoadingList && (
              <View style={styles.listLoadingBox}>
                <ActivityIndicator size="small" color={BrandColors.primary} />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoadingList ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Chưa có đánh giá phù hợp</Text>
              <Text style={styles.emptySub}>
                {selectedFilter !== 'ALL' || isServiceActive
                  ? 'Không tìm thấy đánh giá với bộ lọc hiện tại. Vui lòng chọn bộ lọc khác.'
                  : 'Studio chưa nhận được đánh giá nào.'}
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.shopeeCardDivider} />}
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            {/* Review Header: Avatar, Name, Rating Stars, Date */}
            <View style={styles.reviewHeader}>
              <View style={styles.customerRow}>
                {item.customerAvatar ? (
                  <Image source={{ uri: item.customerAvatar }} style={styles.customerAvatar} contentFit="cover" />
                ) : (
                  <View style={styles.customerAvatarFallback}>
                    <Text style={styles.customerAvatarInitial}>
                      {(item.customerName || 'K').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.customerNameText}>{maskCustomerName(item.customerName)}</Text>
                  <View style={{ marginTop: 2 }}>{renderStars(item.rating || 5, 12)}</View>
                </View>
              </View>

              <Text style={styles.reviewDateText}>{formatDate(item.createdAt)}</Text>
            </View>

            {/* Service variation row (gray rounded pill) */}
            {item.packageName || item.categoryName || item.styleName ? (
              <View style={styles.variationRow}>
                <Text style={styles.variationLabel}>Dịch vụ: </Text>
                <Text style={styles.variationValue} numberOfLines={1}>
                  {item.packageName || item.categoryName || item.styleName}
                </Text>
              </View>
            ) : null}

            {/* Comment Text */}
            {item.comment ? (
              <Text style={styles.commentContentText}>{item.comment}</Text>
            ) : null}

            {/* Photo Thumbnails */}
            {item.imageUrls && item.imageUrls.length > 0 ? (
              <View style={styles.photoGrid}>
                {item.imageUrls.map((imgUrl, pIdx) => (
                  <TouchableOpacity
                    key={pIdx}
                    style={styles.reviewPhotoCard}
                    onPress={() => setLightboxImageUrl(imgUrl)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: imgUrl }} style={styles.reviewPhotoImage} contentFit="cover" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        )}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={BrandColors.primary} />
            </View>
          ) : (
            <View style={{ height: 40 }} />
          )
        }
      />

      {/* 3. MODAL DROPDOWN: CHỌN SỐ SAO */}
      <Modal
        visible={isStarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStarModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsStarModalVisible(false)}
        >
          <View style={styles.dropdownSheet}>
            <View style={styles.dropdownSheetHeader}>
              <Text style={styles.dropdownSheetTitle}>Lọc Theo Số Sao</Text>
              <TouchableOpacity onPress={() => setIsStarModalVisible(false)}>
                <Ionicons name="close" size={22} color={BrandColors.slateMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.dropdownItem, selectedFilter === 'ALL' && styles.dropdownItemActive]}
              onPress={() => handleSelectStarRating(null)}
            >
              <Text style={[styles.dropdownItemText, selectedFilter === 'ALL' && styles.dropdownItemTextActive]}>
                Tất cả ({summary.total})
              </Text>
              {selectedFilter === 'ALL' && <Ionicons name="checkmark" size={18} color={BrandColors.primary} />}
            </TouchableOpacity>

            {[5, 4, 3, 2, 1].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.dropdownItem, selectedFilter === s && styles.dropdownItemActive]}
                onPress={() => handleSelectStarRating(s)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.dropdownItemText, selectedFilter === s && styles.dropdownItemTextActive]}>
                    {s} Sao
                  </Text>
                  <View style={{ flexDirection: 'row' }}>{renderStars(s, 12)}</View>
                </View>
                {selectedFilter === s && <Ionicons name="checkmark" size={18} color={BrandColors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 4. MODAL DROPDOWN: CHỌN PHÂN LOẠI DỊCH VỤ */}
      <Modal
        visible={isServiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsServiceModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsServiceModalVisible(false)}
        >
          <View style={styles.dropdownSheet}>
            <View style={styles.dropdownSheetHeader}>
              <Text style={styles.dropdownSheetTitle}>Phân Loại Dịch Vụ</Text>
              <TouchableOpacity onPress={() => setIsServiceModalVisible(false)}>
                <Ionicons name="close" size={22} color={BrandColors.slateMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.dropdownItem, selectedService === null && styles.dropdownItemActive]}
              onPress={() => handleSelectService(null)}
            >
              <Text style={[styles.dropdownItemText, selectedService === null && styles.dropdownItemTextActive]}>
                Tất cả dịch vụ ({summary.total})
              </Text>
              {selectedService === null && <Ionicons name="checkmark" size={18} color={BrandColors.primary} />}
            </TouchableOpacity>

            {summary.services.map((srv) => {
              const isSelected = selectedService === srv;
              return (
                <TouchableOpacity
                  key={srv}
                  style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                  onPress={() => handleSelectService(srv)}
                >
                  <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                    {srv}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color={BrandColors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 5. FULLSCREEN IMAGE LIGHTBOX MODAL */}
      {lightboxImageUrl && (
        <Modal
          visible={Boolean(lightboxImageUrl)}
          transparent
          animationType="fade"
          onRequestClose={() => setLightboxImageUrl(null)}
        >
          <View style={styles.lightboxOverlay}>
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setLightboxImageUrl(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close-circle" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            <Image
              source={{ uri: lightboxImageUrl }}
              style={styles.lightboxImage}
              contentFit="contain"
            />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  navTitleContainer: {
    alignItems: 'center',
    maxWidth: '75%',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  navSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  scoreOverviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scoreLeft: {
    alignItems: 'center',
    minWidth: 90,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreBig: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
  },
  scoreMax: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginLeft: 2,
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 3,
  },
  scoreDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 14,
  },
  scoreRight: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  satisfactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  satisfactionText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  totalReviewsSub: {
    fontSize: 12,
    color: BrandColors.slateMuted,
  },
  totalBold: {
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterRowFour: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shopeeFilterChipFour: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  shopeeFilterChipActive: {
    backgroundColor: BrandColors.subtle,
    borderColor: BrandColors.primary,
  },
  chipMainText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  chipMainTextActive: {
    color: BrandColors.primary,
  },
  chipCountSub: {
    fontSize: 9.5,
    color: BrandColors.slatePlaceholder,
    marginTop: 1,
    fontWeight: '500',
  },
  chipCountSubActive: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  activeFilterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    maxWidth: '100%',
  },
  activePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
    flexShrink: 1,
  },
  listLoadingBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  emptySub: {
    fontSize: 12.5,
    color: '#94A3B8',
    textAlign: 'center',
  },
  shopeeCardDivider: {
    height: 8,
    backgroundColor: '#F8FAFC',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  customerAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarInitial: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E11D48',
  },
  customerNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  reviewDateText: {
    fontSize: 11,
    color: BrandColors.slatePlaceholder,
  },
  variationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  variationLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  variationValue: {
    flex: 1,
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  commentContentText: {
    fontSize: 13,
    color: BrandColors.slateBody,
    lineHeight: 18,
    marginTop: 6,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  reviewPhotoCard: {
    width: REVIEW_PHOTO_SIZE,
    height: REVIEW_PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  reviewPhotoImage: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  dropdownSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    maxHeight: '60%',
  },
  dropdownSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 6,
  },
  dropdownSheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.slateHeading,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownItemActive: {
    backgroundColor: '#FFF1F2',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.slateBody,
  },
  dropdownItemTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
  },
  lightboxImage: {
    width: '94%',
    height: '80%',
  },
});
