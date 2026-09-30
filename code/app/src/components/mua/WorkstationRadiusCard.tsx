import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWorkstationStore } from '@/store/workstation.store';
import { muaProfileService } from '@/services/mua-profile.service';

const RADIUS_OPTIONS = [5, 10, 15, 20, 30];

export const WorkstationRadiusCard: React.FC = () => {
  const { profile } = useWorkstationStore();
  const [currentRadius, setCurrentRadius] = useState<number>(
    profile?.maxServiceRadiusKm ? Number(profile.maxServiceRadiusKm) : 15
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile?.maxServiceRadiusKm) {
      setCurrentRadius(Number(profile.maxServiceRadiusKm));
    }
  }, [profile?.maxServiceRadiusKm]);

  const handleUpdateRadius = async (newRadius: number) => {
    if (newRadius < 1 || newRadius > 50 || newRadius === currentRadius) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentRadius(newRadius);
      setIsUpdating(true);
      setSavedSuccess(false);

      // Cập nhật CSDL PostgreSQL Backend qua API
      await muaProfileService.updateMyProfile({
        maxServiceRadiusKm: newRadius,
        experienceYears: profile?.experienceYears || 1,
        bio: profile?.bio || '',
      });

      // Cập nhật store cục bộ để header hiển thị ngay
      useWorkstationStore.setState((state) => ({
        profile: state.profile
          ? { ...state.profile, maxServiceRadiusKm: newRadius }
          : null,
      }));

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (e: any) {
      console.warn('Lỗi cập nhật bán kính:', e.message);
      // Rollback nếu có lỗi
      if (profile?.maxServiceRadiusKm) {
        setCurrentRadius(Number(profile.maxServiceRadiusKm));
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAdjust = (delta: number) => {
    const next = Math.max(1, Math.min(50, currentRadius + delta));
    handleUpdateRadius(next);
  };

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconCircle}>
            <Ionicons name="navigate" size={15} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.titleText}>Bán Kính Nhận Ca</Text>
            <Text style={styles.subtitleText}>
              Phạm vi phát sóng GPS nhận ca cấp tốc & hẹn lịch
            </Text>
          </View>
        </View>

        {/* Current Radius Badge & Status */}
        <View style={styles.statusBadgeRow}>
          {isUpdating ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : savedSuccess ? (
            <View style={styles.savedBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#059669" />
              <Text style={styles.savedText}>Đã lưu</Text>
            </View>
          ) : (
            <View style={styles.radiusPill}>
              <Text style={styles.radiusPillText}>{currentRadius} km</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Select Preset Pills & Increment/Decrement */}
      <View style={styles.actionRow}>
        {/* Minus button */}
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => handleAdjust(-1)}
          activeOpacity={0.7}
          disabled={currentRadius <= 1}
        >
          <Ionicons name="remove" size={16} color={currentRadius <= 1 ? '#CBD5E1' : '#0F172A'} />
        </TouchableOpacity>

        {/* Preset Chips */}
        <View style={styles.pillsContainer}>
          {RADIUS_OPTIONS.map((km) => {
            const isSelected = currentRadius === km;
            return (
              <TouchableOpacity
                key={km}
                style={[styles.presetChip, isSelected && styles.presetChipActive]}
                onPress={() => handleUpdateRadius(km)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    isSelected && styles.presetChipTextActive,
                  ]}
                >
                  {km}km
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Plus button */}
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => handleAdjust(1)}
          activeOpacity={0.7}
          disabled={currentRadius >= 50}
        >
          <Ionicons name="add" size={16} color={currentRadius >= 50 ? '#CBD5E1' : '#0F172A'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitleText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadgeRow: {
    alignItems: 'flex-end',
    minWidth: 56,
  },
  radiusPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  radiusPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  savedText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  presetChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
});
