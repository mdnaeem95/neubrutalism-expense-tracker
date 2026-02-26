import { NeuButton, NeuCard, NeuChip, NeuEmptyState, NeuProgressBar } from '@/components/ui';
import { useTheme } from '@/lib/ThemeContext';
import { borderRadius, INCOME_SOURCES, PAYMENT_METHODS, spacing } from '@/lib/theme';
import type { ThemeBorders, ThemeColors, ThemeTypography } from '@/lib/theme';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useIncomeStore } from '@/stores/useIncomeStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import type { ChartPeriod, IncomeBySource, IncomeSource, SpendingByCategory } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { eachDayOfInterval, endOfMonth, endOfWeek, endOfYear, format, getDate, getDaysInMonth, startOfMonth, startOfWeek, startOfYear, subMonths } from 'date-fns';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ErrorBoundary from '@/components/ErrorBoundary';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AnalyticsScreenWrapper() {
  return (
    <ErrorBoundary>
      <AnalyticsScreen />
    </ErrorBoundary>
  );
}

function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { expenses } = useExpenseStore();
  const { incomes } = useIncomeStore();
  const { categories } = useCategoryStore();
  const { formatAmount } = useSettingsStore();
  const { isPremium } = useSubscriptionStore();
  const { getBudgetsWithProgress, budgets } = useBudgetStore();
  const { colors, borders, typography } = useTheme();

  const styles = useMemo(() => createStyles(colors, borders, typography), [colors, borders, typography]);

  const [period, setPeriod] = useState<ChartPeriod>('month');

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'week': return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year': return { start: startOfYear(now), end: endOfYear(now) };
    }
  }, [period]);

  const periodExpenses = useMemo(() =>
    expenses.filter((e) => e.date >= dateRange.start.getTime() && e.date <= dateRange.end.getTime()),
    [expenses, dateRange]
  );

  const totalSpent = useMemo(() => periodExpenses.reduce((sum, e) => sum + e.amount, 0), [periodExpenses]);

  const categoryBreakdown = useMemo((): SpendingByCategory[] => {
    const map = new Map<string, { total: number; count: number }>();
    periodExpenses.forEach((e) => {
      const existing = map.get(e.categoryId) || { total: 0, count: 0 };
      map.set(e.categoryId, { total: existing.total + e.amount, count: existing.count + 1 });
    });
    return Array.from(map.entries())
      .map(([catId, { total, count }]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          categoryId: catId, categoryName: cat?.name || 'Unknown',
          categoryIcon: cat?.icon || 'cube-outline', categoryColor: cat?.color || '#9CA3AF',
          total, percentage: totalSpent > 0 ? (total / totalSpent) * 100 : 0, count,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [periodExpenses, categories, totalSpent]);

  const dailySpending = useMemo(() => {
    const days = period === 'week'
      ? eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
      : period === 'month'
        ? eachDayOfInterval({ start: dateRange.start, end: new Date() })
        : Array.from({ length: 12 }, (_, i) => new Date(new Date().getFullYear(), i, 1));

    return days.map((day) => {
      const dayStart = day.getTime();
      const dayEnd = period === 'year'
        ? new Date(day.getFullYear(), day.getMonth() + 1, 0).getTime()
        : dayStart + 86400000;
      const amount = periodExpenses
        .filter((e) => e.date >= dayStart && e.date < dayEnd)
        .reduce((sum, e) => sum + e.amount, 0);
      return { date: day, amount };
    });
  }, [periodExpenses, dateRange, period]);

  const maxDailySpend = useMemo(() => Math.max(...dailySpending.map((d) => d.amount), 1), [dailySpending]);
  const avgDailySpend = useMemo(() => {
    const nonZeroDays = dailySpending.filter((d) => d.amount > 0);
    return nonZeroDays.length > 0 ? totalSpent / nonZeroDays.length : 0;
  }, [dailySpending, totalSpent]);

  const forecast = useMemo(() => {
    if (period !== 'month') return null;
    const now = new Date();
    const dayOfMonth = getDate(now);
    if (dayOfMonth < 3 || totalSpent === 0) return null;
    const daysInMonth = getDaysInMonth(now);
    const remainingDays = daysInMonth - dayOfMonth;
    const dailyAvg = totalSpent / dayOfMonth;
    const projectedTotal = totalSpent + dailyAvg * remainingDays;
    return { projectedTotal, dailyAvg, remainingDays };
  }, [period, totalSpent]);

  const budgetProgress = useMemo(() => getBudgetsWithProgress(), [expenses, budgets]);

  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const currentMonth = expenses
      .filter((e) => e.date >= startOfMonth(now).getTime() && e.date <= endOfMonth(now).getTime())
      .reduce((sum, e) => sum + e.amount, 0);
    const lastMonthDate = subMonths(now, 1);
    const lastMonth = expenses
      .filter((e) => e.date >= startOfMonth(lastMonthDate).getTime() && e.date <= endOfMonth(lastMonthDate).getTime())
      .reduce((sum, e) => sum + e.amount, 0);
    const percentChange = lastMonth > 0 ? ((currentMonth - lastMonth) / lastMonth) * 100 : 0;
    return { currentMonth, lastMonth, percentChange };
  }, [expenses]);

  const smartInsights = useMemo(() => {
    if (periodExpenses.length === 0) return null;
    const biggestExpense = periodExpenses.reduce(
      (max, e) => (e.amount > max.amount ? e : max), periodExpenses[0]
    );
    const dayTotals = new Map<string, number>();
    periodExpenses.forEach((e) => {
      const dayKey = format(new Date(e.date), 'yyyy-MM-dd');
      dayTotals.set(dayKey, (dayTotals.get(dayKey) || 0) + e.amount);
    });
    let busiestDay = '';
    let busiestDayAmount = 0;
    dayTotals.forEach((amount, day) => {
      if (amount > busiestDayAmount) { busiestDay = day; busiestDayAmount = amount; }
    });
    const mostActive = categoryBreakdown.length > 0
      ? categoryBreakdown.reduce((max, c) => (c.count > max.count ? c : max), categoryBreakdown[0])
      : null;
    const avgTransaction = totalSpent / periodExpenses.length;
    return {
      biggestExpense: { amount: biggestExpense.amount, description: biggestExpense.description },
      busiestDay: { date: busiestDay, amount: busiestDayAmount },
      mostActive,
      avgTransaction,
    };
  }, [periodExpenses, categoryBreakdown, totalSpent]);

  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    periodExpenses.forEach((e) => {
      map.set(e.paymentMethod, (map.get(e.paymentMethod) || 0) + e.amount);
    });
    return PAYMENT_METHODS
      .map((pm) => ({
        id: pm.id,
        label: pm.label,
        icon: pm.icon,
        amount: map.get(pm.id) || 0,
        percentage: totalSpent > 0 ? ((map.get(pm.id) || 0) / totalSpent) * 100 : 0,
      }))
      .filter((pm) => pm.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [periodExpenses, totalSpent]);

  const periodIncome = useMemo(() =>
    incomes
      .filter((i) => i.date >= dateRange.start.getTime() && i.date <= dateRange.end.getTime())
      .reduce((sum, i) => sum + i.amount, 0),
    [incomes, dateRange]
  );

  const savingsRate = useMemo(() => {
    if (periodIncome <= 0) return null;
    return ((periodIncome - totalSpent) / periodIncome) * 100;
  }, [periodIncome, totalSpent]);

  const incomeBySource = useMemo((): IncomeBySource[] => {
    const periodIncomes = incomes.filter(
      (i) => i.date >= dateRange.start.getTime() && i.date <= dateRange.end.getTime()
    );
    const map = new Map<string, { total: number; count: number }>();
    periodIncomes.forEach((i) => {
      const existing = map.get(i.source) || { total: 0, count: 0 };
      map.set(i.source, { total: existing.total + i.amount, count: existing.count + 1 });
    });
    return INCOME_SOURCES
      .map((src) => {
        const data = map.get(src.id) || { total: 0, count: 0 };
        return {
          source: src.id as IncomeSource,
          label: src.label,
          icon: src.icon,
          color: src.color,
          total: data.total,
          percentage: periodIncome > 0 ? (data.total / periodIncome) * 100 : 0,
          count: data.count,
        };
      })
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [incomes, dateRange, periodIncome]);

  if (periodExpenses.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.screenTitle}>Analytics</Text>
        <NeuEmptyState
          icon="chart-bar"
          title="No data yet"
          description="Add some expenses to see your spending analytics"
          actionTitle="Add Expense"
          onAction={() => router.push('/(tabs)/add')}
        />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>Analytics</Text>

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {(['week', 'month', 'year'] as ChartPeriod[]).map((p) => (
          <NeuChip key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} selected={period === p} onPress={() => setPeriod(p)} color={colors.accent} />
        ))}
      </View>

      {/* Total Card */}
      <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 400 }}>
        <NeuCard color={colors.cardTintTeal} style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Spent</Text>
          <Text style={styles.totalAmount}>{formatAmount(totalSpent)}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{periodExpenses.length}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatAmount(avgDailySpend)}</Text>
              <Text style={styles.statLabel}>Avg/Day</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{categoryBreakdown.length}</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
          </View>
        </NeuCard>
      </MotiView>

      {/* Savings Rate */}
      {savingsRate !== null && (
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 10 }}>
          <NeuCard color={savingsRate >= 0 ? colors.cardTintGreen : colors.cardTintRed} style={styles.savingsRateCard}>
            <View style={styles.savingsRateRow}>
              <MaterialCommunityIcons
                name={savingsRate >= 0 ? 'piggy-bank-outline' : 'trending-down'}
                size={22}
                color={savingsRate >= 0 ? colors.green : colors.secondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.savingsRateLabel}>Savings Rate</Text>
                <Text style={[styles.savingsRateValue, { color: savingsRate >= 0 ? colors.green : colors.secondary }]}>
                  {savingsRate >= 0 ? '+' : ''}{savingsRate.toFixed(1)}%
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.savingsRateDetail}>{formatAmount(Math.abs(periodIncome - totalSpent))}</Text>
                <Text style={styles.savingsRateSubDetail}>{savingsRate >= 0 ? 'saved' : 'overspent'}</Text>
              </View>
            </View>
          </NeuCard>
        </MotiView>
      )}

      {/* Monthly Comparison */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 50 }}>
        <NeuCard color={colors.cardTintOrange} style={styles.comparisonCard}>
          <View style={styles.comparisonHeader}>
            <Text style={styles.chartTitle}>Monthly Comparison</Text>
            <View style={[styles.changeBadge, {
              backgroundColor: monthlyComparison.percentChange <= 0 ? colors.cardTintGreen : colors.cardTintRed,
            }]}>
              <MaterialCommunityIcons
                name={monthlyComparison.percentChange <= 0 ? 'trending-down' : 'trending-up'}
                size={14}
                color={monthlyComparison.percentChange <= 0 ? colors.green : colors.secondary}
              />
              <Text style={[styles.changeText, {
                color: monthlyComparison.percentChange <= 0 ? colors.green : colors.secondary,
              }]}>
                {Math.abs(monthlyComparison.percentChange).toFixed(1)}%
              </Text>
            </View>
          </View>
          <View style={styles.comparisonBars}>
            <View style={styles.comparisonBarCol}>
              <View style={styles.comparisonBarTrack}>
                <MotiView
                  from={{ height: 0 }}
                  animate={{
                    height: monthlyComparison.lastMonth > 0
                      ? (monthlyComparison.lastMonth / Math.max(monthlyComparison.currentMonth, monthlyComparison.lastMonth, 1)) * 100
                      : 2,
                  }}
                  transition={{ type: 'timing', duration: 700, delay: 100 }}
                  style={[styles.comparisonBarFill, { backgroundColor: colors.textSecondary }]}
                />
              </View>
              <Text style={styles.comparisonBarAmount}>{formatAmount(monthlyComparison.lastMonth)}</Text>
              <Text style={styles.comparisonBarLabel}>Last Month</Text>
            </View>
            <View style={styles.comparisonBarCol}>
              <View style={styles.comparisonBarTrack}>
                <MotiView
                  from={{ height: 0 }}
                  animate={{
                    height: monthlyComparison.currentMonth > 0
                      ? (monthlyComparison.currentMonth / Math.max(monthlyComparison.currentMonth, monthlyComparison.lastMonth, 1)) * 100
                      : 2,
                  }}
                  transition={{ type: 'timing', duration: 700, delay: 200 }}
                  style={[styles.comparisonBarFill, { backgroundColor: colors.accent }]}
                />
              </View>
              <Text style={styles.comparisonBarAmount}>{formatAmount(monthlyComparison.currentMonth)}</Text>
              <Text style={styles.comparisonBarLabel}>This Month</Text>
            </View>
          </View>
        </NeuCard>
      </MotiView>

      {/* Spending Chart (Bar Chart) */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 100 }}>
        <NeuCard style={styles.chartCard}>
          <Text style={styles.chartTitle}>Spending Trend</Text>
          <View style={styles.barChart}>
            {dailySpending.slice(-14).map((day, index) => {
              const height = maxDailySpend > 0 ? (day.amount / maxDailySpend) * 100 : 0;
              return (
                <View key={index} style={styles.barContainer}>
                  <View style={styles.barWrapper}>
                    <MotiView
                      from={{ height: 0 }}
                      animate={{ height: Math.max(height, 2) }}
                      transition={{ type: 'timing', duration: 600, delay: index * 30 }}
                      style={[styles.bar, { backgroundColor: day.amount > avgDailySpend ? colors.secondary : colors.accent }]}
                    />
                  </View>
                  <Text style={styles.barLabel}>
                    {period === 'year' ? format(day.date, 'MMM').charAt(0) : format(day.date, 'd')}
                  </Text>
                </View>
              );
            })}
          </View>
        </NeuCard>
      </MotiView>

      {/* Spending Forecast */}
      {forecast && (
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 150 }}>
          <NeuCard color={colors.cardTintYellow} style={styles.chartCard}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.chartTitle}>End of Month Forecast</Text>
              {budgetProgress.length > 0 && (() => {
                const overall = budgetProgress.find((b) => !b.categoryName);
                if (!overall) return null;
                const willExceed = forecast.projectedTotal > overall.amount;
                return (
                  <View style={[styles.changeBadge, { backgroundColor: willExceed ? colors.cardTintRed : colors.cardTintGreen }]}>
                    <MaterialCommunityIcons name={willExceed ? 'alert-circle-outline' : 'check-circle-outline'} size={14} color={willExceed ? colors.error : colors.green} />
                    <Text style={[styles.changeText, { color: willExceed ? colors.error : colors.green }]}>
                      {willExceed ? 'Over Budget' : 'On Track'}
                    </Text>
                  </View>
                );
              })()}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatAmount(forecast.projectedTotal)}</Text>
                <Text style={styles.statLabel}>Projected</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatAmount(forecast.dailyAvg)}</Text>
                <Text style={styles.statLabel}>Daily Avg</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{forecast.remainingDays}</Text>
                <Text style={styles.statLabel}>Days Left</Text>
              </View>
            </View>
          </NeuCard>
        </MotiView>
      )}

      {/* Category Breakdown */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 200 }}>
        <Text style={styles.sectionTitle}>By Category</Text>

        {/* Visual Pie-like breakdown */}
        <NeuCard style={styles.breakdownCard}>
          <View style={styles.pieRow}>
            {categoryBreakdown.slice(0, 5).map((cat) => (
              <View key={cat.categoryId} style={styles.pieSegment}>
                <View style={[styles.pieBar, { width: `${Math.max(cat.percentage, 5)}%`, backgroundColor: cat.categoryColor }]} />
              </View>
            ))}
          </View>

          {categoryBreakdown.map((cat, index) => (
            <MotiView
              key={cat.categoryId}
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 300, delay: 300 + index * 80 }}
            >
              <View style={styles.categoryRow}>
                <View style={[styles.catDot, { backgroundColor: cat.categoryColor }]} />
                <MaterialCommunityIcons name={cat.categoryIcon as any} size={20} color={cat.categoryColor} />
                <View style={styles.catInfo}>
                  <Text style={styles.catName}>{cat.categoryName}</Text>
                  <Text style={styles.catCount}>{cat.count} transactions</Text>
                </View>
                <View style={styles.catAmountCol}>
                  <Text style={styles.catAmount}>{formatAmount(cat.total)}</Text>
                  <Text style={styles.catPercent}>{cat.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            </MotiView>
          ))}
        </NeuCard>
      </MotiView>

      {/* Income Breakdown */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 250 }}>
        <Text style={styles.sectionTitle}>Income Breakdown</Text>
        {isPremium ? (
          incomeBySource.length > 0 ? (
            <NeuCard color={colors.cardTintGreen} style={styles.breakdownCard}>
              <View style={styles.pieRow}>
                {incomeBySource.map((src) => (
                  <View key={src.source} style={styles.pieSegment}>
                    <View style={[styles.pieBar, { width: `${Math.max(src.percentage, 5)}%`, backgroundColor: src.color }]} />
                  </View>
                ))}
              </View>
              {incomeBySource.map((src, index) => (
                <MotiView key={src.source} from={{ opacity: 0, translateX: -20 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'timing', duration: 300, delay: 300 + index * 80 }}>
                  <View style={styles.categoryRow}>
                    <View style={[styles.catDot, { backgroundColor: src.color }]} />
                    <MaterialCommunityIcons name={src.icon as any} size={20} color={src.color} />
                    <View style={styles.catInfo}>
                      <Text style={styles.catName}>{src.label}</Text>
                      <Text style={styles.catCount}>{src.count} {src.count === 1 ? 'entry' : 'entries'}</Text>
                    </View>
                    <View style={styles.catAmountCol}>
                      <Text style={[styles.catAmount, { color: colors.green }]}>+{formatAmount(src.total)}</Text>
                      <Text style={styles.catPercent}>{src.percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                </MotiView>
              ))}
            </NeuCard>
          ) : (
            <NeuCard color={colors.cardTintGreen} style={[styles.breakdownCard, { alignItems: 'center' }]}>
              <MaterialCommunityIcons name="trending-up" size={32} color={colors.green} />
              <Text style={[styles.catName, { marginTop: spacing.sm }]}>No income this period</Text>
            </NeuCard>
          )
        ) : (
          <NeuCard color={colors.cardTintGreen} style={[styles.breakdownCard, { alignItems: 'center' }]} onPress={() => router.push('/paywall')}>
            <MaterialCommunityIcons name="lock-outline" size={32} color={colors.green} />
            <Text style={[styles.sectionTitle, { marginTop: spacing.sm, marginBottom: spacing.xs }]}>Income Breakdown</Text>
            <Text style={[styles.premiumDesc, { marginBottom: spacing.md }]}>See income by source with Pro</Text>
            <NeuButton title="Upgrade to Pro" onPress={() => router.push('/paywall')} variant="primary" size="sm" />
          </NeuCard>
        )}
      </MotiView>

      {/* Income vs Expenses (Premium) */}
      {isPremium && (
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 280 }}>
          <Text style={styles.sectionTitle}>Income vs Expenses</Text>
          <NeuCard color={colors.cardTintTeal} style={styles.comparisonCard}>
            <View style={styles.comparisonBars}>
              <View style={styles.comparisonBarCol}>
                <View style={styles.comparisonBarTrack}>
                  <MotiView
                    from={{ height: 0 }}
                    animate={{ height: periodIncome > 0 ? (periodIncome / Math.max(periodIncome, totalSpent, 1)) * 100 : 2 }}
                    transition={{ type: 'timing', duration: 700, delay: 100 }}
                    style={[styles.comparisonBarFill, { backgroundColor: colors.green }]}
                  />
                </View>
                <Text style={[styles.comparisonBarAmount, { color: colors.green }]}>+{formatAmount(periodIncome)}</Text>
                <Text style={styles.comparisonBarLabel}>Income</Text>
              </View>
              <View style={styles.comparisonBarCol}>
                <View style={styles.comparisonBarTrack}>
                  <MotiView
                    from={{ height: 0 }}
                    animate={{ height: totalSpent > 0 ? (totalSpent / Math.max(periodIncome, totalSpent, 1)) * 100 : 2 }}
                    transition={{ type: 'timing', duration: 700, delay: 200 }}
                    style={[styles.comparisonBarFill, { backgroundColor: colors.secondary }]}
                  />
                </View>
                <Text style={[styles.comparisonBarAmount, { color: colors.secondary }]}>-{formatAmount(totalSpent)}</Text>
                <Text style={styles.comparisonBarLabel}>Expenses</Text>
              </View>
            </View>
            <View style={[styles.comparisonHeader, { marginTop: spacing.md, marginBottom: 0 }]}>
              <Text style={styles.chartTitle}>Net</Text>
              <Text style={[styles.comparisonBarAmount, { color: periodIncome >= totalSpent ? colors.green : colors.secondary }]}>
                {periodIncome >= totalSpent ? '+' : ''}{formatAmount(periodIncome - totalSpent)}
              </Text>
            </View>
          </NeuCard>
        </MotiView>
      )}

      {/* Smart Insights (Premium) */}
      {isPremium && smartInsights && (
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 250 }}>
          <Text style={styles.sectionTitle}>Smart Insights</Text>
          <View style={styles.insightsGrid}>
            <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 400, delay: 300 }} style={styles.insightCell}>
              <NeuCard shadow="small" color={colors.cardTintRed} style={styles.insightCard}>
                <MaterialCommunityIcons name="fire" size={22} color={colors.secondary} />
                <Text style={styles.insightLabel}>Biggest Expense</Text>
                <Text style={styles.insightValue}>{formatAmount(smartInsights.biggestExpense.amount)}</Text>
                <Text style={styles.insightSub} numberOfLines={1}>{smartInsights.biggestExpense.description}</Text>
              </NeuCard>
            </MotiView>
            <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 400, delay: 380 }} style={styles.insightCell}>
              <NeuCard shadow="small" color={colors.cardTintBlue} style={styles.insightCard}>
                <MaterialCommunityIcons name="calendar" size={22} color={colors.blue} />
                <Text style={styles.insightLabel}>Busiest Day</Text>
                <Text style={styles.insightValue}>
                  {smartInsights.busiestDay.date ? format(new Date(smartInsights.busiestDay.date), 'MMM d') : '-'}
                </Text>
                <Text style={styles.insightSub}>{formatAmount(smartInsights.busiestDay.amount)}</Text>
              </NeuCard>
            </MotiView>
            <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 400, delay: 460 }} style={styles.insightCell}>
              <NeuCard shadow="small" color={colors.cardTintGreen} style={styles.insightCard}>
                <MaterialCommunityIcons name="podium" size={22} color={colors.green} />
                <Text style={styles.insightLabel}>Most Active</Text>
                <Text style={styles.insightValue} numberOfLines={1}>{smartInsights.mostActive?.categoryName || '-'}</Text>
                <Text style={styles.insightSub}>{smartInsights.mostActive ? `${smartInsights.mostActive.count} txns` : ''}</Text>
              </NeuCard>
            </MotiView>
            <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 400, delay: 540 }} style={styles.insightCell}>
              <NeuCard shadow="small" color={colors.cardTintPurple} style={styles.insightCard}>
                <MaterialCommunityIcons name="calculator" size={22} color={colors.purple} />
                <Text style={styles.insightLabel}>Avg Transaction</Text>
                <Text style={styles.insightValue}>{formatAmount(smartInsights.avgTransaction)}</Text>
                <Text style={styles.insightSub}>per expense</Text>
              </NeuCard>
            </MotiView>
          </View>
        </MotiView>
      )}

      {/* Payment Method Breakdown (Premium) */}
      {isPremium && paymentBreakdown.length > 0 && (
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 300 }}>
          <Text style={styles.sectionTitle}>By Payment Method</Text>
          <NeuCard style={styles.paymentCard}>
            {paymentBreakdown.map((pm, index) => (
              <MotiView
                key={pm.id}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 300, delay: 350 + index * 80 }}
              >
                <View style={styles.pmRow}>
                  <View style={styles.pmInfo}>
                    <View style={styles.pmIconWrap}>
                      <MaterialCommunityIcons name={pm.icon as any} size={18} color={colors.text} />
                    </View>
                    <Text style={styles.pmLabel}>{pm.label}</Text>
                  </View>
                  <View style={styles.pmAmountCol}>
                    <Text style={styles.pmAmount}>{formatAmount(pm.amount)}</Text>
                    <Text style={styles.pmPercent}>{pm.percentage.toFixed(1)}%</Text>
                  </View>
                </View>
                <View style={styles.pmBarTrack}>
                  <MotiView
                    from={{ width: '0%' as any }}
                    animate={{ width: `${Math.max(pm.percentage, 2)}%` as any }}
                    transition={{ type: 'timing', duration: 600, delay: 400 + index * 80 }}
                    style={[styles.pmBarFill, {
                      backgroundColor: pm.id === 'cash' ? colors.green : pm.id === 'card' ? colors.blue : pm.id === 'bank' ? colors.purple : colors.orange,
                    }]}
                  />
                </View>
              </MotiView>
            ))}
          </NeuCard>
        </MotiView>
      )}

      {/* Budget vs Actual (Premium) */}
      {isPremium && budgetProgress.length > 0 && (
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 300 }}>
          <Text style={styles.sectionTitle}>Budget vs Actual</Text>
          <NeuCard>
            {budgetProgress.map((budget) => (
              <View key={budget.id} style={styles.budgetItem}>
                <View style={styles.budgetHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name={(budget.categoryIcon || 'cube-outline') as any} size={16} color={budget.categoryColor || colors.text} />
                  <Text style={styles.budgetCat}>{budget.categoryName}</Text>
                </View>
                  <Text style={styles.budgetAmount}>
                    {formatAmount(budget.spent)} / {formatAmount(budget.amount)}
                  </Text>
                </View>
                <NeuProgressBar
                  progress={budget.percentage}
                  color={budget.categoryColor || colors.primary}
                  height={20}
                />
              </View>
            ))}
          </NeuCard>
        </MotiView>
      )}

      {/* Monthly Report */}
      {isPremium && (
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 350 }}>
          <NeuButton
            title="Monthly Report"
            onPress={() => router.push('/report')}
            variant="accent"
            size="md"
            fullWidth
            icon={<MaterialCommunityIcons name="file-chart-outline" size={18} color={colors.onPrimary} />}
            style={{ marginBottom: spacing.lg }}
          />
        </MotiView>
      )}

      {/* Premium Gate */}
      {!isPremium && (
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 500, delay: 400 }}>
          <NeuCard color={colors.cardTintPurple} style={styles.premiumGate}>
            <MaterialCommunityIcons name="lock-outline" size={40} color={colors.purple} />
            <Text style={styles.premiumTitle}>Unlock Full Analytics</Text>
            <Text style={styles.premiumDesc}>
              Get budget tracking, detailed insights, and export capabilities
            </Text>
            <NeuButton title="Upgrade to Pro" onPress={() => router.push('/paywall')} variant="primary" size="md" />
          </NeuCard>
        </MotiView>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors, borders: ThemeBorders, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  screenTitle: { ...typography.h1, marginTop: spacing.md, marginBottom: spacing.lg, paddingHorizontal: spacing.xl },
  periodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  totalCard: { marginBottom: spacing.lg },
  savingsRateCard: { marginBottom: spacing.lg },
  savingsRateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  savingsRateLabel: { ...typography.caption, color: colors.textSecondary },
  savingsRateValue: { fontSize: 22, fontWeight: '800', fontFamily: 'SpaceMono_700Bold' },
  savingsRateDetail: { fontSize: 15, fontWeight: '700', color: colors.text, fontFamily: 'SpaceMono_700Bold' },
  savingsRateSubDetail: { ...typography.caption, color: colors.textSecondary },
  totalLabel: { ...typography.caption, marginBottom: spacing.xs },
  totalAmount: { ...typography.amount },
  statsRow: { flexDirection: 'row', marginTop: spacing.lg, alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.body, fontWeight: '800' },
  statLabel: { ...typography.caption, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border + '30' },
  chartCard: { marginBottom: spacing.lg },
  chartTitle: { ...typography.label, marginBottom: spacing.md },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 2 },
  barContainer: { flex: 1, alignItems: 'center' },
  barWrapper: { width: '80%', height: 100, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, borderWidth: 1, borderColor: colors.border, minHeight: 2 },
  barLabel: { fontSize: 8, fontWeight: '600', color: colors.textSecondary, marginTop: 4, fontFamily: 'SpaceMono_400Regular' },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  breakdownCard: { marginBottom: spacing.lg },
  pieRow: { flexDirection: 'row', height: 24, borderRadius: 12, overflow: 'hidden', marginBottom: spacing.lg, borderWidth: 2.5, borderColor: colors.border },
  pieSegment: { flexDirection: 'row' },
  pieBar: { height: '100%' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catInfo: { flex: 1 },
  catName: { ...typography.body, fontWeight: '600' },
  catCount: { ...typography.caption },
  catAmountCol: { alignItems: 'flex-end' },
  catAmount: { ...typography.body, fontWeight: '700' },
  catPercent: { ...typography.caption, fontWeight: '600' },
  budgetItem: { marginBottom: spacing.md },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  budgetCat: { ...typography.body, fontWeight: '600' },
  budgetAmount: { ...typography.bodySmall, fontWeight: '600' },
  comparisonCard: { marginBottom: spacing.lg },
  comparisonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 2.5, borderColor: colors.border, borderRadius: borderRadius.sm },
  changeText: { fontSize: 12, fontWeight: '700', fontFamily: 'SpaceMono_700Bold' },
  comparisonBars: { flexDirection: 'row', justifyContent: 'center', gap: spacing['3xl'], alignItems: 'flex-end' },
  comparisonBarCol: { alignItems: 'center', width: 80 },
  comparisonBarTrack: { width: 48, height: 100, justifyContent: 'flex-end', borderWidth: borders.width, borderColor: colors.border, borderRadius: borderRadius.sm, overflow: 'hidden', backgroundColor: colors.background },
  comparisonBarFill: { width: '100%', borderRadius: borderRadius.sm - borders.width },
  comparisonBarAmount: { ...typography.bodySmall, fontWeight: '700', marginTop: spacing.sm },
  comparisonBarLabel: { ...typography.caption, marginTop: 2 },
  insightsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  insightCell: { width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.md) / 2 },
  insightCard: { alignItems: 'flex-start', gap: spacing.xs, minHeight: 120 },
  insightLabel: { ...typography.caption, marginTop: spacing.xs },
  insightValue: { ...typography.body, fontWeight: '800', fontSize: 18 },
  insightSub: { ...typography.caption, fontSize: 11 },
  paymentCard: { marginBottom: spacing.lg },
  pmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  pmInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pmIconWrap: { width: 32, height: 32, borderRadius: borderRadius.sm, borderWidth: 2.5, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  pmLabel: { ...typography.body, fontWeight: '600' },
  pmAmountCol: { alignItems: 'flex-end' },
  pmAmount: { ...typography.body, fontWeight: '700' },
  pmPercent: { ...typography.caption, fontWeight: '600' },
  pmBarTrack: { height: 16, backgroundColor: colors.background, borderWidth: borders.width, borderColor: colors.border, borderRadius: borderRadius.sm, overflow: 'hidden', marginBottom: spacing.md },
  pmBarFill: { height: '100%', borderRadius: borderRadius.sm - borders.width },
  premiumGate: { alignItems: 'center', marginBottom: spacing.lg },
  premiumTitle: { ...typography.h3, marginBottom: spacing.xs },
  premiumDesc: { ...typography.bodySmall, textAlign: 'center', marginBottom: spacing.lg },
});
