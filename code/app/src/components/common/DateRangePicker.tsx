import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { start: string; end: string; onChange: (start: string, end: string) => void };
const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const display = (value: string) => value ? value.split('-').reverse().join('/') : 'Chọn ngày';

export function DateRangePicker({ start, end, onChange }: Props) {
  const [active, setActive] = useState<'start' | 'end' | null>(null);
  const [month, setMonth] = useState(new Date());
  const open = (field: 'start' | 'end') => {
    const value = field === 'start' ? start : end;
    setMonth(value ? new Date(`${value}T12:00:00`) : new Date());
    setActive(active === field ? null : field);
  };
  const first = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const select = (value: string) => {
    // Keep the range valid when either boundary moves past the other.
    if (active === 'start') onChange(value, end && end < value ? value : end);
    else onChange(start && start > value ? value : start, value);
    setActive(null);
  };
  return <View>
    <View style={styles.row}>
      {(['start', 'end'] as const).map(field => <View key={field} style={styles.column}>
        <Text style={styles.label}>{field === 'start' ? 'Từ ngày' : 'Đến ngày'}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Chọn ${field === 'start' ? 'từ ngày' : 'đến ngày'}`} onPress={() => open(field)} style={[styles.input, active === field && styles.active]}>
          <Text style={styles.value}>{display(field === 'start' ? start : end)}</Text>
          <Ionicons name="calendar-outline" size={20} color="#E11D48" />
        </TouchableOpacity>
      </View>)}
    </View>
    {active && <View style={styles.calendar}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Tháng trước" accessibilityRole="button" style={styles.arrow} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Ionicons name="chevron-back" size={22} /></TouchableOpacity>
        <Text style={styles.title}>Tháng {month.getMonth() + 1}/{month.getFullYear()}</Text>
        <TouchableOpacity accessibilityLabel="Tháng sau" accessibilityRole="button" style={styles.arrow} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Ionicons name="chevron-forward" size={22} /></TouchableOpacity>
      </View>
      <View style={styles.grid}>
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <View key={day} style={styles.cell}><Text style={styles.label}>{day}</Text></View>)}
        {Array.from({ length: first }, (_, i) => <View key={`empty-${i}`} style={styles.cell} />)}
        {Array.from({ length: count }, (_, i) => {
          const value = format(new Date(month.getFullYear(), month.getMonth(), i + 1));
          const selected = value === (active === 'start' ? start : end);
          return <TouchableOpacity key={value} accessibilityRole="button" accessibilityLabel={display(value)} accessibilityState={{ selected }} onPress={() => select(value)} style={[styles.cell, selected && styles.selected]}><Text style={selected ? styles.selectedText : styles.value}>{i + 1}</Text></TouchableOpacity>;
        })}
      </View>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 }, column: { flex: 1 },
  label: { fontSize: 13, color: '#64748B', marginBottom: 6 },
  input: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12 },
  active: { borderColor: '#E11D48' }, value: { fontSize: 14, color: '#0F172A' },
  calendar: { marginTop: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 15, fontWeight: '600', color: '#0F172A' }, arrow: { padding: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' }, cell: { width: '14.285714%', height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  selected: { backgroundColor: '#E11D48' }, selectedText: { color: '#FFFFFF', fontWeight: '600' },
});
