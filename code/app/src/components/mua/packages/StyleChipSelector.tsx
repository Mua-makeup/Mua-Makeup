import { DismissibleModal } from '@/components/common/DismissibleModal';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MakeupStyle, taxonomyService } from '@/services/taxonomy.service';
import { BrandColors } from '@/constants/theme';

interface StyleChipSelectorProps {
  selectedStyleIds: number[];
  onChange: (ids: number[]) => void;
  error?: string;
}

export const StyleChipSelector: React.FC<StyleChipSelectorProps> = ({
  selectedStyleIds,
  onChange,
  error,
}) => {
  const insets = useSafeAreaInsets();
  const [stylesList, setStylesList] = useState<MakeupStyle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>(selectedStyleIds);

  useEffect(() => {
    loadStyles();
  }, []);

  useEffect(() => {
    setTempSelectedIds(selectedStyleIds);
  }, [selectedStyleIds]);

  const loadStyles = async () => {
    try {
      setLoading(true);
      const data = await taxonomyService.getActiveStyles();
      setStylesList(data);
    } catch (err) {
      console.error('Lỗi tải danh sách phong cách make-up:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setTempSelectedIds([...selectedStyleIds]);
    setShowModal(true);
  };

  const handleToggleTemp = (id: number) => {
    if (tempSelectedIds.includes(id)) {
      setTempSelectedIds(tempSelectedIds.filter((item) => item !== id));
    } else {
      setTempSelectedIds([...tempSelectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    setTempSelectedIds(stylesList.map((s) => s.id));
  };

  const handleDeselectAll = () => {
    setTempSelectedIds([]);
  };

  const handleConfirm = () => {
    onChange(tempSelectedIds);
    setShowModal(false);
  };

  const handleRemoveOne = (id: number) => {
    onChange(selectedStyleIds.filter((item) => item !== id));
  };

  const selectedStyles = stylesList.filter((s) => selectedStyleIds.includes(s.id));

  if (loading && stylesList.length === 0) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang tải danh sách phong cách...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Ô Trigger mở BottomSheet chọn phong cách - Chuẩn như ô Danh Mục Gốc */}
      <TouchableOpacity
        style={[styles.selectorInput, error ? styles.inputError : null]}
        onPress={handleOpenModal}
        activeOpacity={0.75}
      >
        <View style={styles.selectorContent}>
          <View
            style={[
              styles.iconCircle,
              selectedStyleIds.length > 0 ? styles.iconCircleActive : null,
            ]}
          >
            <Ionicons
              name="color-palette-outline"
              size={18}
              color={selectedStyleIds.length > 0 ? BrandColors.primary : '#64748B'}
            />
          </View>

          <View style={styles.textColumn}>
            <Text
              style={[
                styles.mainLabel,
                selectedStyleIds.length > 0 ? styles.mainLabelActive : null,
              ]}
              numberOfLines={1}
            >
              {selectedStyleIds.length > 0
                ? `Đã chọn ${selectedStyleIds.length} phong cách make-up`
                : 'Chọn các phong cách make-up'}
            </Text>
            <Text style={styles.subHint} numberOfLines={1}>
              {selectedStyleIds.length > 0
                ? 'Bấm để thêm hoặc đổi phong cách'
                : 'Tone Cam Đào, Tone Hàn Douyin, Tone Hồng Baby...'}
            </Text>
          </View>
        </View>

        <View style={styles.actionRight}>
          {selectedStyleIds.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{selectedStyleIds.length}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </View>
      </TouchableOpacity>

      {/* Hiển thị các phong cách đã chọn dưới dạng chip có chữ đầy đủ & nút xóa nhanh */}
      {selectedStyles.length > 0 && (
        <View style={styles.selectedTagsContainer}>
          {selectedStyles.map((st) => (
            <View key={st.id} style={styles.selectedTagPill}>
              <Ionicons name="sparkles" size={12} color={BrandColors.primary} />
              <Text style={styles.selectedTagText}>{st.styleName}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveOne(st.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={15} color="#BE185D" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* BottomSheet Modal chọn nhiều phong cách đầy đủ chữ & không bị nhảy xô lệch */}
      <DismissibleModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        overlayStyle={styles.modalOverlay}
        contentStyle={styles.bottomSheet}
      >
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Phong Cách Make-up</Text>
            <Text style={styles.modalSubtitle}>
              Chọn các phong cách tương thích với gói dịch vụ này
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowModal(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={22} color={BrandColors.slateHeading} />
          </TouchableOpacity>
        </View>

        {/* Thanh chọn nhanh & bộ đếm */}
        <View style={styles.quickBar}>
          <Text style={styles.quickBarCounter}>
            Đã chọn:{' '}
            <Text style={styles.quickBarCounterBold}>
              {tempSelectedIds.length}
            </Text>
            /{stylesList.length} phong cách
          </Text>

          <View style={styles.quickBarActions}>
            <TouchableOpacity onPress={handleSelectAll} activeOpacity={0.7}>
              <Text style={styles.quickActionText}>Chọn tất cả</Text>
            </TouchableOpacity>
            <Text style={styles.quickBarDot}>•</Text>
            <TouchableOpacity onPress={handleDeselectAll} activeOpacity={0.7}>
              <Text style={styles.quickActionTextDanger}>Bỏ chọn</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danh sách phong cách full-width hiển thị trọn vẹn 100% tên không bị cắt */}
        <ScrollView
          style={styles.stylesListScroll}
          contentContainerStyle={styles.stylesListScrollInner}
          showsVerticalScrollIndicator={false}
        >
          {stylesList.map((style) => {
            const isChecked = tempSelectedIds.includes(style.id);
            return (
              <TouchableOpacity
                key={style.id}
                style={[styles.styleRowCard, isChecked ? styles.styleRowCardChecked : null]}
                onPress={() => handleToggleTemp(style.id)}
                activeOpacity={0.75}
              >
                <View style={styles.styleRowLeft}>
                  <View
                    style={[
                      styles.styleIconBox,
                      isChecked ? styles.styleIconBoxChecked : null,
                    ]}
                  >
                    <Ionicons
                      name="sparkles"
                      size={15}
                      color={isChecked ? BrandColors.primary : '#94A3B8'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.styleNameText,
                      isChecked ? styles.styleNameTextChecked : null,
                    ]}
                  >
                    {style.styleName}
                  </Text>
                </View>

                {/* Checkbox tròn cố định kích thước bên phải */}
                <View
                  style={[
                    styles.checkboxCircle,
                    isChecked ? styles.checkboxCircleChecked : null,
                  ]}
                >
                  {isChecked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Nút xác nhận dưới đáy kèm Safe Area Inset chống sát khung */}
        <View style={[styles.bottomActionBox, { paddingBottom: Math.max(insets.bottom + 16, 26) }]}>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirm}
            activeOpacity={0.88}
          >
            <Text style={styles.confirmBtnText}>
              Xác Nhận ({tempSelectedIds.length} phong cách)
            </Text>
          </TouchableOpacity>
        </View>
      </DismissibleModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: BrandColors.slateMuted,
    marginLeft: 8,
  },

  // Trigger input selector trên form chính
  selectorInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  inputError: {
    borderColor: BrandColors.danger,
    backgroundColor: '#FFF5F5',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: '#FFF1F2',
    borderColor: BrandColors.primary,
  },
  textColumn: {
    flex: 1,
  },
  mainLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  mainLabelActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  subHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Selected pills dưới ô trigger
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  selectedTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  selectedTagText: {
    fontSize: 12.5,
    color: '#9F1239',
    fontWeight: '600',
  },

  errorText: {
    fontSize: 12,
    color: BrandColors.danger,
    marginTop: 6,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  modalSubtitle: {
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
  },

  quickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  quickBarCounter: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  quickBarCounterBold: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  quickBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 12.5,
    color: '#2563EB',
    fontWeight: '600',
  },
  quickBarDot: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  quickActionTextDanger: {
    fontSize: 12.5,
    color: '#E11D48',
    fontWeight: '600',
  },

  stylesListScroll: {
    maxHeight: 340,
  },
  stylesListScrollInner: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    gap: 10,
  },
  styleRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  styleRowCardChecked: {
    backgroundColor: '#FFF1F2',
    borderColor: BrandColors.primary,
  },
  styleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  styleIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleIconBoxChecked: {
    backgroundColor: '#FFE4E6',
    borderColor: BrandColors.primary,
  },
  styleNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  styleNameTextChecked: {
    color: '#9F1239',
    fontWeight: '700',
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleChecked: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },

  bottomActionBox: {
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  confirmBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
