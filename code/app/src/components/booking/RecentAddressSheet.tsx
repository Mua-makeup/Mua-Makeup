import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { bookingService, RecentAddressItem } from '@/services/booking.service';
import * as Haptics from 'expo-haptics';

interface Props {
  selectedAddress: string;
  onSelectAddress: (address: string, lat: number, lng: number) => void;
  onOpenMapPicker: () => void;
}

export const RecentAddressSheet: React.FC<Props> = ({
  selectedAddress,
  onSelectAddress,
  onOpenMapPicker,
}) => {
  const [addresses, setAddresses] = useState<RecentAddressItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    bookingService.getRecentAddresses()
      .then((data) => {
        if (isMounted) {
          setAddresses(data);
        }
      })
      .catch(() => {
        // Fallback
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Nếu chưa có lịch sử từ backend, hiển thị danh sách gợi ý địa điểm tiêu biểu
  const displayAddresses: RecentAddressItem[] = addresses.length > 0
    ? addresses
    : [
        {
          address: 'Chung cư Vinhomes Central Park, 208 Nguyễn Hữu Cảnh, P.22, Bình Thạnh, TP.HCM',
          latitude: 10.7941,
          longitude: 106.7218,
          orderCount: 3,
        },
        {
          address: '128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM',
          latitude: 10.7694,
          longitude: 106.6908,
          orderCount: 1,
        },
        {
          address: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP.HCM',
          latitude: 10.7951,
          longitude: 106.7219,
          orderCount: 2,
        },
      ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="bookmark-outline" size={16} color={BrandColors.primary} />
          <Text style={styles.title}>Sổ Địa Chỉ Thân Quen</Text>
        </View>
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => {
            Haptics.selectionAsync();
            onOpenMapPicker();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="map-outline" size={13} color={BrandColors.primary} />
          <Text style={styles.mapBtnText}>Mở Bản Đồ</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Chọn nhanh địa chỉ bạn từng đặt để thợ điều hướng chính xác:
      </Text>

      {isLoading ? (
        <ActivityIndicator size="small" color={BrandColors.primary} style={{ marginVertical: 12 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollList}
        >
          {displayAddresses.map((item, index) => {
            const isSelected = selectedAddress === item.address;
            return (
              <TouchableOpacity
                key={`recent-addr-${index}`}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelectAddress(item.address, item.latitude, item.longitude);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.chipHeader}>
                  <View style={[styles.dot, isSelected && styles.dotSelected]} />
                  <Text style={[styles.chipTitle, isSelected && styles.chipTitleSelected]} numberOfLines={1}>
                    {item.orderCount && item.orderCount > 1 ? `Đã đặt ${item.orderCount} lần` : 'Địa chỉ đã lưu'}
                  </Text>
                </View>
                <Text
                  style={[styles.chipAddress, isSelected && styles.chipAddressSelected]}
                  numberOfLines={2}
                >
                  {item.address}
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
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mapBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  scrollList: {
    gap: 8,
    paddingRight: 10,
  },
  chip: {
    width: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipSelected: {
    backgroundColor: '#FFF5F6',
    borderColor: BrandColors.primary,
  },
  chipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  dotSelected: {
    backgroundColor: BrandColors.primary,
  },
  chipTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  chipTitleSelected: {
    color: BrandColors.primary,
  },
  chipAddress: {
    fontSize: 11,
    color: '#1E293B',
    lineHeight: 15,
  },
  chipAddressSelected: {
    color: '#881337',
    fontWeight: '600',
  },
});
