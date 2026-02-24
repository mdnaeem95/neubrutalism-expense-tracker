import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSavingsGoalStore } from '@/stores/useSavingsGoalStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { useDialog } from '@/contexts/DialogContext';
import { NeuCard, NeuButton, NeuProgressBar, NeuBadge, NeuEmptyState, NeuIconButton } from '@/components/ui';
import { GOAL_ICONS, GOAL_COLORS, spacing, borderRadius } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import type { SavingsGoal } from '@/types';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';

type FormMode = 'add' | 'edit' | 'contribute' | null;

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const { goals, addGoal, updateGoal, contributeToGoal, deleteGoal, canAddGoal, getActiveGoals, getCompletedGoals } = useSavingsGoalStore();
  const { formatAmount } = useSettingsStore();
  const { isPremium } = useSubscriptionStore();
  const { showDialog } = useDialog();

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>(GOAL_ICONS[0].id);
  const [selectedColor, setSelectedColor] = useState<string>(GOAL_COLORS[0]);
  const [contributionAmount, setContributionAmount] = useState('');
  const [useTargetDate, setUseTargetDate] = useState(false);
  const [targetDate, setTargetDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const activeGoals = useMemo(() => getActiveGoals(), [goals]);
  const completedGoals = useMemo(() => getCompletedGoals(), [goals]);
  const selectedGoal = useMemo(() => goals.find((g) => g.id === selectedGoalId), [goals, selectedGoalId]);
  const atFreeLimit = !canAddGoal(isPremium);

  function openAddForm() {
    if (atFreeLimit) {
      showDialog({
        title: 'Upgrade to Pro',
        message: 'You can have 1 active savings goal on the free plan. Upgrade to Pro for unlimited goals.',
        icon: 'piggy-bank-outline',
        iconColor: colors.accent,
        buttons: [
          { text: 'Go Pro', style: 'default', onPress: () => router.push('/paywall') },
          { text: 'Cancel', style: 'cancel' },
        ],
      });
      return;
    }
    setTitle('');
    setTargetAmount('');
    setSelectedIcon(GOAL_ICONS[0].id);
    setSelectedColor(GOAL_COLORS[0]);
    setUseTargetDate(false);
    setTargetDate(new Date());
    setSelectedGoalId(null);
    setFormMode('add');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function openEditForm(goal: SavingsGoal) {
    setTitle(goal.title);
    setTargetAmount(String(goal.targetAmount));
    setSelectedIcon(goal.icon);
    setSelectedColor(goal.color);
    setUseTargetDate(goal.targetDate !== null);
    setTargetDate(goal.targetDate ? new Date(goal.targetDate) : new Date());
    setSelectedGoalId(goal.id);
    setFormMode('edit');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function openContributeForm(goal: SavingsGoal) {
    setContributionAmount('');
    setSelectedGoalId(goal.id);
    setFormMode('contribute');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function closeForm() {
    setFormMode(null);
    setSelectedGoalId(null);
  }

  function handleSaveGoal() {
    const amount = parseFloat(targetAmount);
    if (!title.trim() || isNaN(amount) || amount <= 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const goalDate = useTargetDate ? targetDate.getTime() : null;

    if (formMode === 'add') {
      addGoal({ title: title.trim(), targetAmount: amount, icon: selectedIcon, color: selectedColor, targetDate: goalDate });
    } else if (formMode === 'edit' && selectedGoalId) {
      updateGoal(selectedGoalId, { title: title.trim(), targetAmount: amount, icon: selectedIcon, color: selectedColor, targetDate: goalDate });
    }
    closeForm();
  }

  function handleContribute() {
    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0 || !selectedGoalId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    contributeToGoal(selectedGoalId, amount);
    closeForm();
  }

  function handleDelete(goal: SavingsGoal) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showDialog({
      title: 'Delete Goal',
      message: `Remove "${goal.title}"? Your progress will be lost.`,
      icon: 'delete-outline',
      iconColor: colors.secondary,
      buttons: [
        { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(goal.id) },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  }

  function getDaysLeft(targetDate: number): string {
    const diff = Math.ceil((targetDate - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Overdue';
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day left';
    if (diff < 30) return `${diff} days left`;
    return `by ${format(new Date(targetDate), 'MMM yyyy')}`;
  }

  function GoalCard({ goal, index }: { goal: SavingsGoal; index: number }) {
    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    const isComplete = goal.currentAmount >= goal.targetAmount;
    return (
      <MotiView
        from={{ opacity: 0, translateX: -20 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 300, delay: index * 60 }}
      >
        <Pressable onPress={() => !isComplete && openContributeForm(goal)} onLongPress={() => handleDelete(goal)}>
          <NeuCard style={styles.goalCard}>
            <View style={styles.goalCardTop}>
              <View style={[styles.goalIconCircle, { backgroundColor: goal.color + '25' }]}>
                <MaterialCommunityIcons name={goal.icon as any} size={22} color={goal.color} />
              </View>
              <View style={styles.goalCardInfo}>
                <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
                {goal.targetDate && !isComplete && (
                  <Text style={styles.goalDate}>{getDaysLeft(goal.targetDate)}</Text>
                )}
                {isComplete && (
                  <Text style={[styles.goalDate, { color: colors.green }]}>Achieved!</Text>
                )}
              </View>
              <View style={styles.goalCardRight}>
                <Pressable onPress={() => openEditForm(goal)} hitSlop={8}>
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textLight} />
                </Pressable>
              </View>
            </View>

            <View style={styles.goalProgressRow}>
              <NeuProgressBar progress={Math.min(progress, 100)} color={isComplete ? colors.green : goal.color} />
            </View>

            <View style={styles.goalCardBottom}>
              <Text style={styles.goalAmountSaved}>
                {formatAmount(goal.currentAmount)}
                <Text style={styles.goalAmountTarget}> / {formatAmount(goal.targetAmount)}</Text>
              </Text>
              <NeuBadge
                label={`${Math.min(progress, 100).toFixed(0)}%`}
                color={isComplete ? colors.green + '30' : goal.color + '30'}
                size="sm"
              />
            </View>

            {!isComplete && (
              <NeuButton
                title="+ Add Funds"
                onPress={() => openContributeForm(goal)}
                variant="outline"
                size="sm"
                style={{ marginTop: spacing.sm }}
              />
            )}
          </NeuCard>
        </Pressable>
      </MotiView>
    );
  }

  function CompletedRow({ goal, index }: { goal: SavingsGoal; index: number }) {
    return (
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 300, delay: index * 40 }}
      >
        <Pressable onLongPress={() => handleDelete(goal)}>
          <View style={styles.completedRow}>
            <View style={[styles.completedIcon, { backgroundColor: goal.color + '20' }]}>
              <MaterialCommunityIcons name={goal.icon as any} size={18} color={goal.color} />
            </View>
            <Text style={styles.completedTitle} numberOfLines={1}>{goal.title}</Text>
            <Text style={styles.completedAmount}>{formatAmount(goal.targetAmount)}</Text>
            <MaterialCommunityIcons name="check-circle" size={18} color={colors.green} />
          </View>
        </Pressable>
      </MotiView>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <NeuIconButton icon="arrow-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Goals</Text>
        <NeuIconButton icon="plus" onPress={openAddForm} />
      </View>

      {/* Free limit chip */}
      {!isPremium && atFreeLimit && (
        <Pressable onPress={() => router.push('/paywall')} style={styles.limitChip}>
          <MaterialCommunityIcons name="lock-outline" size={12} color={colors.text} />
          <Text style={styles.limitChipText}>1 of 1 free goal active — Upgrade for unlimited</Text>
        </Pressable>
      )}

      {/* Form Panel */}
      {formMode !== null && (
        <MotiView
          from={{ opacity: 0, translateY: -16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250 }}
        >
          <NeuCard
            color={
              formMode === 'contribute' && selectedGoal
                ? selectedGoal.color + '18'
                : colors.cardTintTeal
            }
            style={styles.formCard}
          >
            {/* Contribute form */}
            {formMode === 'contribute' && selectedGoal && (
              <>
                <Text style={styles.formTitle}>Add to "{selectedGoal.title}"</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Amount"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={contributionAmount}
                  onChangeText={setContributionAmount}
                  autoFocus
                />
                <View style={styles.formButtons}>
                  <NeuButton title="Cancel" onPress={closeForm} variant="outline" size="sm" style={{ flex: 1 }} />
                  <NeuButton
                    title="Add Funds"
                    onPress={handleContribute}
                    variant="primary"
                    size="sm"
                    style={{ flex: 1 }}
                    disabled={!contributionAmount || parseFloat(contributionAmount) <= 0}
                  />
                </View>
              </>
            )}

            {/* Add / Edit form */}
            {(formMode === 'add' || formMode === 'edit') && (
              <>
                <Text style={styles.formTitle}>{formMode === 'add' ? 'New Goal' : 'Edit Goal'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Goal name (e.g. Emergency Fund)"
                  placeholderTextColor={colors.textLight}
                  value={title}
                  onChangeText={setTitle}
                  autoFocus
                  maxLength={40}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Target amount"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                />

                {/* Icon picker */}
                <Text style={styles.formLabel}>Icon</Text>
                <View style={styles.iconGrid}>
                  {GOAL_ICONS.map((icon) => (
                    <TouchableOpacity
                      key={icon.id}
                      style={[
                        styles.iconCell,
                        selectedIcon === icon.id && { backgroundColor: selectedColor + '30', borderColor: selectedColor },
                      ]}
                      onPress={() => { setSelectedIcon(icon.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    >
                      <MaterialCommunityIcons name={icon.id as any} size={22} color={selectedIcon === icon.id ? selectedColor : colors.textLight} />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Color picker */}
                <Text style={styles.formLabel}>Color</Text>
                <View style={styles.colorRow}>
                  {GOAL_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
                      onPress={() => { setSelectedColor(c); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    />
                  ))}
                </View>

                {/* Target date toggle */}
                <TouchableOpacity style={styles.dateToggleRow} onPress={() => setUseTargetDate((v) => !v)}>
                  <MaterialCommunityIcons
                    name={useTargetDate ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
                    size={20}
                    color={colors.text}
                  />
                  <Text style={styles.dateToggleLabel}>Set target date</Text>
                </TouchableOpacity>

                {useTargetDate && (
                  <>
                    <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                      <MaterialCommunityIcons name="calendar-outline" size={16} color={colors.text} />
                      <Text style={styles.dateButtonText}>{format(targetDate, 'MMM d, yyyy')}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={targetDate}
                        mode="date"
                        minimumDate={new Date()}
                        onChange={(_, date) => {
                          setShowDatePicker(Platform.OS === 'android' ? false : true);
                          if (date) setTargetDate(date);
                          if (Platform.OS === 'ios') setShowDatePicker(false);
                        }}
                      />
                    )}
                  </>
                )}

                <View style={styles.formButtons}>
                  <NeuButton title="Cancel" onPress={closeForm} variant="outline" size="sm" style={{ flex: 1 }} />
                  <NeuButton
                    title={formMode === 'add' ? 'Create Goal' : 'Save'}
                    onPress={handleSaveGoal}
                    variant="primary"
                    size="sm"
                    style={{ flex: 1 }}
                    disabled={!title.trim() || !targetAmount || parseFloat(targetAmount) <= 0}
                  />
                </View>
              </>
            )}
          </NeuCard>
        </MotiView>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Empty state */}
        {goals.length === 0 && formMode === null && (
          <NeuCard>
            <NeuEmptyState
              icon="piggy-bank-outline"
              title="No goals yet"
              description="Set a savings goal and track your progress toward it."
              actionTitle="Create Goal"
              onAction={openAddForm}
            />
          </NeuCard>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Active</Text>
            {activeGoals.map((goal, index) => (
              <GoalCard key={goal.id} goal={goal} index={index} />
            ))}
          </>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Achieved</Text>
            <NeuCard padded={false} style={styles.completedCard}>
              {completedGoals.map((goal, index) => (
                <React.Fragment key={goal.id}>
                  <CompletedRow goal={goal} index={index} />
                  {index < completedGoals.length - 1 && <View style={styles.separator} />}
                </React.Fragment>
              ))}
            </NeuCard>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.h2 },

  limitChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginHorizontal: spacing.xl, marginBottom: spacing.md,
    backgroundColor: colors.cardTintYellow, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1.5, borderColor: colors.border,
  },
  limitChipText: { fontSize: 11, fontWeight: '600', color: colors.text, fontFamily: 'SpaceMono_400Regular' },

  scrollContent: { paddingHorizontal: spacing.xl },

  sectionLabel: { ...typography.caption, marginBottom: spacing.sm },

  formCard: { marginHorizontal: spacing.xl, marginBottom: spacing.lg },
  formTitle: { ...typography.h3, marginBottom: spacing.md },
  formLabel: { ...typography.caption, marginTop: spacing.md, marginBottom: spacing.xs },

  input: {
    borderWidth: 2, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: 15, color: colors.text, fontFamily: 'SpaceMono_400Regular',
    backgroundColor: colors.surface, marginBottom: spacing.sm,
  },

  iconGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
  },
  iconCell: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border + '30',
    backgroundColor: colors.surface,
  },

  colorRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  colorDot: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorDotSelected: { borderColor: colors.border, transform: [{ scale: 1.15 }] },

  dateToggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  dateToggleLabel: { ...typography.body },
  dateButton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  dateButtonText: { fontSize: 14, color: colors.text, fontFamily: 'SpaceMono_400Regular' },

  formButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },

  goalCard: { marginBottom: spacing.md },
  goalCardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  goalIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  goalCardInfo: { flex: 1 },
  goalTitle: { fontSize: 15, fontWeight: '700', color: colors.text, fontFamily: 'SpaceMono_700Bold' },
  goalDate: { ...typography.caption, color: colors.textLight, marginTop: 2 },
  goalCardRight: { alignItems: 'center', justifyContent: 'center', padding: spacing.xs },

  goalProgressRow: { marginBottom: spacing.sm },

  goalCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalAmountSaved: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: 'SpaceMono_700Bold' },
  goalAmountTarget: { fontSize: 12, fontWeight: '400', color: colors.textLight, fontFamily: 'SpaceMono_400Regular' },

  completedCard: { marginBottom: spacing.md, overflow: 'hidden' },
  completedRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  completedIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  completedTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textSecondary, fontFamily: 'SpaceMono_400Regular' },
  completedAmount: { fontSize: 14, fontWeight: '700', color: colors.green, fontFamily: 'SpaceMono_700Bold', marginRight: spacing.xs },

  separator: { height: 1, backgroundColor: colors.border + '20', marginHorizontal: spacing.lg },
});
