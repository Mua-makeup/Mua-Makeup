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
  avoidKeyboard?: boolean;
  showHandle?: boolean;
}

/** Shared backdrop and drag handle. Scroll views, maps and inputs keep their own gestures. */
export function DismissibleSurface({ visible, onClose, dismissDisabled = false, overlayStyle, contentStyle, children, overlays, fullHeight, onDismissStart, avoidKeyboard = false, showHandle = true }: SurfaceProps) {
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

  const reset = (velocity?: number) => {
    dismissing.current = false;
    Animated.spring(translateY, {
      toValue: 0,
      velocity: velocity ?? 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  };

  const dismiss = (velocity?: number) => {
    if (!latest.current.visible || latest.current.dismissDisabled || dismissing.current) return;
    dismissing.current = true;
    latest.current.onDismissStart?.();

    let duration = 180;
    if (velocity && velocity > 0.4) {
      const currentVal = (translateY as any)._value || 0;
      const distanceLeft = Math.max(0, latest.current.height - currentVal);
      duration = Math.max(70, Math.min(200, Math.round(distanceLeft / (velocity * 2.5))));
    }

    Animated.timing(translateY, {
      toValue: latest.current.height,
      duration,
      useNativeDriver: true,
    }).start(async ({ finished }) => {
      if (finished && latest.current.visible && !latest.current.dismissDisabled) {
        try {
          await latest.current.onClose();
        } catch {
          reset();
        }
      }
    });
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.dismissDisabled && !dismissing.current,
      onStartShouldSetPanResponderCapture: () => !latest.current.dismissDisabled && !dismissing.current,
      onMoveShouldSetPanResponder: (_, gesture) =>
        !latest.current.dismissDisabled &&
        !dismissing.current &&
        (gesture.dy > 2 || Math.abs(gesture.vy) > 0.1),
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        !latest.current.dismissDisabled &&
        !dismissing.current &&
        (gesture.dy > 2 || Math.abs(gesture.vy) > 0.1),
      onPanResponderGrant: () => {
        translateY.stopAnimation();
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        } else {
          translateY.setValue(gesture.dy * 0.18);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (latest.current.dismissDisabled) {
          reset();
          return;
        }

        const isFlickDown = gesture.vy > 0.35;
        const isDraggedFar = gesture.dy > 60;
        const isMovingDown = gesture.dy > 25 && gesture.vy > 0.15;

        if (isFlickDown || isDraggedFar || isMovingDown) {
          dismiss(gesture.vy);
        } else {
          reset(gesture.vy);
        }
      },
      onPanResponderTerminate: () => reset(),
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <KeyboardAvoidingView style={styles.fill} enabled={avoidKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => dismiss()} disabled={dismissDisabled} accessibilityRole="button" accessibilityLabel="Đóng cửa sổ" />
        <Animated.View style={[styles.surface, fullHeight && styles.fullHeight, contentStyle, { transform: [{ translateY }] }]} accessibilityViewIsModal>
          {showHandle && (
            <View
              {...pan.panHandlers}
              style={styles.dragArea}
              hitSlop={{ top: 20, bottom: 25, left: 150, right: 150 }}
              accessibilityLabel="Kéo xuống để đóng"
              onAccessibilityEscape={dismiss}
            >
              <View style={styles.handle} />
            </View>
          )}
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
    <Modal
      visible={props.visible}
      transparent
      animationType={props.animationType ?? 'fade'}
      statusBarTranslucent
      navigationBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={() => { if (!props.dismissDisabled) props.onClose(); }}
    >
      <DismissibleSurface {...props} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.55)',
    paddingTop: 28,
    paddingBottom: 0,
    marginBottom: 0,
  },
  surface: {
    width: '100%',
    maxHeight: '94%',
    flexShrink: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    overflow: 'hidden',
  },
  fullHeight: {
    height: '98%',
    maxHeight: '98%',
  },
  dragArea: { height: 42, width: '100%', alignItems: 'center', justifyContent: 'center', flexShrink: 0, paddingVertical: 8 },
  handle: { height: 5, width: 48, borderRadius: 3, backgroundColor: '#CBD5E1' },
});
