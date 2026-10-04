import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DismissibleModal } from './DismissibleModal';

export interface SwipeableBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  dismissDisabled?: boolean;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  showHandleBar?: boolean;
  headerRight?: React.ReactNode;
}

export const SwipeableBottomSheet: React.FC<SwipeableBottomSheetProps> = ({
  visible, onClose, dismissDisabled = false, title, subtitle, children,
  showCloseButton = true, headerRight,
}) => (
  <DismissibleModal visible={visible} onClose={onClose} dismissDisabled={dismissDisabled} contentStyle={styles.sheetCard}>
    {(Boolean(title) || showCloseButton || Boolean(headerRight)) && (
      <View style={styles.dragArea}>
                <View style={styles.headerRow}>
                  <View style={styles.titleColumn}>
                    {Boolean(title) && <Text style={styles.sheetTitle}>{title}</Text>}
                    {Boolean(subtitle) && <Text style={styles.sheetSubtitle}>{subtitle}</Text>}
                  </View>

                  <View style={styles.headerActions}>
                    {headerRight}
                    {showCloseButton && (
                      <TouchableOpacity
                        style={styles.closeBtn}
                        disabled={dismissDisabled}
                        onPress={onClose}
                        activeOpacity={0.7}
                        accessibilityLabel="Đóng"
                      >
                        <Ionicons name="close" size={20} color="#64748B" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
      </View>
    )}
    <View style={styles.body}>{children}</View>
  </DismissibleModal>
);

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#F1F5F9',
  },
  dragArea: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 6,
    width: '100%',
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleColumn: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 24,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 17,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexShrink: 1,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
});
