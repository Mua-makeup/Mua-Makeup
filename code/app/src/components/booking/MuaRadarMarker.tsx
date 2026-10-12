import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Ionicons } from '@expo/vector-icons';
import { NearbyProviderRes } from '@/services/telemetry.service';
import { BrandColors } from '@/constants/theme';

interface Props {
  provider: NearbyProviderRes;
  x: number;
  y: number;
  isSelected?: boolean;
  onPress: (provider: NearbyProviderRes) => void;
}

export const MuaRadarMarker: React.FC<Props> = ({
  provider,
  x,
  y,
  isSelected = false,
  onPress,
}) => {
  const formattedDistance =
    provider.distanceKm < 1
      ? `${Math.round(provider.distanceKm * 1000)}m`
      : `${provider.distanceKm.toFixed(1)}km`;



  return (
    <View style={[styles.container, { left: x - 26, top: y - 26 }]}>
      <TouchableOpacity
        style={[
          styles.markerButton,
          isSelected && styles.markerButtonSelected,
        ]}
        onPress={() => onPress(provider)}
        activeOpacity={0.85}
      >
        {/* Pulse ring for active status */}
        <View style={styles.pulseRing} />

        <UserAvatar
          uri={provider.avatarUrl}
          name={provider.fullName}
          size={44}
        />

        {/* Small verified / online badge */}
        <View style={styles.onlineDot} />
      </TouchableOpacity>

      {/* Distance tag under avatar */}
      <View style={[styles.distancePill, isSelected && styles.distancePillSelected]}>
        <Text style={styles.distanceText}>{formattedDistance}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    zIndex: 10,
  },
  markerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 6,
  },
  markerButtonSelected: {
    borderColor: '#F59E0B',
    transform: [{ scale: 1.15 }],
    shadowColor: '#F59E0B',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distancePill: {
    marginTop: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  distancePillSelected: {
    backgroundColor: BrandColors.primary,
    borderColor: '#FDE047',
  },
  distanceText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
});
