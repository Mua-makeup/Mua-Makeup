import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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

export const PackageItemModal: React.FC<PackageItemModalProps> = ({
  visible,
  initialItem,
  defaultStepOrder = 1,
  onSave,
  onClose,
}) => {
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState<'COMPONENT' | 'ADD_ON'>('COMPONENT');
  const [itemPrice, setItemPrice] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('15');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialItem) {
        const isAddon = initialItem.itemType === 'ADD_ON' || initialItem.itemType === 'OPTIONAL_ADDON';
        setItemName(initialItem.itemName);
        setItemType(isAddon ? 'ADD_ON' : 'COMPONENT');
        setItemPrice(initialItem.itemPrice?.toString() || '0');
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

  const handleSubmit = async () => {
    const rawData = {
      itemName,
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {initialItem ? 'Chỉnh Sửa Bước Dịch Vụ' : 'Thêm Bước / Tùy Chọn Mới'}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={BrandColors.slateHeading} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {errors.form ? (
                <View style={styles.formErrorBox}>
                  <Text style={styles.formErrorText}>{errors.form}</Text>
                </View>
              ) : null}

              {/* Loại bước dịch vụ */}
              <Text style={styles.label}>Loại Bước Thực Hiện *</Text>
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    itemType === 'COMPONENT' && styles.typeButtonActive,
                  ]}
                  onPress={() => {
                    setItemType('COMPONENT');
                    setItemPrice('0');
                  }}
                  activeOpacity={0.7}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={itemType === 'COMPONENT' ? BrandColors.primary : BrandColors.slateMuted}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      itemType === 'COMPONENT' && styles.typeButtonTextActive,
                    ]}>
                    Mặc Định (Đã có trong gói)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    itemType === 'ADD_ON' && styles.typeButtonActive,
                  ]}
                  onPress={() => setItemType('ADD_ON')}
                  activeOpacity={0.7}>
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color={itemType === 'ADD_ON' ? BrandColors.primary : BrandColors.slateMuted}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      itemType === 'ADD_ON' && styles.typeButtonTextActive,
                    ]}>
                    Tùy Chọn Thêm (Tính phí)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tên bước */}
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
              {errors.itemName ? <Text style={styles.errorText}>{errors.itemName}</Text> : null}

              {/* Giá phụ thu (chỉ áp dụng nếu là ADD_ON) */}
              {itemType === 'ADD_ON' && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.label}>Phụ Thu Tính Thêm (VNĐ) *</Text>
                  <View style={styles.priceInputWrapper}>
                    <TextInput
                      style={[styles.input, { flex: 1 }, errors.itemPrice && styles.inputError]}
                      placeholder="50.000"
                      placeholderTextColor={BrandColors.slatePlaceholder}
                      keyboardType="numeric"
                      value={itemPrice}
                      onChangeText={(val) => {
                        const num = val.replace(/\D/g, '');
                        setItemPrice(num ? Number(num).toLocaleString('vi-VN') : '');
                        if (errors.itemPrice) {
                          setErrors((prev) => ({ ...prev, itemPrice: '' }));
                        }
                      }}
                    />
                    <Text style={styles.currencyBadge}>đ</Text>
                  </View>
                  {errors.itemPrice ? <Text style={styles.errorText}>{errors.itemPrice}</Text> : null}
                </View>
              )}

              {/* Thời lượng dự kiến */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>Thời Lượng Thực Hiện (Phút)</Text>
                <View style={styles.priceInputWrapper}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="15"
                    placeholderTextColor={BrandColors.slatePlaceholder}
                    keyboardType="number-pad"
                    value={durationMinutes}
                    onChangeText={setDurationMinutes}
                  />
                  <Text style={styles.currencyBadge}>phút</Text>
                </View>
              </View>

              {/* Nút lưu */}
              <TouchableOpacity
                style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={saving}
                activeOpacity={0.8}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {initialItem ? 'Cập Nhật Bước' : 'Thêm Vào Gói'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.borderInput,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  body: {
    padding: 20,
    paddingBottom: 36,
  },
  formErrorBox: {
    backgroundColor: BrandColors.light,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  formErrorText: {
    color: BrandColors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.slateBody,
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: BrandColors.canvasBg,
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: BrandColors.subtle,
    borderColor: BrandColors.primary,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.slateMuted,
  },
  typeButtonTextActive: {
    color: BrandColors.primary,
  },
  input: {
    height: 48,
    backgroundColor: BrandColors.canvasBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
    fontSize: 14,
    color: BrandColors.slateHeading,
  },
  inputError: {
    borderColor: BrandColors.danger,
    backgroundColor: '#FFF5F5',
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyBadge: {
    position: 'absolute',
    right: 14,
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.slateMuted,
  },
  errorText: {
    fontSize: 12,
    color: BrandColors.danger,
    marginTop: 4,
  },
  submitButton: {
    height: 48,
    backgroundColor: BrandColors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
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
