import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { PortfolioShowcase } from '@/services/mua-profile.service';

interface ShowcaseGridCardProps {
  item: PortfolioShowcase;
  onPress: (item: PortfolioShowcase) => void;
  onToggleFeatured: (id: number, isFeatured: boolean) => Promise<void>;
  onDelete: (id: number) => void;
}

export const ShowcaseGridCard: React.FC<ShowcaseGridCardProps> = ({
  item,
  onPress,
  onToggleFeatured,
  onDelete,
}) => {
  const [isFeatured, setIsFeatured] = useState(item.isFeatured ?? false);
  const [updating, setUpdating] = useState(false);

  const handleToggleStar = async () => {
    try {
      if (Platform.OS !== 'web') {
        Vibration.vibrate(50);
      }
      const nextVal = !isFeatured;
      setIsFeatured(nextVal);
      setUpdating(true);
      await onToggleFeatured(item.id, nextVal);
    } catch (err) {
      setIsFeatured(!isFeatured);
    } finally {
      setUpdating(false);
    }
  };

  const extraCount = item.additionalImages ? item.additionalImages.length : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.85}>
      <View style={styles.imageBox}>
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />

        {/* Featured Star Button */}
        <TouchableOpacity
          style={[styles.starBtn, isFeatured && styles.starBtnActive]}
          onPress={handleToggleStar}
          disabled={updating}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name={isFeatured ? 'star' : 'star-outline'}
            size={16}
            color={isFeatured ? '#F59E0B' : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Extra Angles Count Badge */}
        {extraCount > 0 && (
          <View style={styles.extraBadge}>
            <Ionicons name="images-outline" size={12} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={styles.extraBadgeText}>+{extraCount}</Text>
          </View>
        )}

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(item.id)}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.styleName ? (
          <Text style={styles.styleName} numberOfLines={1}>
            {item.styleName}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
    marginBottom: 14,
  },
  imageBox: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: BrandColors.canvasBg,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  starBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBtnActive: {
    backgroundColor: '#FFFBEB',
  },
  extraBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  extraBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  deleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  styleName: {
    fontSize: 11,
    color: BrandColors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
});
