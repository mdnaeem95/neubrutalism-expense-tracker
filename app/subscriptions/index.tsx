import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { NeuCard, NeuIconButton, NeuBadge } from '@/components/ui';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, borderRadius } from '@/lib/theme';
import type { ThemeColors, ThemeTypography, ThemeBorders } from '@/lib/theme';
import type { ExpenseWithCategory, RecurringFrequency } from '@/types';

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const FREQUENCY_ORDER: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

function toMonthly(amount: number, frequency: RecurringFrequency): number {
  switch (frequency) {
    case 'daily': return amount * 30;
    case 'weekly': return amount * 4.33;
    case 'monthly': return amount;
    case 'yearly': return amount / 12;
  }
}

function frequencyBadgeColor(frequency: RecurringFrequency, colors: ThemeColors): string {
  switch (frequency) {
    case 'daily': return colors.cardTintPink;
    case 'weekly': return colors.cardTintBlue;
    case 'monthly': return colors.cardTintGreen;
    case 'yearly': return colors.cardTintPurple;
  }
}

export default function SubscriptionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, borders, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, borders, typography), [colors, borders, typography]);
  const { expenses } = useExpenseStore();
  const { formatAmount } = useSettingsStore();

  // Filter to only recurring expenses (templates)
  const recurringExpenses = useMemo(
    () => expenses.filter((e) => e.isRecurring === 1),
    [expenses]
  );

  // Total monthly cost (normalized)
  const totalMonthly = useMemo(
    () =>
      recurringExpenses.reduce((sum, e) => {
        if (!e.recurringFrequency) return sum;
        return sum + toMonthly(e.amount, e.recurringFrequency);
      }, 0),
    [recurringExpenses]
  );

  // Upcoming this month — nextRecurringDate within current month
  const upcomingThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now).getTime();
    const monthEnd = endOfMonth(now).getTime();
    return recurringExpenses
      .filter(
        (e) =>
          e.nextRecurringDate != null &&
          e.nextRecurringDate >= monthStart &&
          e.nextRecurringDate <= monthEnd
      )
      .sort((a, b) => (a.nextRecurringDate ?? 0) - (b.nextRecurringDate ?? 0));
  }, [recurringExpenses]);

  // Group by frequency
  const grouped = useMemo(() => {
    const map = new Map<RecurringFrequency, ExpenseWithCategory[]>();
    for (const freq of FREQUENCY_ORDER) {
      const items = recurringExpenses.filter((e) => e.recurringFrequency === freq);
      if (items.length > 0) {
        map.set(freq, items);
      }
    }
    return map;
  }, [recurringExpenses]);

  const isEmpty = recurringExpenses.length === 0;

  function SubscriptionRow({
    expense,
    index,
    animDelay = 0,
  }: {
    expense: ExpenseWithCategory;
    index: number;
    animDelay?: number;
  }) {
    const freq = expense.recurringFrequency ?? 'monthly';
    const monthly = toMonthly(expense.amount, freq as RecurringFrequency);
    const badgeColor = frequencyBadgeColor(freq as RecurringFrequency, colors);

    return (
      <MotiView
        from={{ opacity: 0, translateX: -20 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 280, delay: animDelay + index * 50 }}
      >
        <NeuCard shadow="small" color={colors.surface} style={styles.subCard}>
          <View style={styles.subCardRow}>
            {/* Category icon circle */}
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: expense.category.color + '25' },
              ]}
            >
              <MaterialCommunityIcons
                name={expense.category.icon as any}
                size={20}
                color={expense.category.color}
              />
            </View>

            {/* Info */}
            <View style={styles.subCardInfo}>
              <Text style={styles.subCardDescription} numberOfLines={1}>
                {expense.description || expense.category.name}
              </Text>
              <Text style={styles.subCardCategory} numberOfLines={1}>
                {expense.category.name}
              </Text>
              {expense.nextRecurringDate != null && (
                <Text style={styles.subCardNextDate}>
                  Next: {format(new Date(expense.nextRecurringDate), 'MMM d, yyyy')}
                </Text>
              )}
            </View>

            {/* Right column: amount + frequency badge */}
            <View style={styles.subCardRight}>
              <Text style={styles.subCardAmount}>
                {formatAmount(expense.amount)}
              </Text>
              <NeuBadge
                label={FREQUENCY_LABELS[freq as RecurringFrequency]}
                color={badgeColor}
                size="sm"
              />
              {freq !== 'monthly' && (
                <Text style={styles.subCardMonthly}>
                  {formatAmount(monthly)}/mo
                </Text>
              )}
            </View>
          </View>
        </NeuCard>
      </MotiView>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <NeuIconButton icon="chevron-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Subscriptions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Summary card */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          <NeuCard shadow="medium" color={colors.cardTintBlue} style={styles.summaryCard}>
            <View style={styles.summaryInner}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryLabel}>Monthly Total</Text>
                <Text style={styles.summaryAmount}>{formatAmount(totalMonthly)}</Text>
                <Text style={styles.summarySubtitle}>
                  {formatAmount(totalMonthly * 12)} per year
                </Text>
              </View>
              <View style={styles.summaryRight}>
                <View style={[styles.countBadge, { backgroundColor: colors.cardTintPink }]}>
                  <MaterialCommunityIcons
                    name="repeat"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.countNumber, { color: colors.primary }]}>
                    {recurringExpenses.length}
                  </Text>
                  <Text style={styles.countLabel}>active</Text>
                </View>
              </View>
            </View>
          </NeuCard>
        </MotiView>

        {/* Empty state */}
        {isEmpty && (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 100 }}
          >
            <NeuCard shadow="medium" color={colors.surface} style={styles.emptyCard}>
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="repeat-off"
                  size={48}
                  color={colors.textLight}
                />
                <Text style={styles.emptyTitle}>No subscriptions yet</Text>
                <Text style={styles.emptySubtitle}>
                  Mark an expense as recurring to track it here.
                </Text>
              </View>
            </NeuCard>
          </MotiView>
        )}

        {/* Upcoming This Month */}
        {upcomingThisMonth.length > 0 && (
          <>
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 250, delay: 80 }}
            >
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.sectionLabel}>Upcoming This Month</Text>
              </View>
            </MotiView>
            {upcomingThisMonth.map((expense, index) => (
              <SubscriptionRow
                key={`upcoming-${expense.id}`}
                expense={expense}
                index={index}
                animDelay={100}
              />
            ))}
          </>
        )}

        {/* All Subscriptions grouped by frequency */}
        {!isEmpty && (
          <>
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 250, delay: 150 }}
            >
              <View style={[styles.sectionHeader, { marginTop: upcomingThisMonth.length > 0 ? spacing['2xl'] : 0 }]}>
                <MaterialCommunityIcons
                  name="view-list-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.sectionLabel}>All Subscriptions</Text>
              </View>
            </MotiView>

            {FREQUENCY_ORDER.map((freq) => {
              const items = grouped.get(freq);
              if (!items) return null;
              const groupMonthly = items.reduce(
                (sum, e) => sum + toMonthly(e.amount, freq),
                0
              );
              return (
                <View key={freq}>
                  {/* Frequency group header */}
                  <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 250, delay: 180 }}
                  >
                    <View style={styles.freqHeader}>
                      <NeuBadge
                        label={FREQUENCY_LABELS[freq]}
                        color={frequencyBadgeColor(freq, colors)}
                        size="sm"
                      />
                      <Text style={styles.freqTotal}>
                        {formatAmount(groupMonthly)}/mo
                      </Text>
                    </View>
                  </MotiView>

                  {items.map((expense, index) => (
                    <SubscriptionRow
                      key={expense.id}
                      expense={expense}
                      index={index}
                      animDelay={200}
                    />
                  ))}
                </View>
              );
            })}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const createStyles = (
  colors: ThemeColors,
  borders: ThemeBorders,
  typography: ThemeTypography
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
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
    headerSpacer: {
      width: 44,
    },

    scrollContent: {
      paddingHorizontal: spacing.xl,
    },

    // Summary card
    summaryCard: {
      marginBottom: spacing.xl,
    },
    summaryInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    summaryLeft: {
      flex: 1,
    },
    summaryRight: {
      marginLeft: spacing.lg,
    },
    summaryLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    summaryAmount: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text,
      fontFamily: 'SpaceMono_700Bold',
      lineHeight: 40,
    },
    summarySubtitle: {
      ...typography.bodySmall,
      color: colors.textLight,
      marginTop: spacing.xs,
    },
    countBadge: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: borders.medium,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minWidth: 72,
      gap: 2,
    },
    countNumber: {
      fontSize: 22,
      fontWeight: '800',
      fontFamily: 'SpaceMono_700Bold',
      lineHeight: 28,
    },
    countLabel: {
      fontSize: 10,
      fontWeight: '700',
      fontFamily: 'SpaceMono_700Bold',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },

    // Section headers
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    sectionLabel: {
      ...typography.caption,
    },

    // Frequency group
    freqHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    freqTotal: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'SpaceMono_700Bold',
      color: colors.textSecondary,
    },

    // Subscription card
    subCard: {
      marginBottom: spacing.sm,
    },
    subCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.border + '20',
      flexShrink: 0,
    },
    subCardInfo: {
      flex: 1,
    },
    subCardDescription: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      fontFamily: 'SpaceMono_700Bold',
      marginBottom: 2,
    },
    subCardCategory: {
      fontSize: 11,
      fontWeight: '400',
      color: colors.textSecondary,
      fontFamily: 'SpaceMono_400Regular',
      marginBottom: 2,
    },
    subCardNextDate: {
      fontSize: 11,
      fontWeight: '400',
      color: colors.textLight,
      fontFamily: 'SpaceMono_400Regular',
    },
    subCardRight: {
      alignItems: 'flex-end',
      gap: spacing.xs,
      flexShrink: 0,
    },
    subCardAmount: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      fontFamily: 'SpaceMono_700Bold',
    },
    subCardMonthly: {
      fontSize: 10,
      fontWeight: '400',
      color: colors.textLight,
      fontFamily: 'SpaceMono_400Regular',
    },

    // Empty state
    emptyCard: {
      marginBottom: spacing.lg,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing['3xl'],
      gap: spacing.md,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      fontFamily: 'SpaceMono_700Bold',
    },
    emptySubtitle: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.textSecondary,
      fontFamily: 'SpaceMono_400Regular',
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },

    bottomSpacer: {
      height: 120,
    },
  });
