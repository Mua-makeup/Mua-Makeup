import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { PackageItem } from '@/services/package.service';

interface Props {
  items: PackageItem[];
  selectedAddOnIds: number[];
  onToggleAddOn: (addonId: number) => void;
}

export const PackageItemPicker: React.FC<Props> = ({
  items,
  selectedAddOnIds,
  onToggleAddOn,
}) => {
  // Lọc trùng lặp items theo id (nếu có từ API response)
  const uniqueItems = items.filter(
    (item, index, self) => index === self.findIndex((t) => (t.id ? t.id === item.id : index === self.indexOf(item)))
  );

  // Tách bước mặc định và bước mua thêm
  const includedItems = uniqueItems.filter(
    (item) => item.isRequired !== false && item.itemType !== 'OPTIONAL_ADDON' && item.itemType !== 'ADD_ON'
  );
  const optionalItems = uniqueItems.filter(
    (item) => item.isRequired === false || item.itemType === 'OPTIONAL_ADDON' || item.itemType === 'ADD_ON'
  );

  const displayAddOns: PackageItem[] = optionalItems;

  if (includedItems.length === 0 && displayAddOns.length === 0) {
    return null;
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  return (
    <View style={styles.container}>
      {/* 1. CÁC BƯỚC MẶC ĐỊNH TRONG GÓI */}
      {includedItems.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={18} color={BrandColors.primary} />
            <Text style={styles.sectionTitle}>Quy Trình & Các Bước Có Sẵn Trong Gói</Text>
          </View>

          <View style={styles.includedBox}>
            {includedItems.map((item, index) => (
              <View key={`included-${item.id ?? 'item'}-${index}`} style={styles.includedRow}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={12} color="#10B981" />
                </View>
                <View style={styles.includedTextCol}>
                  <Text style={styles.includedTitle}>{item.itemName}</Text>
                  {item.durationMinutes ? (
                    <Text style={styles.includedDuration}>~{item.durationMinutes} phút</Text>
                  ) : null}
                  {item.description ? (
                    <Text style={styles.includedDesc}>{item.description}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* 2. CÁC BƯỚC NÂNG CẤP MUA THÊM (ADD-ONS) */}
      {displayAddOns.length > 0 && (
        <>
          <View style={[styles.sectionHeader, includedItems.length > 0 && { marginTop: 18 }]}>
            <Ionicons name="add-circle-outline" size={18} color={BrandColors.primary} />
            <Text style={styles.sectionTitle}>Tùy Chọn Mua Thêm (Add-ons)</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Chọn thêm các dịch vụ bổ trợ để diện mạo thêm lộng lẫy và hoàn hảo:
          </Text>

          <View style={styles.addOnList}>
            {displayAddOns.map((addon, index) => {
              const isChecked = selectedAddOnIds.includes(addon.id);
              return (
                <TouchableOpacity
                  key={`addon-${addon.id ?? 'item'}-${index}`}
                  style={[styles.addOnCard, isChecked && styles.addOnCardSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onToggleAddOn(addon.id);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                    {isChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <View style={styles.addOnTextCol}>
                    <Text style={styles.addOnTitle}>{addon.itemName}</Text>
                    {addon.durationMinutes ? (
                      <Text style={styles.includedDuration}>~{addon.durationMinutes} phút</Text>
                    ) : null}
                    {addon.description ? (
                      <Text style={styles.addOnDesc}>{addon.description}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.addOnPrice}>
                    +{formatPrice(addon.itemPrice || 0)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  includedBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  includedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  includedTextCol: {
    flex: 1,
  },
  includedTitle: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  includedDuration: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontStyle: 'italic',
  },
  includedDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  addOnList: {
    gap: 8,
  },
  addOnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  addOnCardSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF1F2',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  addOnTextCol: {
    flex: 1,
  },
  addOnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  addOnDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  addOnPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.primary,
  },
});
