import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { PackageDetail } from '@/services/package.service';

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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Chọn Gói Dịch Vụ Make-up</Text>
        <Text style={styles.subtitle}>Bấm chọn để xem ảnh mẫu thực tế bên dưới</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {packages.map((pkg) => {
          const isSelected = selectedPackage?.id === pkg.id;
          const formattedPrice = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
          }).format(pkg.price);
          const duration = pkg.durationMinutes || pkg.estimatedDurationMinutes || 60;

          return (
            <TouchableOpacity
              key={`pkg-sel-${pkg.id}`}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => onSelectPackage(pkg)}
              activeOpacity={0.8}
            >
              {isSelected && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                  <Text style={styles.selectedBadgeText}>Đang chọn</Text>
                </View>
              )}

              <Text style={[styles.packageName, isSelected && styles.packageNameSelected]}>
                {pkg.packageName}
              </Text>

              <View style={styles.metaRow}>
                <Ionicons
                  name="time-outline"
                  size={13}
                  color={isSelected ? BrandColors.primary : '#64748B'}
                />
                <Text
                  style={[styles.durationText, isSelected && styles.durationTextSelected]}
                >
                  {duration} phút
                </Text>
              </View>

              <Text style={[styles.priceText, isSelected && styles.priceTextSelected]}>
                {formattedPrice}
              </Text>

              {/* Tóm tắt các bước trong gói nếu có */}
              {pkg.items && pkg.items.length > 0 && (
                <View style={styles.itemsBox}>
                  <Text style={styles.itemsTitle}>Bao gồm {pkg.items.length} bước:</Text>
                  {pkg.items.slice(0, 2).map((it, idx) => (
                    <Text key={`it-${idx}`} style={styles.itemBullet} numberOfLines={1}>
                      • {it.itemName}
                    </Text>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
    paddingHorizontal: 16,
    marginBottom: 12,
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
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  cardSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  packageName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 19,
    marginBottom: 6,
    paddingRight: 50,
  },
  packageNameSelected: {
    color: '#9F1239',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  durationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  durationTextSelected: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  priceTextSelected: {
    color: BrandColors.primary,
  },
  itemsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemsTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 3,
  },
  itemBullet: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
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
});
