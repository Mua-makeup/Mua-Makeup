import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  PanResponder,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { telemetryService, NearbyProviderRes } from '@/services/telemetry.service';
import { useLocationStore } from '@/store/location.store';
import { GlobalPopupOverlay } from '@/components/common/GlobalPopupModal';
import { showGlobalPopup } from '@/store/popup.store';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectMua: (mua: NearbyProviderRes) => void;
  onFallbackRandomScan: () => void;
}

const RADIUS_OPTIONS = [5, 10, 15, 30];

export const OnlineMuaListModal: React.FC<Props> = ({
  visible,
  onClose,
  onSelectMua,
  onFallbackRandomScan,
}) => {
  const { latitude: storeLat, longitude: storeLng, currentAddress, fetchCurrentLocation } = useLocationStore();
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [providers, setProviders] = useState<NearbyProviderRes[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Cử chỉ vuốt xuống (swipe down) để đóng modal
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 8 && Math.abs(gestureState.dx) < gestureState.dy;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 40 || gestureState.vy > 0.5) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onClose();
        }
      },
    })
  ).current;

  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      reqIdRef.current++;
      setProviders([]);
      setRadiusKm(5);
      return;
    }

    setProviders([]);
    setRadiusKm(5);
    if (storeLat == null || storeLng == null) {
      fetchCurrentLocation();
    }
    loadOnlineProviders(5);
  }, [visible]);

  useEffect(() => {
    if (visible && storeLat != null && storeLng != null) {
      loadOnlineProviders(radiusKm);
    }
  }, [storeLat, storeLng]);

  const loadOnlineProviders = async (radius: number, isPullRefresh: boolean = false) => {
    const currentReqId = ++reqIdRef.current;
    if (isPullRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      let lat = storeLat;
      let lng = storeLng;

      if (lat == null || lng == null) {
        const state = useLocationStore.getState();
        lat = state.latitude;
        lng = state.longitude;
      }

      if (lat == null || lng == null) {
        const lastPos = await Location.getLastKnownPositionAsync().catch(() => null);
        if (lastPos?.coords) {
          lat = lastPos.coords.latitude;
          lng = lastPos.coords.longitude;
        } else {
          lat = 21.0285;
          lng = 105.8542;
        }
      }

      const list = await telemetryService.getNearbyProviders({
        latitude: lat,
        longitude: lng,
        radiusKm: radius,
        providerType: 'FREELANCE_MUA',
      });

      if (currentReqId === reqIdRef.current) {
        const freelanceOnly = (list || []).filter(
          (p) =>
            (!p.providerType || p.providerType === 'FREELANCE_MUA') &&
            (p.distanceKm == null || p.maxServiceRadiusKm == null || p.distanceKm <= p.maxServiceRadiusKm)
        );
        setProviders(freelanceOnly);
      }
    } catch (err) {
      console.warn('[OnlineMuaListModal] Lỗi tải thợ online:', err);
      if (currentReqId === reqIdRef.current) {
        setProviders([]);
      }
    } finally {
      if (currentReqId === reqIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  const handleSelectRadius = (r: number) => {
    Haptics.selectionAsync();
    setRadiusKm(r);
    loadOnlineProviders(r);
  };

  const handleBookNow = (item: NearbyProviderRes) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectMua(item);
  };

  const getHaversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getEffectiveDistance = (item: NearbyProviderRes): number | null => {
    if (item.distanceKm != null && item.distanceKm > 0) {
      return item.distanceKm;
    }
    if (storeLat && storeLng && item.fuzzedLatitude && item.fuzzedLongitude) {
      return getHaversineDistanceKm(storeLat, storeLng, item.fuzzedLatitude, item.fuzzedLongitude);
    }
    return item.distanceKm ?? null;
  };

  const formatDistance = (dist?: number | null) => {
    if (dist == null) return 'Gần bạn';
    if (dist < 0.1) return '< 100m';
    return `${dist.toFixed(1)} km`;
  };

  const formatVnd = (amount?: number) => {
    if (!amount) return '350.000 đ';
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Khoảng trống bên ngoài - ấn vào để đóng */}
        <Pressable
          style={styles.backdropPressable}
          onPress={onClose}
          accessibilityLabel="Đóng modal"
        />

        <View style={styles.sheetContainer}>
          {/* Top drag area with handle bar (vuốt xuống để đóng) */}
          <View {...panResponder.panHandlers} style={styles.dragArea}>
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerTitleCol}>
                <View style={styles.titleWithBadge}>
                  <Text style={styles.headerTitle}>Thợ MUA Đang Trực Tuyến</Text>
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>
                <Text style={styles.headerSub}>
                  {providers.length > 0
                    ? `Tìm thấy ${providers.length} chuyên viên đang online quanh bạn`
                    : 'Chuyên viên sẵn sàng nhận ca cấp tốc ngay'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bán kính quét */}
          <View style={styles.radiusRow}>
            <Text style={styles.radiusLabel}>Bán kính:</Text>
            <View style={styles.radiusPills}>
              {RADIUS_OPTIONS.map((r) => {
                const isSelected = r === radiusKm;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.radiusChip, isSelected && styles.radiusChipActive]}
                    onPress={() => handleSelectRadius(r)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.radiusChipText, isSelected && styles.radiusChipTextActive]}>
                      {r} km
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.refreshIconBtn}
              onPress={() => loadOnlineProviders(radiusKm)}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={16} color={BrandColors.primary} />
            </TouchableOpacity>
          </View>

          {/* Location indicator */}
          <View style={styles.locationBanner}>
            <Ionicons name="location" size={14} color="#E11D48" />
            <Text style={styles.locationBannerText} numberOfLines={1}>
              Điểm đón: {currentAddress || 'Vị trí hiện tại của bạn'}
            </Text>
          </View>

          {/* Nội dung danh sách */}
          {isLoading && !isRefreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
              <Text style={styles.loadingText}>Đang quét radar tìm thợ trực tuyến...</Text>
            </View>
          ) : providers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="radio-outline" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Chưa Có Thợ Online Trong {radiusKm}km</Text>
              <Text style={styles.emptySub}>
                Hiện tại chưa có chuyên viên make-up nào bật trực tuyến trong phạm vi này. Bạn có thể mở rộng bán kính quét hoặc sử dụng tính năng Đặt Thợ Ngẫu Nhiên để hệ thống điều phối.
              </Text>
              <View style={styles.emptyActionsRow}>
                {radiusKm < 30 && (
                  <TouchableOpacity
                    style={styles.expandRadiusBtn}
                    onPress={() => handleSelectRadius(30)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="expand-outline" size={15} color={BrandColors.primary} />
                    <Text style={styles.expandRadiusBtnText}>Quét 30 km</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.fallbackBtn}
                  onPress={onFallbackRandomScan}
                  activeOpacity={0.85}
                >
                  <Ionicons name="flash" size={15} color="#FFFFFF" />
                  <Text style={styles.fallbackBtnText}>Đặt Thợ Ngẫu Nhiên</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <FlatList
              data={providers}
              keyExtractor={(item) => String(item.providerId)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => loadOnlineProviders(radiusKm, true)}
                  colors={[BrandColors.primary]}
                  tintColor={BrandColors.primary}
                />
              }
              renderItem={({ item }) => (
                <View style={styles.muaCard}>
                  {/* Left: Avatar with online pulse */}
                  <View style={styles.avatarWrapper}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.avatarImg} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>
                          {item.fullName ? item.fullName.charAt(0).toUpperCase() : 'M'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.pulseContainer}>
                      <View style={styles.pulseDot} />
                    </View>
                  </View>

                  {/* Center: Info */}
                  <View style={styles.infoCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.muaName} numberOfLines={1}>
                        {item.fullName || 'Chuyên Viên Make-up'}
                      </Text>
                      <Ionicons name="checkmark-circle" size={14} color="#2563EB" style={{ marginLeft: 4 }} />
                    </View>

                    {/* Rating & Distance */}
                    <View style={styles.metaRow}>
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={11} color="#F59E0B" />
                        <Text style={styles.ratingText}>
                          {item.ratingAvg ? Number(item.ratingAvg).toFixed(1) : '5.0'}
                        </Text>
                      </View>

                      <View style={styles.distanceBadge}>
                        <Ionicons name="navigate" size={11} color="#059669" />
                        <Text style={styles.distanceText}>
                          {formatDistance(getEffectiveDistance(item))}
                        </Text>
                      </View>
                    </View>

                    {/* Price & Service Radius */}
                    <View style={styles.priceAndRadiusRow}>
                      <Text style={styles.priceText}>
                        Giá từ: <Text style={styles.priceBold}>{formatVnd(item.startingPrice)}</Text>
                      </Text>

                      {item.maxServiceRadiusKm != null && (
                        <View style={styles.serviceRadiusBadge}>
                          <Ionicons name="radio-outline" size={10} color="#2563EB" />
                          <Text style={styles.serviceRadiusText}>
                            Nhận {item.maxServiceRadiusKm}km
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Styles chips */}
                    {item.styles && item.styles.length > 0 && (
                      <View style={styles.stylesPillRow}>
                        {item.styles.slice(0, 2).map((s, idx) => (
                          <View key={idx} style={styles.stylePill}>
                            <Text style={styles.stylePillText} numberOfLines={1}>
                              {s}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Right: CTA button "Đặt Ngay ⚡" */}
                  <View style={styles.actionCol}>
                    <TouchableOpacity
                      style={styles.bookNowBtn}
                      onPress={() => handleBookNow(item)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="flash" size={13} color="#FFFFFF" />
                      <Text style={styles.bookNowBtnText}>Đặt Ngay</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>

      {/* POPUP ALERT TOÀN CỤC BÊN TRONG MODAL */}
      <GlobalPopupOverlay />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '55%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  dragArea: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  radiusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginRight: 10,
  },
  radiusPills: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  radiusChipActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  radiusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  radiusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  refreshIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 7,
    backgroundColor: '#FFF1F2',
    gap: 6,
  },
  locationBannerText: {
    fontSize: 11,
    color: '#BE123C',
    fontWeight: '600',
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  expandRadiusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF1F2',
  },
  expandRadiusBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BrandColors.primary,
  },
  fallbackBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  muaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImg: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  pulseContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  muaName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    maxWidth: 160,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  serviceRadiusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#BFDBFE',
  },
  serviceRadiusText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  priceAndRadiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  priceText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  priceBold: {
    fontWeight: '700',
    color: '#BE185D',
  },
  stylesPillRow: {
    flexDirection: 'row',
    gap: 4,
  },
  stylePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 90,
  },
  stylePillText: {
    fontSize: 10,
    color: '#475569',
  },
  actionCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  bookNowBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
