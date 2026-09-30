import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { MasterCategory, MakeupStyle } from '@/services/taxonomy.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  categories: MasterCategory[];
  makeupStyles: MakeupStyle[];
  selectedCategoryId: number | null;
  selectedStyleId: number | null;
  selectedRadiusKm: number | null;
  minPrice: number;
  maxPrice: number;
  onSelectCategory: (id: number | null) => void;
  onSelectStyle: (id: number | null) => void;
  onSelectRadius: (radius: number | null) => void;
  onSelectPriceRange: (min: number, max: number) => void;
  onResetAll: () => void;
}

// Rút gọn tên danh mục & gắn icon nhận diện trực quan chuẩn UX
export const getCategoryDisplayInfo = (catName?: string) => {
  if (!catName) return { shortName: 'Tất Cả', iconName: 'sparkles' as const };
  const lower = catName.toLowerCase();
  if (lower.includes('cô dâu') || lower.includes('cưới')) {
    return { shortName: 'Cô Dâu', iconName: 'heart' as const };
  }
  if (lower.includes('tiệc') || lower.includes('dạ hội')) {
    return { shortName: 'Đi Tiệc', iconName: 'wine' as const };
  }
  if (lower.includes('kỷ yếu') || lower.includes('tốt nghiệp')) {
    return { shortName: 'Kỷ Yếu', iconName: 'school' as const };
  }
  if (lower.includes('concept') || lower.includes('chụp')) {
    return { shortName: 'Chụp Ảnh', iconName: 'camera' as const };
  }
  if (lower.includes('sự kiện') || lower.includes('sân khấu')) {
    return { shortName: 'Sự Kiện', iconName: 'musical-notes' as const };
  }
  if (lower.includes('douyin')) {
    return { shortName: 'Douyin', iconName: 'flame' as const };
  }
  if (lower.includes('ngày') || lower.includes('nhẹ nhàng')) {
    return { shortName: 'Hằng Ngày', iconName: 'sunny' as const };
  }
  const cleanName = catName.replace(/Trang điểm/gi, '').trim();
  return { shortName: cleanName || catName, iconName: 'brush' as const };
};

const RADIUS_OPTIONS = [
  { label: 'Bán kính 1 km', value: 1, shortLabel: '1 km' },
  { label: 'Bán kính 3 km (Khuyên dùng)', value: 3, shortLabel: '3 km' },
  { label: 'Bán kính 5 km', value: 5, shortLabel: '5 km' },
  { label: 'Bán kính 10 km', value: 10, shortLabel: '10 km' },
  { label: 'Toàn thành phố', value: null, shortLabel: 'Tất cả' },
];

const PRICE_OPTIONS = [
  { label: 'Tất cả mức giá', min: 200000, max: 10000000, shortLabel: 'Ngân sách' },
  { label: 'Dưới 500.000 đ', min: 200000, max: 500000, shortLabel: '< 500k' },
  { label: '500.000 đ - 1.500.000 đ', min: 500000, max: 1500000, shortLabel: '500k - 1.5tr' },
  { label: '1.500.000 đ - 3.000.000 đ', min: 1500000, max: 3000000, shortLabel: '1.5tr - 3tr' },
  { label: 'Trên 3.000.000 đ (VIP)', min: 3000000, max: 10000000, shortLabel: '> 3tr' },
];

type ActiveSheetType = 'CATEGORY' | 'RADIUS' | 'STYLE' | 'PRICE' | null;

export const CategoryFilterBar: React.FC<Props> = ({
  categories,
  makeupStyles,
  selectedCategoryId,
  selectedStyleId,
  selectedRadiusKm,
  minPrice,
  maxPrice,
  onSelectCategory,
  onSelectStyle,
  onSelectRadius,
  onSelectPriceRange,
  onResetAll,
}) => {
  const [activeSheet, setActiveSheet] = useState<ActiveSheetType>(null);

  // Tính số lượng bộ lọc đang được kích hoạt
  let activeFilterCount = 0;
  if (selectedCategoryId !== null) activeFilterCount++;
  if (selectedStyleId !== null) activeFilterCount++;
  if (selectedRadiusKm !== null && selectedRadiusKm !== 5) activeFilterCount++;
  if (minPrice > 200000 || maxPrice < 5000000) activeFilterCount++;

  // Lấy nhãn hiển thị cho từng Chip
  const selectedCat = categories.find((c) => c.id === selectedCategoryId);
  const catInfo = selectedCat ? getCategoryDisplayInfo(selectedCat.categoryName) : null;
  const categoryChipLabel = catInfo ? catInfo.shortName : 'Loại make';

  const selectedStyle = makeupStyles.find((s) => s.id === selectedStyleId);
  const styleChipLabel = selectedStyle ? selectedStyle.styleName : 'Phong cách';

  const radiusChipLabel =
    selectedRadiusKm !== null ? `< ${selectedRadiusKm}km` : 'Bán kính';

  const currentPriceOption = PRICE_OPTIONS.find(
    (p) => p.min === minPrice && p.max === maxPrice
  );
  const priceChipLabel = currentPriceOption?.shortLabel || 'Ngân sách';

  return (
    <View style={styles.container}>
      {/* 1 HÀNG QUICK-FILTER CHIPS DUY NHẤT */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* NÚT RESET NHANH NẾU CÓ BỘ LỌC ĐANG CHẠY */}
        {activeFilterCount > 0 && (
          <TouchableOpacity
            style={styles.resetPill}
            onPress={onResetAll}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={16} color={BrandColors.primary} />
            <Text style={styles.resetPillText}>Xóa lọc ({activeFilterCount})</Text>
          </TouchableOpacity>
        )}

        {/* CHIP 1: DỊP / DANH MỤC */}
        <TouchableOpacity
          style={[styles.chip, selectedCategoryId !== null && styles.chipActive]}
          onPress={() => setActiveSheet('CATEGORY')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={catInfo ? catInfo.iconName : 'sparkles-outline'}
            size={14}
            color={selectedCategoryId !== null ? BrandColors.primary : '#475569'}
          />
          <Text
            style={[styles.chipText, selectedCategoryId !== null && styles.chipTextActive]}
            numberOfLines={1}
          >
            {categoryChipLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={12}
            color={selectedCategoryId !== null ? BrandColors.primary : '#94A3B8'}
          />
        </TouchableOpacity>


        {/* CHIP 3: PHONG CÁCH MAKEUP */}
        {makeupStyles.length > 0 && (
          <TouchableOpacity
            style={[styles.chip, selectedStyleId !== null && styles.chipActive]}
            onPress={() => setActiveSheet('STYLE')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="color-palette-outline"
              size={14}
              color={selectedStyleId !== null ? BrandColors.primary : '#475569'}
            />
            <Text
              style={[styles.chipText, selectedStyleId !== null && styles.chipTextActive]}
              numberOfLines={1}
            >
              {styleChipLabel}
            </Text>
            <Ionicons
              name="chevron-down"
              size={12}
              color={selectedStyleId !== null ? BrandColors.primary : '#94A3B8'}
            />
          </TouchableOpacity>
        )}
        {/* CHIP 2: BÁN KÍNH GPS */}
        <TouchableOpacity
          style={[
            styles.chip,
            selectedRadiusKm !== null && selectedRadiusKm !== 5 && styles.chipActive,
          ]}
          onPress={() => setActiveSheet('RADIUS')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="navigate-outline"
            size={14}
            color={
              selectedRadiusKm !== null && selectedRadiusKm !== 5
                ? BrandColors.primary
                : '#475569'
            }
          />
          <Text
            style={[
              styles.chipText,
              selectedRadiusKm !== null && selectedRadiusKm !== 5 && styles.chipTextActive,
            ]}
          >
            {radiusChipLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={12}
            color={
              selectedRadiusKm !== null && selectedRadiusKm !== 5
                ? BrandColors.primary
                : '#94A3B8'
            }
          />
        </TouchableOpacity>

        {/* CHIP 4: KHOẢNG GIÁ NGÂN SÁCH */}
        <TouchableOpacity
          style={[
            styles.chip,
            (minPrice > 200000 || maxPrice < 5000000) && styles.chipActive,
          ]}
          onPress={() => setActiveSheet('PRICE')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="cash-outline"
            size={14}
            color={
              minPrice > 200000 || maxPrice < 5000000
                ? BrandColors.primary
                : '#475569'
            }
          />
          <Text
            style={[
              styles.chipText,
              (minPrice > 200000 || maxPrice < 5000000) && styles.chipTextActive,
            ]}
          >
            {priceChipLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={12}
            color={
              minPrice > 200000 || maxPrice < 5000000
                ? BrandColors.primary
                : '#94A3B8'
            }
          />
        </TouchableOpacity>
      </ScrollView>

      {/* BOTTOM SHEET CHỌN NHANH TIÊU CHÍ */}
      <Modal
        visible={activeSheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveSheet(null)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={styles.backdropClickable}
            activeOpacity={1}
            onPress={() => setActiveSheet(null)}
          />
          <SafeAreaView style={styles.sheetContainer}>
            {/* SHEET HEADER */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandleBar} />
              <View style={styles.sheetTitleRow}>
                <Text style={styles.sheetTitle}>
                  {activeSheet === 'CATEGORY' && 'Chọn Dịp / Mục Đích Make-up'}
                  {activeSheet === 'RADIUS' && 'Chọn Khoảng Cách Tìm Thợ'}
                  {activeSheet === 'STYLE' && 'Chọn Phong Cách Sở Trường'}
                  {activeSheet === 'PRICE' && 'Chọn Ngân Sách Dịch Vụ'}
                </Text>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => setActiveSheet(null)}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* SHEET BODY - CATEGORY */}
            {activeSheet === 'CATEGORY' && (
              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                {/* OPTION TẤT CẢ */}
                <TouchableOpacity
                  style={[
                    styles.sheetOptionItem,
                    selectedCategoryId === null && styles.sheetOptionItemActive,
                  ]}
                  onPress={() => {
                    onSelectCategory(null);
                    setActiveSheet(null);
                  }}
                >
                  <View style={styles.optionLeft}>
                    <View style={styles.optionIconBox}>
                      <Ionicons name="sparkles" size={18} color={BrandColors.primary} />
                    </View>
                    <View>
                      <Text style={styles.optionTitle}>Tất Cả Dịch Vụ Làm Đẹp</Text>
                      <Text style={styles.optionSubtitle}>Hiển thị tất cả các gói dịch vụ</Text>
                    </View>
                  </View>
                  {selectedCategoryId === null && (
                    <Ionicons name="checkmark-circle" size={22} color={BrandColors.primary} />
                  )}
                </TouchableOpacity>

                {/* DANH SÁCH CATEGORY */}
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  const display = getCategoryDisplayInfo(cat.categoryName);
                  return (
                    <TouchableOpacity
                      key={`cat-sheet-${cat.id}`}
                      style={[
                        styles.sheetOptionItem,
                        isSelected && styles.sheetOptionItemActive,
                      ]}
                      onPress={() => {
                        onSelectCategory(isSelected ? null : cat.id);
                        setActiveSheet(null);
                      }}
                    >
                      <View style={styles.optionLeft}>
                        <View style={[styles.optionIconBox, isSelected && styles.optionIconBoxActive]}>
                          <Ionicons
                            name={display.iconName}
                            size={18}
                            color={isSelected ? '#FFFFFF' : BrandColors.primary}
                          />
                        </View>
                        <View>
                          <Text style={[styles.optionTitle, isSelected && styles.optionTitleActive]}>
                            {display.shortName}
                          </Text>
                          <Text style={styles.optionSubtitle}>{cat.categoryName}</Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={22} color={BrandColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* SHEET BODY - RADIUS */}
            {activeSheet === 'RADIUS' && (
              <View style={styles.sheetListSimple}>
                {RADIUS_OPTIONS.map((opt) => {
                  const isSelected = selectedRadiusKm === opt.value;
                  return (
                    <TouchableOpacity
                      key={`rad-sheet-${opt.label}`}
                      style={[
                        styles.sheetOptionItem,
                        isSelected && styles.sheetOptionItemActive,
                      ]}
                      onPress={() => {
                        onSelectRadius(opt.value);
                        setActiveSheet(null);
                      }}
                    >
                      <View style={styles.optionLeft}>
                        <Ionicons
                          name="location"
                          size={18}
                          color={isSelected ? BrandColors.primary : '#64748B'}
                        />
                        <Text style={[styles.optionTitle, isSelected && styles.optionTitleActive]}>
                          {opt.label}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={22} color={BrandColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* SHEET BODY - STYLE */}
            {activeSheet === 'STYLE' && (
              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.sheetOptionItem,
                    selectedStyleId === null && styles.sheetOptionItemActive,
                  ]}
                  onPress={() => {
                    onSelectStyle(null);
                    setActiveSheet(null);
                  }}
                >
                  <Text style={styles.optionTitle}>Mọi phong cách</Text>
                  {selectedStyleId === null && (
                    <Ionicons name="checkmark-circle" size={22} color={BrandColors.primary} />
                  )}
                </TouchableOpacity>

                {makeupStyles.map((s) => {
                  const isSelected = selectedStyleId === s.id;
                  return (
                    <TouchableOpacity
                      key={`style-sheet-${s.id}`}
                      style={[
                        styles.sheetOptionItem,
                        isSelected && styles.sheetOptionItemActive,
                      ]}
                      onPress={() => {
                        onSelectStyle(isSelected ? null : s.id);
                        setActiveSheet(null);
                      }}
                    >
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleActive]}>
                        {s.styleName}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={22} color={BrandColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* SHEET BODY - PRICE */}
            {activeSheet === 'PRICE' && (
              <View style={styles.sheetListSimple}>
                {PRICE_OPTIONS.map((opt, idx) => {
                  const isSelected = minPrice === opt.min && maxPrice === opt.max;
                  return (
                    <TouchableOpacity
                      key={`price-sheet-${idx}`}
                      style={[
                        styles.sheetOptionItem,
                        isSelected && styles.sheetOptionItemActive,
                      ]}
                      onPress={() => {
                        onSelectPriceRange(opt.min, opt.max);
                        setActiveSheet(null);
                      }}
                    >
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleActive]}>
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={22} color={BrandColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  resetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  resetPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#FFF1F2',
    borderColor: BrandColors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  chipTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropClickable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.65,
    paddingBottom: 20,
  },
  sheetHeader: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  sheetTitleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetListSimple: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 6,
  },
  sheetOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sheetOptionItemActive: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconBoxActive: {
    backgroundColor: BrandColors.primary,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  optionTitleActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
});
