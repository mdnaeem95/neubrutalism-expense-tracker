import React, { useMemo } from 'react';
import { View, Text, Modal, StyleSheet, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius } from '@/lib/theme';
import type { ThemeColors, ThemeBorders, ThemeShadows, ThemeTypography } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

export type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export interface DialogButton {
  text: string;
  style?: DialogButtonStyle;
  onPress?: () => void;
}

interface NeuDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: DialogButton[];
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onDismiss?: () => void;
}

export default function NeuDialog({
  visible,
  title,
  message,
  buttons,
  icon,
  iconColor,
  onDismiss,
}: NeuDialogProps) {
  const { colors, borders, shadows, typography } = useTheme();
  const resolvedIconColor = iconColor ?? colors.text;
  const styles = useMemo(() => createStyles(colors, borders, shadows, typography), [colors, borders, shadows, typography]);
  const isSideBySide = buttons.length === 2;

  const buttonVariant: Record<DialogButtonStyle, { bg: string; text: string; borderColor: string }> = useMemo(() => ({
    default: { bg: colors.primary, text: colors.text, borderColor: borders.color },
    cancel: { bg: colors.surface, text: colors.text, borderColor: borders.color },
    destructive: { bg: colors.error, text: '#FFFFFF', borderColor: borders.color },
  }), [colors, borders]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.dialogWrapper} onPress={(e) => e.stopPropagation()}>
          {visible && (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'timing', duration: 200 }}
              style={styles.dialog}
            >
              {icon && (
                <View style={[styles.iconContainer, { backgroundColor: resolvedIconColor + '18' }]}>
                  <Ionicons name={icon} size={28} color={resolvedIconColor} />
                </View>
              )}

              <Text style={styles.title}>{title}</Text>
              {message ? <Text style={styles.message}>{message}</Text> : null}

              <View style={[styles.buttonRow, isSideBySide && styles.buttonRowHorizontal]}>
                {buttons.map((btn, i) => {
                  const variant = buttonVariant[btn.style || 'default'];
                  return (
                    <Pressable
                      key={i}
                      onPress={btn.onPress}
                      style={({ pressed }) => [
                        styles.button,
                        {
                          backgroundColor: variant.bg,
                          borderColor: variant.borderColor,
                          shadowOffset: pressed
                            ? { width: 1, height: 1 }
                            : { width: 3, height: 3 },
                          transform: pressed
                            ? [{ translateX: 2 }, { translateY: 2 }]
                            : [{ translateX: 0 }, { translateY: 0 }],
                        },
                        isSideBySide && styles.buttonFlex,
                      ]}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.buttonText, { color: variant.text }]}>
                        {btn.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </MotiView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors, borders: ThemeBorders, shadows: ThemeShadows, typography: ThemeTypography) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing['3xl'],
    },
    dialogWrapper: {
      width: '100%',
      maxWidth: 340,
    },
    dialog: {
      backgroundColor: colors.surface,
      borderWidth: borders.width,
      borderColor: borders.color,
      borderRadius: borderRadius.lg,
      padding: spacing['2xl'],
      shadowColor: shadows.large.color,
      shadowOffset: { width: shadows.large.offset.x, height: shadows.large.offset.y },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 0,
      alignItems: 'center',
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    title: {
      ...typography.h3,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    message: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    buttonRow: {
      width: '100%',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    buttonRowHorizontal: {
      flexDirection: 'row',
    },
    button: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderWidth: borders.width,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.border,
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 0,
    },
    buttonFlex: {
      flex: 1,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '700',
    },
  });
