import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { spacing, borderRadius } from '@/lib/theme';
import type { ThemeColors, ThemeBorders } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface NeuCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  color?: string;
  onPress?: () => void;
  padded?: boolean;
  shadow?: 'small' | 'medium' | 'large';
}

export default function NeuCard({
  children,
  style,
  color,
  onPress,
  padded = true,
  shadow = 'medium',
}: NeuCardProps) {
  const { colors, borders, shadows } = useTheme();
  const bgColor = color ?? colors.surface;
  const pressed = useSharedValue(0);
  const shadowConfig = shadows[shadow];
  const styles = useMemo(() => createStyles(colors, borders), [colors, borders]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pressed.value * (shadowConfig.offset.x - 1) },
      { translateY: pressed.value * (shadowConfig.offset.y - 1) },
    ],
    shadowOffset: {
      width: shadowConfig.offset.x - pressed.value * (shadowConfig.offset.x - 1),
      height: shadowConfig.offset.y - pressed.value * (shadowConfig.offset.y - 1),
    },
  }));

  if (!onPress) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: bgColor,
            shadowColor: shadowConfig.color,
            shadowOffset: {
              width: shadowConfig.offset.x,
              height: shadowConfig.offset.y,
            },
          },
          padded && styles.padded,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 80 });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 100 });
      }}
      style={[
        styles.card,
        { backgroundColor: bgColor, shadowColor: shadowConfig.color },
        padded && styles.padded,
        animatedStyle,
        style,
      ]}
      accessibilityRole="button"
    >
      {children}
    </AnimatedPressable>
  );
}

const createStyles = (colors: ThemeColors, borders: ThemeBorders) =>
  StyleSheet.create({
    card: {
      borderWidth: borders.medium,
      borderColor: borders.color,
      borderRadius: borderRadius.md,
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 0,
    },
    padded: {
      padding: spacing.lg,
    },
  });
