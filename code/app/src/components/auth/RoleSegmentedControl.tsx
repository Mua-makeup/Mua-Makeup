import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';

export type RoleType = 'CUSTOMER' | 'FREELANCER_MUA';

interface RoleSegmentedControlProps {
  selectedRole: RoleType;
  onSelectRole: (role: RoleType) => void;
}

export const RoleSegmentedControl: React.FC<RoleSegmentedControlProps> = ({
  selectedRole,
  onSelectRole,
}) => {
  const isCustomer = selectedRole === 'CUSTOMER';

  return (
    <View style={styles.container}>
      {/* Tab Khách Hàng */}
      <TouchableOpacity
        style={[styles.tabButton, isCustomer && styles.activeTabButton]}
        onPress={() => onSelectRole('CUSTOMER')}
        activeOpacity={0.8}>
        <Ionicons
          name="person"
          size={16}
          color={isCustomer ? BrandColors.primary : BrandColors.slateMuted}
        />
        <Text style={[styles.tabText, isCustomer && styles.activeTabText]}>
          Khách Hàng
        </Text>
      </TouchableOpacity>

      {/* Tab Thợ MUA */}
      <TouchableOpacity
        style={[styles.tabButton, !isCustomer && styles.activeTabButton]}
        onPress={() => onSelectRole('FREELANCER_MUA')}
        activeOpacity={0.8}>
        <Ionicons
          name="brush"
          size={16}
          color={!isCustomer ? BrandColors.primary : BrandColors.slateMuted}
        />
        <Text style={[styles.tabText, !isCustomer && styles.activeTabText]}>
          Thợ Make-up (MUA)
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.slateMuted,
  },
  activeTabText: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
});
