import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { PortfolioShowcase } from '@/services/mua-profile.service';
import { PhotoZoomViewer } from './PhotoZoomViewer';

interface Props {
  visible: boolean;
  showcases: PortfolioShowcase[];
  initialIndex?: number;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ShowcaseGalleryModal: React.FC<Props> = ({
  visible,
  showcases,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, visible]);

  if (!visible || showcases.length === 0) return null;

  const currentPhoto = showcases[currentIndex] || showcases[0];
  const photoUrl =
    currentPhoto.imageUrl ||
    currentPhoto.thumbnailUrl ||
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&auto=format&fit=crop&q=80';

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleNext = () => {
    if (currentIndex < showcases.length - 1) setCurrentIndex((i) => i + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          {/* HEADER BAR */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.counterBox}>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {showcases.length}
              </Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
                <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* MAIN PHOTO ZOOM VIEWER */}
          <View style={styles.viewerContainer}>
            <PhotoZoomViewer imageUrl={photoUrl} />

            {/* Nút điều hướng Trái / Phải */}
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navBtn, styles.navPrev]}
                onPress={handlePrev}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {currentIndex < showcases.length - 1 && (
              <TouchableOpacity
                style={[styles.navBtn, styles.navNext]}
                onPress={handleNext}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* FOOTER INFO & THUMBNAILS */}
          <View style={styles.footer}>
            <View style={styles.captionArea}>
              <View style={styles.badgeRow}>
                {currentPhoto.styleName && (
                  <View style={styles.styleBadge}>
                    <Text style={styles.styleBadgeText}>{currentPhoto.styleName}</Text>
                  </View>
                )}
                {currentPhoto.packageName && (
                  <View style={styles.packageBadge}>
                    <Text style={styles.packageBadgeText} numberOfLines={1}>
                      {currentPhoto.packageName}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.titleText}>{currentPhoto.title || 'Ảnh mẫu tác phẩm'}</Text>
              {currentPhoto.description && (
                <Text style={styles.descText} numberOfLines={2}>
                  {currentPhoto.description}
                </Text>
              )}
            </View>

            {/* THANH THUMBNAIL DƯỚI ĐÁY */}
            {showcases.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbScroll}
              >
                {showcases.map((item, idx) => {
                  const isThumbActive = idx === currentIndex;
                  const thumbUrl = item.thumbnailUrl || item.imageUrl;
                  return (
                    <TouchableOpacity
                      key={`thumb-${item.id}-${idx}`}
                      style={[styles.thumbBox, isThumbActive && styles.thumbBoxActive]}
                      onPress={() => setCurrentIndex(idx)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: thumbUrl }}
                        style={styles.thumbImage}
                        contentFit="cover"
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  navBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  navPrev: {
    left: 12,
  },
  navNext: {
    right: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  captionArea: {
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  styleBadge: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  styleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  packageBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: SCREEN_WIDTH * 0.6,
  },
  packageBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  descText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
  },
  thumbScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  thumbBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.6,
  },
  thumbBoxActive: {
    borderColor: BrandColors.primary,
    opacity: 1,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
});
