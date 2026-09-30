import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { MasterCategory, MakeupStyle } from '@/services/taxonomy.service';

interface Props {
  visible: boolean;
  topOffset?: number;
  keyword: string;
  categories: MasterCategory[];
  styles: MakeupStyle[];
  onSelectSuggestion: (
    suggestionText: string,
    categoryId?: number | null,
    styleId?: number | null
  ) => void;
  onClose: () => void;
}

// 5 loại hình make-up chuẩn theo database
export const POPULAR_MAKEUP_TYPES = [
  {
    code: 'MAKE_CO_DAU',
    title: 'Trang điểm Cô Dâu',
    subtitle: 'Đón dâu, ăn hỏi, tiệc cưới đêm',
    iconName: 'heart' as const,
  },
  {
    code: 'MAKE_TIEC',
    title: 'Trang điểm Tiệc & Sự kiện',
    subtitle: 'Dạ hội, sinh nhật, gala, prom',
    iconName: 'wine' as const,
  },
  {
    code: 'MAKE_KY_YEU',
    title: 'Trang điểm Kỷ Yếu / Học Sinh',
    subtitle: 'Tự nhiên, trong trẻo, chụp ngoài trời',
    iconName: 'school' as const,
  },
  {
    code: 'MAKE_CHUP_ANH',
    title: 'Trang điểm Concept / Chụp ảnh Studio',
    subtitle: 'Nghệ thuật, lookbook, thời trang',
    iconName: 'camera' as const,
  },
  {
    code: 'MAKE_HANG_NGAY',
    title: 'Trang điểm Đi làm / Hàng ngày',
    subtitle: 'Nhẹ nhàng công sở, gặp gỡ bạn bè',
    iconName: 'sunny' as const,
  },
];

export const SearchSuggestionsOverlay: React.FC<Props> = ({
  visible,
  topOffset = 64,
  keyword,
  categories,
  styles: makeupStyles,
  onSelectSuggestion,
  onClose,
}) => {
  if (!visible) return null;

  const normalizedKeyword = keyword.trim().toLowerCase();

  // Lọc các loại hình make theo từ khóa đang gõ (nếu có)
  const filteredTypes = POPULAR_MAKEUP_TYPES.filter(
    (t) =>
      !normalizedKeyword ||
      t.title.toLowerCase().includes(normalizedKeyword) ||
      t.subtitle.toLowerCase().includes(normalizedKeyword)
  );

  // Lọc các phong cách hot
  const filteredStyles = makeupStyles.filter(
    (s) =>
      !normalizedKeyword || s.styleName.toLowerCase().includes(normalizedKeyword)
  );

  const handleSelectType = (typeItem: typeof POPULAR_MAKEUP_TYPES[0]) => {
    Keyboard.dismiss();
    // Tìm categoryId tương ứng trong DB categories nếu có
    const matchedCat = categories.find(
      (c) =>
        c.categoryCode === typeItem.code ||
        c.categoryName.toLowerCase().includes(typeItem.title.toLowerCase())
    );
    onSelectSuggestion(typeItem.title, matchedCat ? matchedCat.id : null, null);
  };

  const handleSelectStyle = (styleItem: MakeupStyle) => {
    Keyboard.dismiss();
    onSelectSuggestion(styleItem.styleName, null, styleItem.id);
  };

  return (
    <View style={[styles.container, { top: topOffset }]}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.contentBox}>
        {/* THANH TIỆN ÍCH TRÊN CÙNG KÈM NÚT ĐÓNG RÕ RÀNG */}
        <View style={styles.topActionBar}>
          <Text style={styles.topActionTitle}>GỢI Ý TÌM KIẾM NHANH</Text>
          <TouchableOpacity
            style={styles.closeOverlayBtn}
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={15} color="#475569" />
            <Text style={styles.closeOverlayText}>Đóng</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* PHẦN 1: CÁC LOẠI HÌNH MAKE-UP CHÍNH */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="sparkles" size={16} color={BrandColors.primary} />
              <Text style={styles.sectionTitle}>Gợi Ý Loại Hình Dịch Vụ</Text>
            </View>
            <Text style={styles.sectionHint}>Chạm để tìm nhanh</Text>
          </View>

          <View style={styles.typeList}>
            {filteredTypes.map((item) => (
              <TouchableOpacity
                key={`sugg-${item.code}`}
                style={styles.typeItem}
                onPress={() => handleSelectType(item)}
                activeOpacity={0.7}
              >
                <View style={styles.typeIconBox}>
                  <Ionicons name={item.iconName} size={18} color={BrandColors.primary} />
                </View>
                <View style={styles.typeTextCol}>
                  <Text style={styles.typeTitle}>{item.title}</Text>
                  <Text style={styles.typeSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>

          {/* PHẦN 2: PHONG CÁCH MAKEUP THỊNH HÀNH */}
          {filteredStyles.length > 0 && (
            <View style={styles.styleSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="flame" size={16} color="#F97316" />
                  <Text style={styles.sectionTitle}>Phong Cách Thịnh Hành</Text>
                </View>
              </View>

              <View style={styles.styleChipWrap}>
                {filteredStyles.slice(0, 8).map((s) => (
                  <TouchableOpacity
                    key={`sugg-style-${s.id}`}
                    style={styles.styleChip}
                    onPress={() => handleSelectStyle(s)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="color-palette-outline" size={13} color="#475569" />
                    <Text style={styles.styleChipText}>{s.styleName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  contentBox: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    maxHeight: '75%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionHint: {
    fontSize: 11,
    color: '#94A3B8',
  },
  typeList: {
    gap: 6,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeTextCol: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  typeSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  styleSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  styleChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  styleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  topActionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  closeOverlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  closeOverlayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
});
