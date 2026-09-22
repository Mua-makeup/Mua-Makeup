import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { packageService, PackageDetail } from '@/services/package.service';
import { muaShowcaseService } from '@/services/mua-showcase.service';
import { PortfolioShowcase } from '@/services/mua-profile.service';
import { ShowcaseGridCard } from '@/components/mua/showcase/ShowcaseGridCard';
import { parseApiError } from '@/utils/error';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PackageShowcaseScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const packageId = Number(id);

  const [packageDetail, setPackageDetail] = useState<PackageDetail | null>(null);
  const [showcases, setShowcases] = useState<PortfolioShowcase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Lightbox preview state
  const [previewItem, setPreviewItem] = useState<PortfolioShowcase | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pkg, res] = await Promise.all([
        packageService.getPackageById(packageId),
        muaShowcaseService.getMyPortfolios(0, 50),
      ]);
      setPackageDetail(pkg);

      // Lọc các tác phẩm thuộc riêng gói này
      const filtered = (res.content || []).filter((item) => item.packageId === packageId);
      setShowcases(filtered);
    } catch (err: any) {
      const parsed = parseApiError(err);
      console.error('Lỗi tải album tác phẩm:', parsed.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [packageId]);

  useEffect(() => {
    if (packageId) {
      loadData();
    }
  }, [loadData, packageId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleFeatured = async (showcaseId: number, isFeatured: boolean) => {
    try {
      await muaShowcaseService.toggleFeatured(showcaseId, isFeatured);
      setShowcases((prev) =>
        prev.map((s) => (s.id === showcaseId ? { ...s, isFeatured } : s))
      );
    } catch (err: any) {
      const parsed = parseApiError(err);
      Alert.alert('Lỗi', parsed.message);
      throw err;
    }
  };

  const handleDeleteShowcase = (showcaseId: number) => {
    Alert.alert(
      'Xóa Tác Phẩm',
      'Bạn có chắc chắn muốn xóa tác phẩm này khỏi album của gói dịch vụ?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await muaShowcaseService.deletePortfolioShowcase(showcaseId);
              setShowcases((prev) => prev.filter((s) => s.id !== showcaseId));
            } catch (err: any) {
              const parsed = parseApiError(err);
              Alert.alert('Lỗi Xóa Tác Phẩm', parsed.message);
            }
          },
        },
      ]
    );
  };

  const allPreviewImages = previewItem
    ? [previewItem.imageUrl, ...(previewItem.additionalImages || [])]
    : [];

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="images-outline" size={42} color={BrandColors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Chưa Có Tác Phẩm Nào</Text>
      <Text style={styles.emptySubtitle}>
        Đăng tải ảnh khách hàng sau khi make-up thực tế của gói này để tạo dựng uy tín và tăng tỷ lệ khách đặt lịch.
      </Text>
      <TouchableOpacity
        style={styles.emptyCreateBtn}
        onPress={() =>
          router.push({
            pathname: '/mua/packages/[id]/add-showcase',
            params: { id: packageId },
          })
        }
        activeOpacity={0.8}>
        <Ionicons name="camera" size={20} color="#FFFFFF" />
        <Text style={styles.emptyCreateBtnText}>Đăng Tác Phẩm Đầu Tiên</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={BrandColors.slateHeading} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Album Tác Phẩm Thực Tế</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {packageDetail?.packageName || 'Gói Dịch Vụ'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={() =>
            router.push({
              pathname: '/mua/packages/[id]/add-showcase',
              params: { id: packageId },
            })
          }
          activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.headerAddBtnText}>Đăng Ảnh</Text>
        </TouchableOpacity>
      </View>

      {/* Main Grid */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải album ảnh mẫu...</Text>
        </View>
      ) : (
        <FlatList
          data={showcases}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[BrandColors.primary]}
              tintColor={BrandColors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
          renderItem={({ item }) => (
            <ShowcaseGridCard
              item={item}
              onPress={(selected) => {
                setPreviewItem(selected);
                setActivePhotoIdx(0);
              }}
              onToggleFeatured={handleToggleFeatured}
              onDelete={handleDeleteShowcase}
            />
          )}
        />
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {previewItem && (
        <Modal
          visible={!!previewItem}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewItem(null)}>
          <View style={styles.lightboxOverlay}>
            <View style={[styles.lightboxHeader, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity
                style={styles.lightboxCloseBtn}
                onPress={() => setPreviewItem(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.lightboxCounter}>
                {activePhotoIdx + 1} / {allPreviewImages.length}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Main Preview Image */}
            <View style={styles.lightboxImageBox}>
              <Image
                source={{ uri: allPreviewImages[activePhotoIdx] }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            </View>

            {/* Bottom Caption & Thumbnail Strip */}
            <View style={[styles.lightboxBottomBar, { paddingBottom: insets.bottom + 16 }]}>
              <Text style={styles.lightboxTitle}>{previewItem.title}</Text>
              {previewItem.description ? (
                <Text style={styles.lightboxDesc} numberOfLines={2}>
                  {previewItem.description}
                </Text>
              ) : null}

              {/* Thumbnails row */}
              {allPreviewImages.length > 1 && (
                <View style={styles.lightboxThumbStrip}>
                  {allPreviewImages.map((uri, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.lightboxThumb,
                        idx === activePhotoIdx && styles.lightboxThumbActive,
                      ]}
                      onPress={() => setActivePhotoIdx(idx)}>
                      <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.canvasBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.borderInput,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: BrandColors.canvasBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  headerSubtitle: {
    fontSize: 12,
    color: BrandColors.primary,
    fontWeight: '600',
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  headerAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: BrandColors.slateMuted,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  columnWrapper: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BrandColors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.slateHeading,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: BrandColors.slateMuted,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
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
    paddingBottom: 10,
    zIndex: 10,
  },
  lightboxCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCounter: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  lightboxImageBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  lightboxBottomBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  lightboxTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  lightboxDesc: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  lightboxThumbStrip: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  lightboxThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  lightboxThumbActive: {
    borderColor: BrandColors.primary,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
});
