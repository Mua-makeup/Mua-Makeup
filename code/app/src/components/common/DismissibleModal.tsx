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

  useEffect(() => {
    translateY.stopAnimation();
    translateY.setValue(0);
    dismissing.current = false;
    return () => translateY.stopAnimation();
  }, [visible, translateY]);

  const reset = () => Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 3 }).start();
  const dismiss = () => {
    if (!latest.current.visible || latest.current.dismissDisabled || dismissing.current) return;
    dismissing.current = true;
    latest.current.onDismissStart?.();
    Animated.timing(translateY, { toValue: latest.current.height, duration: 180, useNativeDriver: true }).start(async ({ finished }) => {
      try {
        if (finished && latest.current.visible && !latest.current.dismissDisabled) await latest.current.onClose();
      } finally {
        // A close handler may open a confirmation while keeping this modal visible.
        translateY.setValue(0);
        dismissing.current = false;
      }
    });
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => !latest.current.dismissDisabled && !dismissing.current && gesture.dy > 6 && gesture.dy > Math.abs(gesture.dx),
    onPanResponderGrant: () => translateY.stopAnimation(),
    onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (latest.current.dismissDisabled) reset();
      else if (gesture.dy > 70 || (gesture.dy > 15 && gesture.vy > 0.6)) dismiss();
      else reset();
    },
    onPanResponderTerminate: reset,
    onPanResponderTerminationRequest: () => false,
  })).current;

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} disabled={dismissDisabled} accessibilityRole="button" accessibilityLabel="Đóng cửa sổ" />
        <Animated.View style={[styles.surface, fullHeight && styles.fullHeight, contentStyle, { transform: [{ translateY }] }]} accessibilityViewIsModal>
          <View {...pan.panHandlers} style={styles.dragArea} accessibilityLabel="Kéo xuống để đóng" onAccessibilityEscape={dismiss}>
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
  dragArea: { height: 28, width: '100%', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  handle: { height: 4, width: 40, borderRadius: 2, backgroundColor: '#CBD5E1' },
});
