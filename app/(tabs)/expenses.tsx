import CategoryIcon from '@/components/CategoryIcon';
import { NeuChip, NeuEmptyState, NeuInput } from '@/components/ui';
import { useDialog } from '@/contexts/DialogContext';
import { useTheme } from '@/lib/ThemeContext';
import { borderRadius, spacing } from '@/lib/theme';
import type { ThemeBorders, ThemeColors, ThemeTypography } from '@/lib/theme';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import type { DateFilter, ExpenseWithCategory } from '@/types';
import { AdBanner } from '@/services/ads';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, isThisWeek, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { SlideInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getDateGroup(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date)) return 'This Week';
  return format(date, 'MMMM d, yyyy');
}

const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getFilteredExpenses, filters, setFilter, deleteExpense } = useExpenseStore();
  const { categories } = useCategoryStore();
  const { formatAmount } = useSettingsStore();
  const { isPremium } = useSubscriptionStore();
  const { showConfirm } = useDialog();
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const openSwipeableId = useRef<string | null>(null);
  const { colors, borders, typography } = useTheme();

  const styles = useMemo(() => createStyles(colors, borders, typography), [colors, borders, typography]);

  const filteredExpenses = useMemo(() => getFilteredExpenses(), [filters, useExpenseStore.getState().expenses]);

  const groupedExpenses = useMemo(() => {
    const groups: { title: string; data: ExpenseWithCategory[] }[] = [];
    const groupMap = new Map<string, ExpenseWithCategory[]>();
    filteredExpenses.forEach((expense) => {
      const group = getDateGroup(expense.date);
      if (!groupMap.has(group)) groupMap.set(group, []);
      groupMap.get(group)!.push(expense);
    });
    groupMap.forEach((data, title) => groups.push({ title, data }));
    return groups;
  }, [filteredExpenses]);

  const totalFiltered = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);

  const handleDelete = useCallback((id: string) => {
    showConfirm({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense?',
      onConfirm: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        deleteExpense(id);
      },
    });
  }, [deleteExpense, showConfirm]);

  const handleCategoryFilter = useCallback((catId: string | null) => {
    setSelectedCategoryFilter(catId);
    setFilter('categoryId', catId);
  }, [setFilter]);

  type FilterItem =
    | { type: 'date'; label: string; value: DateFilter }
    | { type: 'divider' }
    | { type: 'category'; id: string | null; name: string; icon: string; color: string };

  const filterItems = useMemo((): FilterItem[] => {
    const items: FilterItem[] = [];
    DATE_FILTERS.forEach(f => items.push({ type: 'date', ...f }));
    items.push({ type: 'divider' });
    items.push({ type: 'category', id: null, name: 'All', icon: 'view-grid-outline', color: colors.accent });
    categories.forEach(c => items.push({ type: 'category', id: c.id, name: c.name, icon: c.icon, color: c.color }));
    return items;
  }, [categories, colors]);

  const closePreviousSwipeable = useCallback((currentId: string) => {
    if (openSwipeableId.current && openSwipeableId.current !== currentId) {
      const prev = swipeableRefs.current.get(openSwipeableId.current);
      prev?.close();
    }
    openSwipeableId.current = currentId;
  }, []);

  const renderRightActions = useCallback((id: string) => (
    <Pressable
      onPress={() => {
        swipeableRefs.current.get(id)?.close();
        handleDelete(id);
      }}
      style={styles.swipeDeleteAction}
    >
      <MaterialCommunityIcons name="delete-outline" size={22} color="#FFF" />
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </Pressable>
  ), [handleDelete, styles]);

  const renderExpenseItem = useCallback(({ item, index }: { item: ExpenseWithCategory; index: number }) => (
    <Animated.View entering={SlideInRight.delay(index * 50).duration(300)}>
      <Swipeable
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(item.id, ref);
          else swipeableRefs.current.delete(item.id);
        }}
        renderRightActions={() => renderRightActions(item.id)}
        onSwipeableWillOpen={() => closePreviousSwipeable(item.id)}
        overshootRight={false}
        friction={2}
      >
        <Pressable
          onPress={() => router.push(`/expense/${item.id}`)}
          style={styles.expenseItem}
        >
          <CategoryIcon icon={item.category.icon} color={item.category.color} />
          <View style={styles.expenseDetails}>
            <Text style={styles.expenseDesc} numberOfLines={1}>
              {item.description || item.category.name}
            </Text>
            <View style={styles.expenseMeta}>
              <Text style={styles.expenseTime}>{format(new Date(item.date), 'h:mm a')}</Text>
              <View style={styles.dot} />
              <Text style={styles.expensePayment}>{item.paymentMethod}</Text>
            </View>
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.expenseAmount}>-{formatAmount(item.amount)}</Text>
            {item.isRecurring === 1 && (
              <MaterialCommunityIcons name="repeat" size={12} color={colors.accent} />
            )}
          </View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  ), [router, handleDelete, formatAmount, renderRightActions, closePreviousSwipeable, styles, colors]);

  const renderSectionHeader = useCallback((title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  ), [styles]);

  const flatData = useMemo(() => {
    const items: (ExpenseWithCategory | { type: 'header'; title: string })[] = [];
    groupedExpenses.forEach((group) => {
      items.push({ type: 'header', title: group.title } as any);
      items.push(...group.data);
    });
    return items;
  }, [groupedExpenses]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Expenses</Text>
        <Text style={styles.totalText}>{formatAmount(totalFiltered)}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <NeuInput
          placeholder="Search expenses..."
          value={filters.searchQuery}
          onChangeText={(text) => setFilter('searchQuery', text)}
          icon={<MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />}
          containerStyle={{ marginBottom: spacing.sm }}
        />
      </View>

      {/* Filters */}
      <FlatList
        horizontal
        data={filterItems}
        keyExtractor={(item, i) => item.type === 'divider' ? 'divider' : item.type === 'date' ? item.value : (item.id || 'all')}
        showsHorizontalScrollIndicator={false}
        style={styles.filterList}
        contentContainerStyle={styles.filterListContent}
        renderItem={({ item }) => {
          if (item.type === 'divider') return <View style={styles.filterDivider} />;
          if (item.type === 'date') return (
            <NeuChip
              label={item.label}
              selected={filters.dateFilter === item.value}
              onPress={() => setFilter('dateFilter', item.value)}
              color={colors.primary}
              size="sm"
            />
          );
          return (
            <NeuChip
              label={item.name}
              icon={<MaterialCommunityIcons name={item.icon as any} size={14} color={selectedCategoryFilter === item.id ? colors.text : item.color} />}
              selected={selectedCategoryFilter === item.id}
              onPress={() => handleCategoryFilter(item.id)}
              color={item.color}
              size="sm"
            />
          );
        }}
      />

      {/* Expense List */}
      {flatData.length > 0 ? (
        <FlatList
          data={flatData}
          keyExtractor={(item: any) => item.type === 'header' ? `header-${item.title}` : item.id}
          renderItem={({ item, index }: { item: any; index: number }) => {
            if (item.type === 'header') return renderSectionHeader(item.title);
            return renderExpenseItem({ item, index });
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <NeuEmptyState
          icon="magnify"
          title="No expenses found"
          description="Try adjusting your filters or add a new expense"
          actionTitle="Add Expense"
          onAction={() => router.push('/(tabs)/add')}
        />
      )}

      {!isPremium && (
        <AdBanner style={styles.adBanner} />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors, borders: ThemeBorders, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.md, marginBottom: spacing.md },
  screenTitle: { ...typography.h1 },
  totalText: { ...typography.h3, color: colors.secondary },
  searchContainer: { paddingHorizontal: spacing.xl },
  filterList: { flexGrow: 0, marginBottom: spacing.sm },
  filterListContent: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: 'center' },
  filterDivider: { width: 1.5, height: 24, backgroundColor: colors.border + '20', marginHorizontal: spacing.xs },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  sectionHeader: { paddingVertical: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { ...typography.label, color: colors.textSecondary },
  expenseItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderWidth: 2.5, borderColor: colors.border + '20', borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.md,
  },
  catIcon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 20 },
  expenseDetails: { flex: 1 },
  expenseDesc: { ...typography.body, fontWeight: '600' },
  expenseMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  expenseTime: { ...typography.caption },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textLight },
  expensePayment: { ...typography.caption, textTransform: 'capitalize' },
  amountCol: { alignItems: 'flex-end', gap: 2 },
  expenseAmount: { ...typography.body, fontWeight: '800', color: colors.secondary },
  swipeDeleteAction: {
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  swipeDeleteText: { color: '#FFF', fontSize: 11, fontWeight: '700', marginTop: 2, fontFamily: 'SpaceMono_700Bold' },
  separator: { height: spacing.sm },
  adBanner: {
    height: 60, backgroundColor: colors.surface, borderWidth: borders.medium, borderColor: borders.color,
    borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.sm,
  },
  adText: { ...typography.caption, color: colors.textLight },
});
