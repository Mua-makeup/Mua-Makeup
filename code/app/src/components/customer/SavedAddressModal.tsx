import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { SavedAddress } from '@/schemas/customer-profile.schema';

interface Props {
  visible: boolean;
  addresses: SavedAddress[];
  onClose: () => void;
  onSaveAddresses: (addresses: SavedAddress[]) => Promise<void>;
  onSelectAddress?: (address: SavedAddress) => void;
}

export const SavedAddressModal: React.FC<Props> = ({
  visible,
  addresses,
  onClose,
  onSaveAddresses,
  onSelectAddress,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');

  const handleAddNew = async () => {
    if (!label.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên gợi nhớ cho địa chỉ (Ví dụ: Nhà riêng, Công ty).');
      return;
    }
    if (!addressLine.trim() || addressLine.trim().length < 5) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ chi tiết (số nhà, tên đường, phường/xã).');
      return;
    }

    const newAddr: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: label.trim(),
      addressLine: addressLine.trim(),
      isDefault: addresses.length === 0,
    };

    const updated = [...addresses, newAddr];
    await onSaveAddresses(updated);
    setLabel('');
    setAddressLine('');
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    const updated = addresses.filter((a) => a.id !== id);
    await onSaveAddresses(updated);
  };

  const handleSetDefault = async (id: string) => {
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    await onSaveAddresses(updated);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="location-outline" size={20} color={BrandColors.primary} />
              <Text style={styles.title}>Địa Chỉ Trang Điểm Quen Thuộc</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* FORM THÊM ĐỊA CHỈ MỚI */}
            {isAdding ? (
              <View style={styles.addForm}>
                <Text style={styles.formTitle}>Thêm địa chỉ mới</Text>

                <Text style={styles.label}>Tên gợi nhớ</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Nhà riêng, Công ty, Studio Quận 1..."
                  value={label}
                  onChangeText={setLabel}
                />

                <Text style={styles.label}>Địa chỉ cụ thể</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Số nhà, tòa nhà, đường, phường, quận/huyện..."
                  multiline
                  numberOfLines={3}
                  value={addressLine}
                  onChangeText={setAddressLine}
                />

                <View style={styles.formActionRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setIsAdding(false)}
                  >
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitBtn} onPress={handleAddNew}>
                    <Text style={styles.submitBtnText}>Lưu địa chỉ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addTriggerBtn}
                onPress={() => setIsAdding(true)}
              >
                <Ionicons name="add-circle" size={20} color={BrandColors.primary} />
                <Text style={styles.addTriggerText}>Thêm địa chỉ trang điểm mới</Text>
              </TouchableOpacity>
            )}

            {/* DANH SÁCH ĐỊA CHỈ */}
            <View style={styles.listContainer}>
              {addresses.map((item) => (
                <View
                  key={item.id}
                  style={[styles.addressItem, item.isDefault && styles.addressItemDefault]}
                >
                  <View style={styles.addressLeft}>
                    <View style={styles.addressTitleRow}>
                      <Ionicons
                        name={item.label.toLowerCase().includes('công ty') ? 'business' : 'home'}
                        size={16}
                        color={item.isDefault ? BrandColors.primary : '#475569'}
                      />
                      <Text style={styles.addressLabel}>{item.label}</Text>
                      {item.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Mặc định</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.addressLineText}>{item.addressLine}</Text>
                  </View>

                  <View style={styles.addressActions}>
                    {!item.isDefault && (
                      <TouchableOpacity
                        style={styles.setDefaultBtn}
                        onPress={() => handleSetDefault(item.id)}
                      >
                        <Text style={styles.setDefaultText}>Đặt mặc định</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(item.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    maxHeight: 500,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 32,
  },
  addTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 16,
  },
  addTriggerText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  addForm: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  formActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: BrandColors.primary,
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 10,
  },
  addressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressItemDefault: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF1F2',
  },
  addressLeft: {
    flex: 1,
    paddingRight: 10,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  defaultBadge: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addressLineText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  addressActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  setDefaultBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  setDefaultText: {
    fontSize: 11,
    color: BrandColors.primary,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
  },
});
