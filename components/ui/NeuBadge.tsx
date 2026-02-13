import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { spacing, borderRadius } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

interface NeuBadgeProps {
  label: string;
  color?: string;
  textColor?: string;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export default function NeuBadge({
  label,
  color,
  textColor,
  style,
  size = 'md',
}: NeuBadgeProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.primary;
  const resolvedTextColor = textColor ?? colors.text;
  const isSmall = size === 'sm';
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.badge,
        isSmall && styles.badgeSmall,
        { backgroundColor: resolvedColor },
        style,
      ]}
    >
      <Text style={[styles.label, isSmall && styles.labelSmall, { color: resolvedTextColor }]}>
        {label}
      </Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderWidth: 2.5,
      borderColor: colors.border,
      borderRadius: borderRadius.sm,
    },
    badgeSmall: {
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      fontFamily: 'SpaceMono_700Bold',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    labelSmall: {
      fontSize: 10,
    },
  });
