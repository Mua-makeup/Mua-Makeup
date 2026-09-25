import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWorkstationStore } from '@/store/workstation.store';
import { muaProfileService } from '@/services/mua-profile.service';
import { router } from 'expo-router';

const RADIUS_OPTIONS = [
  { km: 5, label: '5 km', desc: 'Bán kính gần (Nội quận, 10–15 phút di chuyển)' },
  { km: 10, label: '10 km', desc: 'Bán kính tiêu chuẩn (Thuận tiện di chuyển)' },
  { km: 15, label: '15 km', desc: 'Mở rộng vừa (Khuyên dùng cho thợ MUA)' },
  { km: 20, label: '20 km', desc: 'Bán kính rộng (Nhận thêm nhiều cuốc VIP)' },
  { km: 30, label: '30 km', desc: 'Toàn thành phố (Tối đa lượng đơn đặt)' },
];

export const WorkstationHeader: React.FC = () => {
  const { isOnline, profile, toggleOnline } = useWorkstationStore();
  const [isToggling, setIsToggling] = useState(false);
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [currentRadius, setCurrentRadius] = useState<number>(
    profile?.maxServiceRadiusKm ? Number(profile.maxServiceRadiusKm) : 15
  );
  const [isUpdatingRadius, setIsUpdatingRadius] = useState(false);

  useEffect(() => {
    if (profile?.maxServiceRadiusKm) {
      setCurrentRadius(Number(profile.maxServiceRadiusKm));
    }
  }, [profile?.maxServiceRadiusKm]);

  const handleToggle = async (value: boolean) => {
    try {
      setIsToggling(true);
      await toggleOnline(value);
    } catch (err: any) {
      Alert.alert('Không Thể Bật Trực Tuyến', err.message || 'Vui lòng kiểm tra quyền vị trí và kết nối mạng.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleUpdateRadius = async (newRadius: number) => {
    if (newRadius < 1 || newRadius > 50 || newRadius === currentRadius) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentRadius(newRadius);
      setIsUpdatingRadius(true);

      // Cập nhật CSDL PostgreSQL Backend qua API
      await muaProfileService.updateMyProfile({
        maxServiceRadiusKm: newRadius,
        experienceYears: profile?.experienceYears || 1,
        bio: profile?.bio || '',
      });

      // Cập nhật store cục bộ
      useWorkstationStore.setState((state) => ({
        profile: state.profile
          ? { ...state.profile, maxServiceRadiusKm: newRadius }
          : null,
      }));
    } catch (e: any) {
      console.warn('Lỗi cập nhật bán kính:', e.message);
      if (profile?.maxServiceRadiusKm) {
        setCurrentRadius(Number(profile.maxServiceRadiusKm));
      }
    } finally {
      setIsUpdatingRadius(false);
    }
  };

  const handleAdjustRadius = (delta: number) => {
    const next = Math.max(1, Math.min(50, currentRadius + delta));
    handleUpdateRadius(next);
  };

  const avatarUrl =
    profile?.avatarUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.profileInfo}
          activeOpacity={0.8}
          onPress={() => router.push('/profile/mua-profile')}
        >
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10B981' : '#94A3B8' }]} />
          </View>
          <View style={styles.nameBlock}>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.fullName} numberOfLines={1}>
                {profile?.fullName || 'Chuyên Viên Make-up'}
              </Text>
              <View style={styles.badge}>
                <Ionicons name="sparkles" size={10} color="#D97706" />
                <Text style={styles.badgeText}>Pro MUA</Text>
              </View>
            </View>
            <Text style={styles.roleSubtext}>
              {profile?.experienceYears ? `${profile.experienceYears} năm kinh nghiệm` : 'Thợ trang điểm tự do'} • Bán kính {currentRadius}km
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profileEditBtn}
          onPress={() => router.push('/profile/mua-profile')}
        >
          <Ionicons name="options-outline" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Switch Bar: Sẵn sàng nhận ca */}
      <View style={[styles.toggleCard, isOnline ? styles.toggleCardActive : styles.toggleCardInactive]}>
        <View style={styles.toggleLeft}>
          <View style={[styles.iconCircle, { backgroundColor: isOnline ? '#DCFCE7' : '#F1F5F9' }]}>
            <Ionicons
              name={isOnline ? 'radio-outline' : 'moon-outline'}
              size={20}
              color={isOnline ? '#10B981' : '#64748B'}
            />
          </View>
          <View style={styles.toggleTextGroup}>
            <Text style={[styles.toggleTitle, { color: isOnline ? '#065F46' : '#1E293B' }]}>
              {isOnline ? 'Đang Trực Tuyến (GPS ON)' : 'Đang Tạm Nghỉ (Offline)'}
            </Text>
            <Text style={styles.toggleSubtitle}>
              {isOnline
                ? 'Sẵn sàng nhận ca khẩn cấp và đơn đặt hẹn gần bạn'
                : 'Bật trực tuyến để phát sóng GPS và nhận thông báo đơn'}
            </Text>
          </View>
        </View>

        {isToggling ? (
          <ActivityIndicator size="small" color="#E11D48" />
        ) : (
          <Switch
            value={isOnline}
            onValueChange={handleToggle}
            trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
            thumbColor={isOnline ? '#10B981' : '#FFFFFF'}
          />
        )}
      </View>

      {/* Bán Kính Nhận Ca: Dạng Dropdown Bar Tinh Tế Ngay Dưới Nút Bật/Tắt */}
      <TouchableOpacity
        style={styles.radiusSelectorBar}
        activeOpacity={0.7}
        onPress={() => setShowRadiusModal(true)}
      >
        <View style={styles.radiusBarLeft}>
          <View style={styles.radiusIconBadge}>
            <Ionicons name="navigate" size={13} color="#2563EB" />
          </View>
          <Text style={styles.radiusBarLabel}>Bán kính nhận ca:</Text>
          <View style={styles.radiusPill}>
            <Text style={styles.radiusPillText}>{currentRadius} km</Text>
          </View>
        </View>

        <View style={styles.radiusBarRight}>
          <Text style={styles.radiusChangeText}>Thay đổi</Text>
          <Ionicons name="chevron-down" size={14} color="#2563EB" />
        </View>
      </TouchableOpacity>

      {/* Bottom Sheet / Dropdown Modal Thiết Lập Bán Kính */}
      <Modal visible={showRadiusModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowRadiusModal(false)}
          />
          <View style={styles.radiusModalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleCol}>
                <Text style={styles.modalTitle}>Thiết Lập Bán Kính Nhận Ca</Text>
                <Text style={styles.modalSubtitle}>
                  Phạm vi phát sóng GPS nhận ca cấp tốc & hẹn lịch
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowRadiusModal(false)}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Current Value Display with +/- adjust */}
            <View style={styles.adjustRow}>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => handleAdjustRadius(-1)}
                disabled={currentRadius <= 1 || isUpdatingRadius}
              >
                <Ionicons name="remove" size={20} color={currentRadius <= 1 ? '#CBD5E1' : '#0F172A'} />
              </TouchableOpacity>

              <View style={styles.largeRadiusBox}>
                <Text style={styles.largeRadiusNum}>{currentRadius}</Text>
                <Text style={styles.largeRadiusUnit}>km</Text>
                {isUpdatingRadius && (
                  <ActivityIndicator size="small" color="#2563EB" style={{ marginLeft: 6 }} />
                )}
              </View>

              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => handleAdjustRadius(1)}
                disabled={currentRadius >= 50 || isUpdatingRadius}
              >
                <Ionicons name="add" size={20} color={currentRadius >= 50 ? '#CBD5E1' : '#0F172A'} />
              </TouchableOpacity>
            </View>

            {/* Quick Option Dropdown List */}
            <Text style={styles.presetHeading}>MỐC BÁN KÍNH PHỔ BIẾN</Text>
            <View style={styles.presetList}>
              {RADIUS_OPTIONS.map((opt) => {
                const isSelected = currentRadius === opt.km;
                return (
                  <TouchableOpacity
                    key={opt.km}
                    style={[styles.presetRow, isSelected && styles.presetRowActive]}
                    onPress={() => handleUpdateRadius(opt.km)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.presetTextCol}>
                      <View style={styles.presetTitleRow}>
                        <Text style={[styles.presetKmText, isSelected && styles.presetKmTextActive]}>
                          {opt.label}
                        </Text>
                        {opt.km === 15 && (
                          <View style={styles.recommendBadge}>
                            <Text style={styles.recommendText}>Khuyên dùng</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.presetDesc}>{opt.desc}</Text>
                    </View>

                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveRadiusBtn}
              onPress={() => setShowRadiusModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.saveRadiusText}>Xác Nhận & Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFE4E6',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nameBlock: {
    marginLeft: 12,
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  roleSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  profileEditBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  toggleCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  toggleCardInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  toggleTextGroup: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Bán kính selector bar đặt ngay dưới nút Bật/Tắt
  radiusSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  radiusBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radiusIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusBarLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  radiusPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  radiusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  radiusBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  radiusChangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },

  // Modal Bottom Sheet Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  radiusModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalHeaderTitleCol: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 17,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  adjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  largeRadiusBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 80,
    justifyContent: 'center',
  },
  largeRadiusNum: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
  },
  largeRadiusUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 4,
  },
  presetHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  presetList: {
    gap: 8,
    marginBottom: 20,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  presetRowActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  presetTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  presetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presetKmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  presetKmTextActive: {
    color: '#2563EB',
  },
  recommendBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  presetDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  saveRadiusBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveRadiusText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
