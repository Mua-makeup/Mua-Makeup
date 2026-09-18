import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';

interface BaseInputProps extends TextInputProps {
  label: string;
  required?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  error?: string;
  isPassword?: boolean;
}

export const BaseInput: React.FC<BaseInputProps> = ({
  label,
  required = false,
  iconName,
  error,
  isPassword = false,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.requiredStar}>*</Text>}
      </View>

      {/* Input Box - Nhấn bất kỳ vị trí nào trong khung đều kích hoạt focus chuẩn xác */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          !!error && styles.inputError,
        ]}>
        {/* Left Icon */}
        {iconName && (
          <Ionicons
            name={iconName}
            size={18}
            color={isFocused ? BrandColors.primary : BrandColors.slatePlaceholder}
            style={styles.leftIcon}
          />
        )}

        {/* Text Input */}
        <TextInput
          ref={inputRef}
          style={[styles.textInput, style]}
          placeholderTextColor={BrandColors.slatePlaceholder}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />

        {/* Password Reveal Toggle */}
        {isPassword && (
          <TouchableOpacity
            style={styles.rightIconButton}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={BrandColors.slatePlaceholder}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Error Message */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  requiredStar: {
    color: BrandColors.danger,
    marginLeft: 3,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputFocused: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: BrandColors.danger,
  },
  leftIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: BrandColors.slateHeading,
  },
  rightIconButton: {
    padding: 6,
  },
  errorText: {
    fontSize: 11.5,
    color: BrandColors.danger,
    marginTop: 4,
    marginLeft: 2,
    fontWeight: '500',
  },
});
