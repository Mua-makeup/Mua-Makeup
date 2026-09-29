import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MakeupStyle, taxonomyService } from '@/services/taxonomy.service';
import { BrandColors } from '@/constants/theme';

interface StyleChipSelectorProps {
  selectedStyleIds: number[];
  onChange: (ids: number[]) => void;
  error?: string;
}

export const StyleChipSelector: React.FC<StyleChipSelectorProps> = ({
  selectedStyleIds,
  onChange,
  error,
}) => {
  const [stylesList, setStylesList] = useState<MakeupStyle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStyles();
  }, []);

  const loadStyles = async () => {
    try {
      setLoading(true);
      const data = await taxonomyService.getActiveStyles();
      setStylesList(data);
    } catch (err) {
      console.error('Lỗi tải danh sách phong cách make-up:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: number) => {
    if (selectedStyleIds.includes(id)) {
      onChange(selectedStyleIds.filter((item) => item !== id));
    } else {
      onChange([...selectedStyleIds, id]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang tải phong cách...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chipsContainer}>
        {stylesList.map((style) => {
          const isSelected = selectedStyleIds.includes(style.id);
          return (
            <TouchableOpacity
              key={style.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => handleToggle(style.id)}
              activeOpacity={0.7}>
              {isSelected && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={BrandColors.primary}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {style.styleName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: BrandColors.slateMuted,
    marginLeft: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
  },
  chipSelected: {
    backgroundColor: BrandColors.subtle,
    borderColor: BrandColors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: BrandColors.slateBody,
  },
  chipTextSelected: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: BrandColors.danger,
    marginTop: 6,
  },
});
