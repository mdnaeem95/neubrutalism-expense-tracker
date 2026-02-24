import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { NeuCard, NeuIconButton } from '@/components/ui';
import AchievementBadge from '@/components/AchievementBadge';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { ACHIEVEMENTS } from '@/services/achievements';
import { useTheme } from '@/lib/ThemeContext';
import { spacing } from '@/lib/theme';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';
import type { Achievement } from '@/types';

const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length;

const SECTIONS: { label: string; ids: string[] }[] = [
  {
    label: 'Logging',
    ids: ['expense_10', 'expense_50', 'expense_100', 'expense_500'],
  },
  {
    label: 'Streaks',
    ids: ['streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_90'],
  },
  {
    label: 'Budgets',
    ids: ['budget_1mo', 'budget_3mo', 'budget_6mo'],
  },
  {
    label: 'Goals',
    ids: ['category_5', 'first_goal_completed'],
  },
];

function getEncouragingMessage(earned: number, total: number): string {
  const ratio = earned / total;
  if (earned === 0) return 'Log your first expense to get started!';
  if (ratio < 0.25) return 'Great start — keep logging to unlock more!';
  if (ratio < 0.5) return "You're making solid progress. Keep it up!";
  if (ratio < 0.75) return 'More than halfway there — impressive!';
  if (ratio < 1) return "Almost a full collection — you're crushing it!";
  return 'All achievements unlocked. You are a Ledgr legend!';
}

export default function AchievementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const earnedAchievements: Record<string, number> =
    (useGamificationStore((s) => (s as any).earnedAchievements) as Record<string, number> | undefined) ?? {};

  const achievementsWithStatus = useMemo<Achievement[]>(
    () =>
      ACHIEVEMENTS.map((a) => ({
        ...a,
        earned: Boolean(earnedAchievements[a.id]),
        earnedAt: earnedAchievements[a.id] ?? null,
      })),
    [earnedAchievements],
  );

  const earnedCount = useMemo(
    () => achievementsWithStatus.filter((a) => a.earned).length,
    [achievementsWithStatus],
  );

  const progressPercent = TOTAL_ACHIEVEMENTS > 0 ? (earnedCount / TOTAL_ACHIEVEMENTS) * 100 : 0;
  const encouragingMessage = getEncouragingMessage(earnedCount, TOTAL_ACHIEVEMENTS);

  const achievementById = useMemo(() => {
    const map: Record<string, Achievement> = {};
    for (const a of achievementsWithStatus) map[a.id] = a;
    return map;
  }, [achievementsWithStatus]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <NeuIconButton icon="chevron-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={styles.headerCountPill}>
          <Text style={styles.headerCount}>
            {earnedCount} / {TOTAL_ACHIEVEMENTS}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Summary card */}
        <MotiView
          from={{ opacity: 0, translateY: -12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350 }}
        >
          <NeuCard color={colors.cardTintYellow} style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Your Collection</Text>
            <Text style={styles.summaryCount}>
              <Text style={styles.summaryCountBig}>{earnedCount}</Text>
              {' '}
              <Text style={styles.summaryCountOf}>/ {TOTAL_ACHIEVEMENTS} earned</Text>
            </Text>

            {/* Progress bar track */}
            <View style={styles.progressTrack}>
              <MotiView
                from={{ width: '0%' }}
                animate={{ width: `${progressPercent}%` as any }}
                transition={{ type: 'timing', duration: 700, delay: 200 }}
                style={[styles.progressFill, { backgroundColor: colors.accent }]}
              />
            </View>

            <Text style={styles.summaryMessage}>{encouragingMessage}</Text>
          </NeuCard>
        </MotiView>

        {/* Sections */}
        {SECTIONS.map((section, sectionIndex) => (
          <View key={section.label} style={styles.section}>
            <MotiView
              from={{ opacity: 0, translateX: -10 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 300, delay: sectionIndex * 80 }}
            >
              <Text style={styles.sectionLabel}>{section.label}</Text>
            </MotiView>

            <View style={styles.grid}>
              {section.ids.map((id, badgeIndex) => {
                const achievement = achievementById[id];
                if (!achievement) return null;
                const globalIndex = sectionIndex * 10 + badgeIndex;
                return (
                  <MotiView
                    key={id}
                    from={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 300, delay: 100 + globalIndex * 55 }}
                    style={styles.badgeWrapper}
                  >
                    <AchievementBadge achievement={achievement} />
                  </MotiView>
                );
              })}
            </View>
          </View>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    headerTitle: {
      ...typography.h2,
    },
    headerCountPill: {
      backgroundColor: colors.cardTintYellow,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    headerCount: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      fontFamily: 'SpaceMono_700Bold',
      letterSpacing: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
    },

    // Summary card
    summaryCard: {
      marginBottom: spacing.xl,
    },
    summaryTitle: {
      ...typography.caption,
      marginBottom: spacing.sm,
    },
    summaryCount: {
      marginBottom: spacing.md,
    },
    summaryCountBig: {
      fontSize: 36,
      fontWeight: '800',
      color: colors.text,
      fontFamily: 'SpaceMono_700Bold',
    },
    summaryCountOf: {
      fontSize: 14,
      fontWeight: '400',
      color: colors.textSecondary,
      fontFamily: 'SpaceMono_400Regular',
    },
    progressTrack: {
      height: 20,
      backgroundColor: colors.background,
      borderWidth: 2.5,
      borderColor: colors.border,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    progressFill: {
      height: '100%',
      borderRadius: 10,
    },
    summaryMessage: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },

    // Sections
    section: {
      marginBottom: spacing['2xl'],
    },
    sectionLabel: {
      ...typography.caption,
      marginBottom: spacing.md,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    badgeWrapper: {
      width: '48%',
    },
  });
