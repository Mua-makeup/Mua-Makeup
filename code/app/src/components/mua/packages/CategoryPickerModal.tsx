import { DismissibleModal } from '@/components/common/DismissibleModal';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MasterCategory, taxonomyService } from '@/services/taxonomy.service';
import { BrandColors } from '@/constants/theme';

interface CategoryPickerModalProps {
  visible: boolean;
  selectedCategoryId?: number;
  onSelect: (category: MasterCategory) => void;
  onClose: () => void;
}

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  visible,
  selectedCategoryId,
  onSelect,
  onClose,
}) => {
  const [categories, setCategories] = useState<MasterCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await taxonomyService.getActiveCategories();
      setCategories(data);
    } catch (err) {
      console.error('Lỗi khi tải danh mục gốc:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DismissibleModal visible={visible} onClose={onClose} overlayStyle={styles.overlay} contentStyle={styles.bottomSheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Chọn Danh Mục Gốc</Text>
        
          </View>

          <Text style={styles.subtitle}>
            Chọn nhóm dịch vụ trang điểm phù hợp nhất để khách hàng dễ dàng tìm kiếm.
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
            </View>
          ) : (
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={[styles.listContainer, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}
              renderItem={({ item }) => {
                const isSelected = selectedCategoryId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                    activeOpacity={0.7}>
                    <View style={styles.itemContent}>
                      <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
                        <Ionicons
                          name="sparkles-outline"
                          size={18}
                          color={isSelected ? BrandColors.primary : BrandColors.slateMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
                          {item.categoryName}
                        </Text>
                        {item.description ? (
                          <Text style={styles.itemDesc} numberOfLines={1}>
                            {item.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={BrandColors.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={BrandColors.slatePlaceholder} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </DismissibleModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '75%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  subtitle: {
    fontSize: 13,
    color: BrandColors.slateMuted,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: BrandColors.canvasBg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
  },
  itemCardSelected: {
    backgroundColor: BrandColors.subtle,
    borderColor: BrandColors.softBorder,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBoxSelected: {
    backgroundColor: BrandColors.light,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  itemNameSelected: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  itemDesc: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    marginTop: 2,
  },
});
