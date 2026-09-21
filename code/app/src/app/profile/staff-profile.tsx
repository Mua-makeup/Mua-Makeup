import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { staffProfileService, AgencyStaffProfile } from '@/services/staff-profile.service';
import { parseApiError } from '@/utils/error';

export default function StaffWorkProfileScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [staffProfile, setStaffProfile] = useState<AgencyStaffProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStaffProfile();
  }, []);

  const loadStaffProfile = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await staffProfileService.getMyStaffProfile();
      setStaffProfile(data);
    } catch (err: any) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Chưa tìm thấy thông tin Studio liên kết.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={BrandColors.slateHeading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ Sơ Nhân Sự Studio</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải hồ sơ nhân sự Studio...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerBox}>
          <Ionicons name="business-outline" size={48} color={BrandColors.slateMuted} />
          <Text style={styles.errorTitle}>Chưa Liên Kết Studio</Text>
          <Text style={styles.errorSub}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={loadStaffProfile}
            activeOpacity={0.7}
          >
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : staffProfile ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* THẺ STUDIO LIÊN KẾT */}
          <View style={styles.studioCard}>
            <View style={styles.studioHeaderRow}>
              {staffProfile.agencyLogoUrl ? (
                <Image
                  source={{ uri: staffProfile.agencyLogoUrl }}
                  style={styles.studioLogo}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.studioLogoPlaceholder}>
                  <Ionicons name="business" size={24} color={BrandColors.primary} />
                </View>
              )}
              <View style={styles.studioHeaderInfo}>
                <Text style={styles.studioName}>{staffProfile.agencyName}</Text>
                <Text style={styles.agencyCodeText}>
                  Mã Studio: {staffProfile.agencyCode || `AG-${staffProfile.agencyId}`}
                </Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>
                    {staffProfile.status === 'ACTIVE'
                      ? '✓ Đang làm việc chính thức'
                      : staffProfile.status === 'PENDING'
                        ? '⏳ Chờ phê duyệt gia nhập'
                        : staffProfile.status}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Thông tin liên hệ cơ sở */}
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color={BrandColors.slateMuted} />
              <Text style={styles.infoText}>
                Hotline Studio: {staffProfile.agencyPhone || 'Chưa cập nhật'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={BrandColors.slateMuted} />
              <Text style={styles.infoText} numberOfLines={2}>
                Địa chỉ: {staffProfile.agencyAddress || 'Chưa cập nhật'}
              </Text>
            </View>
          </View>

          {/* CHÍNH SÁCH HOA HỒNG & ĐÃI NGỘ */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="wallet-outline" size={18} color={BrandColors.primary} />
              <Text style={styles.cardTitle}>Chính Sách Hoa Hồng Thỏa Thuận</Text>
            </View>
            <View style={styles.commissionBox}>
              <Text style={styles.commissionVal}>
                {staffProfile.agreedCommissionRate !== undefined && staffProfile.agreedCommissionRate !== null
                  ? `${staffProfile.agreedCommissionRate}%`
                  : 'Theo tỷ lệ mặc định Studio'}
              </Text>
              <Text style={styles.commissionDesc}>
                Tỷ lệ chiết khấu thu nhập cá nhân được hưởng trên mỗi ca làm việc hoàn thành tại Studio.
              </Text>
            </View>
          </View>

          {/* NĂNG LỰC PHONG CÁCH ĐƯỢC PHỤ TRÁCH */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="color-palette-outline" size={18} color={BrandColors.primary} />
              <Text style={styles.cardTitle}>Phong Cách Được Gán Phụ Trách</Text>
            </View>

            {(!staffProfile.assignedStyles || staffProfile.assignedStyles.length === 0) ? (
              <Text style={styles.emptyText}>Chưa có phong cách nào được Studio gán duyệt.</Text>
            ) : (
              <View style={styles.stylesWrap}>
                {staffProfile.assignedStyles.map((s) => (
                  <View key={`style-${s.id}`} style={styles.styleChip}>
                    <Ionicons name="sparkles" size={12} color={BrandColors.primary} />
                    <Text style={styles.styleChipText}>{s.styleName}</Text>
                    {s.isQualified && (
                      <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {staffProfile.note ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ghi Chú Nội Bộ</Text>
              <Text style={styles.noteText}>{staffProfile.note}</Text>
            </View>
          ) : null}

          <View style={{ height: 30 }} />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: BrandColors.slateMuted,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.slateHeading,
    marginTop: 8,
  },
  errorSub: {
    fontSize: 13,
    color: BrandColors.slateMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: BrandColors.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 16,
  },
  studioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  studioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studioLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  studioLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  studioName: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  agencyCodeText: {
    fontSize: 12,
    color: BrandColors.slateMuted,
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: BrandColors.slateHeading,
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  commissionBox: {
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 4,
  },
  commissionVal: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  commissionDesc: {
    fontSize: 12,
    color: '#9F1239',
    lineHeight: 16,
  },
  emptyText: {
    fontSize: 13,
    color: BrandColors.slateMuted,
  },
  stylesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  styleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  noteText: {
    fontSize: 13,
    color: BrandColors.slateHeading,
    lineHeight: 18,
  },
});
