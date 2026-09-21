import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';

interface BaseButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'outline';
  showArrow?: boolean;
}

export const BaseButton: React.FC<BaseButtonProps> = ({
  title,
  loading = false,
  variant = 'primary',
  showArrow = true,
  style,
  disabled,
  ...props
}) => {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary ? styles.primaryButton : styles.outlineButton,
        (disabled || loading) && styles.disabledButton,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : BrandColors.primary} size="small" />
      ) : (
        <>
          <Text style={[styles.title, isPrimary ? styles.primaryTitle : styles.outlineTitle]}>
            {title}
          </Text>
          {showArrow && (
            <Ionicons
              name="arrow-forward"
              size={18}
              color={isPrimary ? '#FFFFFF' : BrandColors.primary}
              style={styles.icon}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginVertical: 6,
  },
  primaryButton: {
    backgroundColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  outlineButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BrandColors.borderInput,
  },
  disabledButton: {
    opacity: 0.65,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  primaryTitle: {
    color: '#FFFFFF',
  },
  outlineTitle: {
    color: BrandColors.slateHeading,
  },
  icon: {
    marginLeft: 8,
  },
});
