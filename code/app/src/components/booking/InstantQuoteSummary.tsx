import React from 'react';
import { View, Text } from 'react-native';
import type { InstantPriceQuote } from '@/services/booking.service';

export function InstantQuoteSummary({ quote }: { quote: InstantPriceQuote }) {
  const money = (value: number) => Number(value).toLocaleString('vi-VN') + ' đ';
  const rows: [string, number][] = [
    ['Gói trang điểm', quote.basePrice],
    ['Phí khẩn cấp (cố định)', quote.emergencySurchargeFee],
    [`Phụ phí nhu cầu cao (${Number(quote.surgeMultiplier).toFixed(2)}×)`, quote.surgeAmount],
    ['Di chuyển vượt 2km', quote.distanceFee],
    ['Tổng cộng', quote.totalAmount],
    ['Cọc cần thanh toán sau khi chọn thợ (30%)', quote.depositAmount],
  ];
  return <View style={{ padding: 14, backgroundColor: '#F0FDF4', borderRadius: 12, gap: 9, marginVertical: 12 }}>
    <Text style={{ color: '#166534', fontWeight: '700' }}>Báo giá {quote.estimate ? 'ước tính' : 'khẩn cấp'}</Text>
    <Text style={{ color: '#475569', fontSize: 12 }}>{quote.pricingReason}</Text>
    {rows.map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ flex: 1, color: '#334155', fontSize: 12 }}>{label}</Text>
      <Text style={{ color: '#0F172A', fontWeight: '700' }}>{money(value)}</Text>
    </View>)}
    <Text style={{ color: '#64748B', fontSize: 12 }}>Báo giá có hiệu lực 2 phút. Chưa thu tiền cọc.{quote.estimate ? ' Giá gói và phí di chuyển có thể đổi khi ghép thợ khác; bạn sẽ xem lại trước khi đặt cọc.' : ''}</Text>
  </View>;
}
