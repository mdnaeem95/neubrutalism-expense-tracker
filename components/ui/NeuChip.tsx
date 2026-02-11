import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { spacing, borderRadius } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

interface NeuChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export default function NeuChip({
  label,
  selected = false,
  onPress,
  color,
  icon,
  style,
  size = 'md',
}: NeuChipProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.primary;
  const isSmall = size === 'sm';
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      style={[
        styles.chip,
        isSmall && styles.chipSmall,
        selected && { backgroundColor: resolvedColor },
        !selected && styles.unselected,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {icon}
      <Text
        style={[
          styles.label,
          isSmall && styles.labelSmall,
          selected && [styles.selectedLabel, { color: colors.onPrimary }],
          icon ? { marginLeft: 4 } : undefined,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface,
    },
    chipSmall: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    unselected: {
      backgroundColor: colors.surface,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    labelSmall: {
      fontSize: 12,
    },
    selectedLabel: {
      fontWeight: '700',
    },
  });
