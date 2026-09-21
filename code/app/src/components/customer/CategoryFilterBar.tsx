import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { MasterCategory, MakeupStyle } from '@/services/taxonomy.service';

interface Props {
  categories: MasterCategory[];
  makeupStyles: MakeupStyle[];
  selectedCategoryId: number | null;
  selectedStyleId: number | null;
  onSelectCategory: (id: number | null) => void;
  onSelectStyle: (id: number | null) => void;
}

export const CategoryFilterBar: React.FC<Props> = ({
  categories,
  makeupStyles,
  selectedCategoryId,
  selectedStyleId,
  onSelectCategory,
  onSelectStyle,
}) => {
  return (
    <View style={styles.container}>
      {/* TẦNG 1: DANH MỤC GỐC */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={[styles.pill, selectedCategoryId === null && styles.pillActive]}
          onPress={() => onSelectCategory(null)}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.pillText, selectedCategoryId === null && styles.pillTextActive]}
          >
            Tất Cả
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => {
          const isActive = selectedCategoryId === cat.id;
          return (
            <TouchableOpacity
              key={`cat-${cat.id}`}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => onSelectCategory(isActive ? null : cat.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {cat.categoryName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* TẦNG 2: PHONG CÁCH SỞ TRƯỜNG */}
      {makeupStyles.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, styles.subScrollContent]}
        >
          <TouchableOpacity
            style={[
              styles.subPill,
              selectedStyleId === null && styles.subPillActive,
            ]}
            onPress={() => onSelectStyle(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.subPillText,
                selectedStyleId === null && styles.subPillTextActive,
              ]}
            >
              Mọi phong cách
            </Text>
          </TouchableOpacity>

          {makeupStyles.map((style) => {
            const isActive = selectedStyleId === style.id;
            return (
              <TouchableOpacity
                key={`style-${style.id}`}
                style={[styles.subPill, isActive && styles.subPillActive]}
                onPress={() => onSelectStyle(isActive ? null : style.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.subPillText, isActive && styles.subPillTextActive]}>
                  {style.styleName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  subScrollContent: {
    marginTop: 8,
    gap: 6,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  pillActive: {
    backgroundColor: BrandColors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subPillActive: {
    backgroundColor: BrandColors.subtle,
    borderColor: BrandColors.primary,
  },
  subPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  subPillTextActive: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
});
