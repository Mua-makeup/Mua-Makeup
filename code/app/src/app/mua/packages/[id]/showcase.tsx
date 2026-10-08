import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { packageService, PackageDetail } from '@/services/package.service';
import { muaShowcaseService } from '@/services/mua-showcase.service';
import { PortfolioShowcase } from '@/services/mua-profile.service';
import { ShowcaseGridCard } from '@/components/mua/showcase/ShowcaseGridCard';
import { ShowcaseGalleryModal } from '@/components/customer/ShowcaseGalleryModal';
import { parseApiError } from '@/utils/error';
import { useUndoStore } from '@/store/undo.store';

export default function PackageShowcaseScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const packageId = Number(id);

  const [packageDetail, setPackageDetail] = useState<PackageDetail | null>(null);
  const [showcases, setShowcases] = useState<PortfolioShowcase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Xem chi tiết tác phẩm trong Modal Gallery
  const [selectedShowcaseIndex, setSelectedShowcaseIndex] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!packageId) return;
    try {
      const [pkg, portfoliosRes] = await Promise.all([
        packageService.getPackageById(packageId).catch(() => null),
        muaShowcaseService.getMyPortfolios(0, 100).catch(() => ({ content: [] as PortfolioShowcase[] })),
      ]);

      if (pkg) {
        setPackageDetail(pkg);
      }

      const allItems = (portfoliosRes as any)?.content || [];
      // Lọc các tác phẩm thuộc đúng gói dịch vụ này
      const filtered = allItems.filter((item: PortfolioShowcase) => Number(item.packageId) === packageId);
      setShowcases(filtered);
    } catch (err: any) {
      const parsed = parseApiError(err);
      console.warn('Lỗi tải album tác phẩm:', parsed.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [packageId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleFeatured = async (showcaseId: number, isFeatured: boolean) => {
    try {
      await muaShowcaseService.toggleFeatured(showcaseId, isFeatured);
      setShowcases((prev) =>
        prev.map((item) => (item.id === showcaseId ? { ...item, isFeatured } : item))
      );
    } catch (err: any) {
      const parsed = parseApiError(err);
      Alert.alert('Lỗi', parsed.message || 'Không thể đổi trạng thái nổi bật.');
      throw err;
    }
  };

  const handleDeleteShowcase = (showcaseId: number) => {
    const target = showcases.find((item) => item.id === showcaseId);
    if (!target) return;
    const targetIndex = showcases.findIndex((item) => item.id === showcaseId);

    Alert.alert(
      'Xóa Tác Phẩm',
      `Bạn có chắc chắn muốn xóa tác phẩm "${target.title}" khỏi album?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            // Xóa lạc quan
            setShowcases((prev) => prev.filter((item) => item.id !== showcaseId));

            // Kích hoạt Undo Toast
            useUndoStore.getState().showUndoToast({
              message: `Đã xóa tác phẩm "${target.title}"`,
              onUndo: () => {
                setShowcases((prev) => {
                  const next = [...prev];
                  next.splice(targetIndex, 0, target);
                  return next;
                });
              },
              onCommit: async () => {
                try {
                  await muaShowcaseService.deletePortfolioShowcase(showcaseId);
                } catch (err: any) {
                  const parsed = parseApiError(err);
                  console.warn('Lỗi xóa tác phẩm backend:', parsed.message);
                }
              },
            });
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="images-outline" size={48} color={BrandColors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Chưa Có Tác Phẩm Nào</Text>
      <Text style={styles.emptySubtitle}>
        Đăng tải hình ảnh các layout thực tế mà bạn đã thực hiện cho gói "{packageDetail?.packageName || 'này'}" để khách hàng yên tâm lựa chọn.
      </Text>
      <TouchableOpacity
        style={styles.emptyAddBtn}
        onPress={() =>
          router.push({
            pathname: '/mua/packages/[id]/add-showcase',
            params: { id: packageId },
          })
        }
        activeOpacity={0.85}>
        <Ionicons name="camera" size={18} color="#FFFFFF" />
        <Text style={styles.emptyAddBtnText}>Thêm Tác Phẩm Đầu Tiên</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/mua/packages' as any))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={BrandColors.slateHeading} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Album Tác Phẩm</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {packageDetail?.packageName || 'Gói Dịch Vụ'} ({showcases.length} ảnh)
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
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.headerAddBtnText}>Đăng Tác Phẩm</Text>
        </TouchableOpacity>
      </View>

      {/* Danh sách ảnh tác phẩm */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải album tác phẩm...</Text>
        </View>
      ) : (
        <FlatList
          data={showcases}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[
            styles.listContent,
            showcases.length === 0 && { flex: 1, justifyContent: 'center' },
          ]}
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
          renderItem={({ item, index }) => (
            <View style={styles.gridItemWrapper}>
              <ShowcaseGridCard
                item={item}
                onPress={() => setSelectedShowcaseIndex(index)}
                onToggleFeatured={handleToggleFeatured}
                onDelete={handleDeleteShowcase}
              />
            </View>
          )}
        />
      )}

      {/* Modal phóng to xem ảnh chi tiết */}
      <ShowcaseGalleryModal
        visible={selectedShowcaseIndex !== null}
        showcases={showcases}
        initialIndex={selectedShowcaseIndex ?? 0}
        onClose={() => setSelectedShowcaseIndex(null)}
      />
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
    padding: 12,
    paddingBottom: 36,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridItemWrapper: {
    width: '48.5%',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDF2F8',
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
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
