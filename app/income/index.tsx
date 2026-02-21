import { NeuCard, NeuChip, NeuEmptyState, NeuIconButton } from '@/components/ui';
import { useTheme } from '@/lib/ThemeContext';
import { INCOME_SOURCES, borderRadius, spacing } from '@/lib/theme';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';
import { useIncomeStore } from '@/stores/useIncomeStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useDialog } from '@/contexts/DialogContext';
import type { Income } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { endOfMonth, endOfYear, startOfMonth, startOfYear } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Period = 'month' | 'year' | 'all';

export default function IncomeListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { incomes, deleteIncome, getMonthlyTotal } = useIncomeStore();
  const { formatAmount } = useSettingsStore();
  const { colors, typography } = useTheme();
  const { showDialog } = useDialog();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const [period, setPeriod] = useState<Period>('month');

  const filtered = useMemo(() => {
    if (period === 'all') return incomes;
    const now = new Date();
    const start = period === 'month' ? startOfMonth(now).getTime() : startOfYear(now).getTime();
    const end = period === 'month' ? endOfMonth(now).getTime() : endOfYear(now).getTime();
    return incomes.filter((i) => i.date >= start && i.date <= end);
  }, [incomes, period]);

  const total = useMemo(() => filtered.reduce((s, i) => s + i.amount, 0), [filtered]);

  const getSourceMeta = (source: string) =>
    INCOME_SOURCES.find((s) => s.id === source) ?? INCOME_SOURCES[INCOME_SOURCES.length - 1];

  const handleDelete = (item: Income) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showDialog({
      title: 'Delete Income',
      message: `Remove ${formatAmount(item.amount)} income entry?`,
      icon: 'delete-outline',
      iconColor: colors.secondary,
      buttons: [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteIncome(item.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  };

  const renderItem = ({ item, index }: { item: Income; index: number }) => {
    const src = getSourceMeta(item.source);
    return (
      <MotiView
        from={{ opacity: 0, translateX: -20 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 300, delay: index * 40 }}
      >
        <Pressable onLongPress={() => handleDelete(item)}>
          <View style={styles.incomeRow}>
            <View style={[styles.iconCircle, { backgroundColor: src.color + '25' }]}>
              <MaterialCommunityIcons name={src.icon as any} size={20} color={src.color} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.description || src.label}
              </Text>
              <Text style={styles.rowDate}>{format(item.date, 'MMM d, yyyy')}</Text>
            </View>
            <Text style={styles.rowAmount}>+{formatAmount(item.amount)}</Text>
          </View>
        </Pressable>
      </MotiView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <NeuIconButton icon="arrow-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Income</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Period Filter */}
      <View style={styles.filterRow}>
        {(['month', 'year', 'all'] as Period[]).map((p) => (
          <NeuChip
            key={p}
            label={p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'All Time'}
            selected={period === p}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPeriod(p); }}
          />
        ))}
      </View>

      {/* Total Card */}
      <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
        <NeuCard color={colors.cardTintGreen} style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Income</Text>
          <Text style={styles.totalAmount}>+{formatAmount(total)}</Text>
          <Text style={styles.totalCount}>{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</Text>
        </NeuCard>
      </MotiView>

      {/* Income List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <NeuEmptyState
            icon="trending-up"
            title="No income yet"
            description={period === 'month' ? 'Add your first income entry for this month.' : 'No income recorded for this period.'}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.h2 },
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  totalCard: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, alignItems: 'center', paddingVertical: spacing.xl },
  totalLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  totalAmount: { fontSize: 36, fontWeight: '800', color: colors.green, fontFamily: 'SpaceMono_700Bold' },
  totalCount: { ...typography.caption, color: colors.textLight, marginTop: spacing.xs },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  incomeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md,
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border + '20',
  },
  rowInfo: { flex: 1 },
  rowTitle: { ...typography.body, fontWeight: '600', fontFamily: 'SpaceMono_400Regular' },
  rowDate: { ...typography.caption, color: colors.textLight },
  rowAmount: { fontSize: 15, fontWeight: '700', color: colors.green, fontFamily: 'SpaceMono_700Bold' },
  separator: { height: 1, backgroundColor: colors.border + '20' },
});
