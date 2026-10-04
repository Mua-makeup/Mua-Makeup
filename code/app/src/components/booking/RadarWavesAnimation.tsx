import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { BrandColors } from '@/constants/theme';

export const RadarWavesAnimation: React.FC = () => {
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const wave3 = useSharedValue(0);

  useEffect(() => {
    wave1.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    wave2.value = withDelay(
      800,
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );

    wave3.value = withDelay(
      1600,
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, []);

  const createWaveStyle = (animatedVal: SharedValue<number>) => {
    return useAnimatedStyle(() => {
      return {
        transform: [{ scale: 0.5 + animatedVal.value * 2.2 }],
        opacity: (1 - animatedVal.value) * 0.6,
      };
    });
  };

  const style1 = createWaveStyle(wave1);
  const style2 = createWaveStyle(wave2);
  const style3 = createWaveStyle(wave3);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.waveCircle, style1]} />
      <Animated.View style={[styles.waveCircle, style2]} />
      <Animated.View style={[styles.waveCircle, style3]} />
      <View style={styles.centerPulse}>
        <View style={styles.innerCore} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFE4E6',
    borderWidth: 1.5,
    borderColor: BrandColors.primary,
  },
  centerPulse: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  innerCore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.primary,
  },
});
