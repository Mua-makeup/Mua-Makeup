import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { reviewService, ReviewItem, MuaRatingSummary } from '@/services/review.service';

interface MuaReviewsModalProps {
  visible: boolean;
  onClose: () => void;
  muaId: number;
  muaName?: string;
  isOwnerView?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const MuaReviewsModal: React.FC<MuaReviewsModalProps> = ({
  visible,
  onClose,
  muaId,
  muaName,
  isOwnerView = false,
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<MuaRatingSummary | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchReviewData = useCallback(async () => {
    if (!muaId) return;
    try {
      setIsLoading(true);
      const [summaryRes, reviewsRes] = await Promise.all([
        reviewService.getMuaRatingSummary(muaId).catch(() => null),
        reviewService.getReviewsForMua(muaId, 0, 10).catch(() => null),
      ]);

      setSummary(summaryRes);
      if (reviewsRes) {
        setReviews(reviewsRes.content || []);
        setPage(0);
        setTotalPages(reviewsRes.totalPages || 0);
      }
    } catch {
      // Bỏ qua lỗi
    } finally {
      setIsLoading(false);
    }
  }, [muaId]);

  useEffect(() => {
    if (visible && muaId) {
      fetchReviewData();
    }
  }, [visible, muaId, fetchReviewData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReviewData();
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || page + 1 >= totalPages) return;
    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const res = await reviewService.getReviewsForMua(muaId, nextPage, 10);
      if (res?.content) {
        setReviews((prev) => [...prev, ...res.content]);
        setPage(nextPage);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingMore(false);
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
          style={{ marginRight: 1 }}
        />
      );
    }
    return stars;
  };

  const formatDate = (isoString: string) => {
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

  const hasReviews = summary && summary.totalReviews > 0;
  const ratingScore = summary?.ratingAvg != null ? summary.ratingAvg.toFixed(1) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="star" size={18} color="#D97706" />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isOwnerView ? 'Đánh Giá Của Khách Hàng' : 'Đánh Giá & Nhận Xét'}
                </Text>
                {muaName ? (
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    Chuyên viên {muaName}
                  </Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E11D48" />
              <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#E11D48']} />
              }
            >
              {/* 1. SCORE SUMMARY HERO BANNER */}
              <View style={styles.summaryBanner}>
                <View style={styles.scoreCol}>
                  {hasReviews && ratingScore ? (
                    <>
                      <Text style={styles.scoreNumber}>{ratingScore}</Text>
                      <View style={styles.starsRow}>{renderStars(Math.round(summary.ratingAvg || 0))}</View>
                      <Text style={styles.reviewCountText}>
                        {summary.totalReviews} lượt đánh giá
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>MỚI</Text>
                      </View>
                      <Text style={styles.noRatingText}>Chưa có đánh giá</Text>
                      <Text style={styles.reviewCountText}>0 đánh giá</Text>
                    </>
                  )}
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.metaCol}>
                  <View style={styles.metaItem}>
                    <Ionicons name="shield-checkmark" size={15} color="#16A34A" />
                    <Text style={styles.metaText}>
                      Huy hiệu: <Text style={styles.metaHighlight}>{summary?.badgeTier || 'STANDARD'}</Text>
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="checkmark-done-circle" size={15} color="#2563EB" />
                    <Text style={styles.metaText}>
                      Ca hoàn tất: <Text style={styles.metaHighlight}>{summary?.totalCompletedJobs || 0}</Text>
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="heart-circle" size={15} color="#E11D48" />
                    <Text style={styles.metaText}>Đánh giá thực từ đơn hàng</Text>
                  </View>
                </View>
              </View>

              {/* 2. REVIEWS LIST */}
              <View style={styles.listHeaderRow}>
                <Text style={styles.listTitle}>
                  Tất cả nhận xét ({reviews.length})
                </Text>
              </View>

              {reviews.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="chatbubbles-outline" size={36} color="#CBD5E1" />
                  </View>
                  <Text style={styles.emptyTitle}>Chưa có nhận xét nào</Text>
                  <Text style={styles.emptyDesc}>
                    {isOwnerView
                      ? 'Khi bạn hoàn thành các ca làm, đánh giá của khách hàng sẽ được hiển thị minh bạch tại đây.'
                      : 'Chuyên viên này chưa có đánh giá nào từ khách hàng trước đó.'}
                  </Text>
                </View>
              ) : (
                reviews.map((rev) => (
                  <View key={rev.id} style={styles.reviewCard}>
                    {/* Customer Header */}
                    <View style={styles.reviewHeader}>
                      <View style={styles.customerRow}>
                        {rev.customerAvatar ? (
                          <Image source={{ uri: rev.customerAvatar }} style={styles.avatar} />
                        ) : (
                          <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitial}>
                              {(rev.customerName || 'K').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={{ marginLeft: 10 }}>
                          <View style={styles.nameVerifiedRow}>
                            <Text style={styles.customerName}>
                              {rev.customerName || 'Khách hàng'}
                            </Text>
                            <View style={styles.verifiedBadge}>
                              <Ionicons name="checkmark-circle" size={11} color="#16A34A" />
                              <Text style={styles.verifiedText}>Đã trải nghiệm</Text>
                            </View>
                          </View>
                          <Text style={styles.reviewDate}>{formatDate(rev.createdAt)}</Text>
                        </View>
                      </View>

                      <View style={styles.starBadge}>
                        <Ionicons name="star" size={13} color="#F59E0B" />
                        <Text style={styles.starBadgeText}>{rev.rating}.0</Text>
                      </View>
                    </View>

                    {/* Shopee-style: Phân loại dịch vụ */}
                    {(rev.categoryName || rev.packageName || rev.styleName) ? (
                      <View style={styles.variationRow}>
                        <Text style={styles.variationLabel}>Phân loại: </Text>
                        <Text style={styles.variationValue} numberOfLines={2}>
                          {[rev.categoryName, rev.packageName, rev.styleName]
                            .filter((v, idx, arr) => Boolean(v) && arr.indexOf(v) === idx)
                            .join(' • ')}
                        </Text>
                      </View>
                    ) : null}

                    {/* Comment text */}
                    {rev.comment ? (
                      <Text style={styles.commentText}>{rev.comment}</Text>
                    ) : (
                      <Text style={styles.commentEmpty}>Khách hàng chỉ để lại số sao đánh giá.</Text>
                    )}

                    {/* Review Images */}
                    {rev.imageUrls && rev.imageUrls.length > 0 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.imagesRow}
                      >
                        {rev.imageUrls.map((img, idx) => (
                          <Image
                            key={idx}
                            source={{ uri: img }}
                            style={styles.reviewImage}
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                    ) : null}

                    {/* Booking Reference & Navigation to History Detail */}
                    {rev.bookingId ? (
                      <View style={styles.bookingFooterRow}>
                        <View style={styles.bookingTag}>
                          <Ionicons name="receipt-outline" size={12} color="#475569" />
                          <Text style={styles.bookingTagText}>
                            {rev.bookingCode ? `#${rev.bookingCode}` : `Đơn #${rev.bookingId}`}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.viewDetailBtn}
                          onPress={() => {
                            onClose();
                            router.push(`/booking/history-detail/${rev.bookingId}` as any);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.viewDetailBtnText}>Xem chi tiết đơn</Text>
                          <Ionicons name="chevron-forward" size={13} color="#E11D48" />
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ))
              )}

              {/* Load More Button */}
              {page + 1 < totalPages ? (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={handleLoadMore}
                  disabled={isLoadingMore}
                  activeOpacity={0.8}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color="#E11D48" />
                  ) : (
                    <>
                      <Text style={styles.loadMoreText}>Xem thêm đánh giá cũ hơn</Text>
                      <Ionicons name="chevron-down" size={15} color="#E11D48" />
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    minHeight: '60%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  scoreCol: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  newBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 4,
  },
  newBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#D97706',
  },
  noRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  reviewCountText: {
    fontSize: 11,
    color: '#64748B',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 12,
  },
  metaCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
  },
  metaHighlight: {
    fontWeight: '700',
    color: '#0F172A',
  },
  listHeaderRow: {
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
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
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16A34A',
  },
  reviewDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  starBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  commentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    marginTop: 2,
  },
  commentEmpty: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 2,
  },
  imagesRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  reviewImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#FFF1F2',
    borderRadius: 10,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E11D48',
  },
  bookingFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bookingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookingTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewDetailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
  },
  variationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
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
    lineHeight: 15,
  },
});
