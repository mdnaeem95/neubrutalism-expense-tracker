import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '@/lib/theme';
import type { ThemeColors, ThemeBorders, ThemeTypography } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import NeuButton from './NeuButton';

interface NeuEmptyStateProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
}

export default function NeuEmptyState({
  icon,
  title,
  description,
  actionTitle,
  onAction,
}: NeuEmptyStateProps) {
  const { colors, borders, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, borders, typography), [colors, borders, typography]);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon} size={40} color={colors.textSecondary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionTitle && onAction && (
        <NeuButton
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="md"
          style={styles.button}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors, borders: ThemeBorders, typography: ThemeTypography) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing['3xl'],
      paddingVertical: spacing['4xl'],
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: borderRadius.xl,
      borderWidth: borders.medium,
      borderColor: colors.border + '20',
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.h3,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    description: {
      ...typography.bodySmall,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    button: {
      marginTop: spacing.sm,
    },
  });
