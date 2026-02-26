import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, subMonths } from 'date-fns';
import { MotiView } from 'moti';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useIncomeStore } from '@/stores/useIncomeStore';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useGamificationStore } from '@/stores/useGamificationStore';
import { useSavingsGoalStore } from '@/stores/useSavingsGoalStore';
import { useDebtStore } from '@/stores/useDebtStore';
import { NeuCard, NeuProgressBar, NeuBadge, NeuEmptyState, NeuButton } from '@/components/ui';
import XPCard from '@/components/XPCard';
import LevelUpCelebration from '@/components/LevelUpCelebration';
import InsightCard from '@/components/InsightCard';
import CategoryIcon from '@/components/CategoryIcon';
import { AdBanner } from '@/services/ads';
import { generateInsights } from '@/services/insights';
import { ACHIEVEMENTS } from '@/services/achievements';
import { spacing, borderRadius } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import type { ThemeColors, ThemeBorders, ThemeTypography } from '@/lib/theme';
import type { ExpenseWithCategory, SpendingByCategory } from '@/types';

const ExpenseRow = React.memo(function ExpenseRow({ expense, formatAmount: fmtAmount, onPress, colors, typography }: {
  expense: ExpenseWithCategory;
  formatAmount: (n: number) => string;
  onPress: (id: string) => void;
  colors: ThemeColors;
  typography: ThemeTypography;
}) {
  const styles = useMemo(() => createStyles(colors, {} as ThemeBorders, typography), [colors, typography]);
  return (
    <Pressable onPress={() => onPress(expense.id)} style={styles.expenseRow}>
      <CategoryIcon icon={expense.category.icon} color={expense.category.color} />
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseDesc} numberOfLines={1}>
          {expense.description || expense.category.name}
        </Text>
        <Text style={styles.expenseDate}>{format(new Date(expense.date), 'MMM d, h:mm a')}</Text>
      </View>
      <Text style={styles.expenseAmount}>-{fmtAmount(expense.amount)}</Text>
    </Pressable>
  );
});

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const expenses = useExpenseStore((s) => s.expenses);
  const getMonthlyTotal = useExpenseStore((s) => s.getMonthlyTotal);
  const getOverallBudgetProgress = useBudgetStore((s) => s.getOverallBudgetProgress);
  const getBudgetsWithProgress = useBudgetStore((s) => s.getBudgetsWithProgress);
  const budgets = useBudgetStore((s) => s.budgets);
  const formatAmount = useSettingsStore((s) => s.formatAmount);
  const gamificationEnabled = useSettingsStore((s) => s.gamificationEnabled);
  const currencySymbol = useSettingsStore((s) => s.currencySymbol);
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const categories = useCategoryStore((s) => s.categories);
  const pendingLevelUp = useGamificationStore((s) => s.pendingLevelUp);
  const dismissLevelUp = useGamificationStore((s) => s.dismissLevelUp);
  const earnedAchievements = useGamificationStore((s) => s.earnedAchievements);
  const streak = useGamificationStore((s) => s.streak);
  const goals = useSavingsGoalStore((s) => s.goals);
  const debts = useDebtStore((s) => s.debts);
  const getTotalDebt = useDebtStore((s) => s.getTotalDebt);
  const { colors, borders, typography } = useTheme();

  const styles = useMemo(() => createStyles(colors, borders, typography), [colors, borders, typography]);

  const incomes = useIncomeStore((s) => s.incomes);
  const getMonthlyIncomeTotal = useIncomeStore((s) => s.getMonthlyTotal);
  const getMonthlyCount = useIncomeStore((s) => s.getMonthlyCount);

  const currentMonthTotal = useMemo(() => getMonthlyTotal(), [expenses]);
  const lastMonthTotal = useMemo(() => getMonthlyTotal(subMonths(new Date(), 1)), [expenses]);
  const currentMonthIncome = useMemo(() => getMonthlyIncomeTotal(), [incomes]);
  const lastMonthIncome = useMemo(() => getMonthlyIncomeTotal(subMonths(new Date(), 1)), [incomes]);
  const monthlyIncomeCount = useMemo(() => getMonthlyCount(), [incomes]);
  const netBalance = useMemo(() => currentMonthIncome - currentMonthTotal, [currentMonthIncome, currentMonthTotal]);
  const budgetProgress = useMemo(() => getOverallBudgetProgress(), [expenses]);
  const percentChange = useMemo(() => {
    if (lastMonthTotal === 0) return 0;
    return ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
  }, [currentMonthTotal, lastMonthTotal]);
  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);
  const activeGoals = useMemo(() => goals.filter((g) => g.currentAmount < g.targetAmount).slice(0, 2), [goals]);

  const budgetsWithProgress = useMemo(() => getBudgetsWithProgress(), [expenses, budgets]);
  const insights = useMemo(() => generateInsights(
    expenses, budgetsWithProgress, currentMonthIncome, lastMonthIncome, streak?.currentStreak ?? 0, expenses.length, currencySymbol,
  ), [expenses, budgetsWithProgress, currentMonthIncome, lastMonthIncome, streak, currencySymbol]);

  const recurringExpenses = useMemo(() => expenses.filter((e) => e.isRecurring === 1), [expenses]);
  const monthlyRecurringCost = useMemo(() => {
    let total = 0;
    for (const e of recurringExpenses) {
      switch (e.recurringFrequency) {
        case 'daily': total += e.amount * 30; break;
        case 'weekly': total += e.amount * 4.33; break;
        case 'monthly': total += e.amount; break;
        case 'yearly': total += e.amount / 12; break;
        default: total += e.amount;
      }
    }
    return total;
  }, [recurringExpenses]);

  const totalDebt = useMemo(() => getTotalDebt(), [debts]);
  const earnedCount = useMemo(() => Object.keys(earnedAchievements).length, [earnedAchievements]);

  const categoryBreakdown = useMemo((): SpendingByCategory[] => {
    const spendingMap = new Map<string, number>();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    expenses
      .filter((e) => e.date >= monthStart)
      .forEach((e) => { spendingMap.set(e.categoryId, (spendingMap.get(e.categoryId) || 0) + e.amount); });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    return Array.from(spendingMap.entries())
      .map(([catId, total]) => {
        const cat = categoryMap.get(catId);
        return {
          categoryId: catId, categoryName: cat?.name || 'Unknown', categoryIcon: cat?.icon || 'cube-outline',
          categoryColor: cat?.color || '#9CA3AF', total,
          percentage: currentMonthTotal > 0 ? (total / currentMonthTotal) * 100 : 0, count: 0,
        };
      })
      .sort((a, b) => b.total - a.total).slice(0, 5);
  }, [expenses, categories, currentMonthTotal]);

  const handleExpensePress = useCallback((id: string) => {
    router.push(`/expense/${id}`);
  }, [router]);

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <MotiView from={{ opacity: 0, translateY: -10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello!</Text>
            <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          </View>
          {!isPremium && (
            <Pressable onPress={() => router.push('/paywall')} style={styles.premiumBadge}>
              <MaterialCommunityIcons name="star" size={12} color={colors.text} />
              <Text style={styles.premiumText}> PRO</Text>
            </Pressable>
          )}
        </View>
      </MotiView>

      {/* XP Progress */}
      {gamificationEnabled && (
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 50 }}>
          <XPCard />
        </MotiView>
      )}

      {/* Smart Insights */}
      {insights.length > 0 && (
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 75 }}>
          {insights.map((insight, i) => (
            <InsightCard key={insight.id} insight={insight} index={i} />
          ))}
        </MotiView>
      )}

      {/* Net Balance Card */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 100 }}>
        <NeuCard color={netBalance >= 0 ? colors.cardTintGreen : colors.cardTintRed} style={styles.totalCard}>
          <Text style={styles.totalLabel}>Net Balance</Text>
          <Text style={[styles.totalAmount, { color: netBalance >= 0 ? colors.green : colors.secondary }]}>
            {netBalance >= 0 ? '+' : ''}{formatAmount(Math.abs(netBalance))}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.green }]}>+{formatAmount(currentMonthIncome)}</Text>
              <Text style={styles.statLabel}>Income</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.secondary }]}>-{formatAmount(currentMonthTotal)}</Text>
              <Text style={styles.statLabel}>Expenses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name={percentChange >= 0 ? 'trending-up' : 'trending-down'} size={14} color={percentChange <= 0 ? colors.green : colors.secondary} />
              <Text style={styles.statLabel}>{Math.abs(percentChange).toFixed(0)}% vs last</Text>
            </View>
          </View>
        </NeuCard>
      </MotiView>

      {/* Income Card */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 150 }}>
        <NeuCard color={colors.cardTintGreen} style={styles.incomeCard} onPress={() => router.push('/income')}>
          <View style={styles.incomeCardRow}>
            <View style={styles.incomeCardLeft}>
              <MaterialCommunityIcons name="trending-up" size={22} color={colors.green} />
              <View>
                <Text style={styles.incomeCardLabel}>Income This Month</Text>
                <Text style={styles.incomeCardAmount}>{formatAmount(currentMonthIncome)}</Text>
              </View>
            </View>
            <View style={styles.incomeCardRight}>
              <Text style={styles.incomeEntryCount}>{monthlyIncomeCount} {monthlyIncomeCount === 1 ? 'entry' : 'entries'}</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textLight} />
            </View>
          </View>
        </NeuCard>
      </MotiView>

      {/* Savings Goals */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 175 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Savings Goals</Text>
          <Pressable onPress={() => router.push('/goals')}><Text style={styles.seeAll}>See All</Text></Pressable>
        </View>
        {activeGoals.length > 0 ? (
          activeGoals.map((goal) => (
            <NeuCard key={goal.id} onPress={() => router.push('/goals')} style={styles.goalCard}>
              <View style={styles.goalCardRow}>
                <View style={[styles.goalIconCircle, { backgroundColor: goal.color + '25' }]}>
                  <MaterialCommunityIcons name={goal.icon as any} size={20} color={goal.color} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
                  <NeuProgressBar progress={(goal.currentAmount / goal.targetAmount) * 100} color={goal.color} />
                </View>
                <Text style={styles.goalSaved}>{formatAmount(goal.currentAmount)}</Text>
              </View>
            </NeuCard>
          ))
        ) : (
          <NeuCard color={colors.cardTintTeal} onPress={() => router.push('/goals')} style={styles.goalCard}>
            <View style={styles.goalCardRow}>
              <View style={[styles.goalIconCircle, { backgroundColor: colors.accent + '25' }]}>
                <MaterialCommunityIcons name="piggy-bank-outline" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalTitle}>Set a savings goal</Text>
                <Text style={{ fontSize: 11, color: colors.textLight, fontFamily: 'SpaceMono_400Regular' }}>Tap to create your first goal</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textLight} />
            </View>
          </NeuCard>
        )}
      </MotiView>

      {/* Quick Widgets Row */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 185 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.widgetScroll}>
          {/* Subscriptions Widget */}
          {recurringExpenses.length > 0 && (
            <NeuCard color={colors.cardTintBlue} style={styles.widgetCard} onPress={() => router.push('/subscriptions')}>
              <MaterialCommunityIcons name="repeat" size={20} color={colors.blue} />
              <Text style={styles.widgetValue}>{formatAmount(monthlyRecurringCost)}</Text>
              <Text style={styles.widgetLabel}>{recurringExpenses.length} subscription{recurringExpenses.length !== 1 ? 's' : ''}/mo</Text>
            </NeuCard>
          )}

          {/* Debt Widget */}
          {debts.length > 0 && (
            <NeuCard color={colors.cardTintPink} style={styles.widgetCard} onPress={() => router.push('/debts')}>
              <MaterialCommunityIcons name="credit-card-outline" size={20} color={colors.secondary} />
              <Text style={styles.widgetValue}>{formatAmount(totalDebt)}</Text>
              <Text style={styles.widgetLabel}>Total Debt</Text>
            </NeuCard>
          )}

          {/* Achievements Widget */}
          {gamificationEnabled && (
            <NeuCard color={colors.cardTintYellow} style={styles.widgetCard} onPress={() => router.push('/achievements')}>
              <MaterialCommunityIcons name="trophy-outline" size={20} color={colors.orange} />
              <Text style={styles.widgetValue}>{earnedCount}/{ACHIEVEMENTS.length}</Text>
              <Text style={styles.widgetLabel}>Badges Earned</Text>
            </NeuCard>
          )}
        </ScrollView>
      </MotiView>

      {/* Budget Progress */}
      {budgetProgress && (
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 200 }}>
          <NeuCard style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Budget</Text>
              <Text style={styles.budgetText}>{formatAmount(budgetProgress.spent)} / {formatAmount(budgetProgress.total)}</Text>
            </View>
            <NeuProgressBar progress={budgetProgress.percentage} color={budgetProgress.percentage > 80 ? colors.secondary : colors.green} />
          </NeuCard>
        </MotiView>
      )}

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 300 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Top Categories</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {categoryBreakdown.map((cat) => (
              <NeuCard key={cat.categoryId} style={styles.categoryCard}>
                <CategoryIcon icon={cat.categoryIcon} color={cat.categoryColor} size={24} containerSize={44} />
                <Text style={styles.catName} numberOfLines={1}>{cat.categoryName}</Text>
                <Text style={styles.catAmount}>{formatAmount(cat.total)}</Text>
                <NeuBadge label={`${cat.percentage.toFixed(0)}%`} color={cat.categoryColor + '40'} size="sm" />
              </NeuCard>
            ))}
          </ScrollView>
        </MotiView>
      )}

      {/* Recent Transactions */}
      <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500, delay: 400 }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {expenses.length > 0 && (
            <Pressable onPress={() => router.push('/(tabs)/expenses')}><Text style={styles.seeAll}>See All</Text></Pressable>
          )}
        </View>
        {recentExpenses.length > 0 ? (
          <NeuCard padded={false} style={styles.transactionCard}>
            {recentExpenses.map((expense, index) => (
              <React.Fragment key={expense.id}>
                <ExpenseRow expense={expense} formatAmount={formatAmount} onPress={handleExpensePress} colors={colors} typography={typography} />
                {index < recentExpenses.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </NeuCard>
        ) : (
          <NeuCard>
            <NeuEmptyState
              icon="wallet-outline"
              title={gamificationEnabled ? 'Start your journey!' : 'No expenses yet'}
              description={gamificationEnabled ? 'Log your first expense to earn XP' : 'Tap the + button to add your first expense'}
              actionTitle="Add Expense"
              onAction={() => router.push('/(tabs)/add')}
            />
          </NeuCard>
        )}
      </MotiView>

      {!isPremium && (
        <AdBanner style={styles.adBanner} />
      )}
      <View style={{ height: 100 }} />

      {gamificationEnabled && pendingLevelUp !== null && (
        <LevelUpCelebration
          level={pendingLevelUp}
          visible={true}
          onDismiss={dismissLevelUp}
        />
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors, borders: ThemeBorders, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.xl },
  greeting: { ...typography.h2 },
  date: { ...typography.bodySmall, marginTop: 2 },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, borderWidth: 2, borderColor: colors.border },
  premiumText: { fontSize: 12, fontWeight: '800', color: colors.text, fontFamily: 'SpaceMono_700Bold' },
  totalCard: { marginBottom: spacing.md },
  totalLabel: { ...typography.caption, marginBottom: spacing.xs, color: colors.textSecondary },
  totalAmount: { ...typography.amount, marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 13, fontWeight: '700', fontFamily: 'SpaceMono_700Bold' },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border + '40' },
  incomeCard: { marginBottom: spacing.lg },
  incomeCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  incomeCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  incomeCardLabel: { ...typography.caption, color: colors.textSecondary },
  incomeCardAmount: { fontSize: 18, fontWeight: '800', color: colors.green, fontFamily: 'SpaceMono_700Bold' },
  incomeCardRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  incomeEntryCount: { ...typography.caption, color: colors.textLight },
  sectionCard: { marginBottom: spacing.lg },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.h3 },
  budgetText: { ...typography.bodySmall, fontWeight: '600' },
  seeAll: { ...typography.label, color: colors.blue },
  categoryScroll: { paddingBottom: spacing.lg, gap: spacing.md },
  categoryCard: { width: 120, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, gap: spacing.xs },
  catName: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center', fontFamily: 'SpaceMono_400Regular' },
  catAmount: { fontSize: 14, fontWeight: '800', color: colors.text, fontFamily: 'SpaceMono_700Bold' },
  transactionCard: { marginBottom: spacing.lg },
  expenseRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  expenseInfo: { flex: 1 },
  expenseDesc: { ...typography.body, fontWeight: '600' },
  expenseDate: { ...typography.caption, marginTop: 2 },
  expenseAmount: { ...typography.body, fontWeight: '800', color: colors.secondary },
  divider: { height: 1, backgroundColor: colors.border + '20', marginHorizontal: spacing.lg },
  adBanner: { height: 60, backgroundColor: colors.surface, borderWidth: borders.medium, borderColor: borders.color, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  goalCard: { marginBottom: spacing.sm },
  goalCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  goalIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontSize: 13, fontWeight: '700', color: colors.text, fontFamily: 'SpaceMono_700Bold' },
  goalSaved: { fontSize: 13, fontWeight: '700', color: colors.text, fontFamily: 'SpaceMono_700Bold' },
  widgetScroll: { paddingBottom: spacing.lg, gap: spacing.md },
  widgetCard: { width: 130, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, gap: 4 },
  widgetValue: { fontSize: 15, fontWeight: '800', color: colors.text, fontFamily: 'SpaceMono_700Bold' },
  widgetLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, fontFamily: 'SpaceMono_400Regular', textAlign: 'center' },
});
