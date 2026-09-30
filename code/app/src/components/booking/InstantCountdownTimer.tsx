import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';

interface Props {
  secondsLeft: number;
}

export const InstantCountdownTimer: React.FC<Props> = ({ secondsLeft }) => {
  useEffect(() => {
    if (secondsLeft > 0 && secondsLeft % 5 === 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [secondsLeft]);

  return (
    <View style={styles.container}>
      <Text style={styles.countdownNumber}>{secondsLeft}</Text>
      <Text style={styles.countdownLabel}>giây</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  countdownNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: BrandColors.primary,
    lineHeight: 32,
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
});
