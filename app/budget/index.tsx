import { NeuButton, NeuCard, NeuIconButton, NeuProgressBar } from '@/components/ui';
import { useDialog } from '@/contexts/DialogContext';
import { borderRadius, spacing } from '@/lib/theme';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { BudgetPeriod } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useState, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BudgetManagementScreen() {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { budgets, addBudget, deleteBudget, getBudgetsWithProgress, getOverallBudgetProgress } = useBudgetStore();
  const { categories } = useCategoryStore();
  const { formatAmount, currencySymbol } = useSettingsStore();

  const [showAdd, setShowAdd] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCategory, setBudgetCategory] = useState<string | null>(null);
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>('monthly');
  const { showError, showConfirm } = useDialog();

  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const budgetsWithProgress = getBudgetsWithProgress();
  const overallProgress = getOverallBudgetProgress();

  const handleAdd = () => {
    const amount = parseFloat(budgetAmount);
    if (isNaN(amount) || amount <= 0) {
      showError('Error', 'Please enter a valid budget amount.');
      return;
    }
    addBudget({ categoryId: budgetCategory, amount, period: budgetPeriod });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBudgetAmount('');
    setBudgetCategory(null);
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    showConfirm({
      title: 'Delete Budget',
      message: 'Remove this budget?',
      onConfirm: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        deleteBudget(id);
      },
    });
  };

  const categoriesWithoutBudget = categories.filter(
    (cat) => !budgets.some((b) => b.categoryId === cat.id)
  );

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <NeuIconButton icon="arrow-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Budgets</Text>
        <NeuIconButton icon="plus" onPress={() => setShowAdd(!showAdd)} bgColor={colors.primary} color={colors.onPrimary} />
      </View>

      {/* Overall Budget */}
      {overallProgress && (
        <NeuCard color={colors.cardTintTeal} style={styles.overallCard}>
          <Text style={styles.overallTitle}>Overall Budget</Text>
          <Text style={styles.overallAmount}>
            {formatAmount(overallProgress.spent)} / {formatAmount(overallProgress.total)}
          </Text>
          <NeuProgressBar
            progress={overallProgress.percentage}
            color={overallProgress.percentage > 80 ? colors.secondary : colors.accent}
            height={28}
          />
        </NeuCard>
      )}

      {/* Add Form */}
      {showAdd && (
        <MotiView from={{ opacity: 0, translateY: -20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <NeuCard color={colors.cardTintCream} style={styles.addCard}>
            <Text style={styles.addTitle}>New Budget</Text>

            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencyLabel}>{currencySymbol}</Text>
              <TextInput
                style={styles.amountInput}
                value={budgetAmount}
                onChangeText={setBudgetAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.fieldLabel}>Period</Text>
            <View style={styles.periodRow}>
              {(['weekly', 'monthly', 'yearly'] as BudgetPeriod[]).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setBudgetPeriod(p)}
                  style={[styles.periodChip, budgetPeriod === p && styles.periodChipSelected]}
                >
                  <Text style={[styles.periodText, budgetPeriod === p && styles.periodTextSelected]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Category (optional - leave blank for overall)</Text>
            <View style={styles.catGrid}>
              <Pressable
                onPress={() => setBudgetCategory(null)}
                style={[styles.catItem, budgetCategory === null && styles.catItemSelected]}
              >
                <MaterialCommunityIcons name="earth" size={20} color={colors.accent} />
                <Text style={styles.catItemName}>Overall</Text>
              </Pressable>
              {categoriesWithoutBudget.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setBudgetCategory(cat.id)}
                  style={[styles.catItem, budgetCategory === cat.id && { backgroundColor: cat.color + '30', borderColor: cat.color }]}
                >
                  <MaterialCommunityIcons name={cat.icon as any} size={20} color={cat.color} />
                  <Text style={styles.catItemName} numberOfLines={1}>{cat.name}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.addActions}>
              <NeuButton title="Cancel" onPress={() => setShowAdd(false)} variant="outline" size="sm" />
              <NeuButton title="Create Budget" onPress={handleAdd} variant="primary" size="sm" />
            </View>
          </NeuCard>
        </MotiView>
      )}

      {/* Budget List */}
      {budgetsWithProgress.map((budget, index) => (
        <MotiView
          key={budget.id}
          from={{ opacity: 0, translateX: -20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 300, delay: index * 50 }}
        >
          <NeuCard style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <View style={styles.budgetInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <MaterialCommunityIcons name={(budget.categoryIcon || 'earth') as any} size={16} color={budget.categoryColor || colors.accent} />
                  <Text style={styles.budgetCatName}>{budget.categoryName}</Text>
                </View>
                <Text style={styles.budgetPeriod}>{budget.period}</Text>
              </View>
              <NeuIconButton
                icon="delete-outline"
                onPress={() => handleDelete(budget.id)}
                size={16}
                bgColor={colors.secondary + '20'}
                color={colors.secondary}
                style={{ width: 36, height: 36 }}
              />
            </View>
            <NeuProgressBar
              progress={budget.percentage}
              color={budget.categoryColor || colors.primary}
              label={`${formatAmount(budget.spent)} of ${formatAmount(budget.amount)}`}
              height={22}
            />
            <Text style={styles.remainingText}>
              {budget.remaining > 0
                ? `${formatAmount(budget.remaining)} remaining`
                : 'Over budget!'}
            </Text>
          </NeuCard>
        </MotiView>
      ))}

      {budgets.length === 0 && !showAdd && (
        <NeuCard color={colors.cardTintTeal} style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <MaterialCommunityIcons name="flag-outline" size={36} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>No budgets yet</Text>
          <Text style={styles.emptyDesc}>Create a budget to track your spending limits</Text>
          <NeuButton title="Create Budget" onPress={() => setShowAdd(true)} variant="primary" size="md" />
        </NeuCard>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xl, gap: spacing.md },
  headerTitle: { ...typography.h2, flex: 1 },
  overallCard: { marginBottom: spacing.lg },
  overallTitle: { ...typography.label, marginBottom: spacing.xs },
  overallAmount: { ...typography.h3, marginBottom: spacing.md },
  addCard: { marginBottom: spacing.lg },
  addTitle: { ...typography.h3, marginBottom: spacing.md },
  fieldLabel: { ...typography.label, marginBottom: spacing.sm, marginTop: spacing.sm },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2.5, borderColor: colors.border, borderRadius: borderRadius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  currencyLabel: { fontSize: 20, fontWeight: '800', color: colors.text, fontFamily: 'SpaceMono_700Bold' },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '700', paddingVertical: spacing.sm, marginLeft: spacing.sm, color: colors.text, fontFamily: 'SpaceMono_700Bold' },
  periodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  periodChip: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderWidth: 2.5, borderColor: colors.border + '30', borderRadius: borderRadius.md, backgroundColor: colors.surface },
  periodChipSelected: { borderColor: colors.border, backgroundColor: colors.accent + '30' },
  periodText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, fontFamily: 'SpaceMono_400Regular' },
  periodTextSelected: { color: colors.text, fontWeight: '700', fontFamily: 'SpaceMono_700Bold' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  catItem: { width: '22%', alignItems: 'center', paddingVertical: spacing.sm, borderWidth: 2.5, borderColor: colors.border + '30', borderRadius: borderRadius.md, backgroundColor: colors.surface },
  catItemSelected: { borderColor: colors.border, backgroundColor: colors.accent + '30' },
  catItemName: { fontSize: 9, fontWeight: '600', color: colors.text, textAlign: 'center', fontFamily: 'SpaceMono_400Regular' },
  addActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  budgetCard: { marginBottom: spacing.sm },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  budgetInfo: { flex: 1 },
  budgetCatName: { ...typography.body, fontWeight: '700' },
  budgetPeriod: { ...typography.caption, textTransform: 'capitalize' },
  remainingText: { ...typography.caption, fontWeight: '600', marginTop: spacing.xs, textAlign: 'right' },
  emptyCard: { alignItems: 'center', marginTop: spacing['2xl'], gap: spacing.sm },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.accent + '15', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...typography.h3 },
  emptyDesc: { ...typography.bodySmall, textAlign: 'center', marginBottom: spacing.sm },
});
