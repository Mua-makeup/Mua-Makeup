import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';

interface BrandLogoProps {
  title?: string;
  subtitle?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  title,
  subtitle,
}) => {
  return (
    <View style={styles.container}>
      {/* Brand Header Row */}
      <View style={styles.logoRow}>
        <View style={styles.iconBox}>
          <Ionicons name="sparkles" size={22} color="#FFFFFF" />
        </View>
        <Text style={styles.brandName}>MUA MAKEUP</Text>
      </View>

      {/* Screen Title & Subtitle */}
      {title && <Text style={styles.titleText}>{title}</Text>}
      {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 14,
    paddingHorizontal: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: BrandColors.slateHeading,
    letterSpacing: -0.5,
  },
  titleText: {
    fontSize: 26,
    fontWeight: '800',
    color: BrandColors.slateHeading,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: BrandColors.slateMuted,
    textAlign: 'center',
  },
});
