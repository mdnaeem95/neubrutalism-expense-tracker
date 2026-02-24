import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { NeuCard, NeuButton, NeuIconButton, NeuProgressBar, NeuBadge, NeuEmptyState } from '@/components/ui';
import { useDebtStore } from '@/stores/useDebtStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import { useTheme } from '@/lib/ThemeContext';
import { useDialog } from '@/contexts/DialogContext';
import { spacing, borderRadius } from '@/lib/theme';
import type { ThemeColors, ThemeTypography, ThemeBorders } from '@/lib/theme';
import type { Debt } from '@/types';

const DEBT_ICONS = [
  'credit-card-outline',
  'bank-outline',
  'home-outline',
  'car',
  'school-outline',
  'medical-bag',
  'briefcase-outline',
  'cash',
  'hand-coin-outline',
] as const;

const DEBT_COLORS = [
  '#EF4444',
  '#4D96FF',
  '#A855F7',
  '#FB923C',
  '#FF6B9D',
  '#FFD93D',
  '#6BCB77',
  '#9CA3AF',
] as const;

type FormMode = 'add' | 'edit' | 'payment' | null;

export default function DebtsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, typography, borders } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography, borders), [colors, typography, borders]);

  const {
    debts,
    addDebt,
    updateDebt,
    makePayment,
    deleteDebt,
    canAddDebt,
    getTotalDebt,
    getMonthsToPayoff,
  } = useDebtStore();
  const { formatAmount } = useSettingsStore();
  const { isPremium } = useSubscriptionStore();
  const { showDialog } = useDialog();

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);

  // Add / Edit form state
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>(DEBT_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState<string>(DEBT_COLORS[0]);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');

  const atFreeLimit = !canAddDebt(isPremium);
  const totalDebt = useMemo(() => getTotalDebt(), [debts]);
  const totalMinPayment = useMemo(
    () => debts.reduce((sum, d) => sum + d.minimumPayment, 0),
    [debts],
  );
  const selectedDebt = useMemo(
    () => debts.find((d) => d.id === selectedDebtId),
    [debts, selectedDebtId],
  );

  const activeDebts = useMemo(() => debts.filter((d) => d.remainingAmount > 0), [debts]);
  const paidOffDebts = useMemo(() => debts.filter((d) => d.remainingAmount <= 0), [debts]);

  function resetForm() {
    setName('');
    setTotalAmount('');
    setRemainingAmount('');
    setInterestRate('');
    setMinimumPayment('');
    setSelectedIcon(DEBT_ICONS[0]);
    setSelectedColor(DEBT_COLORS[0]);
  }

  function openAddForm() {
    if (atFreeLimit) {
      showDialog({
        title: 'Upgrade to Pro',
        message: 'You can track 1 debt on the free plan. Upgrade to Pro for unlimited debts.',
        icon: 'credit-card-outline',
        iconColor: colors.secondary,
        buttons: [
          { text: 'Go Pro', style: 'default', onPress: () => router.push('/paywall') },
          { text: 'Cancel', style: 'cancel' },
        ],
      });
      return;
    }
    resetForm();
    setSelectedDebtId(null);
    setFormMode('add');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function openEditForm(debt: Debt) {
    setName(debt.name);
    setTotalAmount(String(debt.totalAmount));
    setRemainingAmount(String(debt.remainingAmount));
    setInterestRate(String(debt.interestRate));
    setMinimumPayment(String(debt.minimumPayment));
    setSelectedIcon(debt.icon);
    setSelectedColor(debt.color);
    setSelectedDebtId(debt.id);
    setFormMode('edit');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function openPaymentForm(debt: Debt) {
    setPaymentAmount('');
    setSelectedDebtId(debt.id);
    setFormMode('payment');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function closeForm() {
    setFormMode(null);
    setSelectedDebtId(null);
  }

  function handleSaveDebt() {
    const total = parseFloat(totalAmount);
    const remaining = parseFloat(remainingAmount);
    const rate = parseFloat(interestRate) || 0;
    const minPay = parseFloat(minimumPayment) || 0;

    if (!name.trim() || isNaN(total) || total <= 0 || isNaN(remaining) || remaining < 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (formMode === 'add') {
      addDebt({
        name: name.trim(),
        totalAmount: total,
        remainingAmount: Math.min(remaining, total),
        interestRate: rate,
        minimumPayment: minPay,
        icon: selectedIcon,
        color: selectedColor,
      });
    } else if (formMode === 'edit' && selectedDebtId) {
      updateDebt(selectedDebtId, {
        name: name.trim(),
        totalAmount: total,
        remainingAmount: Math.min(remaining, total),
        interestRate: rate,
        minimumPayment: minPay,
        icon: selectedIcon,
        color: selectedColor,
      });
    }
    closeForm();
  }

  function handleMakePayment() {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || !selectedDebtId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    makePayment(selectedDebtId, amount);
    closeForm();
  }

  const handleDelete = useCallback(
    (debt: Debt) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      showDialog({
        title: 'Delete Debt',
        message: `Remove "${debt.name}"? All tracking data will be lost.`,
        icon: 'delete-outline',
        iconColor: colors.error,
        buttons: [
          { text: 'Delete', style: 'destructive', onPress: () => deleteDebt(debt.id) },
          { text: 'Cancel', style: 'cancel' },
        ],
      });
    },
    [showDialog, colors, deleteDebt],
  );

  function formatMonthsToPayoff(months: number | null): string {
    if (months === null) return 'Min payment < interest';
    if (months === 0) return 'Paid off';
    if (months === 1) return '1 month left';
    if (months < 12) return `${months} months left`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (rem === 0) return `${years} yr${years > 1 ? 's' : ''} left`;
    return `${years} yr${years > 1 ? 's' : ''} ${rem} mo left`;
  }

  function DebtCard({ debt, index }: { debt: Debt; index: number }) {
    const paid = debt.totalAmount - debt.remainingAmount;
    const progress = debt.totalAmount > 0 ? (paid / debt.totalAmount) * 100 : 0;
    const isPaidOff = debt.remainingAmount <= 0;
    const months = getMonthsToPayoff(debt);
    const payoffLabel = formatMonthsToPayoff(months);

    return (
      <MotiView
        from={{ opacity: 0, translateX: -20 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 300, delay: index * 60 }}
      >
        <Pressable onLongPress={() => handleDelete(debt)}>
          <NeuCard style={[styles.debtCard, { borderLeftColor: debt.color, borderLeftWidth: 5 }]}>
            {/* Top row: icon, name, edit */}
            <View style={styles.cardTop}>
              <View style={[styles.iconCircle, { backgroundColor: debt.color + '25' }]}>
                <MaterialCommunityIcons name={debt.icon as any} size={22} color={debt.color} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.debtName} numberOfLines={1}>{debt.name}</Text>
                {isPaidOff ? (
                  <Text style={[styles.payoffLabel, { color: colors.green }]}>Paid Off!</Text>
                ) : (
                  <Text style={styles.payoffLabel}>{payoffLabel}</Text>
                )}
              </View>
              <View style={styles.cardActions}>
                <Pressable onPress={() => openEditForm(debt)} hitSlop={8}>
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textLight} />
                </Pressable>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressRow}>
              <NeuProgressBar
                progress={Math.min(progress, 100)}
                color={isPaidOff ? colors.green : debt.color}
              />
            </View>

            {/* Amounts row */}
            <View style={styles.amountsRow}>
              <Text style={styles.remainingAmount}>
                {formatAmount(debt.remainingAmount)}
                <Text style={styles.totalAmountText}> / {formatAmount(debt.totalAmount)}</Text>
              </Text>
              <NeuBadge
                label={`${Math.min(progress, 100).toFixed(0)}% paid`}
                color={isPaidOff ? colors.green + '30' : debt.color + '30'}
                size="sm"
              />
            </View>

            {/* Badges row: interest + min payment */}
            {!isPaidOff && (
              <View style={styles.badgesRow}>
                {debt.interestRate > 0 && (
                  <View style={[styles.infoBadge, { backgroundColor: colors.cardTintRed }]}>
                    <MaterialCommunityIcons name="percent-outline" size={12} color={colors.error} />
                    <Text style={[styles.infoBadgeText, { color: colors.error }]}>
                      {debt.interestRate}% APR
                    </Text>
                  </View>
                )}
                {debt.minimumPayment > 0 && (
                  <View style={[styles.infoBadge, { backgroundColor: colors.cardTintBlue }]}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={12} color={colors.secondary} />
                    <Text style={[styles.infoBadgeText, { color: colors.secondary }]}>
                      Min {formatAmount(debt.minimumPayment)}/mo
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Make Payment button */}
            {!isPaidOff && (
              <NeuButton
                title="Make Payment"
                onPress={() => openPaymentForm(debt)}
                variant="accent"
                size="sm"
                style={{ marginTop: spacing.sm }}
              />
            )}
          </NeuCard>
        </Pressable>
      </MotiView>
    );
  }

  function PaidOffRow({ debt, index }: { debt: Debt; index: number }) {
    return (
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 300, delay: index * 40 }}
      >
        <Pressable onLongPress={() => handleDelete(debt)}>
          <View style={styles.paidOffRow}>
            <View style={[styles.paidOffIcon, { backgroundColor: debt.color + '20' }]}>
              <MaterialCommunityIcons name={debt.icon as any} size={18} color={debt.color} />
            </View>
            <Text style={styles.paidOffName} numberOfLines={1}>{debt.name}</Text>
            <Text style={styles.paidOffAmount}>{formatAmount(debt.totalAmount)}</Text>
            <MaterialCommunityIcons name="check-circle" size={18} color={colors.green} />
          </View>
        </Pressable>
      </MotiView>
    );
  }

  const isSaveDisabled =
    !name.trim() ||
    !totalAmount ||
    parseFloat(totalAmount) <= 0 ||
    !remainingAmount ||
    parseFloat(remainingAmount) < 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <NeuIconButton icon="arrow-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Debts & Loans</Text>
        <NeuIconButton icon="plus" onPress={openAddForm} />
      </View>

      {/* Free limit chip */}
      {!isPremium && atFreeLimit && (
        <Pressable onPress={() => router.push('/paywall')} style={styles.limitChip}>
          <MaterialCommunityIcons name="lock-outline" size={12} color={colors.text} />
          <Text style={styles.limitChipText}>1 of 1 free debt — Upgrade for unlimited</Text>
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
              formMode === 'payment' && selectedDebt
                ? selectedDebt.color + '18'
                : colors.cardTintBlue
            }
            style={styles.formCard}
          >
            {/* Payment form */}
            {formMode === 'payment' && selectedDebt && (
              <>
                <Text style={styles.formTitle}>Payment for "{selectedDebt.name}"</Text>
                <Text style={styles.formSubtitle}>
                  Remaining: {formatAmount(selectedDebt.remainingAmount)}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Payment amount"
                  placeholderTextColor={colors.textLight}
                  keyboardType="decimal-pad"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  autoFocus
                />
                <View style={styles.formButtons}>
                  <NeuButton
                    title="Cancel"
                    onPress={closeForm}
                    variant="outline"
                    size="sm"
                    style={{ flex: 1 }}
                  />
                  <NeuButton
                    title="Confirm"
                    onPress={handleMakePayment}
                    variant="accent"
                    size="sm"
                    style={{ flex: 1 }}
                    disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  />
                </View>
              </>
            )}

            {/* Add / Edit form */}
            {(formMode === 'add' || formMode === 'edit') && (
              <>
                <Text style={styles.formTitle}>
                  {formMode === 'add' ? 'Add Debt / Loan' : 'Edit Debt'}
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Debt name (e.g. Credit Card)"
                  placeholderTextColor={colors.textLight}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  maxLength={40}
                />

                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Total amount"
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                    value={totalAmount}
                    onChangeText={setTotalAmount}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Remaining"
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                    value={remainingAmount}
                    onChangeText={setRemainingAmount}
                  />
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputWithSuffix, { flex: 1 }]}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      placeholder="Interest %"
                      placeholderTextColor={colors.textLight}
                      keyboardType="decimal-pad"
                      value={interestRate}
                      onChangeText={setInterestRate}
                    />
                  </View>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Min payment/mo"
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                    value={minimumPayment}
                    onChangeText={setMinimumPayment}
                  />
                </View>

                {/* Icon picker */}
                <Text style={styles.formLabel}>Icon</Text>
                <View style={styles.iconGrid}>
                  {DEBT_ICONS.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconCell,
                        selectedIcon === icon && {
                          backgroundColor: selectedColor + '30',
                          borderColor: selectedColor,
                        },
                      ]}
                      onPress={() => {
                        setSelectedIcon(icon);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={icon as any}
                        size={22}
                        color={selectedIcon === icon ? selectedColor : colors.textLight}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Color picker */}
                <Text style={styles.formLabel}>Color</Text>
                <View style={styles.colorRow}>
                  {DEBT_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorDot,
                        { backgroundColor: c },
                        selectedColor === c && styles.colorDotSelected,
                      ]}
                      onPress={() => {
                        setSelectedColor(c);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    />
                  ))}
                </View>

                <View style={styles.formButtons}>
                  <NeuButton
                    title="Cancel"
                    onPress={closeForm}
                    variant="outline"
                    size="sm"
                    style={{ flex: 1 }}
                  />
                  <NeuButton
                    title={formMode === 'add' ? 'Add Debt' : 'Save'}
                    onPress={handleSaveDebt}
                    variant="primary"
                    size="sm"
                    style={{ flex: 1 }}
                    disabled={isSaveDisabled}
                  />
                </View>
              </>
            )}
          </NeuCard>
        </MotiView>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Total Debt Summary card */}
        {debts.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
          >
            <NeuCard color={colors.cardTintRed} style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Remaining</Text>
                  <Text style={styles.summaryAmount}>{formatAmount(totalDebt)}</Text>
                </View>
                {totalMinPayment > 0 && (
                  <>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Monthly Min</Text>
                      <Text style={[styles.summaryAmount, { color: colors.secondary }]}>
                        {formatAmount(totalMinPayment)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </NeuCard>
          </MotiView>
        )}

        {/* Empty state */}
        {debts.length === 0 && formMode === null && (
          <NeuCard>
            <NeuEmptyState
              icon="credit-card-outline"
              title="No debts tracked"
              description="Add a debt or loan to track your payoff progress and stay on top of payments."
              actionTitle="Add Debt"
              onAction={openAddForm}
            />
          </NeuCard>
        )}

        {/* Active debts */}
        {activeDebts.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Active</Text>
            {activeDebts.map((debt, index) => (
              <DebtCard key={debt.id} debt={debt} index={index} />
            ))}
          </>
        )}

        {/* Paid off debts */}
        {paidOffDebts.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Paid Off</Text>
            <NeuCard padded={false} style={styles.paidOffCard}>
              {paidOffDebts.map((debt, index) => (
                <React.Fragment key={debt.id}>
                  <PaidOffRow debt={debt} index={index} />
                  {index < paidOffDebts.length - 1 && <View style={styles.separator} />}
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

const createStyles = (
  colors: ThemeColors,
  typography: ThemeTypography,
  borders: ThemeBorders,
) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    headerTitle: { ...typography.h2 },

    limitChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      backgroundColor: colors.cardTintYellow,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      alignSelf: 'flex-start',
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    limitChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text,
      fontFamily: 'SpaceMono_400Regular',
    },

    scrollContent: { paddingHorizontal: spacing.xl },

    sectionLabel: { ...typography.caption, marginBottom: spacing.sm },

    // Summary card
    summaryCard: { marginBottom: spacing.lg },
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryLabel: {
      ...typography.caption,
      marginBottom: spacing.xs,
    },
    summaryAmount: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.error,
      fontFamily: 'SpaceMono_700Bold',
    },
    summaryDivider: {
      width: 1.5,
      height: 40,
      backgroundColor: colors.border + '30',
      marginHorizontal: spacing.sm,
    },

    // Form
    formCard: { marginHorizontal: spacing.xl, marginBottom: spacing.lg },
    formTitle: { ...typography.h3, marginBottom: spacing.xs },
    formSubtitle: {
      ...typography.bodySmall,
      marginBottom: spacing.md,
      color: colors.textSecondary,
    },
    formLabel: {
      ...typography.caption,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },

    input: {
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 15,
      color: colors.text,
      fontFamily: 'SpaceMono_400Regular',
      backgroundColor: colors.surface,
      marginBottom: spacing.sm,
    },
    inputRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    inputWithSuffix: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    iconCell: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.border + '30',
      backgroundColor: colors.surface,
    },

    colorRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    colorDot: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorDotSelected: {
      borderColor: colors.border,
      transform: [{ scale: 1.15 }],
    },

    formButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },

    // Debt card
    debtCard: { marginBottom: spacing.md },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    cardInfo: { flex: 1 },
    debtName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      fontFamily: 'SpaceMono_700Bold',
    },
    payoffLabel: {
      ...typography.caption,
      color: colors.textLight,
      marginTop: 2,
      textTransform: 'none',
      letterSpacing: 0,
    },
    cardActions: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xs,
    },

    progressRow: { marginBottom: spacing.sm },

    amountsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    remainingAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      fontFamily: 'SpaceMono_700Bold',
    },
    totalAmountText: {
      fontSize: 12,
      fontWeight: '400',
      color: colors.textLight,
      fontFamily: 'SpaceMono_400Regular',
    },

    badgesRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
      marginBottom: spacing.xs,
    },
    infoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      borderWidth: 1.5,
      borderColor: colors.border + '20',
    },
    infoBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      fontFamily: 'SpaceMono_400Regular',
    },

    // Paid off section
    paidOffCard: { marginBottom: spacing.md, overflow: 'hidden' },
    paidOffRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    paidOffIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    paidOffName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      fontFamily: 'SpaceMono_400Regular',
    },
    paidOffAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.green,
      fontFamily: 'SpaceMono_700Bold',
      marginRight: spacing.xs,
    },

    separator: {
      height: 1,
      backgroundColor: colors.border + '20',
      marginHorizontal: spacing.lg,
    },
  });
