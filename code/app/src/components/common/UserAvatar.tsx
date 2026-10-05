import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Image, ImageStyle } from 'expo-image';

export interface UserAvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
  borderRadius?: number;
  contentFit?: 'cover' | 'contain' | 'fill';
}

const AVATAR_PALETTES = [
  { bg: '#FFE4E6', text: '#E11D48', border: '#FDA4AF' }, // Rose
  { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' }, // Amber
  { bg: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD' }, // Purple
  { bg: '#E0E7FF', text: '#4338CA', border: '#A5B4FC' }, // Indigo
  { bg: '#FCE7F3', text: '#BE185D', border: '#F9A8D4' }, // Pink
  { bg: '#CCFBF1', text: '#0F766E', border: '#5EEAD4' }, // Teal
  { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' }, // Emerald
  { bg: '#CFFAFE', text: '#0E7490', border: '#67E8F9' }, // Cyan
];

/**
 * Trích xuất chữ cái đầu tiên của tên để hiển thị avatar mặc định
 */
export const getAvatarInitial = (name?: string | null): string => {
  if (!name) return 'U';
  const clean = name.trim();
  if (!clean) return 'U';
  return clean.charAt(0).toUpperCase();
};

/**
 * Lấy bảng màu tương thích dựa theo chuỗi tên
 */
export const getAvatarColor = (name?: string | null) => {
  if (!name || !name.trim()) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  uri,
  name,
  size = 40,
  style,
  imageStyle,
  textStyle,
  borderRadius,
  contentFit = 'cover',
}) => {
  const [loadFailed, setLoadFailed] = useState(false);

  // Khi URI thay đổi, reset trạng thái lỗi
  useEffect(() => {
    setLoadFailed(false);
  }, [uri]);

  const radius = borderRadius !== undefined ? borderRadius : size / 2;
  const initial = getAvatarInitial(name);
  const palette = getAvatarColor(name);

  const isValidUri = Boolean(
    uri &&
      typeof uri === 'string' &&
      uri.trim().length > 0 &&
      !uri.includes('undefined') &&
      !uri.includes('null')
  );

  if (isValidUri && !loadFailed) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: radius,
            overflow: 'hidden',
          },
          style,
        ]}
      >
        <Image
          source={{ uri: uri!.trim() }}
          style={[
            {
              width: size,
              height: size,
              borderRadius: radius,
            },
            imageStyle,
          ]}
          contentFit={contentFit}
          onError={() => setLoadFailed(true)}
        />
      </View>
    );
  }

  // Fallback: Chữ cái đầu
  return (
    <View
      style={[
        styles.container,
        styles.fallbackContainer,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.initialText,
          {
            color: palette.text,
            fontSize: Math.max(12, Math.round(size * 0.42)),
            lineHeight: Math.max(14, Math.round(size * 0.48)),
          },
          textStyle,
        ]}
      >
        {initial}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackContainer: {
    borderWidth: 1,
  },
  initialText: {
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
