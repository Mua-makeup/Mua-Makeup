import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { reviewService, ReviewItem, MuaRatingSummary } from '@/services/review.service';
import { BrandColors } from '@/constants/theme';

type FilterType = 'ALL' | 'WITH_IMAGES' | 5 | 4 | 3 | 2 | 1;

export default function MuaReviewsScreen() {
  const params = useLocalSearchParams();
  const muaId = Number(params.id);
  const muaName = params.muaName as string | undefined;

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summary, setSummary] = useState<MuaRatingSummary | null>(null);

  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');
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
    async (pageIndex: number, filter: FilterType, isAppend = false) => {
      if (!muaId) return;
      try {
        if (!isAppend) setIsLoadingList(true);
        else setIsLoadingMore(true);

        const filterPayload: {
          rating?: number;
          hasImages?: boolean;
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
    loadReviews(0, 'ALL', false);
  }, [loadSummary, loadReviews]);

  const handleSelectFilter = (filter: FilterType) => {
    if (selectedFilter === filter) return;
    setSelectedFilter(filter);
    setPage(0);
    loadReviews(0, filter, false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSummary(), loadReviews(0, selectedFilter, false)]);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (isLoadingList || isLoadingMore || page + 1 >= totalPages) return;
    loadReviews(page + 1, selectedFilter, true);
  };

  const maskCustomerName = (name?: string) => {
    if (!name) return 'Khách hàng';
    const trimmed = name.trim();
    if (trimmed.length <= 2) return trimmed;
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
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color="#F59E0B"
          style={{ marginRight: 2 }}
        />
      );
    }
    return stars;
  };

  const hasReviews = summary && summary.totalReviews > 0;
  const ratingScore = summary?.ratingAvg != null ? summary.ratingAvg.toFixed(1) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. TOP NAVBAR */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle}>Đánh giá</Text>
          {muaName ? (
            <Text style={styles.navSubtitle} numberOfLines={1}>
              {muaName}
            </Text>
          ) : null}
        </View>
        <View style={{ width: 24 }} />
      </View>

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
            {/* 2. OVERVIEW SCORE CARD (Chuẩn Shopee) */}
            <View style={styles.scoreOverviewCard}>
              <View style={styles.scoreLeft}>
                {hasReviews && ratingScore ? (
                  <>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreBig}>{ratingScore}</Text>
                      <Text style={styles.scoreMax}>/5</Text>
                    </View>
                    <View style={styles.starsRow}>
                      {renderStars(Math.round(summary.ratingAvg!))}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.scoreBig}>--</Text>
                    <Text style={styles.noRatingText}>Chưa có đánh giá</Text>
                  </>
                )}
              </View>

              <View style={styles.scoreDivider} />

              <View style={styles.scoreRight}>
                <View style={styles.satisfactionRow}>
                  <Ionicons name="thumbs-up" size={15} color="#16A34A" />
                  <Text style={styles.satisfactionText}>
                    {hasReviews ? '98% khách hàng cảm thấy Hài lòng' : 'Sẵn sàng nhận ca đầu tiên'}
                  </Text>
                </View>
                <Text style={styles.totalReviewsSub}>
                  Tổng cộng: <Text style={styles.totalBold}>{summary?.totalReviews || 0}</Text> lượt đánh giá
                </Text>
              </View>
            </View>

            {/* 3. HORIZONTAL FILTER CHIPS (Chuẩn Shopee) */}
            <View style={styles.filterSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
              >
                {/* Chip: Tất cả */}
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedFilter === 'ALL' && styles.filterChipActive,
                  ]}
                  onPress={() => handleSelectFilter('ALL')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === 'ALL' && styles.filterChipTextActive,
                    ]}
                  >
                    Tất cả ({summary?.totalReviews || 0})
                  </Text>
                </TouchableOpacity>

                {/* Chip: Có hình ảnh */}
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedFilter === 'WITH_IMAGES' && styles.filterChipActive,
                  ]}
                  onPress={() => handleSelectFilter('WITH_IMAGES')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === 'WITH_IMAGES' && styles.filterChipTextActive,
                    ]}
                  >
                    Có hình ảnh ({summary?.countWithImages || 0})
                  </Text>
                </TouchableOpacity>

                {/* Chip: 5 Sao */}
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedFilter === 5 && styles.filterChipActive,
                  ]}
                  onPress={() => handleSelectFilter(5)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === 5 && styles.filterChipTextActive,
                    ]}
                  >
                    5 Sao ({summary?.count5Star || 0})
                  </Text>
                </TouchableOpacity>

                {/* Chip: 4 Sao */}
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedFilter === 4 && styles.filterChipActive,
                  ]}
                  onPress={() => handleSelectFilter(4)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === 4 && styles.filterChipTextActive,
                    ]}
                  >
                    4 Sao ({summary?.count4Star || 0})
                  </Text>
                </TouchableOpacity>

                {/* Chip: 3 Sao */}
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedFilter === 3 && styles.filterChipActive,
                  ]}
                  onPress={() => handleSelectFilter(3)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === 3 && styles.filterChipTextActive,
                    ]}
                  >
                    3 Sao ({summary?.count3Star || 0})
                  </Text>
                </TouchableOpacity>

                {/* Chip: 2 Sao */}
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedFilter === 2 && styles.filterChipActive,
                  ]}
                  onPress={() => handleSelectFilter(2)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === 2 && styles.filterChipTextActive,
                    ]}
                  >
                    2 Sao ({summary?.count2Star || 0})
                  </Text>
                </TouchableOpacity>

                {/* Chip: 1 Sao */}
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedFilter === 1 && styles.filterChipActive,
                  ]}
                  onPress={() => handleSelectFilter(1)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === 1 && styles.filterChipTextActive,
                    ]}
                  >
                    1 Sao ({summary?.count1Star || 0})
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Loading Indicator for Filter Switching */}
            {isLoadingList && (
              <View style={styles.listLoadingBox}>
                <ActivityIndicator size="small" color={BrandColors.primary} />
                <Text style={styles.listLoadingText}>Đang lọc đánh giá...</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            {/* Header: Avatar, Name, Verified Badge, Date */}
            <View style={styles.reviewHeader}>
              <View style={styles.customerRow}>
                {item.customerAvatar ? (
                  <Image source={{ uri: item.customerAvatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {(item.customerName || 'K').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.customerName}>
                    {maskCustomerName(item.customerName)}
                  </Text>
                  <View style={styles.starsRowCompact}>
                    {renderStars(item.rating)}
                  </View>
                </View>
              </View>

              <View style={styles.verifiedTag}>
                <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                <Text style={styles.verifiedText}>Đã trải nghiệm</Text>
              </View>
            </View>

            {/* Date & Service info */}
            <View style={styles.metaInfoRow}>
              <Text style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
              {item.bookingCode ? (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.serviceTag}>Mã đơn: {item.bookingCode}</Text>
                </>
              ) : null}
            </View>

            {/* Comment Text */}
            {item.comment ? (
              <Text style={styles.commentText}>{item.comment}</Text>
            ) : (
              <Text style={styles.commentEmpty}>Khách hàng chỉ để lại số sao đánh giá.</Text>
            )}

            {/* Image Grid */}
            {item.imageUrls && item.imageUrls.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
                {item.imageUrls.map((url, idx) => (
                  <Image key={idx} source={{ uri: url }} style={styles.reviewPhoto} resizeMode="cover" />
                ))}
              </ScrollView>
            ) : null}

            {/* Footer: Helpful button */}
            <View style={styles.reviewFooter}>
              <TouchableOpacity style={styles.helpfulBtn} activeOpacity={0.7}>
                <Ionicons name="thumbs-up-outline" size={13} color="#64748B" />
                <Text style={styles.helpfulText}>Hữu ích</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !isLoadingList ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Chưa có đánh giá nào</Text>
              <Text style={styles.emptyDesc}>
                {selectedFilter === 'ALL'
                  ? 'Chuyên viên chưa có bài đánh giá nào từ khách hàng.'
                  : 'Không có đánh giá nào phù hợp với bộ lọc hiện tại.'}
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
            <View style={{ height: 40 }} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 4,
  },
  navTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  navSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  scoreOverviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scoreLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreBig: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  scoreMax: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  newBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  newBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
  },
  noRatingText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  scoreDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  scoreRight: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  satisfactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  satisfactionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#16A34A',
  },
  totalReviewsSub: {
    fontSize: 12,
    color: '#64748B',
  },
  totalBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterScrollContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#E11D48',
    fontWeight: '700',
  },
  listLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  listLoadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E11D48',
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  starsRowCompact: {
    flexDirection: 'row',
    marginTop: 2,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16A34A',
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  metaDot: {
    fontSize: 11,
    color: '#CBD5E1',
    marginHorizontal: 5,
  },
  serviceTag: {
    fontSize: 11,
    color: '#64748B',
  },
  commentText: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 20,
  },
  commentEmpty: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  imagesRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  reviewPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  helpfulText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  loadMoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  loadMoreText: {
    fontSize: 12,
    color: '#64748B',
  },
});
