import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { borderRadius } from '@/lib/theme';
import type { ThemeColors, ThemeBorders } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface NeuIconButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  bgColor?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export default function NeuIconButton({
  icon,
  onPress,
  size = 22,
  color,
  bgColor,
  style,
  disabled = false,
}: NeuIconButtonProps) {
  const { colors, borders } = useTheme();
  const resolvedColor = color ?? colors.text;
  const resolvedBgColor = bgColor ?? colors.surface;
  const pressed = useSharedValue(0);
  const styles = useMemo(() => createStyles(colors, borders), [colors, borders]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pressed.value * 2 },
      { translateY: pressed.value * 2 },
    ],
    shadowOffset: {
      width: 3 - pressed.value * 2,
      height: 3 - pressed.value * 2,
    },
  }));

  const handlePress = useCallback(() => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  }, [disabled, onPress]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => { pressed.value = withTiming(1, { duration: 80 }); }}
      onPressOut={() => { pressed.value = withTiming(0, { duration: 100 }); }}
      disabled={disabled}
      style={[
        styles.button,
        { backgroundColor: resolvedBgColor },
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon} size={size} color={resolvedColor} />
    </AnimatedPressable>
  );
}

const createStyles = (colors: ThemeColors, borders: ThemeBorders) =>
  StyleSheet.create({
    button: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: borders.medium,
      borderColor: borders.color,
      borderRadius: borderRadius.md,
      shadowColor: colors.border,
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 0,
    },
    disabled: {
      opacity: 0.5,
    },
  });
