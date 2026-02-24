import React, { useRef, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as Sharing from 'expo-sharing';
import { NeuCard, NeuButton, NeuIconButton, NeuProgressBar } from '@/components/ui';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useIncomeStore } from '@/stores/useIncomeStore';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, borderRadius } from '@/lib/theme';
import type { ThemeColors, ThemeTypography, ThemeBorders } from '@/lib/theme';

let captureRef: any = null;
try {
  const ViewShot = require('react-native-view-shot');
  captureRef = ViewShot.captureRef;
} catch {}

export default function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, borders } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography, borders), [colors, typography, borders]);

  const cardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  const { expenses } = useExpenseStore();
  const { getMonthlyTotal: getMonthlyIncome } = useIncomeStore();
  const { getOverallBudgetProgress } = useBudgetStore();
  const { formatAmount } = useSettingsStore();
  const { streak, currentLevel, xpData } = useGamificationStore();

  const now = new Date();
  const monthLabel = format(now, 'MMMM yyyy').toUpperCase();
  const monthStart = startOfMonth(now).getTime();
  const monthEnd = endOfMonth(now).getTime();

  // --- Data Calculations ---
  const monthlyExpenses = useMemo(
    () => expenses.filter((e) => e.date >= monthStart && e.date <= monthEnd),
    [expenses, monthStart, monthEnd],
  );

  const totalExpenses = useMemo(
    () => monthlyExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthlyExpenses],
  );

  const totalIncome = useMemo(() => getMonthlyIncome(now), [getMonthlyIncome]);

  const netAmount = totalIncome - totalExpenses;
  const isNetPositive = netAmount >= 0;

  const savingsRate = useMemo(() => {
    if (totalIncome <= 0) return 0;
    return Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100);
  }, [totalIncome, totalExpenses]);

  const topCategories = useMemo(() => {
    const categoryMap: Record<string, { name: string; icon: string; color: string; total: number }> = {};
    for (const expense of monthlyExpenses) {
      const catId = expense.categoryId;
      if (!categoryMap[catId]) {
        categoryMap[catId] = {
          name: expense.category.name,
          icon: expense.category.icon,
          color: expense.category.color,
          total: 0,
        };
      }
      categoryMap[catId].total += expense.amount;
    }
    return Object.values(categoryMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [monthlyExpenses]);

  const budgetProgress = useMemo(() => getOverallBudgetProgress(), [getOverallBudgetProgress]);

  const budgetAdherence = useMemo(() => {
    if (!budgetProgress) return null;
    return budgetProgress.percentage;
  }, [budgetProgress]);

  const currentStreak = streak?.currentStreak ?? 0;

  // --- Share Handler ---
  const handleShare = async () => {
    if (!captureRef) return;
    setIsSharing(true);
    try {
      const uri: string = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Monthly Report',
        });
      }
    } catch {
      // sharing failed silently
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <NeuIconButton icon="close" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Monthly Report</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
        >
          {/* Recap Card (captured for sharing) */}
          <View ref={cardRef} collapsable={false}>
            <NeuCard color={colors.cardTintCream} shadow="large" style={styles.recapCard}>
              {/* Month header */}
              <View style={styles.monthHeaderRow}>
                <View style={styles.monthBadge}>
                  <MaterialCommunityIcons
                    name="chart-bar"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.monthLabel}>{monthLabel}</Text>
              </View>

              <View style={styles.divider} />

              {/* Stats row */}
              <View style={styles.statsRow}>
                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'timing', duration: 350, delay: 80 }}
                  style={styles.statBlock}
                >
                  <NeuCard color={colors.cardTintGreen} padded={false} style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                      <MaterialCommunityIcons name="arrow-down-circle" size={16} color={colors.green} />
                    </View>
                    <Text style={styles.statLabel}>Income</Text>
                    <Text style={[styles.statAmount, { color: colors.green }]} numberOfLines={1}>
                      {formatAmount(totalIncome)}
                    </Text>
                  </NeuCard>
                </MotiView>

                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'timing', duration: 350, delay: 140 }}
                  style={styles.statBlock}
                >
                  <NeuCard color={colors.cardTintRed} padded={false} style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                      <MaterialCommunityIcons name="arrow-up-circle" size={16} color={colors.error} />
                    </View>
                    <Text style={styles.statLabel}>Expenses</Text>
                    <Text style={[styles.statAmount, { color: colors.error }]} numberOfLines={1}>
                      {formatAmount(totalExpenses)}
                    </Text>
                  </NeuCard>
                </MotiView>

                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'timing', duration: 350, delay: 200 }}
                  style={styles.statBlock}
                >
                  <NeuCard
                    color={isNetPositive ? colors.cardTintGreen : colors.cardTintRed}
                    padded={false}
                    style={styles.statCard}
                  >
                    <View style={styles.statIconWrap}>
                      <MaterialCommunityIcons
                        name={isNetPositive ? 'trending-up' : 'trending-down'}
                        size={16}
                        color={isNetPositive ? colors.green : colors.error}
                      />
                    </View>
                    <Text style={styles.statLabel}>Net</Text>
                    <Text
                      style={[
                        styles.statAmount,
                        { color: isNetPositive ? colors.green : colors.error },
                      ]}
                      numberOfLines={1}
                    >
                      {isNetPositive ? '+' : ''}{formatAmount(netAmount)}
                    </Text>
                  </NeuCard>
                </MotiView>
              </View>

              {/* Top Categories */}
              {topCategories.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Top Categories</Text>
                  </View>
                  <View style={styles.categoriesContainer}>
                    {topCategories.map((cat, index) => {
                      const pct = totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0;
                      return (
                        <MotiView
                          key={cat.name}
                          from={{ opacity: 0, translateX: -10 }}
                          animate={{ opacity: 1, translateX: 0 }}
                          transition={{ type: 'timing', duration: 300, delay: 250 + index * 70 }}
                          style={styles.categoryRow}
                        >
                          <View
                            style={[
                              styles.categoryIconWrap,
                              { backgroundColor: cat.color + '22', borderColor: cat.color },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={cat.icon as any}
                              size={16}
                              color={cat.color}
                            />
                          </View>
                          <View style={styles.categoryInfo}>
                            <View style={styles.categoryLabelRow}>
                              <Text style={styles.categoryName} numberOfLines={1}>
                                {cat.name}
                              </Text>
                              <Text style={styles.categoryPct}>{Math.round(pct)}%</Text>
                            </View>
                            <View style={styles.categoryBarTrack}>
                              <MotiView
                                from={{ width: '0%' }}
                                animate={{ width: `${Math.min(pct, 100)}%` as any }}
                                transition={{ type: 'timing', duration: 600, delay: 350 + index * 80 }}
                                style={[styles.categoryBarFill, { backgroundColor: cat.color }]}
                              />
                            </View>
                          </View>
                          <Text style={styles.categoryAmount}>{formatAmount(cat.total)}</Text>
                        </MotiView>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Budget Adherence */}
              {budgetAdherence !== null && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Budget Adherence</Text>
                  </View>
                  <View style={styles.budgetSection}>
                    <NeuProgressBar
                      progress={budgetAdherence}
                      color={budgetAdherence > 90 ? colors.error : budgetAdherence > 70 ? colors.accent : colors.green}
                      label={
                        budgetAdherence > 100
                          ? 'Over budget!'
                          : budgetAdherence > 90
                          ? 'Nearly at limit'
                          : 'On track'
                      }
                      showPercentage
                      height={20}
                    />
                    {budgetProgress && (
                      <View style={styles.budgetAmounts}>
                        <Text style={styles.budgetAmountText}>
                          {formatAmount(budgetProgress.spent)} spent
                        </Text>
                        <Text style={styles.budgetAmountText}>
                          of {formatAmount(budgetProgress.total)}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* Savings Rate */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Savings Rate</Text>
              </View>
              <NeuCard
                color={savingsRate >= 20 ? colors.cardTintGreen : savingsRate >= 10 ? colors.cardTintYellow : colors.cardTintRed}
                padded={false}
                style={styles.savingsCard}
              >
                <View style={styles.savingsContent}>
                  <MaterialCommunityIcons
                    name="piggy-bank-outline"
                    size={28}
                    color={savingsRate >= 20 ? colors.green : savingsRate >= 10 ? colors.accent : colors.error}
                  />
                  <View style={styles.savingsTextBlock}>
                    <Text style={styles.savingsRate}>
                      {totalIncome > 0 ? `${Math.round(savingsRate)}%` : 'N/A'}
                    </Text>
                    <Text style={styles.savingsSubtext}>
                      {totalIncome > 0
                        ? savingsRate >= 20
                          ? 'Excellent savings!'
                          : savingsRate >= 10
                          ? 'Good progress'
                          : 'Room to improve'
                        : 'Add income to track'}
                    </Text>
                  </View>
                  {totalIncome > 0 && (
                    <Text style={styles.savingsAmount}>
                      {formatAmount(Math.max(0, totalIncome - totalExpenses))} saved
                    </Text>
                  )}
                </View>
              </NeuCard>

              {/* Streak & Level */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Player Status</Text>
              </View>
              <View style={styles.streakLevelRow}>
                <MotiView
                  from={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'timing', duration: 350, delay: 450 }}
                  style={styles.streakLevelBlock}
                >
                  <NeuCard color={colors.cardTintOrange} padded={false} style={styles.statBadge}>
                    <Text style={styles.statBadgeIcon}>🔥</Text>
                    <Text style={styles.statBadgeValue}>{currentStreak}</Text>
                    <Text style={styles.statBadgeLabel}>Day Streak</Text>
                  </NeuCard>
                </MotiView>

                <MotiView
                  from={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'timing', duration: 350, delay: 530 }}
                  style={styles.streakLevelBlock}
                >
                  <NeuCard color={colors.cardTintPurple} padded={false} style={styles.statBadge}>
                    <Text style={styles.statBadgeIcon}>⚡</Text>
                    <Text style={styles.statBadgeValue}>Lv.{currentLevel}</Text>
                    <Text style={styles.statBadgeLabel} numberOfLines={1}>
                      {xpData?.rank ?? 'Rookie'}
                    </Text>
                  </NeuCard>
                </MotiView>

                <MotiView
                  from={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'timing', duration: 350, delay: 610 }}
                  style={styles.streakLevelBlock}
                >
                  <NeuCard color={colors.cardTintBlue} padded={false} style={styles.statBadge}>
                    <Text style={styles.statBadgeIcon}>✨</Text>
                    <Text style={styles.statBadgeValue}>{xpData?.totalXP ?? 0}</Text>
                    <Text style={styles.statBadgeLabel}>Total XP</Text>
                  </NeuCard>
                </MotiView>
              </View>

              {/* Footer branding */}
              <View style={styles.footer}>
                <View style={styles.footerDivider} />
                <View style={styles.footerContent}>
                  <MaterialCommunityIcons name="notebook-outline" size={14} color={colors.textLight} />
                  <Text style={styles.footerText}>Generated with Ledgr</Text>
                </View>
              </View>
            </NeuCard>
          </View>
        </MotiView>

        {/* Share Button */}
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 300 }}
          style={styles.shareButtonWrap}
        >
          {captureRef ? (
            <NeuButton
              title={isSharing ? 'Capturing...' : 'Share Report'}
              onPress={handleShare}
              variant="primary"
              size="lg"
              fullWidth
              loading={isSharing}
              disabled={isSharing}
              icon={
                !isSharing ? (
                  <MaterialCommunityIcons name="share-variant" size={20} color={colors.onPrimary} />
                ) : undefined
              }
            />
          ) : (
            <NeuCard color={colors.cardTintGray} style={styles.noShareCard}>
              <View style={styles.noShareContent}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={22}
                  color={colors.textSecondary}
                />
                <Text style={styles.noShareText}>
                  Sharing available in production builds
                </Text>
              </View>
            </NeuCard>
          )}
        </MotiView>

        <View style={{ height: insets.bottom + spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography, borders: ThemeBorders) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
      gap: spacing.md,
    },
    headerTitle: {
      ...typography.h2,
      flex: 1,
      textAlign: 'center',
    },

    scrollContent: {
      paddingHorizontal: spacing.xl,
    },

    // Recap Card
    recapCard: {
      borderWidth: borders.thick,
      shadowOffset: { width: 6, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 0,
    },

    // Month header
    monthHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    monthBadge: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary + '22',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: borders.thin,
      borderColor: colors.primary,
    },
    monthLabel: {
      fontSize: 22,
      fontWeight: '800',
      fontFamily: 'SpaceMono_700Bold',
      color: colors.text,
      letterSpacing: 2,
    },

    divider: {
      height: borders.medium,
      backgroundColor: colors.border,
      marginBottom: spacing.lg,
      borderRadius: 1,
    },

    // Stats row
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    statBlock: {
      flex: 1,
    },
    statCard: {
      padding: spacing.sm,
      alignItems: 'center',
      gap: 3,
    },
    statIconWrap: {
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 10,
      fontFamily: 'SpaceMono_400Regular',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statAmount: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'SpaceMono_700Bold',
    },

    // Section headers
    sectionHeader: {
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    sectionTitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },

    // Top Categories
    categoriesContainer: {
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    categoryIconWrap: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.sm,
      borderWidth: borders.thin,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryInfo: {
      flex: 1,
    },
    categoryLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    categoryName: {
      fontSize: 12,
      fontFamily: 'SpaceMono_700Bold',
      color: colors.text,
      flex: 1,
    },
    categoryPct: {
      fontSize: 10,
      fontFamily: 'SpaceMono_400Regular',
      color: colors.textSecondary,
      marginLeft: spacing.xs,
    },
    categoryBarTrack: {
      height: 8,
      backgroundColor: colors.background,
      borderWidth: borders.thin,
      borderColor: colors.border,
      borderRadius: borderRadius.full,
      overflow: 'hidden',
    },
    categoryBarFill: {
      height: '100%',
      borderRadius: borderRadius.full,
    },
    categoryAmount: {
      fontSize: 12,
      fontFamily: 'SpaceMono_700Bold',
      color: colors.text,
      minWidth: 60,
      textAlign: 'right',
    },

    // Budget
    budgetSection: {
      marginBottom: spacing.md,
    },
    budgetAmounts: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    budgetAmountText: {
      fontSize: 11,
      fontFamily: 'SpaceMono_400Regular',
      color: colors.textSecondary,
    },

    // Savings Rate
    savingsCard: {
      marginBottom: spacing.md,
    },
    savingsContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.md,
    },
    savingsTextBlock: {
      flex: 1,
    },
    savingsRate: {
      fontSize: 26,
      fontWeight: '800',
      fontFamily: 'SpaceMono_700Bold',
      color: colors.text,
      lineHeight: 32,
    },
    savingsSubtext: {
      fontSize: 11,
      fontFamily: 'SpaceMono_400Regular',
      color: colors.textSecondary,
    },
    savingsAmount: {
      fontSize: 12,
      fontFamily: 'SpaceMono_700Bold',
      color: colors.text,
      textAlign: 'right',
    },

    // Streak & Level
    streakLevelRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    streakLevelBlock: {
      flex: 1,
    },
    statBadge: {
      padding: spacing.sm,
      alignItems: 'center',
      gap: 2,
    },
    statBadgeIcon: {
      fontSize: 22,
      lineHeight: 28,
    },
    statBadgeValue: {
      fontSize: 16,
      fontWeight: '800',
      fontFamily: 'SpaceMono_700Bold',
      color: colors.text,
    },
    statBadgeLabel: {
      fontSize: 9,
      fontFamily: 'SpaceMono_400Regular',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: 'center',
    },

    // Footer branding
    footer: {
      marginTop: spacing.sm,
    },
    footerDivider: {
      height: borders.thin,
      backgroundColor: colors.border,
      opacity: 0.4,
      marginBottom: spacing.sm,
    },
    footerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    footerText: {
      fontSize: 11,
      fontFamily: 'SpaceMono_400Regular',
      color: colors.textLight,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },

    // Share button
    shareButtonWrap: {
      marginTop: spacing.xl,
    },

    // No share fallback
    noShareCard: {
      padding: spacing.lg,
    },
    noShareContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    noShareText: {
      ...typography.bodySmall,
      flex: 1,
      color: colors.textSecondary,
    },
  });
