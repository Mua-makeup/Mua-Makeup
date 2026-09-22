import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import {
  packageService,
  PackageDetail,
  PackageItem,
  CreatePackageItemReq,
} from '@/services/package.service';
import { PackageItemModal } from '@/components/mua/packages/PackageItemModal';
import { parseApiError } from '@/utils/error';

export default function PackageItemsScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const packageId = Number(id);

  const [packageDetail, setPackageDetail] = useState<PackageDetail | null>(null);
  const [items, setItems] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PackageItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pkg, itemList] = await Promise.all([
        packageService.getPackageById(packageId),
        packageService.getPackageItems(packageId),
      ]);
      setPackageDetail(pkg);
      setItems(itemList);
    } catch (err: any) {
      const parsed = parseApiError(err);
      Alert.alert('Lỗi', parsed.message || 'Không thể tải danh sách bước thực hiện.');
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    if (packageId) {
      loadData();
    }
  }, [loadData, packageId]);

  const handleSaveItem = async (req: CreatePackageItemReq) => {
    if (editingItem) {
      const updated = await packageService.updatePackageItem(packageId, editingItem.id, req);
      setItems((prev) => prev.map((it) => (it.id === editingItem.id ? updated : it)));
    } else {
      const created = await packageService.createPackageItem(packageId, req);
      setItems((prev) => [...prev, created]);
    }
  };

  const handleDeleteItem = (itemId: number) => {
    Alert.alert(
      'Xóa Bước Thực Hiện',
      'Bạn có chắc chắn muốn xóa bước dịch vụ này khỏi gói?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await packageService.deletePackageItem(packageId, itemId);
              setItems((prev) => prev.filter((it) => it.id !== itemId));
            } catch (err) {
              const parsed = parseApiError(err);
              Alert.alert('Lỗi', parsed.message);
            }
          },
        },
      ]
    );
  };

  const includedItems = items.filter((it) => it.itemType === 'COMPONENT' || it.itemType === 'INCLUDED' || !it.itemType);
  const addonItems = items.filter((it) => it.itemType === 'ADD_ON' || it.itemType === 'OPTIONAL_ADDON');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={BrandColors.slateHeading} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Cấu Hình Bước Dịch Vụ</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {packageDetail?.packageName || 'Đang tải thông tin gói...'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={() => {
            setEditingItem(null);
            setShowItemModal(true);
          }}
          activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.headerAddBtnText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải các bước dịch vụ...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {/* Thông tin gói tóm tắt */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Giá Niêm Yết:</Text>
              <Text style={styles.summaryPrice}>
                {Number(packageDetail?.price || 0).toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Thời Lượng Dự Kiến:</Text>
              <Text style={styles.summaryValue}>
                {packageDetail?.estimatedDurationMinutes || packageDetail?.durationMinutes || 60} phút
              </Text>
            </View>
          </View>

          {/* Section 1: Các bước mặc định */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="checkmark-done-circle" size={20} color={BrandColors.success} />
              <Text style={styles.sectionTitle}>Các Bước Mặc Định Trong Gói ({includedItems.length})</Text>
            </View>
            <Text style={styles.sectionHint}>
              Đã bao gồm trong giá niêm yết của gói dịch vụ
            </Text>
          </View>

          {includedItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Chưa có bước mặc định nào.</Text>
            </View>
          ) : (
            includedItems.map((it, idx) => (
              <View key={it.id || idx} style={styles.itemCard}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{it.itemName}</Text>
                  <Text style={styles.itemMeta}>
                    Thời lượng ước tính: {it.durationMinutes || 15} phút
                  </Text>
                </View>

                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => {
                      setEditingItem(it);
                      setShowItemModal(true);
                    }}>
                    <Ionicons name="create-outline" size={18} color={BrandColors.slateBody} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconActionBtn, { backgroundColor: '#FFF1F2' }]}
                    onPress={() => handleDeleteItem(it.id)}>
                    <Ionicons name="trash-outline" size={18} color={BrandColors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* Section 2: Tùy chọn làm thêm (Add-ons) */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="add-circle" size={20} color={BrandColors.primary} />
              <Text style={styles.sectionTitle}>Tùy Chọn Mua Thêm / Add-on ({addonItems.length})</Text>
            </View>
            <Text style={styles.sectionHint}>
              Khách hàng có thể tick chọn thêm khi đặt lịch (có cộng thêm tiền & thời lượng)
            </Text>
          </View>

          {addonItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Chưa có dịch vụ làm thêm nào (Ví dụ: Dán mi 3D, Đính đá, Nền body...).</Text>
            </View>
          ) : (
            addonItems.map((it, idx) => (
              <View key={it.id || idx} style={[styles.itemCard, styles.addonCard]}>
                <View style={[styles.stepBadge, styles.addonBadge]}>
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{it.itemName}</Text>
                  <View style={styles.addonMetaRow}>
                    <Text style={styles.addonPrice}>
                      +{Number(it.itemPrice || 0).toLocaleString('vi-VN')} đ
                    </Text>
                    <Text style={styles.addonDuration}>
                      • +{it.durationMinutes || 15} phút
                    </Text>
                  </View>
                </View>

                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => {
                      setEditingItem(it);
                      setShowItemModal(true);
                    }}>
                    <Ionicons name="create-outline" size={18} color={BrandColors.slateBody} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconActionBtn, { backgroundColor: '#FFF1F2' }]}
                    onPress={() => handleDeleteItem(it.id)}>
                    <Ionicons name="trash-outline" size={18} color={BrandColors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* Nút Thêm Bước Dưới Chân */}
          <TouchableOpacity
            style={styles.bottomAddBtn}
            onPress={() => {
              setEditingItem(null);
              setShowItemModal(true);
            }}
            activeOpacity={0.85}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.bottomAddBtnText}>Thêm Bước Hoặc Tùy Chọn Add-on Mới</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Package Item Modal */}
      <PackageItemModal
        visible={showItemModal}
        initialItem={editingItem}
        defaultStepOrder={items.length + 1}
        onSave={handleSaveItem}
        onClose={() => {
          setShowItemModal(false);
          setEditingItem(null);
        }}
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
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: BrandColors.slateMuted,
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  sectionHint: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    marginTop: 2,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BrandColors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 12,
    color: BrandColors.slatePlaceholder,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
  },
  addonCard: {
    borderColor: BrandColors.softBorder,
    backgroundColor: '#FFFDFD',
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BrandColors.canvasBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addonBadge: {
    backgroundColor: BrandColors.primary,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  itemMeta: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    marginTop: 2,
  },
  addonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  addonPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  addonDuration: {
    fontSize: 12,
    color: BrandColors.slateMuted,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: BrandColors.canvasBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    backgroundColor: BrandColors.primary,
    marginTop: 16,
    gap: 8,
  },
  bottomAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
