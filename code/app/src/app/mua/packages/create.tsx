import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { BrandColors } from '@/constants/theme';
import { packageService } from '@/services/package.service';
import { MasterCategory } from '@/services/taxonomy.service';
import { CategoryPickerModal } from '@/components/mua/packages/CategoryPickerModal';
import { StyleChipSelector } from '@/components/mua/packages/StyleChipSelector';
import { createPackageSchema } from '@/schemas/package-builder.schema';
import { parseApiError } from '@/utils/error';

export default function CreatePackageScreen() {
  const insets = useSafeAreaInsets();

  const [packageName, setPackageName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MasterCategory | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [styleIds, setStyleIds] = useState<number[]>([]);
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
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

      const created = await packageService.createPackage({
        masterCategoryId: result.data.masterCategoryId,
        packageName: result.data.packageName,
        price: result.data.price,
        estimatedDurationMinutes: result.data.estimatedDurationMinutes,
        description: result.data.description,
        styleIds: result.data.styleIds,
      });

      Alert.alert(
        'Tạo Gói Thành Công',
        `Gói "${created.packageName}" đã sẵn sàng. Bạn muốn thêm ảnh mẫu vào Album tác phẩm hay cấu hình các bước thực hiện trước?`,
        [
          {
            text: 'Để sau',
            style: 'cancel',
            onPress: () => router.back(),
          },
          {
            text: 'Thêm ảnh mẫu vào Album',
            onPress: () => {
              router.replace({
                pathname: '/mua/packages/[id]/add-showcase',
                params: { id: created.id },
              });
            },
          },
          {
            text: 'Cấu hình bước',
            onPress: () => {
              router.replace({
                pathname: '/mua/packages/[id]/items',
                params: { id: created.id },
              });
            },
          },
        ]
      );
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
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={BrandColors.slateHeading} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Tạo Gói Dịch Vụ Mới</Text>
        <View style={{ width: 38 }} />
      </View>

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

          {/* 1. Thông tin Album tác phẩm liên kết */}
          <View style={styles.albumHintCard}>
            <View style={styles.albumHintHeader}>
              <Ionicons name="sparkles" size={18} color={BrandColors.primary} />
              <Text style={styles.albumHintTitle}>Ảnh Đại Diện & Album Gói</Text>
            </View>
            <Text style={styles.albumHintText}>
              Ảnh đại diện của gói sẽ tự động hiển thị từ các tác phẩm ảnh mẫu thực tế trong Album của gói. Bạn có thể thêm tác phẩm vào album ngay sau khi tạo gói.
            </Text>
          </View>

          {/* 2. Danh mục gốc */}
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
                {selectedCategory ? selectedCategory.categoryName : 'Chọn danh mục (Cô dâu, Dự tiệc, Kỷ yếu...)'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={BrandColors.slateMuted} />
          </TouchableOpacity>
          {errors.masterCategoryId ? (
            <Text style={styles.errorText}>{errors.masterCategoryId}</Text>
          ) : null}

          {/* 3. Tên gói dịch vụ */}
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

          {/* 4. Phong cách make-up phù hợp */}
          <Text style={styles.sectionLabel}>Phong Cách Make-up Tương Thích *</Text>
          <Text style={styles.fieldHint}>Chọn các phong cách khách hàng có thể yêu cầu trong gói này</Text>
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

          {/* 5. Giá niêm yết & Thời lượng */}
          <View style={styles.twoColRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>Giá Niêm Yết (VNĐ) *</Text>
              <View style={styles.currencyInputWrapper}>
                <TextInput
                  style={[styles.input, errors.price && styles.inputError]}
                  placeholder="850.000"
                  placeholderTextColor={BrandColors.slatePlaceholder}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={(val) => {
                    const num = val.replace(/\D/g, '');
                    setPrice(num ? Number(num).toLocaleString('vi-VN') : '');
                    if (errors.price) {
                      setErrors((prev) => ({ ...prev, price: '' }));
                    }
                  }}
                />
                <Text style={styles.currencyUnit}>đ</Text>
              </View>
              {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>Thời Lượng (Phút) *</Text>
              <View style={styles.currencyInputWrapper}>
                <TextInput
                  style={[styles.input, errors.estimatedDurationMinutes && styles.inputError]}
                  placeholder="60"
                  placeholderTextColor={BrandColors.slatePlaceholder}
                  keyboardType="number-pad"
                  value={durationMinutes}
                  onChangeText={(val) => {
                    setDurationMinutes(val);
                    if (errors.estimatedDurationMinutes) {
                      setErrors((prev) => ({ ...prev, estimatedDurationMinutes: '' }));
                    }
                  }}
                />
                <Text style={styles.currencyUnit}>phút</Text>
              </View>
              {errors.estimatedDurationMinutes ? (
                <Text style={styles.errorText}>{errors.estimatedDurationMinutes}</Text>
              ) : null}
            </View>
          </View>

          {/* 6. Mô tả chi tiết */}
          <Text style={styles.sectionLabel}>Mô Tả Chi Tiết Gói</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Mô tả kỹ thuật trang điểm, các dòng mỹ phẩm sử dụng, chính sách hỗ trợ làm tóc..."
            placeholderTextColor={BrandColors.slatePlaceholder}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSave}
            disabled={submitting}
            activeOpacity={0.85}>
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Lưu & Xuất Bản Gói Dịch Vụ</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Picker Bottom Sheet */}
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
  fieldHint: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    marginBottom: 8,
  },
  albumHintCard: {
    backgroundColor: BrandColors.subtle,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BrandColors.softBorder,
    marginBottom: 8,
  },
  albumHintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  albumHintTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  albumHintText: {
    fontSize: 12,
    color: BrandColors.slateBody,
    lineHeight: 18,
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
});
