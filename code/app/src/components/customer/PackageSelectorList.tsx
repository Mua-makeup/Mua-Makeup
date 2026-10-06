import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { PackageDetail } from '@/services/package.service';
import { DismissibleModal } from '@/components/common/DismissibleModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
// Độ rộng card vàng: ~80% màn hình, tối thiểu 285px và tối đa 330px -> hiển thị trọn vẹn tiêu đề và bước làm mà vẫn lộ card kế tiếp
const CARD_WIDTH = Math.round(Math.min(330, Math.max(285, SCREEN_WIDTH * 0.78)));

interface Props {
  packages: PackageDetail[];
  selectedPackage: PackageDetail | null;
  onSelectPackage: (pkg: PackageDetail) => void;
}

export const PackageSelectorList: React.FC<Props> = ({
  packages,
  selectedPackage,
  onSelectPackage,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [showAllModal, setShowAllModal] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Danh sách các danh mục có trong các gói
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(packages.map((p) => p.categoryName).filter(Boolean))
    ) as string[];
    return cats;
  }, [packages]);

  // Lọc theo danh mục nếu có
  const filteredPackages = useMemo(() => {
    if (selectedCat === 'ALL') return packages;
    return packages.filter((p) => p.categoryName === selectedCat);
  }, [packages, selectedCat]);

  // Tự động scroll đến gói đang chọn khi thay đổi
  useEffect(() => {
    if (selectedPackage) {
      const idx = filteredPackages.findIndex((p) => p.id === selectedPackage.id);
      if (idx !== -1 && idx !== activeIndex) {
        scrollToIndex(idx);
      }
    }
  }, [selectedPackage?.id, filteredPackages]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    if (index >= 0 && index < filteredPackages.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const scrollToIndex = (index: number) => {
    scrollRef.current?.scrollTo({
      x: index * (CARD_WIDTH + CARD_GAP),
      animated: true,
    });
    setActiveIndex(index);
  };

  if (packages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="sparkles-outline" size={24} color="#94A3B8" />
        <Text style={styles.emptyText}>Thợ hiện chưa có gói dịch vụ nào hoạt động.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Header chọn gói & nút Mở danh sách toàn bộ */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Chọn Gói Dịch Vụ Make-up</Text>
          <Text style={styles.subtitle}>Bấm chọn để xem ảnh mẫu thực tế bên dưới</Text>
        </View>

        {packages.length > 1 && (
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => setShowAllModal(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="apps-outline" size={14} color={BrandColors.primary} />
            <Text style={styles.viewAllBtnText}>Tất cả ({packages.length})</Text>
            <Ionicons name="chevron-forward" size={12} color={BrandColors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Bộ lọc danh mục nhanh (khi có 2 danh mục trở lên) */}
      {categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFilterRow}
        >
          <TouchableOpacity
            style={[
              styles.categoryFilterChip,
              selectedCat === 'ALL' && styles.categoryFilterChipActive,
            ]}
            onPress={() => {
              setSelectedCat('ALL');
              setActiveIndex(0);
              scrollRef.current?.scrollTo({ x: 0, animated: true });
            }}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.categoryFilterText,
                selectedCat === 'ALL' && styles.categoryFilterTextActive,
              ]}
            >
              Tất cả ({packages.length})
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => {
            const count = packages.filter((p) => p.categoryName === cat).length;
            const isCatActive = selectedCat === cat;
            return (
              <TouchableOpacity
                key={`cat-${cat}`}
                style={[
                  styles.categoryFilterChip,
                  isCatActive && styles.categoryFilterChipActive,
                ]}
                onPress={() => {
                  setSelectedCat(cat);
                  setActiveIndex(0);
                  scrollRef.current?.scrollTo({ x: 0, animated: true });
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.categoryFilterText,
                    isCatActive && styles.categoryFilterTextActive,
                  ]}
                >
                  {cat} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* 3. Dãy thẻ gói dịch vụ: Vuốt Snap từng thẻ mượt mà + Peek thẻ tiếp theo */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {filteredPackages.map((pkg) => {
          const isSelected = selectedPackage?.id === pkg.id;
          const isAvailable = pkg.isAvailable !== false;
          const formattedPrice = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
          }).format(pkg.price);
          const duration = pkg.durationMinutes || pkg.estimatedDurationMinutes || 60;

          return (
            <TouchableOpacity
              key={`pkg-sel-${pkg.id}`}
              style={[
                styles.card,
                !isAvailable && styles.cardPaused,
                isSelected && (isAvailable ? styles.cardSelected : styles.cardPausedSelected),
              ]}
              onPress={() => onSelectPackage(pkg)}
              activeOpacity={0.82}
            >
              {/* Header của thẻ gói */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, paddingRight: 4 }}>
                  <Text
                    style={[
                      styles.packageName,
                      isSelected && (isAvailable ? styles.packageNameSelected : styles.packageNamePausedSelected),
                    ]}
                    numberOfLines={2}
                  >
                    {pkg.packageName}
                  </Text>
                  {pkg.categoryName && (
                    <Text style={styles.categorySubtitle}>{pkg.categoryName}</Text>
                  )}
                </View>

                {isSelected ? (
                  <View style={[styles.selectedBadge, !isAvailable && styles.selectedBadgePaused]}>
                    <Ionicons
                      name={isAvailable ? 'checkmark-circle' : 'eye'}
                      size={12}
                      color="#FFFFFF"
                    />
                    <Text style={styles.selectedBadgeText}>
                      {isAvailable ? 'Đang chọn' : 'Đang xem'}
                    </Text>
                  </View>
                ) : !isAvailable ? (
                  <View style={styles.pausedPill}>
                    <Text style={styles.pausedPillText}>Chỉ xem</Text>
                  </View>
                ) : null}
              </View>

              {/* Thông tin phụ: Thời lượng & Trạng thái */}
              <View style={styles.metaRow}>
                <View style={styles.durationBox}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={isSelected && isAvailable ? BrandColors.primary : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.durationText,
                      isSelected && isAvailable && styles.durationTextSelected,
                    ]}
                  >
                    {duration} phút
                  </Text>
                </View>
                {!isAvailable && (
                  <View style={styles.unavailableChip}>
                    <Text style={styles.unavailableChipText}>Tạm dừng nhận lịch</Text>
                  </View>
                )}
              </View>

              {/* Giá gói niêm yết */}
              <Text
                style={[
                  styles.priceText,
                  !isAvailable && styles.priceTextPaused,
                  isSelected && isAvailable && styles.priceTextSelected,
                ]}
              >
                {formattedPrice}
              </Text>

              {/* Tóm tắt quy trình các bước trong gói */}
              {pkg.items && pkg.items.length > 0 ? (
                <View style={styles.itemsBox}>
                  <Text style={styles.itemsTitle}>Bao gồm {pkg.items.length} bước tiêu chuẩn:</Text>
                  {pkg.items.slice(0, 2).map((it, idx) => (
                    <Text key={`it-${idx}`} style={styles.itemBullet} numberOfLines={1}>
                      • {it.itemName}
                    </Text>
                  ))}
                  {pkg.items.length > 2 && (
                    <Text style={styles.itemMoreText}>+ {pkg.items.length - 2} bước nữa...</Text>
                  )}
                </View>
              ) : (
                <View style={styles.emptyStepsBox}>
                  <Text style={styles.emptyStepsText}>Dịch vụ trọn gói chuẩn chuyên nghiệp</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 4. Thanh chỉ số phân trang Pagination Dots */}
      {filteredPackages.length > 1 && (
        <View style={styles.paginationRow}>
          <View style={styles.dotsContainer}>
            {filteredPackages.map((_, idx) => {
              const isActive = idx === activeIndex;
              return (
                <TouchableOpacity
                  key={`dot-${idx}`}
                  style={[styles.dot, isActive && styles.dotActive]}
                  onPress={() => scrollToIndex(idx)}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                />
              );
            })}
          </View>
          <Text style={styles.paginationText}>
            Gói {activeIndex + 1} / {filteredPackages.length}
          </Text>
        </View>
      )}

      {/* 5. Modal BottomSheet xem & so sánh tất cả các gói dịch vụ */}
      <DismissibleModal
        visible={showAllModal}
        onClose={() => setShowAllModal(false)}
        overlayStyle={styles.modalOverlay}
        contentStyle={styles.modalContent}
      >
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>Tất Cả Gói Dịch Vụ ({packages.length})</Text>
            <Text style={styles.modalSubtitle}>
              Chạm vào gói để chọn đặt lịch hoặc xem các bước & ảnh mẫu
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.modalList}
          contentContainerStyle={{ paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}
        >
          {packages.map((pkg) => {
            const isSelected = selectedPackage?.id === pkg.id;
            const isAvailable = pkg.isAvailable !== false;
            const formattedPrice = new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(pkg.price);
            const duration = pkg.durationMinutes || pkg.estimatedDurationMinutes || 60;

            return (
              <TouchableOpacity
                key={`modal-pkg-${pkg.id}`}
                style={[
                  styles.modalPkgCard,
                  isSelected && styles.modalPkgCardSelected,
                  !isAvailable && styles.modalPkgCardPaused,
                ]}
                onPress={() => {
                  onSelectPackage(pkg);
                  setShowAllModal(false);
                }}
                activeOpacity={0.75}
              >
                <View style={styles.modalPkgHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.modalPkgTitle, isSelected && styles.modalPkgTitleSelected]}>
                      {pkg.packageName}
                    </Text>
                    <View style={styles.modalMetaRow}>
                      <Ionicons name="time-outline" size={13} color="#64748B" />
                      <Text style={styles.modalMetaText}>{duration} phút</Text>
                      {pkg.categoryName && (
                        <View style={styles.modalCatBadge}>
                          <Text style={styles.modalCatBadgeText}>{pkg.categoryName}</Text>
                        </View>
                      )}
                      {!isAvailable && (
                        <View style={styles.unavailableChip}>
                          <Text style={styles.unavailableChipText}>Tạm dừng nhận lịch</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </View>

                <View style={styles.modalPriceRow}>
                  <Text style={[styles.modalPriceText, isSelected && styles.modalPriceTextSelected]}>
                    {formattedPrice}
                  </Text>
                  {isSelected ? (
                    <View style={styles.selectedPill}>
                      <Ionicons name="checkmark-circle" size={12} color="#FFFFFF" />
                      <Text style={styles.selectedPillText}>Đang chọn</Text>
                    </View>
                  ) : null}
                </View>

                {pkg.items && pkg.items.length > 0 && (
                  <View style={styles.modalStepsBox}>
                    <Text style={styles.modalStepsTitle}>
                      Quy trình {pkg.items.length} bước thực hiện:
                    </Text>
                    {pkg.items.slice(0, 3).map((it, idx) => (
                      <Text key={`m-it-${idx}`} style={styles.modalStepItem} numberOfLines={1}>
                        • {it.itemName}
                      </Text>
                    ))}
                    {pkg.items.length > 3 && (
                      <Text style={styles.modalStepMore}>
                        + {pkg.items.length - 3} bước nữa...
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </DismissibleModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  viewAllBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: BrandColors.primary,
  },

  // Category Filter Row
  categoryFilterRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 8,
  },
  categoryFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryFilterChipActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Scroll Content & Card
  scrollContent: {
    paddingHorizontal: 16,
    gap: CARD_GAP,
    paddingTop: 4,
    paddingBottom: 8,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
    minHeight: 42,
  },
  packageName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 21,
  },
  packageNameSelected: {
    color: '#9F1239',
  },
  categorySubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  selectedBadge: {
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  durationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  durationTextSelected: {
    color: BrandColors.primary,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  priceTextSelected: {
    color: BrandColors.primary,
  },
  itemsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemsTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  itemBullet: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 17,
  },
  itemMoreText: {
    fontSize: 10.5,
    color: BrandColors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyStepsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  emptyStepsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  // Pagination Dots
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 6,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 18,
    backgroundColor: BrandColors.primary,
  },
  paginationText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
  },

  // Paused Card
  cardPaused: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.85,
  },
  cardPausedSelected: {
    backgroundColor: '#F1F5F9',
    borderColor: '#94A3B8',
    opacity: 1,
  },
  packageNamePausedSelected: {
    color: '#334155',
  },
  selectedBadgePaused: {
    backgroundColor: '#64748B',
  },
  pausedPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
  },
  pausedPillText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
  },
  unavailableChip: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  unavailableChipText: {
    fontSize: 9.5,
    color: '#EF4444',
    fontWeight: '600',
  },
  priceTextPaused: {
    color: '#64748B',
  },

  // BottomSheet Modal All Packages
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
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
  modalList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalPkgCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  modalPkgCardSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF1F2',
  },
  modalPkgCardPaused: {
    opacity: 0.75,
  },
  modalPkgHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalPkgTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalPkgTitleSelected: {
    color: '#9F1239',
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  modalMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  modalCatBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalCatBadgeText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleSelected: {
    borderColor: BrandColors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: BrandColors.primary,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalPriceText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalPriceTextSelected: {
    color: BrandColors.primary,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalStepsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
  },
  modalStepsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  modalStepItem: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
  },
  modalStepMore: {
    fontSize: 11,
    color: BrandColors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
});
