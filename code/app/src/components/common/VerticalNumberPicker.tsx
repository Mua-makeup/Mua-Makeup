import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BrandColors } from '@/constants/theme';

const ROW_HEIGHT = 30;

interface Props {
  label: string;
  unit: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
}

/** Compact wheel with a highlighted selection and one adjacent value on each side. */
export function VerticalNumberPicker({ label, unit, value, options, onChange }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, options.indexOf(value));
  const indexRef = useRef(selectedIndex);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (indexRef.current !== selectedIndex) {
      indexRef.current = selectedIndex;
      scrollRef.current?.scrollTo({ y: selectedIndex * ROW_HEIGHT, animated: false });
    }
  }, [selectedIndex]);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  const select = (index: number) => {
    const next = Math.max(0, Math.min(options.length - 1, index));
    indexRef.current = next;
    onChange(options[next]);
    scrollRef.current?.scrollTo({ y: next * ROW_HEIGHT, animated: false });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label} <Text style={styles.unit}>({unit})</Text></Text>
      <View style={styles.wheel}>
        <View pointerEvents="none" style={styles.selection} />
        <ScrollView
          ref={scrollRef}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={ROW_HEIGHT}
          decelerationRate="fast"
          bounces={false}
          scrollEventThrottle={16}
          contentContainerStyle={styles.items}
          onLayout={() => scrollRef.current?.scrollTo({ y: indexRef.current * ROW_HEIGHT, animated: false })}
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: options[0], max: options[options.length - 1], now: value, text: `${value} ${unit}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={({ nativeEvent }) => select(indexRef.current + (nativeEvent.actionName === 'increment' ? 1 : -1))}
          onScroll={({ nativeEvent }) => {
            const index = Math.max(0, Math.min(options.length - 1, Math.round(nativeEvent.contentOffset.y / ROW_HEIGHT)));
            if (index !== indexRef.current) {
              indexRef.current = index;
              onChange(options[index]);
            }
            if (settleTimer.current) clearTimeout(settleTimer.current);
            settleTimer.current = setTimeout(() => {
              scrollRef.current?.scrollTo({ y: indexRef.current * ROW_HEIGHT, animated: false });
            }, 180);
          }}
        >
          {options.map((option, index) => (
            <TouchableOpacity key={option} style={styles.item} onPress={() => select(index)} accessibilityLabel={`${option} ${unit}`} accessibilityState={{ selected: option === value }}>
              <Text style={[styles.number, option === value && styles.selectedNumber]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minWidth: 0, gap: 6 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155' },
  unit: { fontWeight: '400', color: '#64748B' },
  wheel: { height: ROW_HEIGHT * 3, overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  selection: { position: 'absolute', top: ROW_HEIGHT, left: 5, right: 5, height: ROW_HEIGHT, borderRadius: 7, backgroundColor: BrandColors.subtle },
  items: { paddingVertical: ROW_HEIGHT },
  item: { height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  number: { fontSize: 14, color: '#94A3B8', fontVariant: ['tabular-nums'] },
  selectedNumber: { fontSize: 19, fontWeight: '700', color: BrandColors.primary },
});
