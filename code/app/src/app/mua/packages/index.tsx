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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { packageService, PackageSummary } from '@/services/package.service';
import { PackageCard } from '@/components/mua/packages/PackageCard';
import { AppBottomNavBar } from '@/components/common/AppBottomNavBar';
import { parseApiError } from '@/utils/error';

export default function MuaPackagesScreen() {
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPackages = useCallback(async () => {
    try {
      const data = await packageService.listMyPackages();
      setPackages(Array.isArray(data) ? data : []);
    } catch (err) {
      const parsed = parseApiError(err);
      console.error('Lỗi nạp danh sách gói dịch vụ:', parsed.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPackages();
  };

  const handleToggleAvailability = async (packageId: number, isAvailable: boolean) => {
    try {
      await packageService.toggleAvailability(packageId, isAvailable);
      setPackages((prev) =>
        prev.map((pkg) => (pkg.id === packageId ? { ...pkg, isAvailable } : pkg))
      );
    } catch (err) {
      const parsed = parseApiError(err);
      Alert.alert('Lỗi', parsed.message || 'Không thể đổi trạng thái gói dịch vụ.');
      throw err;
    }
  };

  const handleDeletePackage = (packageId: number) => {
    Alert.alert(
      'Xóa Gói Dịch Vụ',
      'Bạn có chắc chắn muốn xóa gói này? Các thông tin cấu hình bước và album ảnh liên kết sẽ không còn hiển thị cho khách hàng.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa Gói',
          style: 'destructive',
          onPress: async () => {
            try {
              await packageService.deletePackage(packageId);
              setPackages((prev) => prev.filter((pkg) => pkg.id !== packageId));
            } catch (err) {
              const parsed = parseApiError(err);
              Alert.alert('Lỗi Xóa Gói', parsed.message);
            }
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="sparkles" size={42} color={BrandColors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Bạn Chưa Có Gói Dịch Vụ Nào</Text>
      <Text style={styles.emptySubtitle}>
        Tạo gói dịch vụ cá nhân (Cô dâu, Dự tiệc, Kỷ yếu...) để khách hàng quanh khu vực có thể tìm thấy và đặt lịch với bạn.
      </Text>
      <TouchableOpacity
        style={styles.emptyCreateBtn}
        onPress={() => router.push('/mua/packages/create')}
        activeOpacity={0.8}>
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyCreateBtnText}>Tạo Gói Dịch Vụ Đầu Tiên</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={BrandColors.slateHeading} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Gói Dịch Vụ Của Tôi</Text>
          <Text style={styles.headerSubtitle}>{packages.length} gói đang quản lý</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/mua/packages/create')}
          activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Tạo Gói</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách gói...</Text>
        </View>
      ) : (
        <FlatList
          data={packages}
          keyExtractor={(item) => item.id.toString()}
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
            <PackageCard
              item={item}
              onToggleAvailability={handleToggleAvailability}
              onManageItems={(pkgId) =>
                router.push({
                  pathname: '/mua/packages/[id]/items',
                  params: { id: pkgId },
                })
              }
              onManageShowcase={(pkgId) =>
                router.push({
                  pathname: '/mua/packages/[id]/showcase',
                  params: { id: pkgId },
                })
              }
              onEdit={(pkgId) =>
                router.push({
                  pathname: '/mua/packages/[id]/edit',
                  params: { id: pkgId },
                })
              }
              onDelete={handleDeletePackage}
            />
          )}
        />
      )}

      {/* Bottom Navigation */}
      <AppBottomNavBar activeTab="account" />
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
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  headerSubtitle: {
    fontSize: 12,
    color: BrandColors.slateMuted,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
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
    paddingBottom: 100,
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
});
