import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { packageService } from '@/services/package.service';
import { MasterCategory, taxonomyService } from '@/services/taxonomy.service';
import { CategoryPickerModal } from '@/components/mua/packages/CategoryPickerModal';
import { StyleChipSelector } from '@/components/mua/packages/StyleChipSelector';
import { createPackageSchema } from '@/schemas/package-builder.schema';
import { parseApiError } from '@/utils/error';

const PACKAGE_PRICE_PRESETS = [
  350000, 500000, 800000, 1000000, 1500000, 2000000, 3000000,
];

const PACKAGE_DURATION_PRESETS = [
  30, 45, 60, 90, 120, 150, 180,
];

const formatPresetPrice = (val: number) => {
  if (val >= 1000000) {
    const tr = val / 1000000;
    return `${tr % 1 === 0 ? tr : tr.toFixed(1)}tr`;
  }
  return `${val / 1000}k`;
};

const formatDurationHuman = (mins: number) => {
  if (!mins) return '60 phút';
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours > 0 && rem > 0) return `${hours}h ${rem}p`;
  if (hours > 0) return `${hours} tiếng`;
  return `${mins} phút`;
};

export default function EditPackageScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const packageId = Number(id);

  const [packageName, setPackageName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MasterCategory | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [styleIds, setStyleIds] = useState<number[]>([]);
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const handleAdjustPrice = (delta: number) => {
    const current = Number(price.replace(/\D/g, '')) || 0;
    const next = Math.max(0, current + delta);
    setPrice(next > 0 ? next.toLocaleString('vi-VN') : '');
    if (errors.price) {
      setErrors((prev) => ({ ...prev, price: '' }));
    }
  };

  const handleAdjustDuration = (delta: number) => {
    const current = Number(durationMinutes) || 60;
    const next = Math.max(15, Math.min(360, current + delta));
    setDurationMinutes(next.toString());
    if (errors.estimatedDurationMinutes) {
      setErrors((prev) => ({ ...prev, estimatedDurationMinutes: '' }));
    }
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (packageId) {
      loadPackageDetails();
    }
  }, [packageId]);

  const loadPackageDetails = async () => {
    try {
      setLoading(true);
      const pkg = await packageService.getPackageById(packageId);
      const allCategories = await taxonomyService.getActiveCategories();

      setPackageName(pkg.packageName);
      setPrice(Number(pkg.price || 0).toLocaleString('vi-VN'));
      setDurationMinutes((pkg.estimatedDurationMinutes || pkg.durationMinutes || 60).toString());
      setDescription(pkg.description || '');

      if (pkg.masterCategoryId) {
        const found = allCategories.find((c: MasterCategory) => c.id === pkg.masterCategoryId);
        if (found) setSelectedCategory(found);
      }

      if (pkg.styles) {
        setStyleIds(pkg.styles.map((s) => s.id));
      }
    } catch (err: any) {
      const parsed = parseApiError(err);
      Alert.alert('Lỗi', parsed.message || 'Không thể tải chi tiết gói dịch vụ.');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/mua/packages' as any);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    const rawPrice = Number(price.replace(/\D/g, '') || 0);
    const rawDuration = Number(durationMinutes) || 0;

    const rawData = {
      masterCategoryId: selectedCategory?.id,
      packageName,
      price: rawPrice,
      estimatedDurationMinutes: rawDuration,
      description,
      styleIds,
      isAvailable: true,
    };

    const result = createPackageSchema.safeParse(rawData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      await packageService.updatePackage(packageId, {
        masterCategoryId: result.data.masterCategoryId,
        packageName: result.data.packageName,
        price: result.data.price,
        estimatedDurationMinutes: result.data.estimatedDurationMinutes,
        description: result.data.description,
        styleIds: result.data.styleIds,
      });

      Alert.alert('Thành Công', 'Đã cập nhật thông tin gói dịch vụ.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const parsed = parseApiError(err);
      if (parsed.fieldErrors) {
        setErrors(parsed.fieldErrors);
      } else {
        setErrors({ form: parsed.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/mua/packages' as any))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={BrandColors.slateHeading} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Chỉnh Sửa Gói Dịch Vụ</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang nạp dữ liệu gói...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {errors.form ? (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{errors.form}</Text>
              </View>
            ) : null}

            {/* Danh mục gốc */}
            <Text style={styles.sectionLabel}>Danh Mục Dịch Vụ Gốc *</Text>
            <TouchableOpacity
              style={[
                styles.selectorInput,
                errors.masterCategoryId && styles.inputError,
              ]}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.7}>
              <View style={styles.selectorContent}>
                <Ionicons
                  name="sparkles-outline"
                  size={20}
                  color={selectedCategory ? BrandColors.primary : BrandColors.slateMuted}
                />
                <Text
                  style={[
                    styles.selectorText,
                    selectedCategory && styles.selectorTextActive,
                  ]}>
                  {selectedCategory ? selectedCategory.categoryName : 'Chọn danh mục'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={BrandColors.slateMuted} />
            </TouchableOpacity>
            {errors.masterCategoryId ? (
              <Text style={styles.errorText}>{errors.masterCategoryId}</Text>
            ) : null}

            {/* Tên gói */}
            <Text style={styles.sectionLabel}>Tên Gói Dịch Vụ *</Text>
            <TextInput
              style={[styles.input, errors.packageName && styles.inputError]}
              placeholder="Ví dụ: Trang Điểm Cô Dâu Ăn Hỏi Tone Cam Đào"
              placeholderTextColor={BrandColors.slatePlaceholder}
              value={packageName}
              onChangeText={(text) => {
                setPackageName(text);
                if (errors.packageName) {
                  setErrors((prev) => ({ ...prev, packageName: '' }));
                }
              }}
            />
            {errors.packageName ? <Text style={styles.errorText}>{errors.packageName}</Text> : null}

            {/* Phong cách make-up */}
            <Text style={styles.sectionLabel}>Phong Cách Make-up Tương Thích *</Text>
            <StyleChipSelector
              selectedStyleIds={styleIds}
              onChange={(ids) => {
                setStyleIds(ids);
                if (errors.styleIds) {
                  setErrors((prev) => ({ ...prev, styleIds: '' }));
                }
              }}
              error={errors.styleIds}
            />

            {/* 5. Giá niêm yết & Thời lượng với Stepper & Presets thông minh */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Giá Niêm Yết (VNĐ) *</Text>
                <Text style={styles.priceHighlight}>
                  🏷️ {price ? `${price} đ` : 'Chưa đặt giá'}
                </Text>
              </View>

              <View style={styles.stepperBox}>
                <TouchableOpacity
                  style={styles.stepperActionBtn}
                  onPress={() => handleAdjustPrice(-50000)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={18} color="#334155" />
                  <Text style={styles.stepperActionText}>50k</Text>
                </TouchableOpacity>

                <View style={styles.stepperCenter}>
                  <Ionicons name="cash-outline" size={20} color={BrandColors.primary} />
                  <TextInput
                    style={[styles.stepperPriceInput, errors.price && styles.inputError]}
                    placeholder="850.000"
                    placeholderTextColor={BrandColors.slatePlaceholder}
                    keyboardType="number-pad"
                    value={price}
                    onChangeText={(val) => {
                      const num = val.replace(/\D/g, '');
                      setPrice(num ? Number(num).toLocaleString('vi-VN') : '');
                      if (errors.price) {
                        setErrors((prev) => ({ ...prev, price: '' }));
                      }
                    }}
                    selectTextOnFocus
                  />
                  <Text style={styles.stepperUnitLabel}>đ</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepperActionBtn}
                  onPress={() => handleAdjustPrice(50000)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={18} color="#334155" />
                  <Text style={styles.stepperActionText}>50k</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Price Presets */}
              <View style={styles.presetGrid}>
                {PACKAGE_PRICE_PRESETS.map((p) => {
                  const currentNum = Number(price.replace(/\D/g, '')) || 0;
                  const isMatch = currentNum === p;
                  return (
                    <TouchableOpacity
                      key={`p-${p}`}
                      style={[styles.presetChip, isMatch && styles.presetChipActive]}
                      onPress={() => {
                        setPrice(p.toLocaleString('vi-VN'));
                        if (errors.price) {
                          setErrors((prev) => ({ ...prev, price: '' }));
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
                        {formatPresetPrice(p)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
            </View>

            {/* 6. Thời lượng dự kiến */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Thời Lượng Dự Kiến *</Text>
                <Text style={styles.durationHighlight}>
                  ⏱️ {durationMinutes || 60} phút ({formatDurationHuman(Number(durationMinutes))})
                </Text>
              </View>

              <View style={styles.stepperBox}>
                <TouchableOpacity
                  style={styles.stepperActionBtn}
                  onPress={() => handleAdjustDuration(-15)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={18} color="#334155" />
                  <Text style={styles.stepperActionText}>15p</Text>
                </TouchableOpacity>

                <View style={styles.stepperCenter}>
                  <Ionicons name="time-outline" size={20} color={BrandColors.primary} />
                  <TextInput
                    style={[
                      styles.stepperDurationInput,
                      errors.estimatedDurationMinutes && styles.inputError,
                    ]}
                    placeholder="60"
                    placeholderTextColor={BrandColors.slatePlaceholder}
                    keyboardType="number-pad"
                    value={durationMinutes}
                    onChangeText={(val) => {
                      const num = val.replace(/\D/g, '');
                      setDurationMinutes(num);
                      if (errors.estimatedDurationMinutes) {
                        setErrors((prev) => ({ ...prev, estimatedDurationMinutes: '' }));
                      }
                    }}
                    selectTextOnFocus
                  />
                  <Text style={styles.stepperUnitLabel}>phút</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepperActionBtn}
                  onPress={() => handleAdjustDuration(15)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={18} color="#334155" />
                  <Text style={styles.stepperActionText}>15p</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Duration Presets */}
              <View style={styles.presetGrid}>
                {PACKAGE_DURATION_PRESETS.map((dur) => {
                  const isMatch = Number(durationMinutes) === dur;
                  return (
                    <TouchableOpacity
                      key={`dur-${dur}`}
                      style={[styles.presetChip, isMatch && styles.presetChipActive]}
                      onPress={() => {
                        setDurationMinutes(dur.toString());
                        if (errors.estimatedDurationMinutes) {
                          setErrors((prev) => ({ ...prev, estimatedDurationMinutes: '' }));
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
                        {dur}p
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.estimatedDurationMinutes ? (
                <Text style={styles.errorText}>{errors.estimatedDurationMinutes}</Text>
              ) : null}
            </View>

            {/* Mô tả */}
            <Text style={styles.sectionLabel}>Mô Tả Chi Tiết Gói</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Mô tả kỹ thuật trang điểm, các dòng mỹ phẩm sử dụng..."
              placeholderTextColor={BrandColors.slatePlaceholder}
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />

            {/* Nút lưu */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleUpdate}
              disabled={submitting}
              activeOpacity={0.85}>
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Cập Nhật Gói Dịch Vụ</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Category Picker Modal */}
      <CategoryPickerModal
        visible={showCategoryModal}
        selectedCategoryId={selectedCategory?.id}
        onSelect={(cat) => {
          setSelectedCategory(cat);
          if (errors.masterCategoryId) {
            setErrors((prev) => ({ ...prev, masterCategoryId: '' }));
          }
        }}
        onClose={() => setShowCategoryModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.slateHeading,
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
  formErrorBox: {
    backgroundColor: BrandColors.light,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  formErrorText: {
    color: BrandColors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.slateHeading,
    marginTop: 14,
    marginBottom: 6,
  },
  selectorInput: {
    height: 50,
    backgroundColor: BrandColors.canvasBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectorText: {
    fontSize: 14,
    color: BrandColors.slatePlaceholder,
  },
  selectorTextActive: {
    color: BrandColors.slateHeading,
    fontWeight: '600',
  },
  input: {
    height: 50,
    backgroundColor: BrandColors.canvasBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
    fontSize: 14,
    color: BrandColors.slateHeading,
  },
  multilineInput: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: BrandColors.danger,
    backgroundColor: '#FFF5F5',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  currencyUnit: {
    position: 'absolute',
    right: 14,
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.slateMuted,
  },
  errorText: {
    fontSize: 12,
    color: BrandColors.danger,
    marginTop: 4,
  },
  submitButton: {
    height: 52,
    backgroundColor: BrandColors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  fieldSection: {
    marginTop: 18,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  priceHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  durationHighlight: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    height: 50,
  },
  stepperActionBtn: {
    width: 54,
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
    paddingHorizontal: 8,
  },
  stepperPriceInput: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    minWidth: 120,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  stepperDurationInput: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    minWidth: 55,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  stepperUnitLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
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
});
