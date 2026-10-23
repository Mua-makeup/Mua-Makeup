import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { reviewService, ReviewItem, MuaRatingSummary } from '@/services/review.service';
import { BrandColors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const REVIEW_PHOTO_SIZE = Math.floor((SCREEN_WIDTH - 28 - 8) / 2);

type FilterType = 'ALL' | 'WITH_IMAGES' | 5 | 4 | 3 | 2 | 1;

export default function MuaReviewsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const muaId = Number(params.id);
  const muaName = (params.muaName as string | undefined) || 'Chuyên viên Make-up';

  // Summary State
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summary, setSummary] = useState<MuaRatingSummary | null>(null);

  // Filters State
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Tất cả');

  // Modals for Shopee-style Dropdowns
  const [isStarModalVisible, setIsStarModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  // Image Lightbox Viewer Modal
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Expanded Comment Map (for 'Xem thêm / Thu gọn')
  const [expandedCommentIds, setExpandedCommentIds] = useState<Record<number, boolean>>({});


  // Reviews List State
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Tải Summary đánh giá
  const loadSummary = useCallback(async () => {
    if (!muaId) return;
    try {
      setIsLoadingSummary(true);
      const res = await reviewService.getMuaRatingSummary(muaId);
      setSummary(res);
    } catch {
      // ignore
    } finally {
      setIsLoadingSummary(false);
    }
  }, [muaId]);

  // 2. Tải Danh sách Review theo Filter & Page
  const loadReviews = useCallback(
    async (pageIndex: number, filter: FilterType, catId: number | null, isAppend = false) => {
      if (!muaId) return;
      try {
        if (!isAppend) setIsLoadingList(true);
        else setIsLoadingMore(true);

        const filterPayload: {
          rating?: number;
          hasImages?: boolean;
          categoryId?: number;
          page: number;
          size: number;
        } = {
          page: pageIndex,
          size: 10,
        };

        if (typeof filter === 'number') {
          filterPayload.rating = filter;
        } else if (filter === 'WITH_IMAGES') {
          filterPayload.hasImages = true;
        }

        if (catId != null) {
          filterPayload.categoryId = catId;
        }

        const res = await reviewService.getReviewsForMua(muaId, filterPayload);
        if (res) {
          if (isAppend) {
            setReviews((prev) => [...prev, ...(res.content || [])]);
          } else {
            setReviews(res.content || []);
          }
          setPage(res.number ?? pageIndex);
          setTotalPages(res.totalPages || 0);
          setTotalElements(res.totalElements || 0);
        }
      } catch {
        // ignore
      } finally {
        setIsLoadingList(false);
        setIsLoadingMore(false);
      }
    },
    [muaId]
  );

  useEffect(() => {
    loadSummary();
    loadReviews(0, 'ALL', null);
  }, [loadSummary, loadReviews]);

  // Pull to refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSummary(), loadReviews(0, selectedFilter, selectedCategoryId)]);
    setRefreshing(false);
  };

  // Pagination Load More
  const handleLoadMore = () => {
    if (isLoadingMore || isLoadingList) return;
    if (page + 1 < totalPages) {
      loadReviews(page + 1, selectedFilter, selectedCategoryId, true);
    }
  };

  // Select Filter: Tất cả hoặc Có hình ảnh
  const handleSelectQuickFilter = (filter: 'ALL' | 'WITH_IMAGES') => {
    Haptics.selectionAsync();
    setSelectedFilter(filter);
    loadReviews(0, filter, selectedCategoryId);
  };

  // Select Star Rating from Dropdown
  const handleSelectStarRating = (star: number | null) => {
    Haptics.selectionAsync();
    setIsStarModalVisible(false);
    const newFilter: FilterType = star === null ? 'ALL' : (star as FilterType);
    setSelectedFilter(newFilter);
    loadReviews(0, newFilter, selectedCategoryId);
  };

  // Select Category Classification from Dropdown
  const handleSelectCategory = (catId: number | null, catName: string) => {
    Haptics.selectionAsync();
    setIsCategoryModalVisible(false);
    setSelectedCategoryId(catId);
    setSelectedCategoryName(catName);
    loadReviews(0, selectedFilter, catId);
  };

  // Toggle Tag Filter
  const handleToggleTag = (tag: string) => {
    Haptics.selectionAsync();
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
    }
  };


  // Toggle Read More Comment
  const toggleExpandComment = (reviewId: number) => {
    setExpandedCommentIds((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  // Mask Customer Name (Shopee style: t***3 or N***h)
  const maskCustomerName = (name?: string) => {
    if (!name) return 'Khách hàng';
    const trimmed = name.trim();
    if (trimmed.length <= 2) return trimmed.charAt(0) + '***';
    const first = trimmed.charAt(0);
    const last = trimmed.charAt(trimmed.length - 1);
    return `${first}***${last}`;
  };

  // Format Date (DD/MM/YYYY HH:mm)
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

  // Render Star Icons
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


  const ratingScore = summary?.ratingAvg != null ? summary.ratingAvg.toFixed(1) : '5.0';
  const hasReviews = (summary?.totalReviews || 0) > 0;
  const isStarActive = typeof selectedFilter === 'number';
  const isCategoryActive = selectedCategoryId !== null;

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
            {muaName}
          </Text>
        </View>

        <View style={{ width: 28 }} />
      </View>

      {/* 2. MAIN REVIEWS FEED (SHOPEE-STYLE FILTER & CATEGORY) */}
      <FlatList
        data={reviews}
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
                  {renderStars(Math.round(summary?.ratingAvg || 5), 15)}
                </View>
              </View>

              <View style={styles.scoreDivider} />

              <View style={styles.scoreRight}>
                <View style={styles.satisfactionRow}>
                  <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
                  <Text style={styles.satisfactionText}>
                    {summary?.badgeTier === 'GOLD_TOP_PRO'
                      ? 'Chuyên viên Hạng Vàng'
                      : summary?.badgeTier === 'SILVER'
                      ? 'Chuyên viên Hạng Bạc'
                      : 'Chuyên viên Tiêu Chuẩn'}
                  </Text>
                </View>
                <Text style={styles.totalReviewsSub}>
                  <Text style={styles.totalBold}>{summary?.totalCompletedJobs || 0}</Text> ca hoàn tất • <Text style={styles.totalBold}>{summary?.totalReviews || 0}</Text> lượt đánh giá
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
                    selectedFilter === 'ALL' && !isCategoryActive && styles.shopeeFilterChipActive,
                  ]}
                  onPress={() => handleSelectQuickFilter('ALL')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipMainText,
                      selectedFilter === 'ALL' && !isCategoryActive && styles.chipMainTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    Tất cả
                  </Text>
                  <Text
                    style={[
                      styles.chipCountSub,
                      selectedFilter === 'ALL' && !isCategoryActive && styles.chipCountSubActive,
                    ]}
                    numberOfLines={1}
                  >
                    ({summary?.totalReviews || 0})
                  </Text>
                </TouchableOpacity>

                {/* 2. Chip: Có ảnh */}
                <TouchableOpacity
                  style={[
                    styles.shopeeFilterChipFour,
                    selectedFilter === 'WITH_IMAGES' && styles.shopeeFilterChipActive,
                  ]}
                  onPress={() => handleSelectQuickFilter('WITH_IMAGES')}
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
                    ({summary?.countWithImages || 0})
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
                    isCategoryActive && styles.shopeeFilterChipActive,
                  ]}
                  onPress={() => setIsCategoryModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text
                      style={[
                        styles.chipMainText,
                        isCategoryActive && styles.chipMainTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      Dịch vụ
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={10}
                      color={isCategoryActive ? BrandColors.primary : '#64748B'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.chipCountSub,
                      isCategoryActive && styles.chipCountSubActive,
                    ]}
                    numberOfLines={1}
                  >
                    {isCategoryActive ? 'Đã lọc' : '(Tất cả)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tag phân loại đang lọc (hiển thị trọn vẹn tên gói dịch vụ và nút hủy 1 chạm) */}
              {(isCategoryActive || isStarActive) && (
                <View style={styles.activeFilterPillsRow}>
                  {isCategoryActive && (
                    <View style={styles.activePill}>
                      <Ionicons name="pricetag" size={11} color={BrandColors.primary} />
                      <Text style={styles.activePillText} numberOfLines={1}>
                        {selectedCategoryName}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleSelectCategory(null, 'Tất cả')}
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


            {/* Loading Indicator for Filter Switching */}
            {isLoadingList && (
              <View style={styles.listLoadingBox}>
                <ActivityIndicator size="small" color={BrandColors.primary} />
                <Text style={styles.listLoadingText}>Đang tải đánh giá phù hợp...</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => {
          const isExpanded = !!expandedCommentIds[item.id];
          const comment = item.comment || '';
          const isLongComment = comment.length > 140;

          return (
            <View style={styles.reviewCard}>
              {/* Reviewer Header: Avatar + Name + Stars on Left | Date on Right */}
              <View style={styles.reviewHeader}>
                <View style={styles.customerRow}>
                  {item.customerAvatar ? (
                    <Image source={{ uri: item.customerAvatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={18} color="#94A3B8" />
                    </View>
                  )}
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.customerName}>
                      {maskCustomerName(item.customerName)}
                    </Text>
                    {/* Stars */}
                    <View style={styles.starsRowCompact}>
                      {renderStars(item.rating, 12)}
                    </View>
                  </View>
                </View>

                {/* Review Date on Top Right (chuẩn Image 4) */}
                <Text style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
              </View>

              {/* Tên dịch vụ dạng badge xám bo góc (Chỉ hiện tên dịch vụ theo yêu cầu) */}
              {(item.packageName || item.categoryName || item.styleName) ? (
                <View style={styles.variationRow}>
                  <Text style={styles.variationLabel}>Dịch vụ: </Text>
                  <Text style={styles.variationValue} numberOfLines={1}>
                    {item.packageName || item.categoryName || item.styleName}
                  </Text>
                </View>
              ) : null}

              {/* Review Comment Text */}
              {comment ? (
                <View style={styles.commentContainer}>
                  <Text
                    style={styles.commentText}
                    numberOfLines={!isExpanded && isLongComment ? 3 : undefined}
                  >
                    {comment}
                  </Text>
                  {isLongComment && (
                    <TouchableOpacity
                      onPress={() => toggleExpandComment(item.id)}
                      style={styles.expandCommentBtn}
                    >
                      <Text style={styles.expandCommentText}>
                        {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={styles.commentEmpty}>Khách hàng không để lại nhận xét bằng chữ.</Text>
              )}

              {/* Attached Review Photos (Bố cục 1 hàng gồm 2 ảnh, có +N ở ảnh thứ 2 nếu nhiều hơn) */}
              {(() => {
                const uniqueImages = Array.from(new Set(item.imageUrls || []));
                if (uniqueImages.length === 0) return null;

                const hasMore = uniqueImages.length > 2;
                const displayImages = uniqueImages.slice(0, 2);
                const extraCount = uniqueImages.length - 2;

                return (
                  <View style={styles.reviewPhotosRow}>
                    {displayImages.map((url, idx) => {
                      const isSecondWithMore = idx === 1 && hasMore;
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={displayImages.length === 1 ? styles.reviewPhotoCardSingle : styles.reviewPhotoCard}
                          onPress={() => {
                            setLightboxImages(uniqueImages);
                            setLightboxIndex(idx);
                          }}
                          activeOpacity={0.88}
                        >
                          <Image source={{ uri: url }} style={styles.reviewPhotoImage} contentFit="cover" />

                          {/* Lớp phủ +N nếu có nhiều hơn 2 ảnh */}
                          {isSecondWithMore && (
                            <View style={styles.reviewPhotoMoreOverlay}>
                              <Text style={styles.reviewPhotoMoreText}>+{extraCount}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })()}

              {/* Phản hồi từ Studio */}
              {item.agencyReply ? (
                <View style={styles.agencyReplyBox}>
                  <View style={styles.agencyReplyHeaderRow}>
                    <Text style={styles.agencyReplyTitle}>Phản hồi từ Studio</Text>
                    {item.agencyRepliedAt ? (
                      <Text style={styles.agencyReplyDate}>{formatDate(item.agencyRepliedAt)}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.agencyReplyContent}>{item.agencyReply}</Text>
                </View>
              ) : null}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.shopeeCardDivider} />}
        ListEmptyComponent={
          !isLoadingList ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Chưa có đánh giá nào</Text>
              <Text style={styles.emptyDesc}>
                {selectedFilter === 'ALL' && selectedCategoryId === null
                  ? 'Chuyên viên chưa có bài đánh giá nào từ khách hàng.'
                  : 'Không tìm thấy đánh giá phù hợp với bộ lọc hiện tại.'}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadMoreBox}>
              <ActivityIndicator size="small" color={BrandColors.primary} />
              <Text style={styles.loadMoreText}>Đang tải thêm đánh giá...</Text>
            </View>
          ) : (
            <View style={{ height: 32 }} />
          )
        }
      />

      {/* 4. MODAL DROPDOWN: CHỌN SỐ SAO (CHUẨN SHOPEE) */}
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
              style={[
                styles.dropdownItem,
                selectedFilter === 'ALL' && styles.dropdownItemActive,
              ]}
              onPress={() => handleSelectStarRating(null)}
            >
              <Text style={[styles.dropdownItemText, selectedFilter === 'ALL' && styles.dropdownItemTextActive]}>
                Tất cả các sao ({summary?.totalReviews || 0})
              </Text>
              {selectedFilter === 'ALL' && <Ionicons name="checkmark" size={18} color={BrandColors.primary} />}
            </TouchableOpacity>

            {[5, 4, 3, 2, 1].map((s) => {
              const count =
                s === 5
                  ? summary?.count5Star || 0
                  : s === 4
                  ? summary?.count4Star || 0
                  : s === 3
                  ? summary?.count3Star || 0
                  : s === 2
                  ? summary?.count2Star || 0
                  : summary?.count1Star || 0;
              const isSelected = selectedFilter === s;

              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                  onPress={() => handleSelectStarRating(s)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                      {s} Sao
                    </Text>
                    {renderStars(s, 14)}
                    <Text style={styles.dropdownItemCount}>({count})</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={18} color={BrandColors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 5. MODAL DROPDOWN: PHÂN LOẠI DỊCH VỤ (CHUẨN SHOPEE) */}
      <Modal
        visible={isCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsCategoryModalVisible(false)}
        >
          <View style={styles.dropdownSheet}>
            <View style={styles.dropdownSheetHeader}>
              <Text style={styles.dropdownSheetTitle}>Phân Loại Dịch Vụ</Text>
              <TouchableOpacity onPress={() => setIsCategoryModalVisible(false)}>
                <Ionicons name="close" size={22} color={BrandColors.slateMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.dropdownItem,
                selectedCategoryId === null && styles.dropdownItemActive,
              ]}
              onPress={() => handleSelectCategory(null, 'Tất cả')}
            >
              <Text style={[styles.dropdownItemText, selectedCategoryId === null && styles.dropdownItemTextActive]}>
                Tất cả dịch vụ ({summary?.totalReviews || 0})
              </Text>
              {selectedCategoryId === null && <Ionicons name="checkmark" size={18} color={BrandColors.primary} />}
            </TouchableOpacity>

            {summary?.categoryBreakdown?.map((cat) => {
              const isSelected = selectedCategoryId === cat.categoryId;
              return (
                <TouchableOpacity
                  key={cat.categoryId}
                  style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                  onPress={() => handleSelectCategory(cat.categoryId, cat.categoryName)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                      {cat.categoryName}
                    </Text>
                    <Text style={styles.dropdownItemCount}>({cat.count})</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={18} color={BrandColors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 6. FULLSCREEN IMAGE LIGHTBOX MODAL */}
      <Modal
        visible={lightboxImages.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxImages([])}
      >
        <View style={styles.lightboxOverlay}>
          {/* Header với nút đóng và số trang */}
          <SafeAreaView style={styles.lightboxHeader}>
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setLightboxImages([])}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {lightboxImages.length > 1 && (
              <View style={styles.lightboxCounterBadge}>
                <Text style={styles.lightboxCounterText}>
                  Ảnh {lightboxIndex + 1} / {lightboxImages.length}
                </Text>
              </View>
            )}

            <View style={{ width: 40 }} />
          </SafeAreaView>

          {/* Vùng xem ảnh kèm 2 mũi tên điều hướng < > */}
          <View style={styles.lightboxViewerArea}>
            {lightboxImages[lightboxIndex] && (
              <Image
                source={{ uri: lightboxImages[lightboxIndex] }}
                style={styles.lightboxImage}
                contentFit="contain"
              />
            )}

            {/* Mũi tên lùi < */}
            {lightboxIndex > 0 && (
              <TouchableOpacity
                style={[styles.lightboxNavBtn, styles.lightboxNavPrev]}
                onPress={() => setLightboxIndex((i) => i - 1)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Mũi tên tiến > */}
            {lightboxIndex < lightboxImages.length - 1 && (
              <TouchableOpacity
                style={[styles.lightboxNavBtn, styles.lightboxNavNext]}
                onPress={() => setLightboxIndex((i) => i + 1)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // 1. Top Bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 4,
  },
  navTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.slateHeading,
  },
  navSubtitle: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    marginTop: 1,
  },
  navRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navIconBtn: {
    padding: 4,
  },

  // 2. Rating Overview Banner
  scoreOverviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scoreLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreBig: {
    fontSize: 32,
    fontWeight: '900',
    color: BrandColors.slateHeading,
    letterSpacing: -0.5,
  },
  scoreMax: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateMuted,
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
    color: '#16A34A',
  },
  totalReviewsSub: {
    fontSize: 12,
    color: BrandColors.slateMuted,
  },
  totalBold: {
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },

  // 3. Shopee-Style Filter Row 4-in-1 (Tối ưu 100% mọi màn hình điện thoại)
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

  // 6. Review Cards
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
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  starsRowCompact: {
    marginTop: 2,
  },
  reviewHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  helpfulBtnActive: {
    borderColor: BrandColors.primary,
    backgroundColor: BrandColors.subtle,
  },
  helpfulText: {
    fontSize: 11,
    color: BrandColors.slateMuted,
    fontWeight: '600',
  },
  helpfulTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  moreOptionsBtn: {
    padding: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: BrandColors.slatePlaceholder,
  },
  variationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
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
  commentContainer: {
    marginTop: 8,
  },
  commentText: {
    fontSize: 13,
    color: BrandColors.slateHeading,
    lineHeight: 19,
  },
  expandCommentBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  expandCommentText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.slateMuted,
  },
  commentEmpty: {
    fontSize: 12,
    fontStyle: 'italic',
    color: BrandColors.slatePlaceholder,
    marginTop: 6,
  },
  reviewPhotosRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    width: '100%',
  },
  reviewPhotoCard: {
    flex: 1,
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  reviewPhotoCardSingle: {
    width: '48%',
    maxWidth: '48%',
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  reviewPhotoImage: {
    width: '100%',
    height: '100%',
  },
  reviewPhotoMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  agencyReplyBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFF1F2',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E11D48',
  },
  agencyReplyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  agencyReplyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9F1239',
  },
  agencyReplyDate: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginLeft: 'auto',
  },
  agencyReplyContent: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  reviewPhotoMoreText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // 8. Dropdown BottomSheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  dropdownSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
    paddingTop: 14,
  },
  dropdownSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.slateHeading,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownItemActive: {
    backgroundColor: BrandColors.subtle,
  },
  dropdownItemText: {
    fontSize: 14,
    color: BrandColors.slateHeading,
    fontWeight: '600',
  },
  dropdownItemTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  dropdownItemCount: {
    fontSize: 13,
    color: BrandColors.slateMuted,
  },

  // 9. Lightbox Overlay
  lightboxOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 10,
  },
  lightboxCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCounterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  lightboxCounterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  lightboxViewerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lightboxNavBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  lightboxNavPrev: {
    left: 12,
  },
  lightboxNavNext: {
    right: 12,
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },

  // Helpers
  listLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  listLoadingText: {
    fontSize: 12,
    color: BrandColors.slateMuted,
  },
  loadMoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  loadMoreText: {
    fontSize: 12,
    color: BrandColors.slateMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.slateMuted,
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: BrandColors.slatePlaceholder,
    textAlign: 'center',
    marginTop: 4,
  },
});
