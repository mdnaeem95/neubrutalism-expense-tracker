import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
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

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface NeuButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const SIZE_STYLES: Record<ButtonSize, { paddingH: number; paddingV: number; fontSize: number }> = {
  sm: { paddingH: spacing.md, paddingV: spacing.sm, fontSize: 13 },
  md: { paddingH: spacing.xl, paddingV: spacing.md, fontSize: 15 },
  lg: { paddingH: spacing['2xl'], paddingV: spacing.lg, fontSize: 17 },
};

export default function NeuButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}: NeuButtonProps) {
  const { colors, borders } = useTheme();
  const pressed = useSharedValue(0);
  const styles = useMemo(() => createStyles(colors, borders), [colors, borders]);

  const variantColors: Record<ButtonVariant, { bg: string; text: string }> = useMemo(() => ({
    primary: { bg: colors.primary, text: colors.onPrimary },
    secondary: { bg: colors.secondary, text: '#FFFFFF' },
    accent: { bg: colors.accent, text: colors.onPrimary },
    danger: { bg: colors.error, text: '#FFFFFF' },
    outline: { bg: colors.surface, text: colors.text },
    ghost: { bg: 'transparent', text: colors.text },
  }), [colors]);

  const { bg, text } = variantColors[variant];
  const sizeStyle = SIZE_STYLES[size];
  const isGhost = variant === 'ghost';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pressed.value * 3 },
      { translateY: pressed.value * 3 },
    ],
    shadowOffset: {
      width: 4 - pressed.value * 3,
      height: 4 - pressed.value * 3,
    },
  }));

  const handlePressIn = useCallback(() => {
    pressed.value = withTiming(1, { duration: 80 });
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = withTiming(0, { duration: 100 });
  }, [pressed]);

  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  }, [disabled, loading, onPress]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: bg,
          paddingHorizontal: sizeStyle.paddingH,
          paddingVertical: sizeStyle.paddingV,
        },
        isGhost && styles.ghost,
        !isGhost && styles.bordered,
        disabled && styles.disabled,
        fullWidth && styles.fullWidth,
        animatedStyle,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
    >
      {loading ? (
        <ActivityIndicator color={text} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              { color: text, fontSize: sizeStyle.fontSize },
              icon ? { marginLeft: spacing.sm } : undefined,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const createStyles = (colors: ThemeColors, borders: ThemeBorders) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.border,
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 0,
    },
    bordered: {
      borderWidth: borders.medium,
      borderColor: borders.color,
      borderRadius: borderRadius.md,
    },
    ghost: {
      borderWidth: 0,
      shadowOpacity: 0,
    },
    disabled: {
      opacity: 0.5,
    },
    fullWidth: {
      width: '100%',
    },
    text: {
      fontWeight: '700',
      fontFamily: 'SpaceMono_700Bold',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
  });
