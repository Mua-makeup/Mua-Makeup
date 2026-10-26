import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { AgencyPublicProfile } from '@/services/agency.service';

interface Props {
  studio: AgencyPublicProfile;
  distanceKm?: number | null;
}

export const StudioProfileHeader: React.FC<Props> = ({ studio, distanceKm }) => {
  const insets = useSafeAreaInsets();
  const [isAvatarZoomVisible, setIsAvatarZoomVisible] = useState(false);

  const logoUrl = studio.logoUrl;
  const coverUrl =
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&auto=format&fit=crop&q=80';

  const rating =
    studio.ratingAvg != null ? Number(studio.ratingAvg).toFixed(1) : '5.0';

  const fullAddress = [studio.addressStreet, studio.district, studio.city]
    .filter(Boolean)
    .join(', ');

  const phoneDisplay = studio.hotline || studio.ownerPhone || '0364852922';

  const modalTopInset = Math.max(
    insets.top,
    Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24
  );

  return (
    <View style={styles.container}>
      {/* ẢNH BÌA COVER BANNER */}
      <View style={styles.coverContainer}>
        <Image
          source={{ uri: coverUrl }}
          style={styles.coverImage}
          contentFit="cover"
        />
        <View style={styles.coverOverlay} />
      </View>

      {/* AVATAR VÀ THÔNG TIN PROFILE STUDIO */}
      <View style={styles.profileContent}>
        <View style={styles.avatarRow}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => setIsAvatarZoomVisible(true)}
            activeOpacity={0.88}
          >
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={styles.avatarImg}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="business" size={38} color={BrandColors.primary} />
              </View>
            )}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
            </View>
          </TouchableOpacity>

          {/* Thống kê đánh giá, đơn hoàn tất, độ hài lòng */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.statValue}>{rating}</Text>
              </View>
              <Text style={styles.statLabel}>
                {studio.totalReviews != null && studio.totalReviews > 0
                  ? `${studio.totalReviews} đánh giá`
                  : 'Chưa có đánh giá'}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statValue}>11+</Text>
              <Text style={styles.statLabel}>Chuyên viên trực</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statValue}>100%</Text>
              <Text style={styles.statLabel}>Cam kết ca</Text>
            </View>
          </View>
        </View>

        {/* TÊN STUDIO VÀ BADGES */}
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={styles.fullName} numberOfLines={2}>
              {studio.agencyName}
            </Text>
            <View style={styles.studioEnterpriseTag}>
              <Text style={styles.studioEnterpriseTagText}>🏛️ Cơ Sở Viện Cưới</Text>
            </View>
          </View>

          {/* MÃ CƠ SỞ & LOẠI HÌNH */}
          <View style={styles.subInfoRow}>
            <Ionicons name="business-outline" size={13} color="#64748B" />
            <Text style={styles.experienceText}>
              Cơ sở Viện Áo Cưới & Make-up Chuyên Nghiệp
            </Text>
            {!!studio.agencyCode && (
              <View style={styles.codeBadge}>
                <Text style={styles.codeBadgeText}>{studio.agencyCode}</Text>
              </View>
            )}
          </View>
        </View>

        {/* TIỂU SỬ / GIỚI THIỆU STUDIO */}
        <Text style={styles.bioText} numberOfLines={3}>
          Hệ thống cơ sở trang điểm uy tín, chuyên nghiệp. Cam kết 100% sử dụng mỹ phẩm chính hãng cao cấp, phục vụ chu đáo cho cô dâu, dự tiệc và sự kiện.
        </Text>

        {/* THÔNG TIN ĐỊA CHỈ VÀ SỐ ĐIỆN THOẠI STUDIO (KHÔNG NÚT GỌI) */}
        <View style={styles.contactCard}>
          {!!fullAddress && (
            <View style={styles.contactItem}>
              <View style={styles.contactIconWrapAddress}>
                <Ionicons name="location-sharp" size={15} color="#E11D48" />
              </View>
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactText} numberOfLines={2}>
                  {fullAddress}
                </Text>
                {distanceKm != null && (
                  <Text style={styles.distanceText}>
                    • Cách bạn {distanceKm < 0.1 ? '< 100m' : `${distanceKm} km`}
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.contactDivider} />

          <View style={styles.contactItem}>
            <View style={styles.contactIconWrapPhone}>
              <Ionicons name="call" size={14} color="#059669" />
            </View>
            <View style={styles.contactTextContainer}>
              <Text style={styles.phoneLabel}>Hotline tư vấn & đặt hẹn: </Text>
              <Text style={styles.phoneValue}>{phoneDisplay}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* MODAL PHÓNG TO ẢNH LOGO CƠ SỞ STUDIO */}
      <Modal
        visible={isAvatarZoomVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsAvatarZoomVisible(false)}
        statusBarTranslucent
      >
        <View
          style={[
            styles.zoomContainer,
            {
              paddingTop: modalTopInset,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <View style={styles.zoomHeader}>
            <TouchableOpacity
              style={styles.zoomBackBtn}
              onPress={() => setIsAvatarZoomVisible(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.zoomTitle} numberOfLines={1}>
                {studio.agencyName}
              </Text>
              <Text style={styles.zoomSubtitle}>Logo cơ sở Studio</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <Pressable
            style={styles.zoomContent}
            onPress={() => setIsAvatarZoomVisible(false)}
          >
            {logoUrl ? (
              <Image
                source={{ uri: logoUrl }}
                style={styles.largeAvatarImg}
                contentFit="contain"
              />
            ) : (
              <View style={styles.largeFallback}>
                <Ionicons name="business" size={90} color={BrandColors.primary} />
                <Text style={styles.largeFallbackText}>{studio.agencyName}</Text>
              </View>
            )}
            <Text style={styles.zoomHint}>Chạm vào màn hình để đóng</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  coverContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    opacity: 0.88,
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  profileContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: -40,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'visible',
  },
  avatarImg: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  avatarFallback: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    padding: 1.5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statBox: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  nameSection: {
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  fullName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  studioEnterpriseTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: '#BFDBFE',
  },
  studioEnterpriseTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  experienceText: {
    fontSize: 12,
    color: '#64748B',
  },
  codeBadge: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  bioText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 10,
  },
  contactCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactIconWrapAddress: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactIconWrapPhone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 17,
  },
  distanceText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  contactDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  phoneLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  phoneValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  zoomContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  zoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  zoomBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  zoomSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  zoomContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  largeAvatarImg: {
    width: '100%',
    height: '75%',
  },
  largeFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  largeFallbackText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  zoomHint: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 20,
  },
});
