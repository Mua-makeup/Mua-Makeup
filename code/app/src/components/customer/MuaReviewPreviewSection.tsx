import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { reviewService, ReviewItem } from '@/services/review.service';
import { BrandColors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_PHOTO_SIZE = Math.floor((SCREEN_WIDTH - 32 - 8) / 2);

interface Props {
  muaId: number;
  muaName?: string;
  ratingAverage?: number | null;
  totalReviews?: number;
}

export const MuaReviewPreviewSection: React.FC<Props> = ({
  muaId,
  muaName,
  ratingAverage,
  totalReviews = 0,
}) => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!muaId) return;
    let isMounted = true;

    const fetchTopReviews = async () => {
      try {
        setIsLoading(true);
        // Chỉ tải đúng 2 review mới nhất để preview cực nhẹ
        const res = await reviewService.getReviewsForMua(muaId, { page: 0, size: 2 });
        if (isMounted && res?.content) {
          setReviews(res.content);
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchTopReviews();
    return () => {
      isMounted = false;
    };
  }, [muaId]);

  const handleGoToAllReviews = () => {
    router.push({
      pathname: '/mua-reviews/[id]',
      params: { id: muaId, muaName: muaName || 'Chuyên viên' },
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={12}
          color="#F59E0B"
          style={{ marginRight: 2 }}
        />
      );
    }
    return stars;
  };

  const maskName = (name?: string) => {
    if (!name) return 'Khách hàng';
    const trimmed = name.trim();
    if (trimmed.length <= 2) return trimmed;
    return `${trimmed.charAt(0)}***${trimmed.charAt(trimmed.length - 1)}`;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  const hasReviews = totalReviews > 0 && ratingAverage != null;

  return (
    <View style={styles.container}>
      {/* 1. SECTION HEADER (Chuẩn Shopee - "4.8 ★ Đánh Giá Dịch Vụ (120) >") */}
      <TouchableOpacity
        style={styles.headerRow}
        activeOpacity={hasReviews ? 0.7 : 1}
        disabled={!hasReviews}
        onPress={handleGoToAllReviews}
      >
        <View style={styles.headerLeft}>
          {hasReviews ? (
            <>
              <Text style={styles.headerScore}>{Number(ratingAverage).toFixed(1)}</Text>
              <Ionicons name="star" size={15} color="#F59E0B" style={{ marginHorizontal: 3 }} />
              <Text style={styles.headerTitle}>
                Đánh Giá Dịch Vụ ({totalReviews})
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.headerTitle}>Đánh Giá Dịch Vụ</Text>
              <View style={styles.unratedBadge}>
                <Text style={styles.unratedBadgeText}>Chưa có đánh giá</Text>
              </View>
            </>
          )}
        </View>

        {hasReviews ? (
          <View style={styles.headerRight}>
            <Text style={styles.viewAllText}>Xem tất cả</Text>
            <Ionicons name="chevron-forward" size={16} color="#E11D48" />
          </View>
        ) : null}
      </TouchableOpacity>

      {/* 2. REVIEWS PREVIEW BODY (Chỉ hiển thị 1-2 review mới nhất) */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={BrandColors.primary} />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="chatbubbles-outline" size={24} color="#CBD5E1" />
          <Text style={styles.emptyText}>Chuyên viên chưa có bài đánh giá nào từ khách hàng.</Text>
        </View>
      ) : (
        <View style={styles.reviewsList}>
          {reviews.map((rev) => (
            <TouchableOpacity
              key={rev.id}
              style={styles.reviewItem}
              activeOpacity={0.8}
              onPress={handleGoToAllReviews}
            >
              {/* Header của 1 review */}
              <View style={styles.itemHeader}>
                <View style={styles.customerInfoRow}>
                  {rev.customerAvatar ? (
                    <Image source={{ uri: rev.customerAvatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitial}>
                        {(rev.customerName || 'K').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.customerName}>{maskName(rev.customerName)}</Text>
                    <View style={styles.starsRow}>{renderStars(rev.rating)}</View>
                  </View>
                </View>

                <Text style={styles.reviewDate}>{formatDate(rev.createdAt)}</Text>
              </View>

              {/* Tên dịch vụ dạng badge xám bo góc (Chỉ hiện tên dịch vụ theo yêu cầu) */}
              {(rev.packageName || rev.categoryName || rev.styleName) ? (
                <View style={styles.variationRow}>
                  <Text style={styles.variationLabel}>Dịch vụ: </Text>
                  <Text style={styles.variationValue} numberOfLines={1}>
                    {rev.packageName || rev.categoryName || rev.styleName}
                  </Text>
                </View>
              ) : null}

              {/* Nội dung comment */}
              {rev.comment ? (
                <Text style={styles.commentText} numberOfLines={2}>
                  {rev.comment}
                </Text>
              ) : null}

              {/* Thumbnail ảnh đính kèm (Chuẩn Shopee - 2 ảnh to trên 1 hàng như Ảnh 4) */}
              {rev.imageUrls && rev.imageUrls.length > 0 ? (
                <View style={styles.thumbnailRow}>
                  {rev.imageUrls.slice(0, 2).map((url, idx) => {
                    const isSecondAndHasMore = idx === 1 && rev.imageUrls.length > 2;
                    return (
                      <View key={idx} style={styles.photoContainer}>
                        <Image source={{ uri: url }} style={styles.thumbnailLarge} resizeMode="cover" />
                        {isSecondAndHasMore && (
                          <View style={styles.morePhotoOverlay}>
                            <Text style={styles.morePhotoText}>+{rev.imageUrls.length - 2}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 3. BUTTON XEM TẤT CẢ (Đáy section) */}
      {totalReviews > 0 && (
        <TouchableOpacity
          style={styles.bottomViewAllBtn}
          activeOpacity={0.8}
          onPress={handleGoToAllReviews}
        >
          <Text style={styles.bottomViewAllText}>
            Xem tất cả {totalReviews} đánh giá
          </Text>
          <Ionicons name="arrow-forward" size={14} color="#E11D48" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerScore: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E11D48',
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyText: {
    fontSize: 12.5,
    color: '#94A3B8',
  },
  reviewsList: {
    paddingTop: 8,
  },
  reviewItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  customerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
  },
  customerName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  commentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginTop: 2,
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  photoContainer: {
    width: PREVIEW_PHOTO_SIZE,
    height: PREVIEW_PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  thumbnailLarge: {
    width: '100%',
    height: '100%',
  },
  morePhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePhotoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  bottomViewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: '#FFF1F2',
    borderRadius: 8,
  },
  bottomViewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#E11D48',
  },
  unratedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  unratedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
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
});
