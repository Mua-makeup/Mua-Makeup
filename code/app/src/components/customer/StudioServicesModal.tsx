import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import { AgencyPublicProfile } from '@/services/agency.service';
import { packageService, PackageSummary } from '@/services/package.service';
import { DismissibleModal } from '@/components/common/DismissibleModal';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  visible: boolean;
  studio: AgencyPublicProfile | null;
  distanceKm?: number | null;
  onClose: () => void;
}

export const StudioServicesModal: React.FC<Props> = ({
  visible,
  studio,
  distanceKm,
  onClose,
}) => {
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && studio?.id) {
      loadStudioPackages(studio.id);
    } else {
      setPackages([]);
      setErrorMessage(null);
    }
  }, [visible, studio?.id]);

  const loadStudioPackages = async (agencyId: number) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 100% Real API từ Spring Boot Backend
      const list = await packageService.listPackages({
        agencyId,
        availableOnly: true,
      });
      setPackages(list);
    } catch (err: any) {
      console.warn('Lỗi tải gói dịch vụ của studio:', err);
      setErrorMessage('Không thể tải danh sách dịch vụ của studio lúc này.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallHotline = (phone?: string) => {
    if (!phone) {
      Alert.alert('Thông báo', 'Studio chưa cập nhật số hotline.');
      return;
    }
    Haptics.selectionAsync();
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Không thể thực hiện cuộc gọi', `Số hotline: ${phone}`);
    });
  };

  const handleBookPackage = (pkg: PackageSummary) => {
    if (!studio) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    if (!useAuthStore.getState().isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    // Điều hướng trực tiếp sang quy trình Đặt Lịch với vai trò AGENCY
    router.push({
      pathname: '/booking/create',
      params: {
        packageId: pkg.id.toString(),
        providerId: studio.id.toString(),
        providerType: 'AGENCY',
      },
    });
  };

  if (!studio) return null;

  const fullAddress = [studio.addressStreet, studio.district, studio.city]
    .filter(Boolean)
    .join(', ');

  return (
    <DismissibleModal
      visible={visible}
      onClose={onClose}
      overlayStyle={styles.overlay}
      contentStyle={styles.modalContent}
    >
      {/* HEADER STUDIO INFO */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.studioTypeBadge}>
            <Ionicons name="business-outline" size={13} color="#334155" />
            <Text style={styles.studioTypeBadgeText}>Cơ sở / Viện Áo Cưới</Text>
          </View>


        </View>

        <View style={styles.studioIdentityRow}>
          {studio.logoUrl ? (
            <Image
              source={{ uri: studio.logoUrl }}
              style={styles.studioLogo}
              contentFit="cover"
            />
          ) : (
            <View style={styles.studioLogoFallback}>
              <Ionicons name="business" size={28} color={BrandColors.primary} />
            </View>
          )}

          <View style={styles.studioIdentityInfo}>
            <View style={styles.studioNameRow}>
              <Text style={styles.studioName} numberOfLines={1}>
                {studio.agencyName}
              </Text>
              <Ionicons name="checkmark-circle" size={17} color="#2563EB" />
            </View>

            <View style={styles.ratingAndDistRow}>
              <View style={styles.ratingBox}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {studio.ratingAvg != null ? Number(studio.ratingAvg).toFixed(1) : '5.0'}
                </Text>
              </View>

              {distanceKm != null && (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <View style={styles.distBox}>
                    <Ionicons name="navigate-outline" size={12} color="#2563EB" />
                    <Text style={styles.distText}>
                      {distanceKm < 0.1 ? '< 100m' : `${distanceKm} km`}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {fullAddress ? (
              <View style={styles.addressRow}>
                <Ionicons
                  name="location-outline"
                  size={13}
                  color="#64748B"
                  style={{ marginTop: 1 }}
                />
                <Text style={styles.addressText} numberOfLines={2}>
                  {fullAddress}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* HOTLINE CALL ACTION */}
        {studio.hotline && (
          <TouchableOpacity
            style={styles.hotlineBar}
            onPress={() => handleCallHotline(studio.hotline)}
            activeOpacity={0.8}
          >
            <View style={styles.hotlineLeft}>
              <Ionicons name="call" size={14} color="#059669" />
              <Text style={styles.hotlineLabel}>Hotline tư vấn:</Text>
              <Text style={styles.hotlineNumber}>{studio.hotline}</Text>
            </View>
            <View style={styles.callNowBtn}>
              <Text style={styles.callNowBtnText}>Gọi ngay</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* DANH SÁCH GÓI DỊCH VỤ CỦA STUDIO */}
      <View style={styles.servicesHeaderRow}>
        <View style={styles.servicesHeaderLeft}>
          <Text style={styles.servicesTitle}>Bảng Giá Dịch Vụ Của Studio</Text>
        </View>
        {!isLoading && (
          <View style={styles.packageCountBadge}>
            <Text style={styles.packageCountText}>{packages.length} gói</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.packagesScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.packagesScrollInner}
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Đang tải bảng giá dịch vụ từ Studio...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadStudioPackages(studio.id)}
            >
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Studio đang cập nhật gói dịch vụ</Text>
            <Text style={styles.emptySubtitle}>
              Hiện chưa có gói dịch vụ công khai trên ứng dụng. Quý khách vui lòng liên hệ
              hotline để được tư vấn bảng giá và xếp lịch thợ nhanh chóng.
            </Text>
            {studio.hotline && (
              <TouchableOpacity
                style={styles.emptyCallBtn}
                onPress={() => handleCallHotline(studio.hotline)}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={15} color="#FFFFFF" />
                <Text style={styles.emptyCallBtnText}>Gọi {studio.hotline}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          packages.map((pkg) => {
            const formattedPrice = new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(pkg.price);

            return (
              <View key={`pkg-${pkg.id}`} style={styles.packageCard}>
                <View style={styles.packageCardTop}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {pkg.categoryName || 'Trang điểm'}
                    </Text>
                  </View>
                  <View style={styles.durationChip}>
                    <Ionicons name="time-outline" size={12} color="#64748B" />
                    <Text style={styles.durationText}>
                      {pkg.estimatedDurationMinutes || pkg.durationMinutes || 60} phút
                    </Text>
                  </View>
                </View>

                <Text style={styles.packageName} numberOfLines={2}>
                  {pkg.packageName}
                </Text>

                {pkg.description ? (
                  <Text style={styles.packageDescription} numberOfLines={2}>
                    {pkg.description}
                  </Text>
                ) : null}

                {/* STYLES TAGS */}
                {pkg.styles && pkg.styles.length > 0 && (
                  <View style={styles.stylesTagsRow}>
                    {pkg.styles.slice(0, 3).map((st) => (
                      <View key={`st-${st.id}`} style={styles.styleTag}>
                        <Text style={styles.styleTagText}>{st.styleName}</Text>
                      </View>
                    ))}
                    {pkg.styles.length > 3 && (
                      <View style={styles.styleTagMore}>
                        <Text style={styles.styleTagMoreText}>
                          +{pkg.styles.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* BOTTOM PRICE & ACTION */}
                <View style={styles.packageCardBottom}>
                  <View>
                    <Text style={styles.priceLabel}>Giá niêm yết</Text>
                    <Text style={styles.priceValue}>{formattedPrice}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.bookPackageBtn}
                    onPress={() => handleBookPackage(pkg)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.bookPackageBtnText}>Đặt Lịch</Text>
                    <Ionicons name="calendar" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </DismissibleModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '85%',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  header: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  studioTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  studioTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioIdentityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  studioLogo: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  studioLogoFallback: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioIdentityInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  studioNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  studioName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  ratingAndDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  dotSeparator: {
    color: '#94A3B8',
    fontSize: 10,
  },
  distBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distText: {
    fontSize: 11.5,
    color: '#2563EB',
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  addressText: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    flex: 1,
  },
  hotlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    borderWidth: 0.8,
    borderColor: '#A7F3D0',
  },
  hotlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hotlineLabel: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '500',
  },
  hotlineNumber: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#047857',
  },
  callNowBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  callNowBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  servicesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  servicesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  servicesTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  packageCountBadge: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  packageCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  packagesScroll: {
    paddingHorizontal: 16,
  },
  packagesScrollInner: {
    gap: 12,
    paddingBottom: 24,
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  errorBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyCallBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  packageCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  packageName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  stylesTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  styleTag: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  styleTagText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
  },
  styleTagMore: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  styleTagMoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  packageCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  bookPackageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  bookPackageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
