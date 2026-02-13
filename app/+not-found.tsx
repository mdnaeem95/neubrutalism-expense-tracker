import React, { useMemo } from 'react';
import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NeuButton } from '@/components/ui';
import { spacing } from '@/lib/theme';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

export default function NotFoundScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors]);

  return (
    <>
      <Stack.Screen options={{ title: 'Not Found', headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="help-circle-outline" size={48} color={colors.textSecondary} />
        </View>
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.subtitle}>This screen doesn't exist.</Text>
        <Link href="/" asChild>
          <NeuButton title="Go Home" onPress={() => {}} variant="primary" size="lg" />
        </Link>
      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing['3xl'],
      backgroundColor: colors.background,
    },
    iconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.border + '10', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
    title: { ...typography.h2, marginBottom: spacing.sm },
    subtitle: { ...typography.bodySmall, marginBottom: spacing.xl },
  });
