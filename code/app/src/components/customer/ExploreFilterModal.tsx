import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import { MasterCategory, MakeupStyle } from '@/services/taxonomy.service';
import { DismissibleModal } from '@/components/common/DismissibleModal';

export const RADIUS_OPTIONS = [
  { label: 'Toàn thành phố (Tất cả)', value: null, shortLabel: 'Tất cả' },
  { label: 'Trong vòng 1 km', value: 1, shortLabel: '< 1 km' },
  { label: 'Trong vòng 3 km', value: 3, shortLabel: '< 3 km' },
  { label: 'Trong vòng 5 km', value: 5, shortLabel: '< 5 km' },
  { label: 'Trong vòng 10 km', value: 10, shortLabel: '< 10 km' },
  { label: 'Trong vòng 20 km', value: 20, shortLabel: '< 20 km' },
];

export const PRICE_OPTIONS = [
  { label: 'Tất cả mức giá', min: 200000, max: 10000000, shortLabel: 'Tất cả' },
  { label: 'Dưới 500.000 đ', min: 200000, max: 500000, shortLabel: '< 500k' },
  { label: '500.000 đ - 1.500.000 đ', min: 500000, max: 1500000, shortLabel: '500k - 1.5tr' },
  { label: '1.500.000 đ - 3.000.000 đ', min: 1500000, max: 3000000, shortLabel: '1.5tr - 3tr' },
  { label: 'Trên 3.000.000 đ (VIP)', min: 3000000, max: 10000000, shortLabel: '> 3tr' },
];

export const RATING_OPTIONS = [
  { label: 'Tất cả đánh giá', value: null, shortLabel: 'Tất cả' },
  { label: '⭐ 4.8★ trở lên (Xuất sắc)', value: 4.8, shortLabel: '≥ 4.8★' },
  { label: '⭐ 4.5★ trở lên (Đánh giá cao)', value: 4.5, shortLabel: '≥ 4.5★' },
  { label: '⭐ 4.0★ trở lên (Khá tốt)', value: 4.0, shortLabel: '≥ 4.0★' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  categories: MasterCategory[];
  makeupStyles: MakeupStyle[];
  selectedCategoryId: number | null;
  selectedStyleId: number | null;
  selectedRadiusKm: number | null;
  minPrice: number;
  maxPrice: number;
  minRating?: number | null;
  onSelectCategory: (id: number | null) => void;
  onSelectStyle: (id: number | null) => void;
  onSelectRadius: (radius: number | null) => void;
  onSelectPriceRange: (min: number, max: number) => void;
  onSelectMinRating?: (rating: number | null) => void;
  onResetAll: () => void;
  resultCount?: number;
}

type SectionKey = 'CATEGORY' | 'STYLE' | 'RADIUS' | 'PRICE' | 'RATING' | null;

export const ExploreFilterModal: React.FC<Props> = ({
  visible,
  onClose,
  categories,
  makeupStyles,
  selectedCategoryId,
  selectedStyleId,
  selectedRadiusKm,
  minPrice,
  maxPrice,
  minRating,
  onSelectCategory,
  onSelectStyle,
  onSelectRadius,
  onSelectPriceRange,
  onSelectMinRating,
  onResetAll,
  resultCount,
}) => {
  // Quản lý phần đang xổ xuống. Khi ấn chọn 1 giá trị -> setExpandedSection(null) để ẩn đi lập tức
  const [expandedSection, setExpandedSection] = useState<SectionKey>(null);

  const toggleSection = (key: SectionKey) => {
    Haptics.selectionAsync();
    setExpandedSection((prev) => (prev === key ? null : key));
  };

  const handleSelectOption = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
    // Yêu cầu người dùng: "chọn xong nó sẽ ẩn đi"
    setExpandedSection(null);
  };

  // Xác định nhãn hiển thị hiện tại cho từng section
  const currentCategory = categories.find((c) => c.id === selectedCategoryId);
  const currentCategoryLabel = currentCategory ? currentCategory.categoryName : 'Tất cả';

  const currentStyle = makeupStyles.find((s) => s.id === selectedStyleId);
  const currentStyleLabel = currentStyle ? currentStyle.styleName : 'Tất cả';

  const currentRadiusOpt = RADIUS_OPTIONS.find((r) => r.value === selectedRadiusKm);
  const currentRadiusLabel = currentRadiusOpt ? currentRadiusOpt.shortLabel : 'Tất cả';

  const currentPriceOpt = PRICE_OPTIONS.find((p) => p.min === minPrice && p.max === maxPrice);
  const currentPriceLabel = currentPriceOpt ? currentPriceOpt.shortLabel : 'Tất cả';

  const currentRatingOpt = RATING_OPTIONS.find((r) => r.value === (minRating ?? null));
  const currentRatingLabel = currentRatingOpt ? currentRatingOpt.shortLabel : 'Tất cả';

  // Đếm số lượng bộ lọc đang hoạt động
  let activeFilterCount = 0;
  if (selectedCategoryId !== null) activeFilterCount++;
  if (selectedStyleId !== null) activeFilterCount++;
  if (selectedRadiusKm !== null) activeFilterCount++;
  if (minPrice > 200000 || maxPrice < 5000000) activeFilterCount++;
  if (minRating != null) activeFilterCount++;

  return (
    <DismissibleModal
      visible={visible}
      onClose={onClose}
      overlayStyle={styles.overlay}
      contentStyle={styles.modalContent}
    >
      {/* HEADER BỘ LỌC */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="funnel" size={20} color={BrandColors.primary} />
          <Text style={styles.headerTitle}>Bộ Lọc Tìm Kiếm</Text>
          {activeFilterCount > 0 && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </View>


      </View>

      <Text style={styles.headerSubtitle}>
        Chọn từng tiêu chí bên dưới để tìm thợ MUA và Studio phù hợp nhất với bạn
      </Text>

      {/* DANH SÁCH CÁC PHẦN BỘ LỌC TÁCH BIỆT */}
      <ScrollView
        style={styles.scrollList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollInner}
      >
        {/* PHẦN 1: LOẠI HÌNH TRANG ĐIỂM (CATEGORY) */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={[
              styles.sectionHeader,
              expandedSection === 'CATEGORY' && styles.sectionHeaderActive,
            ]}
            onPress={() => toggleSection('CATEGORY')}
            activeOpacity={0.8}
          >
            <View style={styles.sectionTitleLeft}>
              <View style={[styles.sectionIconBox, { backgroundColor: '#FDF2F8' }]}>
                <Ionicons name="sparkles" size={16} color="#BE185D" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Loại hình dịch vụ</Text>
                <Text style={styles.sectionDescription}>Dịp hoặc mục đích trang điểm</Text>
              </View>
            </View>

            <View style={styles.sectionRight}>
              <View
                style={[
                  styles.valueTag,
                  selectedCategoryId !== null && styles.valueTagHighlight,
                ]}
              >
                <Text
                  style={[
                    styles.valueTagText,
                    selectedCategoryId !== null && styles.valueTagTextHighlight,
                  ]}
                  numberOfLines={1}
                >
                  {currentCategoryLabel}
                </Text>
              </View>
              <Ionicons
                name={expandedSection === 'CATEGORY' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={expandedSection === 'CATEGORY' ? BrandColors.primary : '#94A3B8'}
              />
            </View>
          </TouchableOpacity>

          {/* DROPDOWN XỔ XUỐNG CỦA PHẦN 1 */}
          {expandedSection === 'CATEGORY' && (
            <View style={styles.dropdownPanel}>
              <TouchableOpacity
                style={[
                  styles.optionRow,
                  selectedCategoryId === null && styles.optionRowSelected,
                ]}
                onPress={() => handleSelectOption(() => onSelectCategory(null))}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedCategoryId === null && styles.optionTextSelected,
                  ]}
                >
                  Tất cả loại hình
                </Text>
                {selectedCategoryId === null && (
                  <Ionicons name="checkmark-circle" size={18} color={BrandColors.primary} />
                )}
              </TouchableOpacity>

              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={`cat-${cat.id}`}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => handleSelectOption(() => onSelectCategory(cat.id))}
                  >
                    <Text
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                    >
                      {cat.categoryName}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={BrandColors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* PHẦN 2: PHONG CÁCH MAKE-UP (STYLE) */}
        {makeupStyles.length > 0 && (
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={[
                styles.sectionHeader,
                expandedSection === 'STYLE' && styles.sectionHeaderActive,
              ]}
              onPress={() => toggleSection('STYLE')}
              activeOpacity={0.8}
            >
              <View style={styles.sectionTitleLeft}>
                <View style={[styles.sectionIconBox, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="color-palette" size={16} color="#7C3AED" />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Phong cách make-up</Text>
                  <Text style={styles.sectionDescription}>Tone layout trang điểm</Text>
                </View>
              </View>

              <View style={styles.sectionRight}>
                <View
                  style={[
                    styles.valueTag,
                    selectedStyleId !== null && styles.valueTagHighlight,
                  ]}
                >
                  <Text
                    style={[
                      styles.valueTagText,
                      selectedStyleId !== null && styles.valueTagTextHighlight,
                    ]}
                    numberOfLines={1}
                  >
                    {currentStyleLabel}
                  </Text>
                </View>
                <Ionicons
                  name={expandedSection === 'STYLE' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={expandedSection === 'STYLE' ? BrandColors.primary : '#94A3B8'}
                />
              </View>
            </TouchableOpacity>

            {/* DROPDOWN XỔ XUỐNG CỦA PHẦN 2 */}
            {expandedSection === 'STYLE' && (
              <View style={styles.dropdownPanel}>
                <TouchableOpacity
                  style={[
                    styles.optionRow,
                    selectedStyleId === null && styles.optionRowSelected,
                  ]}
                  onPress={() => handleSelectOption(() => onSelectStyle(null))}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedStyleId === null && styles.optionTextSelected,
                    ]}
                  >
                    Tất cả phong cách
                  </Text>
                  {selectedStyleId === null && (
                    <Ionicons name="checkmark-circle" size={18} color={BrandColors.primary} />
                  )}
                </TouchableOpacity>

                {makeupStyles.map((st) => {
                  const isSelected = selectedStyleId === st.id;
                  return (
                    <TouchableOpacity
                      key={`st-${st.id}`}
                      style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                      onPress={() => handleSelectOption(() => onSelectStyle(st.id))}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.optionText, isSelected && styles.optionTextSelected]}
                        >
                          {st.styleName}
                        </Text>
                        {st.description ? (
                          <Text style={styles.optionDescription} numberOfLines={1}>
                            {st.description}
                          </Text>
                        ) : null}
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color={BrandColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* PHẦN 3: BÁN KÍNH GPS (RADIUS) */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={[
              styles.sectionHeader,
              expandedSection === 'RADIUS' && styles.sectionHeaderActive,
            ]}
            onPress={() => toggleSection('RADIUS')}
            activeOpacity={0.8}
          >
            <View style={styles.sectionTitleLeft}>
              <View style={[styles.sectionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="navigate" size={16} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Bán kính định vị GPS</Text>
                <Text style={styles.sectionDescription}>Khoảng cách từ vị trí của bạn</Text>
              </View>
            </View>

            <View style={styles.sectionRight}>
              <View
                style={[
                  styles.valueTag,
                  selectedRadiusKm !== null && styles.valueTagHighlight,
                ]}
              >
                <Text
                  style={[
                    styles.valueTagText,
                    selectedRadiusKm !== null && styles.valueTagTextHighlight,
                  ]}
                  numberOfLines={1}
                >
                  {currentRadiusLabel}
                </Text>
              </View>
              <Ionicons
                name={expandedSection === 'RADIUS' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={expandedSection === 'RADIUS' ? BrandColors.primary : '#94A3B8'}
              />
            </View>
          </TouchableOpacity>

          {/* DROPDOWN XỔ XUỐNG CỦA PHẦN 3 */}
          {expandedSection === 'RADIUS' && (
            <View style={styles.dropdownPanel}>
              {RADIUS_OPTIONS.map((opt) => {
                const isSelected = selectedRadiusKm === opt.value;
                return (
                  <TouchableOpacity
                    key={`rad-${opt.label}`}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() => handleSelectOption(() => onSelectRadius(opt.value))}
                  >
                    <Text
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={BrandColors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* PHẦN 4: KHOẢNG GIÁ NGÂN SÁCH (PRICE) */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={[
              styles.sectionHeader,
              expandedSection === 'PRICE' && styles.sectionHeaderActive,
            ]}
            onPress={() => toggleSection('PRICE')}
            activeOpacity={0.8}
          >
            <View style={styles.sectionTitleLeft}>
              <View style={[styles.sectionIconBox, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="pricetag" size={16} color="#059669" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Khoảng giá ngân sách</Text>
                <Text style={styles.sectionDescription}>Mức giá khởi điểm phù hợp</Text>
              </View>
            </View>

            <View style={styles.sectionRight}>
              <View
                style={[
                  styles.valueTag,
                  (minPrice > 200000 || maxPrice < 5000000) && styles.valueTagHighlight,
                ]}
              >
                <Text
                  style={[
                    styles.valueTagText,
                    (minPrice > 200000 || maxPrice < 5000000) && styles.valueTagTextHighlight,
                  ]}
                  numberOfLines={1}
                >
                  {currentPriceLabel}
                </Text>
              </View>
              <Ionicons
                name={expandedSection === 'PRICE' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={expandedSection === 'PRICE' ? BrandColors.primary : '#94A3B8'}
              />
            </View>
          </TouchableOpacity>

          {/* DROPDOWN XỔ XUỐNG CỦA PHẦN 4 */}
          {expandedSection === 'PRICE' && (
            <View style={styles.dropdownPanel}>
              {PRICE_OPTIONS.map((p, idx) => {
                const isSelected = minPrice === p.min && maxPrice === p.max;
                return (
                  <TouchableOpacity
                    key={`price-opt-${idx}`}
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                    onPress={() =>
                      handleSelectOption(() => onSelectPriceRange(p.min, p.max))
                    }
                  >
                    <Text
                      style={[styles.optionText, isSelected && styles.optionTextSelected]}
                    >
                      {p.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={BrandColors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* PHẦN 5: ĐÁNH GIÁ CHẤT LƯỢNG (RATING) */}
        {onSelectMinRating && (
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={[
                styles.sectionHeader,
                expandedSection === 'RATING' && styles.sectionHeaderActive,
              ]}
              onPress={() => toggleSection('RATING')}
              activeOpacity={0.8}
            >
              <View style={styles.sectionTitleLeft}>
                <View style={[styles.sectionIconBox, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="star" size={16} color="#D97706" />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Đánh giá sao tối thiểu</Text>
                  <Text style={styles.sectionDescription}>Chất lượng uy tín từ khách hàng</Text>
                </View>
              </View>

              <View style={styles.sectionRight}>
                <View
                  style={[
                    styles.valueTag,
                    minRating != null && styles.valueTagHighlight,
                  ]}
                >
                  <Text
                    style={[
                      styles.valueTagText,
                      minRating != null && styles.valueTagTextHighlight,
                    ]}
                    numberOfLines={1}
                  >
                    {currentRatingLabel}
                  </Text>
                </View>
                <Ionicons
                  name={expandedSection === 'RATING' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={expandedSection === 'RATING' ? BrandColors.primary : '#94A3B8'}
                />
              </View>
            </TouchableOpacity>

            {/* DROPDOWN XỔ XUỐNG CỦA PHẦN 5 */}
            {expandedSection === 'RATING' && (
              <View style={styles.dropdownPanel}>
                {RATING_OPTIONS.map((opt) => {
                  const isSelected = minRating === opt.value;
                  return (
                    <TouchableOpacity
                      key={`rating-${opt.label}`}
                      style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                      onPress={() =>
                        handleSelectOption(() => onSelectMinRating(opt.value))
                      }
                    >
                      <Text
                        style={[styles.optionText, isSelected && styles.optionTextSelected]}
                      >
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color={BrandColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* FOOTER ACTIONS */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onResetAll();
            setExpandedSection(null);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={16} color="#64748B" />
          <Text style={styles.resetBtnText}>Thiết lập lại</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.applyBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onClose();
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.applyBtnText}>
            Áp Dụng {resultCount !== undefined ? `(${resultCount})` : ''}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </DismissibleModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '82%',
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeBadge: {
    backgroundColor: BrandColors.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    paddingHorizontal: 20,
    marginBottom: 16,
    lineHeight: 18,
  },
  scrollList: {
    paddingHorizontal: 20,
  },
  scrollInner: {
    gap: 12,
    paddingBottom: 16,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  sectionHeaderActive: {
    backgroundColor: '#FFF1F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E6',
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionDescription: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '42%',
  },
  valueTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: 110,
  },
  valueTagHighlight: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
  },
  valueTagText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  valueTagTextHighlight: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  dropdownPanel: {
    backgroundColor: '#FAFAFA',
    paddingVertical: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  optionRowSelected: {
    backgroundColor: '#FFF1F2',
  },
  optionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    backgroundColor: BrandColors.primary,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
