import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';

interface QuickTestAccountsProps {
  onSelectAccount: (phone: string, roleName: string) => void;
}

export const QuickTestAccounts: React.FC<QuickTestAccountsProps> = ({ onSelectAccount }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>TÀI KHOẢN DÙNG THỬ (MOBILE ROLES)</Text>

      <View style={styles.grid}>
        {/* Role 1: Khách Hàng */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => onSelectAccount('0912345678', 'Khách Hàng')}
          activeOpacity={0.75}>
          <Ionicons name="person" size={16} color={BrandColors.primary} style={styles.icon} />
          <Text style={styles.roleName}>Khách Hàng</Text>
          <Text style={styles.phoneText}>0912345678</Text>
        </TouchableOpacity>

        {/* Role 2: Thợ MUA Tự Do */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => onSelectAccount('0987654321', 'Thợ MUA')}
          activeOpacity={0.75}>
          <Ionicons name="brush" size={16} color="#F59E0B" style={styles.icon} />
          <Text style={styles.roleName}>Thợ MUA</Text>
          <Text style={styles.phoneText}>0987654321</Text>
        </TouchableOpacity>

        {/* Role 3: Nhân Viên Agency */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => onSelectAccount('0933112233', 'NV Agency')}
          activeOpacity={0.75}>
          <Ionicons name="business" size={16} color="#3B82F6" style={styles.icon} />
          <Text style={styles.roleName}>NV Agency</Text>
          <Text style={styles.phoneText}>0933112233</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    width: '100%',
  },
  sectionLabel: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: BrandColors.slatePlaceholder,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 4,
  },
  roleName: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.slateHeading,
    textAlign: 'center',
  },
  phoneText: {
    fontSize: 10,
    color: BrandColors.slateMuted,
    marginTop: 2,
    fontWeight: '500',
  },
});
