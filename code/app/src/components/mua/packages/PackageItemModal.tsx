import { DismissibleModal } from '@/components/common/DismissibleModal';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { CreatePackageItemReq, PackageItem } from '@/services/package.service';
import { packageItemSchema } from '@/schemas/package-builder.schema';

interface PackageItemModalProps {
  visible: boolean;
  initialItem?: PackageItem | null;
  defaultStepOrder?: number;
  onSave: (item: CreatePackageItemReq) => Promise<void>;
  onClose: () => void;
}

const DURATION_PRESETS = [5, 10, 15, 20, 30, 45, 60];
const PRICE_PRESETS = [30000, 50000, 80000, 100000, 150000, 200000];

const COMPONENT_SUGGESTIONS = [
  'Đánh nền mỏng nhẹ',
  'Kẻ eyeliner & phấn mắt',
  'Tạo khối & má hồng',
  'Tô son môi quyến rũ',
];

const ADDON_SUGGESTIONS = [
  'Dán mi giả 3D cao cấp',
  'Đính đá nghệ thuật',
  'Đánh nền body che khuyết điểm',
  'Tạo kiểu tóc & phụ kiện',
];

export const PackageItemModal: React.FC<PackageItemModalProps> = ({
  visible,
  initialItem,
  defaultStepOrder = 1,
  onSave,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState<'COMPONENT' | 'ADD_ON'>('COMPONENT');
  const [itemPrice, setItemPrice] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('15');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialItem) {
        const isAddon =
          initialItem.itemType === 'ADD_ON' || initialItem.itemType === 'OPTIONAL_ADDON';
        setItemName(initialItem.itemName || '');
        setItemType(isAddon ? 'ADD_ON' : 'COMPONENT');
        setItemPrice(
          initialItem.itemPrice ? Number(initialItem.itemPrice).toLocaleString('vi-VN') : '0'
        );
        setDurationMinutes(initialItem.durationMinutes?.toString() || '15');
      } else {
        setItemName('');
        setItemType('COMPONENT');
        setItemPrice('0');
        setDurationMinutes('15');
      }
      setErrors({});
    }
  }, [visible, initialItem]);

  const handleAdjustDuration = (delta: number) => {
    const current = Number(durationMinutes) || 15;
    const next = Math.max(5, Math.min(180, current + delta));
    setDurationMinutes(next.toString());
  };

  const handleAdjustPrice = (delta: number) => {
    const current = Number(itemPrice.replace(/\D/g, '')) || 0;
    const next = Math.max(0, current + delta);
    setItemPrice(next > 0 ? next.toLocaleString('vi-VN') : '0');
    if (errors.itemPrice) {
      setErrors((prev) => ({ ...prev, itemPrice: '' }));
    }
  };

  const handleSubmit = async () => {
    const rawData = {
      itemName: itemName.trim(),
      itemType,
      itemPrice: itemType === 'COMPONENT' ? 0 : Number(itemPrice.replace(/\D/g, '') || 0),
      durationMinutes: Number(durationMinutes) || 0,
      stepOrder: initialItem?.stepOrder || defaultStepOrder,
      isRequired: itemType === 'COMPONENT',
      isActive: true,
    };

    const validation = packageItemSchema.safeParse(rawData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setSaving(true);
      await onSave(validation.data);
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Lưu bước dịch vụ thất bại.' });
    } finally {
      setSaving(false);
    }
  };

  const suggestions = itemType === 'COMPONENT' ? COMPONENT_SUGGESTIONS : ADDON_SUGGESTIONS;

  return (
    <DismissibleModal
      visible={visible}
      onClose={onClose}
      dismissDisabled={saving}
      overlayStyle={styles.overlay}
      contentStyle={styles.bottomSheet}
      avoidKeyboard={true}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            {initialItem ? 'Chỉnh Sửa Bước Dịch Vụ' : 'Thêm Bước / Tùy Chọn Mới'}
          </Text>
          <Text style={styles.subtitle}>
            {itemType === 'COMPONENT'
              ? 'Quy trình trang điểm chuẩn trong gói'
              : 'Tùy chọn dịch vụ khách có thể mua thêm'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={22} color={BrandColors.slateHeading} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: Math.max(insets.bottom + 20, 36) },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {errors.form ? (
          <View style={styles.formErrorBox}>
            <Text style={styles.formErrorText}>{errors.form}</Text>
          </View>
        ) : null}

        {/* 1. Loại bước thực hiện: 2 thẻ tùy chọn độc lập rộng rãi, không bị sát mép */}
        <Text style={styles.label}>Loại Bước Thực Hiện *</Text>
        <View style={styles.typeCardsColumn}>
          <TouchableOpacity
            style={[
              styles.typeCard,
              itemType === 'COMPONENT' && styles.typeCardActive,
            ]}
            onPress={() => {
              setItemType('COMPONENT');
              setItemPrice('0');
            }}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.typeIconBox,
                itemType === 'COMPONENT' && styles.typeIconBoxActive,
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={itemType === 'COMPONENT' ? BrandColors.primary : '#94A3B8'}
              />
            </View>
            <View style={styles.typeTextCol}>
              <Text
                style={[
                  styles.typeCardTitle,
                  itemType === 'COMPONENT' && styles.typeCardTitleActive,
                ]}
              >
                Bước Mặc Định Trong Gói
              </Text>
              <Text style={styles.typeCardSubtitle}>
                Đã bao gồm trong giá niêm yết, không phụ thu thêm
              </Text>
            </View>
            <View
              style={[
                styles.radioIndicator,
                itemType === 'COMPONENT' && styles.radioIndicatorActive,
              ]}
            >
              {itemType === 'COMPONENT' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeCard,
              itemType === 'ADD_ON' && styles.typeCardActive,
            ]}
            onPress={() => setItemType('ADD_ON')}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.typeIconBox,
                itemType === 'ADD_ON' && styles.typeIconBoxActive,
              ]}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={itemType === 'ADD_ON' ? BrandColors.primary : '#94A3B8'}
              />
            </View>
            <View style={styles.typeTextCol}>
              <Text
                style={[
                  styles.typeCardTitle,
                  itemType === 'ADD_ON' && styles.typeCardTitleActive,
                ]}
              >
                Tùy Chọn Mua Thêm (Add-on)
              </Text>
              <Text style={styles.typeCardSubtitle}>
                Khách tick chọn thêm khi đặt lịch (có cộng tiền & giờ)
              </Text>
            </View>
            <View
              style={[
                styles.radioIndicator,
                itemType === 'ADD_ON' && styles.radioIndicatorActive,
              ]}
            >
              {itemType === 'ADD_ON' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* 2. Tên bước thực hiện */}
        <View style={styles.fieldSection}>
          <Text style={styles.label}>Tên Bước / Dịch Vụ Làm Thêm *</Text>
          <TextInput
            style={[styles.input, errors.itemName && styles.inputError]}
            placeholder={
              itemType === 'COMPONENT'
                ? 'Ví dụ: Đánh nền mỏng nhẹ, Kẻ eyeliner sắc nét...'
                : 'Ví dụ: Dán mi giả 3D cao cấp, Đính đá nghệ thuật...'
            }
            placeholderTextColor={BrandColors.slatePlaceholder}
            value={itemName}
            onChangeText={(text) => {
              setItemName(text);
              if (errors.itemName) {
                setErrors((prev) => ({ ...prev, itemName: '' }));
              }
            }}
          />
          {errors.itemName ? (
            <Text style={styles.errorText}>{errors.itemName}</Text>
          ) : null}

          {/* Gợi ý tên nhanh */}
          <View style={styles.suggestionRow}>
            <Text style={styles.suggestionLabel}>Gợi ý nhanh:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionList}>
              {suggestions.map((sug, idx) => (
                <TouchableOpacity
                  key={`sug-${idx}`}
                  style={styles.suggestionChip}
                  onPress={() => {
                    setItemName(sug);
                    if (errors.itemName) {
                      setErrors((prev) => ({ ...prev, itemName: '' }));
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionChipText}>+ {sug}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* 3. Phụ thu tính thêm (Chỉ hiển thị khi là ADD_ON) */}
        {itemType === 'ADD_ON' && (
          <View style={styles.fieldSection}>
            <View style={styles.fieldHeaderRow}>
              <Text style={styles.label}>Phụ Thu Tính Thêm *</Text>
              <Text style={styles.priceHighlight}>
                +{Number(itemPrice.replace(/\D/g, '') || 0).toLocaleString('vi-VN')} đ
              </Text>
            </View>

            {/* Bộ tăng giảm Stepper +/- 10.000 đ */}
            <View style={styles.stepperBox}>
              <TouchableOpacity
                style={styles.stepperActionBtn}
                onPress={() => handleAdjustPrice(-10000)}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={18} color="#334155" />
                <Text style={styles.stepperActionText}>10k</Text>
              </TouchableOpacity>

              <View style={styles.stepperCenter}>
                <Ionicons name="cash-outline" size={18} color={BrandColors.primary} />
                <TextInput
                  style={[styles.stepperPriceInput, errors.itemPrice && styles.inputError]}
                  placeholder="0"
                  placeholderTextColor={BrandColors.slatePlaceholder}
                  keyboardType="number-pad"
                  value={itemPrice}
                  onChangeText={(val) => {
                    const num = val.replace(/\D/g, '');
                    setItemPrice(num ? Number(num).toLocaleString('vi-VN') : '0');
                    if (errors.itemPrice) {
                      setErrors((prev) => ({ ...prev, itemPrice: '' }));
                    }
                  }}
                  selectTextOnFocus
                />
                <Text style={styles.stepperUnitLabel}>đ</Text>
              </View>

              <TouchableOpacity
                style={styles.stepperActionBtn}
                onPress={() => handleAdjustPrice(10000)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color="#334155" />
                <Text style={styles.stepperActionText}>10k</Text>
              </TouchableOpacity>
            </View>

            {/* Các mức giá chọn nhanh phổ biến */}
            <View style={styles.presetGrid}>
              {PRICE_PRESETS.map((p) => {
                const currentNum = Number(itemPrice.replace(/\D/g, '')) || 0;
                const isMatch = currentNum === p;
                return (
                  <TouchableOpacity
                    key={`p-${p}`}
                    style={[styles.presetChip, isMatch && styles.presetChipActive]}
                    onPress={() => {
                      setItemPrice(p.toLocaleString('vi-VN'));
                      if (errors.itemPrice) {
                        setErrors((prev) => ({ ...prev, itemPrice: '' }));
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        isMatch && styles.presetChipTextActive,
                      ]}
                    >
                      {p >= 1000 ? `${p / 1000}k` : p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.itemPrice ? (
              <Text style={styles.errorText}>{errors.itemPrice}</Text>
            ) : null}
          </View>
        )}

        {/* 4. Thời lượng thực hiện (Stepper +/- 5 phút & Mức chọn nhanh) */}
        <View style={styles.fieldSection}>
          <View style={styles.fieldHeaderRow}>
            <Text style={styles.label}>Thời Lượng Dự Kiến</Text>
            <Text style={styles.durationHighlight}>
              ⏱️ {durationMinutes || 15} phút
            </Text>
          </View>

          {/* Bộ tăng giảm Stepper +/- 5 phút */}
          <View style={styles.stepperBox}>
            <TouchableOpacity
              style={styles.stepperActionBtn}
              onPress={() => handleAdjustDuration(-5)}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={18} color="#334155" />
              <Text style={styles.stepperActionText}>5p</Text>
            </TouchableOpacity>

            <View style={styles.stepperCenter}>
              <Ionicons name="time-outline" size={18} color={BrandColors.primary} />
              <TextInput
                style={styles.stepperDurationInput}
                keyboardType="number-pad"
                value={durationMinutes}
                onChangeText={(val) => {
                  const num = val.replace(/\D/g, '');
                  setDurationMinutes(num);
                }}
                selectTextOnFocus
              />
              <Text style={styles.stepperUnitLabel}>phút</Text>
            </View>

            <TouchableOpacity
              style={styles.stepperActionBtn}
              onPress={() => handleAdjustDuration(5)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color="#334155" />
              <Text style={styles.stepperActionText}>5p</Text>
            </TouchableOpacity>
          </View>

          {/* Các mốc thời lượng chọn nhanh */}
          <View style={styles.presetGrid}>
            {DURATION_PRESETS.map((dur) => {
              const isMatch = Number(durationMinutes) === dur;
              return (
                <TouchableOpacity
                  key={`dur-${dur}`}
                  style={[styles.presetChip, isMatch && styles.presetChipActive]}
                  onPress={() => setDurationMinutes(dur.toString())}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      isMatch && styles.presetChipTextActive,
                    ]}
                  >
                    {dur}p
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Nút lưu */}
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.88}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {initialItem ? 'Cập Nhật Bước Dịch Vụ' : 'Thêm Vào Gói Dịch Vụ'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </DismissibleModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  subtitle: {
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
  body: {
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  formErrorBox: {
    backgroundColor: BrandColors.light,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  formErrorText: {
    color: BrandColors.danger,
    fontSize: 13,
    fontWeight: '500',
  },

  // 1. Thẻ Loại bước thực hiện
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  typeCardsColumn: {
    gap: 10,
    marginBottom: 18,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  typeCardActive: {
    backgroundColor: '#FFF1F2',
    borderColor: BrandColors.primary,
  },
  typeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconBoxActive: {
    backgroundColor: '#FFE4E6',
    borderColor: BrandColors.primary,
  },
  typeTextCol: {
    flex: 1,
  },
  typeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  typeCardTitleActive: {
    color: BrandColors.primary,
  },
  typeCardSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  radioIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioIndicatorActive: {
    borderColor: BrandColors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BrandColors.primary,
  },

  // Field sections
  fieldSection: {
    marginBottom: 18,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceHighlight: {
    fontSize: 13.5,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  durationHighlight: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },

  input: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    fontSize: 14,
    color: BrandColors.slateHeading,
  },
  inputError: {
    borderColor: BrandColors.danger,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    fontSize: 12,
    color: BrandColors.danger,
    marginTop: 5,
  },

  // Gợi ý nhanh
  suggestionRow: {
    marginTop: 8,
  },
  suggestionLabel: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 6,
  },
  suggestionList: {
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionChipText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '500',
  },

  // Stepper Controller
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    height: 48,
  },
  stepperActionBtn: {
    width: 48,
    height: '100%',
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  stepperActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  stepperCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  stepperPriceInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    minWidth: 110,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  stepperDurationInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    minWidth: 50,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  stepperUnitLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },

  // Preset Chips
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#FFF1F2',
    borderColor: BrandColors.primary,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  presetChipTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },

  // Submit Button
  submitButton: {
    height: 52,
    backgroundColor: BrandColors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
