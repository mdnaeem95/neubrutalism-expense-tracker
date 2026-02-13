import { NeuButton, NeuCard, NeuIconButton, NeuInput } from '@/components/ui';
import { useDialog } from '@/contexts/DialogContext';
import { useTheme } from '@/lib/ThemeContext';
import { borderRadius, PAYMENT_METHODS, spacing } from '@/lib/theme';
import type { ThemeColors, ThemeTypography } from '@/lib/theme';
import { showInterstitial } from '@/services/ads';
import { saveReceipt } from '@/lib/receipt';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useExpenseStore } from '@/stores/useExpenseStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSubscriptionStore } from '@/stores/useSubscriptionStore';
import type { PaymentMethod, RecurringFrequency } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const expenseSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine((v) => parseFloat(v) > 0, 'Must be greater than 0'),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof expenseSchema>;

export default function AddExpenseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addExpense, incrementAddCount } = useExpenseStore();
  const { categories } = useCategoryStore();
  const { currencySymbol, defaultPaymentMethod } = useSettingsStore();
  const { isPremium } = useSubscriptionStore();
  const { colors, typography } = useTheme();

  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultPaymentMethod);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<RecurringFrequency>('monthly');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { showDialog } = useDialog();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { amount: '', description: '', notes: '' },
  });

  const imagePickerOptions: ImagePicker.ImagePickerOptions = {
    quality: 0.7,
    allowsEditing: true,
    aspect: [4, 3] as [number, number],
  };

  const handlePickReceipt = useCallback(() => {
    showDialog({
      title: 'Add Receipt',
      message: 'Choose how to add your receipt photo.',
      icon: 'camera-outline',
      iconColor: colors.accent,
      buttons: [
        {
          text: 'Take Photo',
          style: 'default',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync(imagePickerOptions);
            if (!result.canceled && result.assets[0]) {
              const persistedUri = await saveReceipt(result.assets[0].uri);
              setReceiptUri(persistedUri);
            }
          },
        },
        {
          text: 'Choose from Library',
          style: 'default',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync(imagePickerOptions);
            if (!result.canceled && result.assets[0]) {
              const persistedUri = await saveReceipt(result.assets[0].uri);
              setReceiptUri(persistedUri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  }, [showDialog, colors]);

  const onSubmit = useCallback(async (data: FormData) => {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) return;

    addExpense({
      amount,
      categoryId: selectedCategory,
      description: data.description || '',
      date: selectedDate,
      paymentMethod,
      isRecurring: isRecurring && isPremium,
      recurringFrequency: isRecurring && isPremium ? recurringFreq : undefined,
      notes: data.notes || undefined,
      receiptUri: receiptUri || undefined,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowSuccess(true);

    // Check if should show interstitial
    if (!isPremium) {
      const shouldShow = incrementAddCount();
      if (shouldShow) {
        await showInterstitial();
      }
    }

    setTimeout(() => {
      setShowSuccess(false);
      reset();
      setSelectedCategory(categories[0]?.id || '');
      setPaymentMethod(defaultPaymentMethod);
      setSelectedDate(new Date());
      setIsRecurring(false);
      setReceiptUri(null);
    }, 1500);
  }, [selectedCategory, selectedDate, paymentMethod, isRecurring, recurringFreq, isPremium, categories, defaultPaymentMethod, addExpense, incrementAddCount, reset, receiptUri]);

  if (showSuccess) {
    return (
      <View style={[styles.successContainer, { paddingTop: insets.top }]}>
        <MotiView
          from={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        >
          <NeuCard color={colors.green} style={styles.successCard}>
            <MaterialCommunityIcons name="check-circle" size={48} color={colors.green} />
            <Text style={styles.successTitle}>Expense Added!</Text>
            <Text style={styles.successText}>Successfully recorded</Text>
          </NeuCard>
        </MotiView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>Add Expense</Text>

        {/* Amount Input */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400 }}>
          <NeuCard color={colors.cardTintPink} style={styles.amountCard}>
            <Text style={styles.amountLabel}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>{currencySymbol}</Text>
              <Controller
                control={control}
                name="amount"
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.amountInput}
                    value={value}
                    onChangeText={onChange}
                    placeholder="0.00"
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                    autoFocus
                  />
                )}
              />
            </View>
            {errors.amount && <Text style={styles.errorText}>{errors.amount.message}</Text>}
          </NeuCard>
        </MotiView>

        {/* Category Picker */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 100 }}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(cat.id);
                }}
                style={[
                  styles.categoryItem,
                  selectedCategory === cat.id && { backgroundColor: cat.color + '30', borderColor: cat.color },
                ]}
              >
                <MaterialCommunityIcons name={cat.icon as any} size={22} color={selectedCategory === cat.id ? cat.color : colors.textSecondary} />
                <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>
        </MotiView>

        {/* Description */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 200 }}>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <NeuInput
                label="Description"
                placeholder="What was this for?"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </MotiView>

        {/* Date */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 250 }}>
          <Text style={styles.sectionLabel}>Date</Text>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDatePicker(true); }}>
            <NeuCard style={styles.dateCard}>
              <MaterialCommunityIcons name="calendar" size={20} color={colors.text} />
              <Text style={styles.dateText}>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textLight} />
            </NeuCard>
          </Pressable>
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setSelectedDate(date);
              }}
            />
          )}
          {showDatePicker && Platform.OS === 'ios' && (
            <Modal transparent animationType="slide">
              <View style={styles.datePickerOverlay}>
                <View style={[styles.datePickerSheet, { backgroundColor: colors.surface }]}>
                  <View style={styles.datePickerHeader}>
                    <Pressable onPress={() => setShowDatePicker(false)}>
                      <Text style={[styles.datePickerDone, { color: colors.blue }]}>Done</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={(_, date) => { if (date) setSelectedDate(date); }}
                  />
                </View>
              </View>
            </Modal>
          )}
        </MotiView>

        {/* Payment Method */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 300 }}>
          <Text style={styles.sectionLabel}>Payment Method</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_METHODS.map((pm) => (
              <Pressable
                key={pm.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPaymentMethod(pm.id as PaymentMethod);
                }}
                style={[
                  styles.paymentItem,
                  paymentMethod === pm.id && styles.paymentItemSelected,
                ]}
              >
                <MaterialCommunityIcons
                  name={pm.icon as any}
                  size={18}
                  color={paymentMethod === pm.id ? colors.text : colors.textSecondary}
                />
                <Text style={[styles.paymentLabel, paymentMethod === pm.id && styles.paymentLabelSelected]}>
                  {pm.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </MotiView>

        {/* Recurring Toggle */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 350 }}>
          <Pressable
            onPress={() => {
              if (!isPremium) {
                router.push('/paywall');
                return;
              }
              setIsRecurring(!isRecurring);
            }}
            style={styles.recurringRow}
          >
            <View style={styles.recurringInfo}>
              <MaterialCommunityIcons name="repeat" size={20} color={colors.text} />
              <Text style={styles.recurringLabel}>Recurring Expense</Text>
              {!isPremium && <Text style={styles.proBadge}>PRO</Text>}
            </View>
            <View style={[styles.toggle, isRecurring && isPremium && styles.toggleActive]}>
              <View style={[styles.toggleThumb, isRecurring && isPremium && styles.toggleThumbActive]} />
            </View>
          </Pressable>

          {isRecurring && isPremium && (
            <View style={styles.frequencyRow}>
              {(['daily', 'weekly', 'monthly', 'yearly'] as RecurringFrequency[]).map((freq) => (
                <Pressable
                  key={freq}
                  onPress={() => setRecurringFreq(freq)}
                  style={[styles.freqChip, recurringFreq === freq && styles.freqChipSelected]}
                >
                  <Text style={[styles.freqText, recurringFreq === freq && styles.freqTextSelected]}>
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </MotiView>

        {/* Notes */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 400 }}>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <NeuInput
                label="Notes (optional)"
                placeholder="Add a note..."
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                containerStyle={{ marginBottom: spacing['2xl'] }}
              />
            )}
          />
        </MotiView>

        {/* Receipt Photo */}
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 450 }}>
          <Text style={styles.sectionLabel}>Receipt (optional)</Text>
          {receiptUri ? (
            <View style={styles.receiptPreview}>
              <NeuCard style={styles.receiptCard} padded={false}>
                <Image source={{ uri: receiptUri }} style={styles.receiptImage} />
              </NeuCard>
              <NeuIconButton
                icon="close-circle"
                onPress={() => setReceiptUri(null)}
                size={18}
                bgColor={colors.cardTintRed}
                color={colors.secondary}
                style={styles.receiptRemoveBtn}
              />
            </View>
          ) : (
            <Pressable onPress={handlePickReceipt} style={styles.receiptPlaceholder}>
              <MaterialCommunityIcons name="camera-outline" size={28} color={colors.textLight} />
              <Text style={styles.receiptPlaceholderText}>Add Receipt Photo</Text>
            </Pressable>
          )}
        </MotiView>

        {/* Save Button */}
        <NeuButton
          title="Save Expense"
          onPress={handleSubmit(onSubmit)}
          variant="primary"
          size="lg"
          fullWidth
          style={{ marginTop: spacing.md }}
        />

        <View style={{ height: 120 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors, typography: ThemeTypography) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  screenTitle: { ...typography.h1, marginTop: spacing.md, marginBottom: spacing.xl },
  amountCard: { marginBottom: spacing.xl, alignItems: 'center' },
  amountLabel: { ...typography.caption, marginBottom: spacing.sm },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { fontSize: 32, fontWeight: '800', color: colors.text, marginRight: spacing.xs, fontFamily: 'SpaceMono_700Bold' },
  amountInput: { fontSize: 48, fontWeight: '800', color: colors.text, minWidth: 120, textAlign: 'center', fontFamily: 'SpaceMono_700Bold' },
  errorText: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
  sectionLabel: { ...typography.label, marginBottom: spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  categoryItem: {
    width: '22%', alignItems: 'center', paddingVertical: spacing.md, borderWidth: 2.5,
    borderColor: colors.border + '30', borderRadius: borderRadius.md, backgroundColor: colors.surface,
  },
  categoryName: { fontSize: 10, fontWeight: '600', color: colors.text, textAlign: 'center', fontFamily: 'SpaceMono_400Regular' },
  dateCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  dateText: { ...typography.body, fontWeight: '600', flex: 1, fontFamily: 'SpaceMono_400Regular' },
  datePickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  datePickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.lg },
  datePickerDone: { fontSize: 16, fontWeight: '700', fontFamily: 'SpaceMono_700Bold' },
  paymentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  paymentItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: spacing.sm, borderWidth: 2.5, borderColor: colors.border + '30',
    borderRadius: borderRadius.md, backgroundColor: colors.surface,
  },
  paymentItemSelected: { borderColor: colors.border, backgroundColor: colors.primary + '30' },
  paymentLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, fontFamily: 'SpaceMono_400Regular' },
  paymentLabelSelected: { color: colors.text, fontWeight: '700', fontFamily: 'SpaceMono_700Bold' },
  recurringRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, marginBottom: spacing.md,
  },
  recurringInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recurringLabel: { ...typography.body, fontWeight: '600', fontFamily: 'SpaceMono_400Regular' },
  proBadge: {
    fontSize: 10, fontWeight: '800', color: colors.text, backgroundColor: colors.primary,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', fontFamily: 'SpaceMono_700Bold',
  },
  toggle: {
    width: 48, height: 28, borderRadius: 14, borderWidth: 2.5, borderColor: colors.border,
    backgroundColor: colors.background, padding: 2, justifyContent: 'center',
  },
  toggleActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 2.5, borderColor: colors.border },
  toggleThumbActive: { alignSelf: 'flex-end' },
  frequencyRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  freqChip: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderWidth: 2.5,
    borderColor: colors.border + '30', borderRadius: borderRadius.md, backgroundColor: colors.surface,
  },
  freqChipSelected: { borderColor: colors.border, backgroundColor: colors.accent + '30' },
  freqText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, fontFamily: 'SpaceMono_400Regular' },
  freqTextSelected: { color: colors.text, fontWeight: '700', fontFamily: 'SpaceMono_700Bold' },
  receiptPreview: { position: 'relative', marginBottom: spacing.lg },
  receiptCard: { overflow: 'hidden' },
  receiptImage: { width: '100%', height: 200, borderRadius: borderRadius.md - 2 },
  receiptRemoveBtn: { position: 'absolute', top: -8, right: -8, width: 32, height: 32 },
  receiptPlaceholder: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl,
    borderWidth: 2.5, borderColor: colors.border + '30', borderStyle: 'dashed',
    borderRadius: borderRadius.md, backgroundColor: colors.surface, marginBottom: spacing.lg, gap: spacing.xs,
  },
  receiptPlaceholderText: { ...typography.bodySmall, color: colors.textLight },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  successCard: { alignItems: 'center', paddingVertical: spacing['3xl'], paddingHorizontal: spacing['4xl'] },
  successTitle: { ...typography.h2, marginBottom: spacing.xs },
  successText: { ...typography.bodySmall },
});
