import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { spacing, borderRadius } from '@/lib/theme';
import type { ThemeColors, ThemeBorders, ThemeTypography } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

interface NeuInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  containerStyle?: ViewStyle;
}

export default function NeuInput({
  label,
  error,
  icon,
  style,
  containerStyle,
  ...props
}: NeuInputProps) {
  const [focused, setFocused] = useState(false);
  const { colors, borders, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, borders, typography), [colors, borders, typography]);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.focused,
          error ? styles.errorBorder : undefined,
          style,
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[styles.input, icon ? styles.inputWithIcon : undefined]}
          placeholderTextColor={colors.textLight}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const createStyles = (colors: ThemeColors, borders: ThemeBorders, typography: ThemeTypography) =>
  StyleSheet.create({
    container: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.label,
      marginBottom: spacing.sm,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: borders.medium,
      borderColor: borders.color,
      borderRadius: borderRadius.md,
      shadowColor: colors.border,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 0,
    },
    focused: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
    },
    errorBorder: {
      borderColor: colors.error,
      shadowColor: colors.error,
    },
    icon: {
      paddingLeft: spacing.md,
    },
    input: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...typography.body,
      fontFamily: 'SpaceMono_400Regular',
      color: colors.text,
    },
    inputWithIcon: {
      paddingLeft: spacing.sm,
    },
    error: {
      ...typography.caption,
      color: colors.error,
      marginTop: spacing.xs,
    },
  });
