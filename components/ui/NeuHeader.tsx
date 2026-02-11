import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/lib/theme';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

interface NeuHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export default function NeuHeader({
  title,
  subtitle,
  leftAction,
  rightAction,
  style,
}: NeuHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }, style]}>
      <View style={styles.row}>
        <View style={styles.leftAction}>{leftAction}</View>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.rightAction}>{rightAction}</View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
    },
    leftAction: {
      width: 44,
      alignItems: 'flex-start',
    },
    titleContainer: {
      flex: 1,
      alignItems: 'center',
    },
    title: {
      ...typography.h3,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.caption,
      textAlign: 'center',
      marginTop: 2,
    },
    rightAction: {
      width: 44,
      alignItems: 'flex-end',
    },
  });
