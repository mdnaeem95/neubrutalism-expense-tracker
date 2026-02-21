import React, { useMemo } from 'react';
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
import { NeuCard, NeuProgressBar, NeuBadge, NeuEmptyState, NeuButton } from '@/components/ui';
import XPCard from '@/components/XPCard';
import LevelUpCelebration from '@/components/LevelUpCelebration';
import CategoryIcon from '@/components/CategoryIcon';
import { AdBanner } from '@/services/ads';
import { spacing, borderRadius } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import type { ThemeColors, ThemeBorders, ThemeTypography } from '@/lib/theme';
import type { ExpenseWithCategory, SpendingByCategory } from '@/types';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { expenses, getMonthlyTotal } = useExpenseStore();
  const { getOverallBudgetProgress } = useBudgetStore();
  const { formatAmount, gamificationEnabled } = useSettingsStore();
  const { isPremium } = useSubscriptionStore();
  const { categories } = useCategoryStore();
  const { pendingLevelUp, dismissLevelUp } = useGamificationStore();
  const { goals } = useSavingsGoalStore();
  const { colors, borders, typography } = useTheme();

  const styles = useMemo(() => createStyles(colors, borders, typography), [colors, borders, typography]);

  const { incomes, getMonthlyTotal: getMonthlyIncomeTotal, getMonthlyCount } = useIncomeStore();

  const currentMonthTotal = useMemo(() => getMonthlyTotal(), [expenses]);
  const lastMonthTotal = useMemo(() => getMonthlyTotal(subMonths(new Date(), 1)), [expenses]);
  const currentMonthIncome = useMemo(() => getMonthlyIncomeTotal(), [incomes]);
  const monthlyIncomeCount = useMemo(() => getMonthlyCount(), [incomes]);
  const netBalance = useMemo(() => currentMonthIncome - currentMonthTotal, [currentMonthIncome, currentMonthTotal]);
  const budgetProgress = useMemo(() => getOverallBudgetProgress(), [expenses]);
  const percentChange = useMemo(() => {
    if (lastMonthTotal === 0) return 0;
    return ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
  }, [currentMonthTotal, lastMonthTotal]);
  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);
  const activeGoals = useMemo(() => goals.filter((g) => g.currentAmount < g.targetAmount).slice(0, 2), [goals]);

  const categoryBreakdown = useMemo((): SpendingByCategory[] => {
    const map = new Map<string, number>();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    expenses
      .filter((e) => e.date >= monthStart)
      .forEach((e) => { map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amount); });
    return Array.from(map.entries())
      .map(([catId, total]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          categoryId: catId, categoryName: cat?.name || 'Unknown', categoryIcon: cat?.icon || 'cube-outline',
          categoryColor: cat?.color || '#9CA3AF', total,
          percentage: currentMonthTotal > 0 ? (total / currentMonthTotal) * 100 : 0, count: 0,
        };
      })
      .sort((a, b) => b.total - a.total).slice(0, 5);
  }, [expenses, categories, currentMonthTotal]);

  function ExpenseRow({ expense, formatAmount: fmtAmount }: { expense: ExpenseWithCategory; formatAmount: (n: number) => string }) {
    return (
      <Pressable onPress={() => router.push(`/expense/${expense.id}`)} style={styles.expenseRow}>
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
  }

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
              <View style={[styles.goalIconCircle, { backgroundColor: '#4ECDC425' }]}>
                <MaterialCommunityIcons name="piggy-bank-outline" size={20} color="#4ECDC4" />
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
                <ExpenseRow expense={expense} formatAmount={formatAmount} />
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
  adText: { ...typography.caption, color: colors.textLight },
  goalCard: { marginBottom: spacing.sm },
  goalCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  goalIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontSize: 13, fontWeight: '700', color: colors.text, fontFamily: 'SpaceMono_700Bold' },
  goalSaved: { fontSize: 13, fontWeight: '700', color: colors.text, fontFamily: 'SpaceMono_700Bold' },
});
