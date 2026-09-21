import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { MuaPublicProfile } from '@/services/mua-profile.service';

interface Props {
  profile: MuaPublicProfile;
}

export const MuaProfileHeader: React.FC<Props> = ({ profile }) => {
  const avatarUrl =
    profile.avatarUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
  const coverUrl =
    profile.coverImageUrl ||
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80';

  const rating = profile.ratingAverage ? Number(profile.ratingAverage).toFixed(1) : '4.9';
  const completedJobs = profile.totalCompletedJobs || 120;
  const experience = profile.experienceYears ? `${profile.experienceYears} năm kinh nghiệm` : 'Chuyên nghiệp';

  return (
    <View style={styles.container}>
      {/* ẢNH BÌA COVER */}
      <View style={styles.coverContainer}>
        <Image
          source={{ uri: coverUrl }}
          style={styles.coverImage}
          contentFit="cover"
        />
        <View style={styles.coverOverlay} />
      </View>

      {/* AVATAR VÀ THÔNG TIN PROFILE */}
      <View style={styles.profileContent}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            </View>
          </View>

          {/* Thống kê đánh giá và đơn hàng */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.statValue}>{rating}</Text>
              </View>
              <Text style={styles.statLabel}>{profile.totalReviews || 85} đánh giá</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statValue}>{completedJobs}+</Text>
              <Text style={styles.statLabel}>Đơn hoàn tất</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statValue}>99%</Text>
              <Text style={styles.statLabel}>Hài lòng</Text>
            </View>
          </View>
        </View>

        {/* TÊN NGHỆ DANH VÀ KINH NGHIỆM */}
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={styles.fullName}>{profile.fullName}</Text>
            <View style={styles.proTag}>
              <Text style={styles.proTagText}>Pro Artist</Text>
            </View>
          </View>
          <Text style={styles.experienceText}>
            <Ionicons name="ribbon-outline" size={13} color="#64748B" /> {experience}
          </Text>
        </View>

        {/* TIỂU SỬ BIO */}
        {profile.bio && (
          <Text style={styles.bioText} numberOfLines={3}>
            {profile.bio}
          </Text>
        )}

        {/* CHIPS PHONG CÁCH SỞ TRƯỜNG */}
        {profile.styles && profile.styles.length > 0 && (
          <View style={styles.stylesChipsRow}>
            {profile.styles.map((s) => (
              <View key={`mua-st-${s.id || s.styleId}`} style={styles.chip}>
                <Text style={styles.chipText}>{s.styleName}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
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
    opacity: 0.85,
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
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
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
    gap: 8,
  },
  fullName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  proTag: {
    backgroundColor: BrandColors.light,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  experienceText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  bioText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 10,
  },
  stylesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
});
