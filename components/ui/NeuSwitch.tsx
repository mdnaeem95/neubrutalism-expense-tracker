import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { spacing, borderRadius } from '@/lib/theme';
import type { ThemeColors, ThemeBorders, ThemeTypography } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

interface NeuSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  description?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export default function NeuSwitch({
  value,
  onValueChange,
  label,
  description,
  style,
  disabled = false,
}: NeuSwitchProps) {
  const { colors, borders, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, borders, typography), [colors, borders, typography]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(value ? colors.primary : colors.background, {
      duration: 200,
    }),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(value ? 22 : 0, { duration: 200 }),
      },
    ],
  }));

  return (
    <Pressable
      onPress={() => {
        if (!disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onValueChange(!value);
        }
      }}
      style={[styles.container, disabled && styles.disabled, style]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <View style={styles.textContainer}>
        {label && <Text style={styles.label}>{label}</Text>}
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors, borders: ThemeBorders, typography: ThemeTypography) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
    },
    disabled: {
      opacity: 0.5,
    },
    textContainer: {
      flex: 1,
      marginRight: spacing.md,
    },
    label: {
      ...typography.body,
      fontWeight: '600',
      fontFamily: 'SpaceMono_400Regular',
    },
    description: {
      ...typography.caption,
      marginTop: 2,
      fontFamily: 'SpaceMono_400Regular',
    },
    track: {
      width: 52,
      height: 30,
      borderWidth: borders.medium,
      borderColor: borders.color,
      borderRadius: borderRadius.full,
      padding: 2,
      justifyContent: 'center',
    },
    thumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
    },
  });
