import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import {
  customerAddressService,
  CustomerAddressItem,
  SaveCustomerAddressPayload,
} from '@/services/customer-address.service';
import { mapsService } from '@/services/maps.service';
import { useLocationStore } from '@/store/location.store';
import { SwipeableBottomSheet } from '@/components/common/SwipeableBottomSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectAddress?: (address: CustomerAddressItem) => void;
  onAddressesUpdated?: () => void;
  selectedAddressId?: number;
}

export const SavedAddressModal: React.FC<Props> = ({
  visible,
  onClose,
  onSelectAddress,
  onAddressesUpdated,
  selectedAddressId,
}) => {
  const { latitude: defaultLat, longitude: defaultLng } = useLocationStore();
  const [addresses, setAddresses] = useState<CustomerAddressItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form thêm / sửa
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [label, setLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Xác nhận xóa
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<CustomerAddressItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Lưu trạng thái địa chỉ đang được tích chọn
  const [activeSelectedId, setActiveSelectedId] = useState<number | undefined>(selectedAddressId);

  useEffect(() => {
    if (selectedAddressId !== undefined) {
      setActiveSelectedId(selectedAddressId);
    }
  }, [selectedAddressId]);

  // Khi danh sách địa chỉ tải về, đồng bộ ID đang chọn
  useEffect(() => {
    if (visible && addresses.length > 0) {
      if (activeSelectedId === undefined || !addresses.some((a) => a.id === activeSelectedId)) {
        if (selectedAddressId !== undefined && addresses.some((a) => a.id === selectedAddressId)) {
          setActiveSelectedId(selectedAddressId);
        } else {
          const defaultItem = addresses.find((a) => a.isDefault) || addresses[0];
          if (defaultItem) {
            setActiveSelectedId(defaultItem.id);
          }
        }
      }
    }
  }, [visible, addresses, selectedAddressId]);

  // Tải danh sách địa chỉ từ backend
  const fetchAddresses = async () => {
    setIsLoading(true);
    try {
      const data = await customerAddressService.getSavedAddresses();
      setAddresses(data);
      if (onAddressesUpdated) {
        onAddressesUpdated();
      }
    } catch (err: any) {
      console.warn('Lỗi tải danh sách địa chỉ:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchAddresses();
      setIsAdding(false);
      setEditingId(null);
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setLabel('');
    setAddressLine('');
    setRecipientName('');
    setRecipientPhone('');
    setIsDefault(addresses.length === 0);
    setEditingId(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleStartEdit = (item: CustomerAddressItem) => {
    setEditingId(item.id);
    setLabel(item.label || '');
    setAddressLine(item.addressLine || '');
    setRecipientName(item.recipientName || '');
    setRecipientPhone(item.recipientPhone || '');
    setIsDefault(item.isDefault || false);
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert('Thiếu Thông Tin', 'Vui lòng nhập tên gợi nhớ (VD: Nhà riêng, Công ty, Studio).');
      return;
    }
    if (!addressLine.trim() || addressLine.trim().length < 5) {
      Alert.alert('Thiếu Thông Tin', 'Vui lòng nhập địa chỉ chi tiết (số nhà, tên đường, phường/xã).');
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // 1. Tự động Geocode tọa độ từ địa chỉ nếu chưa có
      let lat = defaultLat || 21.0285;
      let lng = defaultLng || 105.8542;

      try {
        const geo = await mapsService.geocode(addressLine.trim());
        if (geo && geo.latitude && geo.longitude) {
          lat = geo.latitude;
          lng = geo.longitude;
        }
      } catch (e) {
        console.warn('Lỗi geocode địa chỉ mới:', e);
      }

      const payload: SaveCustomerAddressPayload = {
        label: label.trim(),
        addressLine: addressLine.trim(),
        latitude: lat,
        longitude: lng,
        recipientName: recipientName.trim() || undefined,
        recipientPhone: recipientPhone.trim() || undefined,
        isDefault: addresses.length === 0 ? true : isDefault,
      };

      if (editingId) {
        await customerAddressService.updateAddress(editingId, payload);
      } else {
        await customerAddressService.createAddress(payload);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsAdding(false);
      resetForm();
      await fetchAddresses();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể lưu địa chỉ.';
      Alert.alert('Lỗi Lưu Địa Chỉ', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    try {
      setIsDeleting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await customerAddressService.deleteAddress(deleteConfirmTarget.id);
      setDeleteConfirmTarget(null);
      await fetchAddresses();
      onAddressesUpdated?.();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể xóa địa chỉ.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      Haptics.selectionAsync();
      await customerAddressService.setDefaultAddress(id);
      await fetchAddresses();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể đổi địa chỉ mặc định.');
    }
  };

  return (
    <SwipeableBottomSheet
      dismissDisabled={isSubmitting}
      visible={visible}
      onClose={() => {
        setIsAdding(false);
        setEditingId(null);
        onClose();
      }}
      title={isAdding ? (editingId ? 'Chỉnh Sửa Địa Chỉ' : 'Thêm Địa Chỉ Make-up Mới') : 'Sổ Địa Chỉ Trang Điểm'}
      subtitle={
        isAdding
          ? 'Nhập thông tin địa chỉ để chuyên viên phục vụ tận nơi'
          : onSelectAddress
          ? 'Chạm vào địa chỉ để chọn làm điểm đến'
          : 'Quản lý các địa chỉ make-up quen thuộc của bạn'
      }
    >
      {isAdding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.addFormModalContent}
          >
            {/* QUAY LẠI DANH SÁCH ĐỊA CHỈ */}
            <TouchableOpacity
              style={styles.backToListBtn}
              onPress={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color="#64748B" />
              <Text style={styles.backToListText}>Quay lại danh sách</Text>
            </TouchableOpacity>
            {/* TÊN GỢI NHỚ */}
            <Text style={styles.inputLabel}>Tên gợi nhớ *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: Nhà riêng, Chung cư Vinhomes, Studio Quận 1..."
              placeholderTextColor="#94A3B8"
              value={label}
              onChangeText={setLabel}
            />

            {/* ĐỊA CHỈ CHI TIẾT */}
            <Text style={styles.inputLabel}>Địa chỉ chi tiết (số nhà, đường, phường, quận) *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ví dụ: Căn 1204 Tòa Park 2, Times City, Minh Khai, Hai Bà Trưng, Hà Nội..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={addressLine}
              onChangeText={setAddressLine}
            />

            {/* NGƯỜI NHẬN & SỐ ĐT LIÊN HỆ */}
            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Người nhận (Tùy chọn)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tên khách"
                  placeholderTextColor="#94A3B8"
                  value={recipientName}
                  onChangeText={setRecipientName}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Số điện thoại (Tùy chọn)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="098..."
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                />
              </View>
            </View>

            {/* CÔNG TẮC ĐẶT LÀM MẶC ĐỊNH */}
            {addresses.length === 0 && !editingId ? (
              <View style={styles.firstAddressPill}>
                <Ionicons name="information-circle" size={18} color="#D97706" />
                <Text style={styles.firstAddressText}>
                  Địa chỉ đầu tiên này sẽ tự động được chọn làm địa chỉ mặc định.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.defaultToggleRow}
                activeOpacity={0.8}
                onPress={() => {
                  if (editingId && addresses.length === 1 && isDefault) {
                    Alert.alert('Thông báo', 'Bạn cần duy trì ít nhất 1 địa chỉ mặc định.');
                    return;
                  }
                  setIsDefault(!isDefault);
                }}
              >
                <Ionicons
                  name={isDefault ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={isDefault ? BrandColors.primary : '#94A3B8'}
                />
                <Text style={styles.defaultToggleText}>Đặt làm địa chỉ mặc định khi đặt lịch</Text>
              </TouchableOpacity>
            )}

            {/* HÀNH ĐỘNG FORM */}
            <View style={styles.formActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsAdding(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                onPress={handleSave}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>{editingId ? 'Cập nhật' : 'Lưu địa chỉ'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
            {/* NÚT THÊM ĐỊA CHỈ HOẶC FORM NHẬP */}

              <TouchableOpacity
                style={styles.addTriggerBtn}
                onPress={handleStartAdd}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color={BrandColors.primary} />
                <Text style={styles.addTriggerText}>Thêm địa chỉ make-up mới</Text>
              </TouchableOpacity>


            {/* DANH SÁCH ĐỊA CHỈ */}
            {isLoading && addresses.length === 0 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={BrandColors.primary} />
                <Text style={styles.loadingText}>Đang tải sổ địa chỉ...</Text>
              </View>
            ) : addresses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="map-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Chưa Có Địa Chỉ Nào Trong Sổ</Text>
                <Text style={styles.emptySubtitle}>
                  Thêm địa chỉ nhà hoặc nơi tổ chức tiệc để đặt make-up nhanh chóng mà không cần gõ lại.
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {addresses.map((item) => {
                  const isSelected = activeSelectedId !== undefined
                    ? activeSelectedId === item.id
                    : Boolean(item.isDefault);
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.addressItem,
                        isSelected && styles.addressItemSelected,
                      ]}
                    >
                      {/* VÙNG CHỌN ĐỊA CHỈ BÊN TRÁI */}
                      <TouchableOpacity
                        style={styles.addressLeftTouchable}
                        activeOpacity={onSelectAddress ? 0.7 : 1}
                        onPress={() => {
                          setActiveSelectedId(item.id);
                          if (onSelectAddress) {
                            Haptics.selectionAsync();
                            onSelectAddress(item);
                            onClose();
                          }
                        }}
                      >
                        {onSelectAddress && (
                          <View style={styles.radioCol}>
                            {isSelected ? (
                              <Ionicons name="checkmark-circle" size={22} color={BrandColors.primary} />
                            ) : (
                              <Ionicons name="ellipse-outline" size={22} color="#CBD5E1" />
                            )}
                          </View>
                        )}

                        <View style={styles.addressLeft}>
                          <View style={styles.addressTitleRow}>
                            <Ionicons
                              name={
                                item.label.toLowerCase().includes('công ty') || item.label.toLowerCase().includes('văn phòng')
                                  ? 'business'
                                  : 'home'
                              }
                              size={16}
                              color={item.isDefault ? BrandColors.primary : '#475569'}
                            />
                            <Text style={styles.addressLabel}>{item.label}</Text>
                            {item.isDefault && (
                              <View style={styles.defaultBadge}>
                                <Ionicons name="checkmark-circle" size={11} color="#FFFFFF" />
                                <Text style={styles.defaultBadgeText}>Mặc định</Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.addressLineText} numberOfLines={2}>
                            {item.addressLine}
                          </Text>

                          {(item.recipientName || item.recipientPhone) && (
                            <Text style={styles.recipientText}>
                              Người đón: {item.recipientName || 'Khách hàng'} • {item.recipientPhone || ''}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* HÀNH ĐỘNG BÊN PHẢI (ĐỘC LẬP HOÀN TOÀN) */}
                      <View style={styles.addressActions}>
                        {!item.isDefault && (
                          <TouchableOpacity
                            style={styles.setDefaultBtn}
                            onPress={() => handleSetDefault(item.id)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.setDefaultText}>Đặt làm mặc định</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => handleStartEdit(item)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="pencil-outline" size={16} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.iconBtn, styles.deleteBtn]}
                          onPress={() => setDeleteConfirmTarget(item)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
      )}
      {/* MODAL XÁC NHẬN XÓA ĐỊA CHỈ */}
      <Modal
        visible={Boolean(deleteConfirmTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmTarget(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="trash" size={26} color="#EF4444" />
            </View>
            <Text style={styles.confirmTitle}>Xác Nhận Xóa Địa Chỉ</Text>
            <Text style={styles.confirmMessage}>
              Bạn có chắc chắn muốn xóa địa chỉ "{deleteConfirmTarget?.label}" khỏi sổ địa chỉ không? Thao tác này không thể hoàn tác.
            </Text>
            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setDeleteConfirmTarget(null)}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelText}>Hủy Bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteBtn, isDeleting && styles.confirmDeleteBtnDisabled]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash" size={15} color="#FFFFFF" />
                    <Text style={styles.confirmDeleteText}>Xóa Địa Chỉ</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SwipeableBottomSheet>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 8,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  body: {
    maxHeight: 520,
  },
  backToListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 8,
  },
  backToListText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  addFormModalContent: {
    paddingVertical: 10,
    paddingBottom: 24,
    gap: 8,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 36,
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
    gap: 8,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  textArea: {
    height: 64,
    textAlignVertical: 'top',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  defaultToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  defaultToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  formActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  listContainer: {
    gap: 10,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  addressItemDefault: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
  },
  addressItemSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF1F2',
  },
  radioCol: {
    paddingRight: 4,
  },
  addressLeft: {
    flex: 1,
    gap: 3,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 14,
  },
  addressLineText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  recipientText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  setDefaultBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  setDefaultText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  iconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressLeftTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  firstAddressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  firstAddressText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
    fontWeight: '500',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  confirmDeleteBtn: {
    flex: 1.2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmDeleteBtnDisabled: {
    opacity: 0.6,
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
