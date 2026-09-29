import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { PackageDetail, PackageItem } from '@/services/package.service';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  selectedPackage: PackageDetail | null;
}

// Danh sách các bước làm đẹp mặc định fallback nếu gói chưa cấu hình items
const DEFAULT_BEAUTY_STEPS: PackageItem[] = [
  {
    id: 101,
    itemName: 'Làm sạch da & Cấp ẩm chuyên sâu',
    description: 'Tẩy trang nhẹ nhàng, thoa toner cân bằng và serum dưỡng ẩm chống mốc nền.',
    durationMinutes: 10,
    itemType: 'INCLUDED',
    isRequired: true,
  },
  {
    id: 102,
    itemName: 'Lót nền kiềm dầu & Đánh nền che khuyết điểm',
    description: 'Đánh nền mỏng nhẹ, che thâm mụn, quầng mắt với kem nền chuyên dụng lâu trôi 12h.',
    durationMinutes: 25,
    itemType: 'INCLUDED',
    isRequired: true,
  },
  {
    id: 103,
    itemName: 'Kẻ chân mày & Phối màu mắt chuẩn phong cách',
    description: 'Tỉa chân mày, kẻ eyeliner sắc nét, đánh nhũ bắt sáng và chuốt mi cong tự nhiên.',
    durationMinutes: 20,
    itemType: 'INCLUDED',
    isRequired: true,
  },
  {
    id: 104,
    itemName: 'Tạo khối gò má, sống mũi & Đánh son lòng môi',
    description: 'Tạo khối thanh thoát gương mặt, má hồng hào và son bền màu dưỡng bóng căng mọng.',
    durationMinutes: 15,
    itemType: 'INCLUDED',
    isRequired: true,
  },
  {
    id: 105,
    itemName: 'Tạo kiểu tóc đi kèm phù hợp trang phục',
    description: 'Uốn xoăn sóng lơi, bới tóc cô dâu hoặc tết tóc dự tiệc theo yêu cầu.',
    durationMinutes: 20,
    itemType: 'INCLUDED',
    isRequired: true,
  },
];

const DEFAULT_ADDONS: PackageItem[] = [
  {
    id: 201,
    itemName: 'Dán mi giả sợi 3D cao cấp gân trong',
    description: 'Mi siêu nhẹ, mềm mượt tự nhiên, không cộm mắt.',
    itemPrice: 70000,
    durationMinutes: 10,
    itemType: 'OPTIONAL_ADDON',
  },
  {
    id: 202,
    itemName: 'Đính đá / Ngọc trai nghệ thuật quanh mắt',
    description: 'Tạo điểm nhấn lung linh cho concept tiệc đêm và chụp ảnh.',
    itemPrice: 100000,
    durationMinutes: 15,
    itemType: 'OPTIONAL_ADDON',
  },
  {
    id: 203,
    itemName: 'Đánh phấn bắt sáng & Nền body cổ, vai, gáy',
    description: 'Đều màu da toàn diện khi mặc váy hở vai hoặc đầm dạ hội.',
    itemPrice: 150000,
    durationMinutes: 15,
    itemType: 'OPTIONAL_ADDON',
  },
];

export const PackageIncludedSteps: React.FC<Props> = ({ selectedPackage }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!selectedPackage) return null;

  // Lấy các bước từ package nếu có, hoặc dùng danh sách fallback
  const rawItems = selectedPackage.items && selectedPackage.items.length > 0
    ? selectedPackage.items
    : [...DEFAULT_BEAUTY_STEPS, ...DEFAULT_ADDONS];

  const includedSteps = rawItems.filter(
    (i) => i.itemType === 'INCLUDED' || i.itemType === 'COMPONENT' || !i.itemPrice
  );

  const addonSteps = rawItems.filter(
    (i) => i.itemType === 'OPTIONAL_ADDON' || i.itemType === 'ADD_ON' || (i.itemPrice && i.itemPrice > 0)
  );

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const formatVnd = (amount?: number) => {
    if (!amount) return '0 đ';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  return (
    <View style={styles.container}>
      {/* HEADER SECTION */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.titleWithIcon}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={16} color={BrandColors.primary} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Quy Trình & Các Bước Thực Hiện</Text>
            <Text style={styles.sectionSubtitle}>
              {includedSteps.length} bước mặc định
              {addonSteps.length > 0 ? ` • ${addonSteps.length} tùy chọn làm thêm` : ''}
            </Text>
          </View>
        </View>

        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#64748B"
        />
      </TouchableOpacity>

      {/* BODY CONTENT */}
      {isExpanded && (
        <View style={styles.content}>
          {/* CÁC BƯỚC MẶC ĐỊNH ĐÃ BAO GỒM */}
          <View style={styles.stepGroup}>
            <View style={styles.groupHeaderBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.groupHeaderText}>Đã bao gồm trong giá gói:</Text>
            </View>

            {includedSteps.map((step, idx) => (
              <View key={`inc-step-${step.id}-${idx}`} style={styles.stepItemRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>{idx + 1}</Text>
                </View>
                <View style={styles.stepInfoCol}>
                  <View style={styles.stepNameRow}>
                    <Text style={styles.stepNameText}>{step.itemName}</Text>
                    {step.durationMinutes ? (
                      <Text style={styles.stepDurationText}>
                        ~{step.durationMinutes} ph
                      </Text>
                    ) : null}
                  </View>
                  {step.description ? (
                    <Text style={styles.stepDescText}>{step.description}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          {/* CÁC BƯỚC TÙY CHỌN NÂNG CẤP / LÀM THÊM (ADD-ONS) */}
          {addonSteps.length > 0 && (
            <View style={styles.addonGroup}>
              <View style={[styles.groupHeaderBadge, styles.addonHeaderBadge]}>
                <Ionicons name="add-circle" size={14} color={BrandColors.primary} />
                <Text style={[styles.groupHeaderText, styles.addonHeaderText]}>
                  Tùy chọn nâng cấp thêm (Chọn khi đặt hẹn):
                </Text>
              </View>

              {addonSteps.map((addon, idx) => (
                <View key={`addon-step-${addon.id}-${idx}`} style={styles.addonCard}>
                  <View style={styles.addonLeft}>
                    <View style={styles.addonDot} />
                    <View style={styles.addonTextCol}>
                      <Text style={styles.addonNameText}>{addon.itemName}</Text>
                      {addon.description ? (
                        <Text style={styles.addonDescText}>{addon.description}</Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.addonPriceCol}>
                    <Text style={styles.addonPriceText}>
                      +{formatVnd(addon.itemPrice)}
                    </Text>
                    {addon.durationMinutes ? (
                      <Text style={styles.addonDurationText}>
                        +{addon.durationMinutes} phút
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  content: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  stepGroup: {
    gap: 12,
  },
  groupHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  groupHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  stepInfoCol: {
    flex: 1,
  },
  stepNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    paddingRight: 8,
  },
  stepDurationText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  stepDescText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  addonGroup: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    gap: 10,
  },
  addonHeaderBadge: {
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
  },
  addonHeaderText: {
    color: BrandColors.primary,
  },
  addonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  addonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  addonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.primary,
  },
  addonTextCol: {
    flex: 1,
  },
  addonNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  addonDescText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  addonPriceCol: {
    alignItems: 'flex-end',
  },
  addonPriceText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  addonDurationText: {
    fontSize: 10,
    color: '#94A3B8',
  },
});
