import React, { useEffect, useRef } from 'react';
import {
  Animated, KeyboardAvoidingView, Modal, ModalProps, PanResponder,
  Platform, Pressable, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle,
} from 'react-native';

interface SurfaceProps {
  visible: boolean;
  onClose: () => void;
  dismissDisabled?: boolean;
  overlayStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  overlays?: React.ReactNode;
  fullHeight?: boolean;
  onDismissStart?: () => void;
}

/** Shared backdrop and drag handle. Scroll views, maps and inputs keep their own gestures. */
export function DismissibleSurface({ visible, onClose, dismissDisabled = false, overlayStyle, contentStyle, children, overlays, fullHeight, onDismissStart }: SurfaceProps) {
  const { height } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(0)).current;
  const dismissing = useRef(false);
  const latest = useRef({ onClose, dismissDisabled, visible, height, onDismissStart });
  latest.current = { onClose, dismissDisabled, visible, height, onDismissStart };

  // Chỉ reset translateY về 0 khi modal bắt đầu mở (visible chuyển sang true).
  // TUYỆT ĐỐI KHÔNG reset translateY về 0 khi visible chuyển sang false vì sẽ giật ngược modal lên màn hình trong lúc đang đóng!
  useEffect(() => {
    if (visible) {
      translateY.stopAnimation();
      translateY.setValue(0);
      dismissing.current = false;
    }
  }, [visible]);

  const reset = () => {
    dismissing.current = false;
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 3 }).start();
  };

  const dismiss = () => {
    if (!latest.current.visible || latest.current.dismissDisabled || dismissing.current) return;
    dismissing.current = true;
    latest.current.onDismissStart?.();
    Animated.timing(translateY, { toValue: latest.current.height, duration: 160, useNativeDriver: true }).start(async ({ finished }) => {
      if (finished && latest.current.visible && !latest.current.dismissDisabled) {
        try {
          await latest.current.onClose();
        } catch {
          reset();
        }
      }
    });
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) =>
      !latest.current.dismissDisabled &&
      !dismissing.current &&
      gesture.dy > 4 &&
      gesture.dy > Math.abs(gesture.dx),
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      !latest.current.dismissDisabled &&
      !dismissing.current &&
      gesture.dy > 4 &&
      gesture.dy > Math.abs(gesture.dx),
    onPanResponderGrant: () => {
      translateY.stopAnimation();
    },
    onPanResponderMove: (_, gesture) => {
      if (gesture.dy > 0) {
        translateY.setValue(gesture.dy);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (latest.current.dismissDisabled) {
        reset();
      } else if (gesture.dy > 35 || (gesture.dy > 8 && gesture.vy > 0.25)) {
        dismiss();
      } else {
        reset();
      }
    },
    onPanResponderTerminate: reset,
    onPanResponderTerminationRequest: () => false,
  })).current;

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} disabled={dismissDisabled} accessibilityRole="button" accessibilityLabel="Đóng cửa sổ" />
        <Animated.View style={[styles.surface, fullHeight && styles.fullHeight, contentStyle, { transform: [{ translateY }] }]} accessibilityViewIsModal>
          <View
            {...pan.panHandlers}
            style={styles.dragArea}
            hitSlop={{ top: 15, bottom: 25, left: 50, right: 50 }}
            accessibilityLabel="Kéo xuống để đóng"
            onAccessibilityEscape={dismiss}
          >
            <View style={styles.handle} />
          </View>
          {children}
        </Animated.View>
      </View>
      {overlays}
    </KeyboardAvoidingView>
  );
}

interface Props extends SurfaceProps {
  animationType?: ModalProps['animationType'];
}

export function DismissibleModal(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType={props.animationType ?? 'fade'} statusBarTranslucent
      onRequestClose={() => { if (!props.dismissDisabled) props.onClose(); }}>
      <DismissibleSurface {...props} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.55)', paddingTop: 28 },
  surface: { width: '100%', maxHeight: '92%', flexShrink: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  fullHeight: { height: '94%' },
  dragArea: { height: 32, width: '100%', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  handle: { height: 4, width: 42, borderRadius: 2, backgroundColor: '#CBD5E1' },
});
