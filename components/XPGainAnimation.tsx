import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '@/lib/ThemeContext';
import type { ThemeTypography } from '@/lib/theme';

interface XPGainAnimationProps {
  label: string;
}

export default function XPGainAnimation({ label }: XPGainAnimationProps) {
  const { colors, typography } = useTheme();
  // Split label to show base XP and streak bonus separately
  const parts = label.split('  ');

  return (
    <MotiView
      from={{ opacity: 0, translateY: 0 }}
      animate={{ opacity: [0, 1, 1, 0], translateY: -60 }}
      transition={{ type: 'timing', duration: 1500 }}
      style={styles.container}
    >
      <Text style={[getMainStyle(typography), { color: colors.accent }]}>
        {parts[0]}
      </Text>
      {parts[1] && (
        <Text style={[getSubStyle(typography), { color: colors.orange }]}>
          {parts[1]}
        </Text>
      )}
    </MotiView>
  );
}

function getMainStyle(typography: ThemeTypography) {
  return { ...typography.h2, textAlign: 'center' as const };
}

function getSubStyle(typography: ThemeTypography) {
  return { ...typography.bodySmall, textAlign: 'center' as const, fontWeight: '700' as const };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    alignItems: 'center',
  },
});
