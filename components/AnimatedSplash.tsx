import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { lightColors, spacing } from '@/lib/theme';

interface AnimatedSplashProps {
  onFinish: () => void;
}

const ICON_SIZE = 120;

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const containerOpacity = useSharedValue(1);
  const containerScale = useSharedValue(1);

  useEffect(() => {
    containerOpacity.value = withDelay(
      1500,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      })
    );
    containerScale.value = withDelay(
      1500,
      withTiming(1.05, { duration: 500 })
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Icon */}
      <MotiView
        from={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 150, mass: 1 }}
        style={styles.iconWrapper}
      >
        <View style={styles.iconCard}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.iconImage}
            resizeMode="cover"
          />
        </View>
      </MotiView>

      {/* App name */}
      <MotiView
        from={{ translateY: 20, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: 'timing', duration: 500, delay: 300 }}
      >
        <Text style={styles.appName}>Ledgr</Text>
      </MotiView>

      {/* Tagline */}
      <MotiView
        from={{ translateY: 15, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: 'timing', duration: 400, delay: 500 }}
      >
        <Text style={styles.tagline}>Track every penny</Text>
      </MotiView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginBottom: spacing['2xl'],
  },
  iconCard: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#1A1A2E',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: spacing.sm,
  },
});
