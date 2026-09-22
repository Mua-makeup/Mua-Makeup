import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { PackageSummary } from '@/services/package.service';

interface PackageCardProps {
  item: PackageSummary;
  onToggleAvailability: (packageId: number, isAvailable: boolean) => Promise<void>;
  onManageItems: (packageId: number) => void;
  onManageShowcase: (packageId: number) => void;
  onEdit: (packageId: number) => void;
  onDelete: (packageId: number) => void;
}

export const PackageCard: React.FC<PackageCardProps> = ({
  item,
  onToggleAvailability,
  onManageItems,
  onManageShowcase,
  onEdit,
  onDelete,
}) => {
  const [isAvailable, setIsAvailable] = useState<boolean>(item.isAvailable ?? true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleToggle = async (val: boolean) => {
    try {
      if (Platform.OS !== 'web') {
        Vibration.vibrate(50);
      }
      setIsAvailable(val);
      setUpdatingStatus(true);
      await onToggleAvailability(item.id, val);
    } catch (err) {
      // Revert if error
      setIsAvailable(!val);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const duration = item.estimatedDurationMinutes || item.durationMinutes || 60;

  return (
    <View style={styles.cardContainer}>
      {/* Cover Image Header */}
      <View style={styles.imageWrapper}>
        {item.coverImageUrl ? (
          <Image source={{ uri: item.coverImageUrl }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="color-wand-outline" size={36} color={BrandColors.primary} />
            <Text style={styles.placeholderText}>Gói Dịch Vụ MUA</Text>
          </View>
        )}

        {/* Category Badge */}
        {item.categoryName ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.categoryName}</Text>
          </View>
        ) : null}

        {/* Status Switch Overlay */}
        <View style={styles.statusSwitchWrapper}>
          <Text style={[styles.statusText, { color: isAvailable ? BrandColors.success : BrandColors.slateMuted }]}>
            {isAvailable ? 'Đang Nhận Ca' : 'Tạm Đóng'}
          </Text>
          <Switch
            value={isAvailable}
            onValueChange={handleToggle}
            disabled={updatingStatus}
            trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
            thumbColor={isAvailable ? BrandColors.success : '#94A3B8'}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>
      </View>

      {/* Body Info */}
      <View style={styles.body}>
        <Text style={styles.packageName} numberOfLines={2}>
          {item.packageName}
        </Text>

        <View style={styles.metricsRow}>
          <Text style={styles.priceText}>
            {Number(item.price || 0).toLocaleString('vi-VN')} đ
          </Text>
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={14} color={BrandColors.slateMuted} />
            <Text style={styles.durationText}>{duration} phút</Text>
          </View>
        </View>

        {/* Styles Tags */}
        {item.styles && item.styles.length > 0 ? (
          <View style={styles.stylesList}>
            {item.styles.slice(0, 3).map((s) => (
              <View key={s.id} style={styles.styleTag}>
                <Text style={styles.styleTagText}>{s.styleName || (s as any).name}</Text>
              </View>
            ))}
            {item.styles.length > 3 && (
              <View style={[styles.styleTag, { backgroundColor: '#F1F5F9' }]}>
                <Text style={styles.styleTagText}>+{item.styles.length - 3}</Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.divider} />

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onManageItems(item.id)}
            activeOpacity={0.7}>
            <Ionicons name="list-outline" size={16} color={BrandColors.primary} />
            <Text style={styles.actionBtnText}>Cấu Hình Bước</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onManageShowcase(item.id)}
            activeOpacity={0.7}>
            <Ionicons name="images-outline" size={16} color={BrandColors.info} />
            <Text style={[styles.actionBtnText, { color: BrandColors.info }]}>Album Tác Phẩm</Text>
          </TouchableOpacity>

          <View style={styles.iconActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => onEdit(item.id)}
              activeOpacity={0.7}>
              <Ionicons name="create-outline" size={18} color={BrandColors.slateBody} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: '#FFF1F2' }]}
              onPress={() => onDelete(item.id)}
              activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color={BrandColors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
      },
    }),
  },
  imageWrapper: {
    width: '100%',
    height: 140,
    backgroundColor: BrandColors.canvasBg,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: BrandColors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statusSwitchWrapper: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 2,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 2,
  },
  body: {
    padding: 16,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateHeading,
    lineHeight: 22,
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.canvasBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    fontWeight: '500',
  },
  stylesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  styleTag: {
    backgroundColor: BrandColors.subtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  styleTagText: {
    fontSize: 11,
    color: BrandColors.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: BrandColors.borderInput,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.canvasBg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  iconActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: BrandColors.canvasBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
