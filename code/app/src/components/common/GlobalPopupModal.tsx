import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePopupStore, PopupButton, PopupType } from '@/store/popup.store';

export const GlobalPopupModal: React.FC = () => {
  const { isOpen, options, hide } = usePopupStore();

  if (!isOpen || !options) {
    return null;
  }

  const { title, message, type = 'info', buttons = [], cancelable = true } = options;

  const handleBackdropPress = () => {
    if (cancelable) {
      hide();
    }
  };

  const handleButtonPress = (btn: PopupButton) => {
    hide();
    if (btn.onPress) {
      // Cho một tick nhỏ để modal đóng mượt trước khi gọi callback
      setTimeout(() => {
        btn.onPress?.();
      }, 50);
    }
  };

  const getIconConfig = (popupType: PopupType) => {
    switch (popupType) {
      case 'success':
        return {
          name: 'checkmark-circle' as const,
          color: '#10B981',
          bgColor: '#ECFDF5',
          borderColor: '#A7F3D0',
        };
      case 'error':
        return {
          name: 'alert-circle' as const,
          color: '#EF4444',
          bgColor: '#FEF2F2',
          borderColor: '#FECACA',
        };
      case 'warning':
        return {
          name: 'warning' as const,
          color: '#F59E0B',
          bgColor: '#FFFBEB',
          borderColor: '#FDE68A',
        };
      case 'confirm':
        return {
          name: 'help-circle' as const,
          color: '#E11D48',
          bgColor: '#FDF2F4',
          borderColor: '#FECDD3',
        };
      case 'info':
      default:
        return {
          name: 'information-circle' as const,
          color: '#3B82F6',
          bgColor: '#EFF6FF',
          borderColor: '#BFDBFE',
        };
    }
  };

  const iconConfig = getIconConfig(type);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (cancelable) hide();
      }}
    >
      <Pressable style={styles.overlay} onPress={handleBackdropPress}>
        <Pressable style={styles.cardContainer} onPress={(e) => e.stopPropagation()}>
          {/* Icon Badge */}
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: iconConfig.bgColor, borderColor: iconConfig.borderColor },
            ]}
          >
            <Ionicons name={iconConfig.name} size={32} color={iconConfig.color} />
          </View>

          {/* Title */}
          {Boolean(title) && <Text style={styles.title}>{title}</Text>}

          {/* Message */}
          {Boolean(message) && <Text style={styles.message}>{message}</Text>}

          {/* Action Buttons */}
          <View
            style={[
              styles.buttonsContainer,
              buttons.length === 2 ? styles.buttonsRow : styles.buttonsColumn,
            ]}
          >
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  style={[
                    styles.button,
                    buttons.length === 2 ? styles.buttonHalf : styles.buttonFull,
                    isCancel
                      ? styles.cancelButton
                      : isDestructive
                      ? styles.destructiveButton
                      : styles.primaryButton,
                  ]}
                  onPress={() => handleButtonPress(btn)}
                >
                  <Text
                    style={isCancel ? styles.cancelButtonText : styles.primaryButtonText}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  buttonsContainer: {
    width: '100%',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonsColumn: {
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonFull: {
    width: '100%',
  },
  buttonHalf: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#E11D48',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  destructiveButton: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
});
