import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useWorkstationStore } from '@/store/workstation.store';
import { router } from 'expo-router';

export const WorkstationHeader: React.FC = () => {
  const { isOnline, profile, toggleOnline } = useWorkstationStore();
  const [isToggling, setIsToggling] = useState(false);

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
              {profile?.experienceYears ? `${profile.experienceYears} năm kinh nghiệm` : 'Thợ trang điểm tự do'} • Bán kính {profile?.maxServiceRadiusKm || 15}km
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
});
