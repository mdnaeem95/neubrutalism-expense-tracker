import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NeuCard, NeuProgressBar, NeuBadge } from '@/components/ui';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useTheme } from '@/lib/ThemeContext';
import { getRankColorKey } from '@/types';
import { spacing } from '@/lib/theme';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';

interface XPCardProps {
  style?: ViewStyle;
}

export default function XPCard({ style }: XPCardProps) {
  const { colors, typography } = useTheme();
  const { xpData, streak } = useGamificationStore();
  const rankColorKey = getRankColorKey(xpData.currentLevel);
  const rankColor = (colors as unknown as Record<string, string>)[rankColorKey] ?? colors.primary;
  const progressPercent = xpData.xpRequiredForNextLevel > 0
    ? (xpData.xpInCurrentLevel / xpData.xpRequiredForNextLevel) * 100
    : 0;

  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <NeuCard shadow="small" style={{ ...styles.card, ...style }}>
      <View style={styles.topRow}>
        <Text style={styles.level}>LVL {xpData.currentLevel}</Text>
        <NeuBadge label={xpData.rank} color={rankColor + '30'} textColor={rankColor} size="sm" />
      </View>

      <NeuProgressBar
        progress={progressPercent}
        color={rankColor}
        label={`${xpData.xpInCurrentLevel} / ${xpData.xpRequiredForNextLevel} XP`}
        showPercentage={false}
        height={20}
        style={styles.progressBar}
      />

      {streak.currentStreak > 0 && (
        <View style={styles.streakRow}>
          <MaterialCommunityIcons name="fire" size={16} color={colors.orange} />
          <Text style={[styles.streakText, { color: colors.orange }]}>
            {streak.currentStreak} day streak
          </Text>
        </View>
      )}
    </NeuCard>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) => StyleSheet.create({
  card: { marginBottom: spacing.lg },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  level: {
    ...typography.h3,
  },
  progressBar: {
    marginTop: spacing.xs,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  streakText: {
    ...typography.caption,
    fontWeight: '700',
  },
});
