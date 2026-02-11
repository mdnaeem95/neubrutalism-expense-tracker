import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { spacing, borderRadius } from '@/lib/theme';
import type { ThemeColors, ThemeBorders, ThemeTypography } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

interface NeuProgressBarProps {
  progress: number; // 0-100
  color?: string;
  label?: string;
  showPercentage?: boolean;
  height?: number;
  style?: ViewStyle;
}

export default function NeuProgressBar({
  progress,
  color,
  label,
  showPercentage = true,
  height = 24,
  style,
}: NeuProgressBarProps) {
  const { colors, borders, typography } = useTheme();
  const resolvedColor = color ?? colors.primary;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const isOverBudget = progress > 100;
  const styles = useMemo(() => createStyles(colors, borders, typography), [colors, borders, typography]);

  const animatedWidth = useAnimatedStyle(() => ({
    width: withTiming(`${Math.min(clampedProgress, 100)}%`, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    }),
  }));

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {showPercentage && (
            <Text
              style={[
                styles.percentage,
                isOverBudget && { color: colors.error },
              ]}
            >
              {Math.round(progress)}%
            </Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: isOverBudget ? colors.error : resolvedColor,
              height: height - borders.width * 2,
            },
            animatedWidth,
          ]}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors, borders: ThemeBorders, typography: ThemeTypography) =>
  StyleSheet.create({
    container: {},
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    label: {
      ...typography.bodySmall,
      fontWeight: '600',
    },
    percentage: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.text,
    },
    track: {
      backgroundColor: colors.background,
      borderWidth: borders.width,
      borderColor: borders.color,
      borderRadius: borderRadius.full,
      overflow: 'hidden',
    },
    fill: {
      borderRadius: borderRadius.full,
      marginLeft: -1,
    },
  });
